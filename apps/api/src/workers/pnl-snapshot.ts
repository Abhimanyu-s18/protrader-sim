import { Worker, type Job } from 'bullmq'
import { prisma } from '../lib/prisma.js'
import { calcPnlCents, calcBidAsk } from '../lib/calculations.js'
import { getRedis, getCachedPrice } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'

const log = createLogger('pnl-snapshot-worker')

/**
 * P&L Snapshot Worker — runs daily at midnight UTC.
 *
 * For every user with at least one open trade, computes the current
 * unrealized P&L and persists it as a daily snapshot. This powers:
 * - Historical P&L charts in the platform
 * - Monthly account statements
 * - Tax reporting (unrealized gains at end-of-day)
 *
 * Uses the latest cached mid price; skips instruments with no live price.
 */
export let pnlSnapshotWorker: Worker | null = null

if (process.env['NODE_ENV'] !== 'test') {
  pnlSnapshotWorker = new Worker(
    QUEUES.PNL_SNAPSHOT,
    async (_job: Job) => {
      const snapshotAt = new Date()
      snapshotAt.setUTCHours(0, 0, 0, 0) // normalise to midnight

      log.info({ snapshotAt }, 'Starting daily P&L snapshot')

      // Find all users with open trades
      const usersWithOpenTrades = await prisma.trade.groupBy({
        by: ['userId'],
        where: { status: 'OPEN' },
      })

      let processed = 0
      let skipped = 0
      let totalMissingPrices = 0

      // Declared outside the per-user loop so the post-loop summary log can access it
      const skippedTradesBySymbol = new Map<string, { count: number; tradeIds: bigint[] }>()

      for (const { userId } of usersWithOpenTrades) {
        try {
          // Fetch open trades with instrument data
          const openTrades = await prisma.trade.findMany({
            where: { userId, status: 'OPEN' },
            include: {
              instrument: {
                select: {
                  symbol: true,
                  contractSize: true,
                  spreadPips: true,
                  pipDecimalPlaces: true,
                },
              },
            },
          })

          // Batch fetch prices to avoid redundant Redis calls
          const uniqueSymbols = Array.from(new Set(openTrades.map((t) => t.instrument.symbol)))
          const priceCache = new Map<string, Awaited<ReturnType<typeof getCachedPrice>>>()

          for (const symbol of uniqueSymbols) {
            const cached = await getCachedPrice(symbol)
            if (cached) priceCache.set(symbol, cached)
          }

          let totalUnrealizedPnlCents = 0n
          let usedMarginCents = 0n
          let skippedTrades = 0

          for (const trade of openTrades) {
            const cached = priceCache.get(trade.instrument.symbol)
            if (!cached) {
              skippedTrades++
              totalMissingPrices++

              // Batch skipped trades by symbol (cap tradeIds to prevent unbounded growth)
              const MAX_TRACKED_IDS = 10
              const symbol = trade.instrument.symbol
              const existing = skippedTradesBySymbol.get(symbol)
              if (existing) {
                existing.count++
                if (existing.tradeIds.length < MAX_TRACKED_IDS) {
                  existing.tradeIds.push(trade.id)
                }
              } else {
                skippedTradesBySymbol.set(symbol, { count: 1, tradeIds: [trade.id] })
              }
              continue
            }

            const midScaled = BigInt(cached.mid_scaled)
            const { bidScaled, askScaled } = calcBidAsk(
              midScaled,
              trade.instrument.spreadPips,
              trade.instrument.pipDecimalPlaces,
            )

            const pnl = calcPnlCents(
              trade.direction,
              trade.units,
              trade.openRateScaled,
              trade.direction === 'BUY' ? bidScaled : askScaled,
              trade.instrument.contractSize,
            )

            totalUnrealizedPnlCents += pnl
            usedMarginCents += trade.marginRequiredCents
          }

          // Compute balance from ledger
          const [balRow] = await prisma.$queryRaw<
            [{ balance_cents: bigint }]
          >`SELECT get_user_balance(${userId}) AS balance_cents`

          const balanceCents = balRow?.balance_cents ?? 0n
          const equityCents = balanceCents + totalUnrealizedPnlCents

          // Persist snapshot to database for compliance and audit trail
          const snapshotPayload = {
            userId: userId.toString(),
            balanceCents: balanceCents.toString(),
            unrealizedPnlCents: totalUnrealizedPnlCents.toString(),
            equityCents: equityCents.toString(),
            usedMarginCents: usedMarginCents.toString(),
            skippedTrades,
            snapshotAt,
          }

          // Insert into daily_pnl_snapshots table (idempotent via unique constraint on userId + snapshotAt)
          try {
            await prisma.$executeRaw`
              INSERT INTO daily_pnl_snapshots (user_id, balance_cents, unrealized_pnl_cents, equity_cents, used_margin_cents, skipped_trades, snapshot_at, created_at, source)
              VALUES (${userId}, ${balanceCents}, ${totalUnrealizedPnlCents}, ${equityCents}, ${usedMarginCents}, ${skippedTrades}, ${snapshotAt}, NOW(), 'daily_pnl_snapshot')
              ON CONFLICT (user_id, snapshot_at) DO NOTHING
            `
          } catch (insertErr) {
            log.warn(
              { userId: userId.toString(), insertErr },
              'Failed to persist P&L snapshot to DB — possible missing table or unmigrated skipped_trades column',
            )
          }

          // Also log for structured logging / external observability
          log.info(snapshotPayload, 'daily_pnl_snapshot')

          processed++
        } catch (err) {
          log.error({ userId: userId.toString(), err }, 'Failed to snapshot P&L for user')
          skipped++
        }
      }

      // Emit summary logs for skipped trades by symbol
      for (const [symbol, { count, tradeIds }] of skippedTradesBySymbol.entries()) {
        const trimmedTradeIds = tradeIds.slice(0, 10) // Limit to first 10 trade IDs to avoid huge logs
        log.warn(
          {
            symbol,
            count,
            tradeIds: trimmedTradeIds.map((id) => id.toString()),
            totalTradeIds: tradeIds.length,
          },
          `Skipped ${count} trades for symbol — no live price`,
        )
      }

      log.info({ processed, skipped, totalMissingPrices }, 'P&L snapshot run complete')
      return { processed, skipped, totalMissingPrices }
    },
    { connection: getRedis() },
  )

  pnlSnapshotWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'P&L snapshot job failed')
  })
}
