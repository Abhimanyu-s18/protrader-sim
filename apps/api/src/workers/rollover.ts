import { Worker, type Job } from 'bullmq'
import type { Prisma } from '@prisma/client'
import { prisma, withSerializableRetry } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'
import { calcRolloverCents } from '../lib/calculations.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'

const log = createLogger('rollover-worker')

interface RolloverJobData {
  isWednesday?: boolean
}

/**
 * Rollover worker — processes daily and Wednesday triple swap calculations.
 *
 * Daily job runs at 22:00 UTC Mon, Tue, Thu, Fri (cron: '0 22 * * 1,2,4,5')
 * Wednesday triple job runs at 22:00 UTC Wednesday (cron: '0 22 * * 3')
 *
 * For each open trade:
 * 1. Look up the swap rate for the instrument + direction
 * 2. Calculate the daily swap fee using the BigInt formula
 * 3. Accumulate on the trade and create a ledger entry
 */
export let rolloverWorker: Worker<RolloverJobData> | null = null

if (process.env['NODE_ENV'] !== 'test') {
  rolloverWorker = new Worker<RolloverJobData>(
    QUEUES.ROLLOVER_DAILY,
    async (job: Job<RolloverJobData>) => {
      // Use explicit isWednesday override if provided, otherwise derive from job name
      const isWednesday = job.data.isWednesday ?? job.name === 'process-rollover-triple'

      // Compute UTC "today" once at job start — ensures all trades in a single run
      // use the same reference date for idempotency checks, even if the job spans midnight
      const jobStartDate = new Date()
      jobStartDate.setUTCHours(0, 0, 0, 0)

      log.info({ jobName: job.name, isWednesday, jobStartDate }, 'Starting rollover processing')

      // Fetch only the latest swap rate per instrument+direction using DISTINCT ON
      // This is more efficient than loading all historical rows and deduplicating in memory
      const latestSwapRates = await prisma.$queryRaw<
        Array<{ instrumentId: bigint; direction: string; rateBps: bigint }>
      >`
      SELECT DISTINCT ON ("instrumentId", "direction")
        "instrumentId",
        "direction",
        "rateBps"
      FROM "SwapRate"
      WHERE "effectiveFrom" <= NOW()
      ORDER BY "instrumentId", "direction", "effectiveFrom" DESC
    `

      // Build map of swap rate per instrument+direction
      const swapRateMap = new Map<string, bigint>()
      for (const sr of latestSwapRates) {
        const key = `${sr.instrumentId.toString()}:${sr.direction}`
        swapRateMap.set(key, sr.rateBps)
      }

      let processed = 0
      let failed = 0
      let skippedTrades = 0
      let cursor: bigint | undefined

      const BATCH_SIZE = 500

      // Process trades in batches using cursor-based pagination
      while (true) {
        const openTrades = await prisma.trade.findMany({
          where: {
            status: 'OPEN',
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          include: {
            instrument: {
              select: {
                id: true,
                symbol: true,
                contractSize: true,
                swapBuyBps: true,
                swapSellBps: true,
              },
            },
            user: {
              select: { id: true },
            },
          },
          orderBy: { id: 'asc' },
          take: BATCH_SIZE,
        })

        if (openTrades.length === 0) {
          log.info({ processed, failed, skippedTrades }, 'No more open trades — rollover complete')
          break
        }

        for (const trade of openTrades) {
          try {
            const inst = trade.instrument

            // Determine swap rate: prefer swap_rates table, fall back to instrument defaults
            const rateKey = `${inst.id.toString()}:${trade.direction}`
            const rateBps =
              swapRateMap.get(rateKey) ??
              (trade.direction === 'BUY' ? inst.swapBuyBps : inst.swapSellBps)

            // Skip trades with zero swap rate
            if (rateBps === 0n) {
              skippedTrades++
              continue
            }

            const rolloverCents = calcRolloverCents(
              trade.units,
              inst.contractSize,
              trade.openRateScaled,
              rateBps,
              isWednesday,
            )

            if (rolloverCents === 0n) {
              skippedTrades++
              continue
            }

            const txResult = await withSerializableRetry(() =>
              prisma.$transaction(
                async (tx: Prisma.TransactionClient) => {
                  // Lock user row
                  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${trade.userId} FOR UPDATE`

                  // Lock and check trade for idempotency
                  const tradeRow = await tx.$queryRaw<
                    [{ id: bigint; last_rollover_date: Date | null }]
                  >`
                SELECT id, last_rollover_date FROM "trades" WHERE id = ${trade.id} FOR UPDATE
              `

                  if (!tradeRow || !tradeRow[0]) {
                    throw new Error(`Trade ${trade.id} not found during rollover processing`)
                  }

                  const lastRolloverDate = tradeRow[0]?.last_rollover_date

                  // Skip if already processed today (idempotency guard)
                  if (lastRolloverDate) {
                    const lastRolloverDay = new Date(lastRolloverDate)
                    lastRolloverDay.setUTCHours(0, 0, 0, 0)
                    if (lastRolloverDay.getTime() === jobStartDate.getTime()) {
                      log.debug(
                        { tradeId: trade.id.toString() },
                        'Trade already processed today, skipping',
                      )
                      return { status: 'already_processed' as const }
                    }
                  }

                  // Get current balance with explicit error handling
                  const balanceResult = await tx.$queryRaw<[{ balance_cents: bigint | null }]>`
                SELECT get_user_balance(${trade.userId}) AS balance_cents
              `

                  if (!balanceResult || !balanceResult[0]) {
                    const errMsg = `Failed to retrieve balance for user ${trade.userId} during rollover processing`
                    log.error(
                      { userId: trade.userId.toString(), tradeId: trade.id.toString() },
                      errMsg,
                    )
                    throw new Error(errMsg)
                  }

                  const balanceRow = balanceResult[0]
                  // Null balance indicates a data integrity failure — get_user_balance should
                  // never return null for a user with open trades (margin was validated on entry).
                  // Throwing here prevents incorrect ledger entries with fabricated zero balances.
                  if (
                    balanceRow?.balance_cents === null ||
                    balanceRow?.balance_cents === undefined
                  ) {
                    const errMsg = `User balance is null for user ${trade.userId} — data integrity failure during rollover`
                    log.error(
                      { userId: trade.userId.toString(), tradeId: trade.id.toString() },
                      errMsg,
                    )
                    throw new Error(errMsg)
                  }

                  const currentBalance = balanceRow.balance_cents
                  // rolloverCents: positive = charge (money taken from user), negative = credit (money given to user)
                  // ledgerAmount = -rolloverCents: convert to ledger convention where negative = debit, positive = credit
                  // newBalance = currentBalance + ledgerAmount: apply the converted ledger amount to the balance
                  const ledgerAmount = -rolloverCents
                  const newBalance = currentBalance + ledgerAmount

                  // Update trade accumulator and set lastRolloverDate for idempotency
                  await tx.trade.update({
                    where: { id: trade.id },
                    data: {
                      rolloverAccumulatedCents: { increment: rolloverCents },
                      overnightCount: { increment: 1 },
                      lastRolloverDate: jobStartDate,
                    },
                  })

                  // Create ledger entry
                  await tx.ledgerTransaction.create({
                    data: {
                      userId: trade.userId,
                      transactionType: 'ROLLOVER',
                      amountCents: ledgerAmount,
                      balanceAfterCents: newBalance,
                      referenceId: trade.id,
                      referenceType: 'TRADE',
                      description: `Rollover${isWednesday ? ' (3x)' : ''}: ${trade.direction} ${trade.units} ${inst.symbol}`,
                    },
                  })

                  return { status: 'processed' as const }
                },
                { isolationLevel: 'Serializable' },
              ),
            )

            if (txResult?.status === 'already_processed') {
              skippedTrades++
            } else {
              processed++
            }
          } catch (err) {
            failed++
            log.error({ err, tradeId: trade.id.toString() }, 'Failed to process rollover for trade')
          }
        }

        // Move cursor to last trade for next batch
        cursor = openTrades[openTrades.length - 1]?.id
      }

      log.info({ processed, failed, skippedTrades }, 'Rollover processing complete')
      return { processed, failed, skippedTrades }
    },
    {
      connection: getRedis(),
      concurrency: 1,
    },
  )

  rolloverWorker.on('completed', (job) => {
    log.info({ jobId: job.id, result: job.returnvalue }, 'Rollover job completed')
  })

  rolloverWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Rollover job failed')
  })
}
