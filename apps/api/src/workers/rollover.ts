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
export const rolloverWorker = new Worker<RolloverJobData>(
  QUEUES.ROLLOVER_DAILY,
  async (job: Job<RolloverJobData>) => {
    // Use explicit isWednesday override if provided, otherwise derive from job name
    const isWednesday = job.data.isWednesday ?? (job.name === 'process-rollover-triple')
    log.info({ jobName: job.name, isWednesday }, 'Starting rollover processing')

    // Get today's date (in UTC) for idempotency check
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Fetch swap rates once for all instruments
    const allSwapRates = await prisma.swapRate.findMany({
      where: {
        effectiveFrom: { lte: new Date() },
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    // Build map of latest swap rate per instrument+direction
    const swapRateMap = new Map<string, bigint>()
    for (const sr of allSwapRates) {
      const key = `${sr.instrumentId.toString()}:${sr.direction}`
      if (!swapRateMap.has(key)) {
        swapRateMap.set(key, sr.rateBps)
      }
    }

    let processed = 0
    let failed = 0
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
        log.info({ processed, failed }, 'No more open trades — rollover complete')
        break
      }

      for (const trade of openTrades) {
        try {
          const inst = trade.instrument

          // Determine swap rate: prefer swap_rates table, fall back to instrument defaults
          const rateKey = `${inst.id.toString()}:${trade.direction}`
          const rateBps = swapRateMap.get(rateKey)
            ?? (trade.direction === 'BUY' ? inst.swapBuyBps : inst.swapSellBps)

          // Skip trades with zero swap rate
          if (rateBps === 0n) continue

          const rolloverCents = calcRolloverCents(
            trade.units,
            inst.contractSize,
            trade.openRateScaled,
            rateBps,
            isWednesday,
          )

          if (rolloverCents === 0n) continue

          await withSerializableRetry(() =>
            prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              // Lock user row
              await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${trade.userId} FOR UPDATE`

              // Lock and check trade for idempotency
              const tradeRow = await tx.$queryRaw<[{ id: bigint; last_rollover_date: Date | null }]>`
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
                if (lastRolloverDay.getTime() === today.getTime()) {
                  log.debug({ tradeId: trade.id.toString() }, 'Trade already processed today, skipping')
                  return
                }
              }

              // Get current balance with explicit error handling
              const balanceResult = await tx.$queryRaw<[{ balance_cents: bigint | null }]>`
                SELECT get_user_balance(${trade.userId}) AS balance_cents
              `

              if (!balanceResult || !balanceResult[0]) {
                const errMsg = `Failed to retrieve balance for user ${trade.userId} during rollover processing`
                log.error({ userId: trade.userId.toString(), tradeId: trade.id.toString() }, errMsg)
                throw new Error(errMsg)
              }

              const balanceRow = balanceResult[0]
              if (balanceRow?.balance_cents === null || balanceRow?.balance_cents === undefined) {
                const warnMsg = `User balance is null for user ${trade.userId}, defaulting to 0`
                log.warn({ userId: trade.userId.toString(), tradeId: trade.id.toString() }, warnMsg)
              }

              const currentBalance = balanceRow?.balance_cents ?? 0n
              // rolloverCents: positive = debit (charge), negative = credit (income)
              // For ledger: negative amount = debit, positive amount = credit
              const ledgerAmount = -rolloverCents
              const newBalance = currentBalance + ledgerAmount

              // Update trade accumulator and set lastRolloverDate for idempotency
              await tx.trade.update({
                where: { id: trade.id },
                data: {
                  rolloverAccumulatedCents: { increment: rolloverCents },
                  overnightCount: { increment: 1 },
                  lastRolloverDate: today,
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
            }, { isolationLevel: 'Serializable' }),
          )

          processed++
        } catch (err) {
          failed++
          log.error({ err, tradeId: trade.id.toString() }, 'Failed to process rollover for trade')
        }
      }

      // Move cursor to last trade for next batch
      cursor = openTrades[openTrades.length - 1]?.id
    }

    log.info({ processed, failed }, 'Rollover processing complete')
    return { processed, failed }
  },
  {
    connection: getRedis(),
    concurrency: 5,
    limiter: { max: 100, duration: 1000 },
  },
)

rolloverWorker.on('completed', (job) => {
  log.info({ jobId: job.id, result: job.returnvalue }, 'Rollover job completed')
})

rolloverWorker.on('failed', (job, err) => {
  log.error({ jobId: job?.id, err }, 'Rollover job failed')
})
