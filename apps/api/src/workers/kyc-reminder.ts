import { Worker, type Job } from 'bullmq'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES, emailQueue } from '../lib/queues.js'

const log = createLogger('kyc-reminder-worker')

/**
 * KYC reminder worker — runs daily at 09:00 UTC.
 * Finds traders who registered 3+ days ago with KYC status PENDING
 * and queues a reminder email.
 */
export let kycReminderWorker: Worker | null = null

if (process.env['NODE_ENV'] !== 'test') {
  kycReminderWorker = new Worker(
    QUEUES.KYC_REMINDER,
    async (_job: Job) => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

      // Find all traders with pending KYC registered more than 3 days ago
      const pendingUsers = await prisma.user.findMany({
        where: {
          kycStatus: 'PENDING',
          createdAt: { lte: threeDaysAgo },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      })

      log.info({ count: pendingUsers.length }, 'Sending KYC reminders')

      let queued = 0
      for (const user of pendingUsers) {
        try {
          await emailQueue.add('kyc-reminder', {
            type: 'kyc-reminder',
            to: user.email,
            fullName: user.fullName,
          })
          queued++
        } catch (err) {
          log.error(
            { err, userId: user.id.toString(), email: user.email },
            'Failed to queue KYC reminder email',
          )
        }
      }

      log.info({ queued, total: pendingUsers.length }, 'KYC reminder emails queued')
      return { queued, total: pendingUsers.length }
    },
    {
      connection: getRedis(),
      concurrency: 1,
    },
  )

  kycReminderWorker.on('completed', (job) => {
    log.info({ jobId: job.id, result: job.returnvalue }, 'KYC reminder job completed')
  })

  kycReminderWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'KYC reminder job failed')
  })
}
