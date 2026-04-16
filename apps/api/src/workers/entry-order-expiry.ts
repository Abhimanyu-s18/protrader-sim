import { Worker, type Job } from 'bullmq'
import type { Prisma } from '@protrader/db'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'
import { notificationQueue, emailQueue } from '../lib/queues.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'

const log = createLogger('entry-order-expiry-worker')

/**
 * Entry Order Expiry Worker — runs every 5 minutes.
 *
 * Scans PENDING trades where `expiryAt` is in the past and:
 * 1. Cancels the trade (sets status = CANCELLED, closedBy = EXPIRED)
 * 2. Queues an in-app notification and email for the user
 *
 * Without this worker, expired entry orders accumulate forever and keep firing
 * against the market-data tick processor even after their window has passed.
 */
export let entryOrderExpiryWorker: Worker | null = null

if (process.env['NODE_ENV'] !== 'test') {
  entryOrderExpiryWorker = new Worker(
    QUEUES.ENTRY_ORDER_EXPIRY,
    async (_job: Job) => {
      const now = new Date()
      const BATCH_SIZE = 100

      let expiredCount = 0
      let cursor: bigint | undefined = undefined

      // Use batched processing to avoid memory pressure from large result sets
      for (;;) {
        // Fetch one batch of expired orders
        const expiredOrders: Prisma.TradeGetPayload<{
          include: { instrument: { select: { symbol: true; displayName: true } } }
        }>[] = await prisma.trade.findMany({
          where: {
            status: 'PENDING',
            expiryAt: { lte: now },
          },
          include: {
            instrument: { select: { symbol: true, displayName: true } },
          },
          orderBy: { id: 'asc' },
          take: BATCH_SIZE,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
        })

        if (expiredOrders.length === 0) {
          log.debug('No more expired entry orders found')
          break
        }

        log.info(
          { count: expiredOrders.length, batch: true },
          'Processing batch of expired entry orders',
        )

        for (const trade of expiredOrders) {
          try {
            const updated = await prisma.trade.updateMany({
              where: { id: trade.id, status: 'PENDING' },
              data: {
                status: 'CANCELLED',
                closedBy: 'EXPIRED',
                closeAt: now,
              },
            })

            // Skip notifications if another process already handled this trade
            if (updated.count === 0) {
              log.debug({ tradeId: trade.id.toString() }, 'Trade already processed, skipping')
              continue
            }

            // Notify the trader
            try {
              await notificationQueue.add('entry-order-expired', {
                userId: trade.userId.toString(),
                type: 'ENTRY_ORDER_EXPIRED',
                title: 'Entry Order Expired',
                message: `Your ${trade.direction} entry order on ${trade.instrument.symbol} has expired and been cancelled.`,
              })
            } catch (err) {
              log.error(
                { tradeId: trade.id.toString(), err },
                'Failed to add notification to queue',
              )
            }

            try {
              await emailQueue.add('entry-order-expired-email', {
                type: 'ENTRY_ORDER_EXPIRED',
                userId: trade.userId.toString(),
                tradeId: trade.id.toString(),
                symbol: trade.instrument.symbol,
                direction: trade.direction,
              })
            } catch (err) {
              log.error({ tradeId: trade.id.toString(), err }, 'Failed to add email to queue')
            }

            expiredCount++
          } catch (err) {
            log.error({ tradeId: trade.id.toString(), err }, 'Failed to expire entry order')
          }
        }

        // Move cursor to next batch
        const lastTrade = expiredOrders[expiredOrders.length - 1]
        if (!lastTrade?.id) break
        cursor = lastTrade.id
      }

      log.info({ expired: expiredCount }, 'Entry order expiry run complete')
      return { expired: expiredCount }
    },
    { connection: getRedis() },
  )

  entryOrderExpiryWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Entry order expiry job failed')
  })

  // Graceful shutdown — only registered outside test environments to avoid
  // interfering with test runners that manage their own signal handling.
  let isShuttingDown = false
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return
    isShuttingDown = true
    log.info({ signal }, 'Received shutdown signal, closing worker...')
    if (entryOrderExpiryWorker) {
      try {
        await entryOrderExpiryWorker.close()
        log.info('Entry order expiry worker closed')
      } catch (err) {
        log.error({ err }, 'Error closing entry order expiry worker')
      }
    }
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
