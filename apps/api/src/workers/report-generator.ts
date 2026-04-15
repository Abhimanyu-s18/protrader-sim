import { Worker, type Job } from 'bullmq'
import { prisma } from '../lib/prisma.js'
import { serializeBigInt } from '../lib/calculations.js'
import { createLogger } from '../lib/logger.js'
import { emailQueue, QUEUES } from '../lib/queues.js'
import { getRedis } from '../lib/redis.js'

const log = createLogger('report-generator-worker')

interface ReportJobData {
  /** Optional: generate for a specific user only (admin-triggered) */
  userId?: string
  /** Report period — defaults to the previous calendar month */
  year?: number
  month?: number // 1-12
}

/**
 * Report Generator Worker — runs monthly on the 1st at 01:00 UTC.
 *
 * For each active user, generates a monthly account statement covering:
 * - Opening / closing balance
 * - All ledger transactions (deposits, withdrawals, P&L, rollovers)
 * - Trade summary (total trades, win rate, net P&L)
 *
 * Queues an email to the user with the statement data.
 * Full PDF rendering via React PDF is a future enhancement (Phase 4).
 */
export let reportGeneratorWorker: Worker<ReportJobData> | null = null

if (process.env['NODE_ENV'] !== 'test') {
  reportGeneratorWorker = new Worker<ReportJobData>(
    QUEUES.REPORT_GENERATOR,
    async (job: Job<ReportJobData>) => {
      const now = new Date()

      // Default to previous calendar month
      const reportYear =
        job.data.year ?? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
      const reportMonth = job.data.month ?? (now.getMonth() === 0 ? 12 : now.getMonth()) // 1-12

      const periodStart = new Date(Date.UTC(reportYear, reportMonth - 1, 1))
      const periodEnd = new Date(Date.UTC(reportYear, reportMonth, 1)) // exclusive

      log.info(
        { reportYear, reportMonth, periodStart, periodEnd },
        'Starting monthly report generation',
      )

      // Determine which users to generate for
      // Determine which users to generate for
      let userFilter: { id: bigint } | { accountStatus: 'ACTIVE' }
      if (job.data.userId) {
        const parsed = /^\d+$/.test(job.data.userId) ? BigInt(job.data.userId) : null
        if (parsed === null) {
          throw new Error(`Invalid userId format: ${job.data.userId}`)
        }
        userFilter = { id: parsed }
      } else {
        userFilter = { accountStatus: 'ACTIVE' as const }
      }

      const users = await prisma.user.findMany({
        where: userFilter,
        select: { id: true, email: true, fullName: true, accountNumber: true },
      })

      let generated = 0
      let failed = 0

      for (const user of users) {
        try {
          // Fetch ledger transactions for the period
          const transactions = await prisma.ledgerTransaction.findMany({
            where: {
              userId: user.id,
              createdAt: { gte: periodStart, lt: periodEnd },
            },
            orderBy: { createdAt: 'asc' },
          })

          if (transactions.length === 0) continue // skip users with no activity

          // Compute period net
          const netCents = transactions.reduce((sum, t) => sum + t.amountCents, 0n)
          const openingBalance = transactions[0]
            ? transactions[0].balanceAfterCents - transactions[0].amountCents
            : 0n
          const closingBalance = transactions[transactions.length - 1]?.balanceAfterCents ?? 0n

          // Fetch trade summary for the period
          const [closedTrades, deposits, withdrawals] = await Promise.all([
            prisma.trade.count({
              where: {
                userId: user.id,
                status: 'CLOSED',
                closeAt: { gte: periodStart, lt: periodEnd },
              },
            }),
            prisma.deposit.count({
              where: {
                userId: user.id,
                status: 'COMPLETED',
                createdAt: { gte: periodStart, lt: periodEnd },
              },
            }),
            prisma.withdrawal.count({
              where: {
                userId: user.id,
                status: 'COMPLETED',
                createdAt: { gte: periodStart, lt: periodEnd },
              },
            }),
          ])

          const reportData = serializeBigInt({
            user: {
              email: user.email,
              fullName: user.fullName,
              accountNumber: user.accountNumber,
            },
            period: {
              year: reportYear,
              month: reportMonth,
              start: periodStart.toISOString(),
              end: new Date(periodEnd.getTime() - 1).toISOString(),
            },
            summary: {
              openingBalanceCents: openingBalance,
              closingBalanceCents: closingBalance,
              netCents,
              transactionCount: transactions.length,
              closedTradesCount: closedTrades,
              depositsCount: deposits,
              withdrawalsCount: withdrawals,
            },
          })

          // Queue email with statement data using deterministic jobId for deduplication
          const emailJobId = `monthly-statement-${user.id}-${reportYear}-${reportMonth}`
          await emailQueue.add(
            'monthly-statement-email',
            {
              type: 'MONTHLY_STATEMENT',
              userId: user.id.toString(),
              reportData,
            },
            {
              jobId: emailJobId,
              removeOnComplete: true,
              removeOnFail: false,
            },
          )

          generated++
        } catch (err) {
          log.error({ userId: user.id.toString(), err }, 'Failed to generate report for user')
          failed++
        }
      }

      log.info({ generated, failed, reportYear, reportMonth }, 'Report generation run complete')
      return { generated, failed }
    },
    { connection: getRedis() },
  )

  reportGeneratorWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Report generator job failed')
  })
}
