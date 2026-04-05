import { Worker, type Job } from 'bullmq'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'
import { emitToUser } from '../lib/socket.js'

const log = createLogger('notification-worker')

export type NotificationType = 'info' | 'warning' | 'error'

export interface NotificationJobData {
  userId: string
  type: NotificationType
  title: string
  message: string
}

export let notificationWorker: Worker<NotificationJobData> | null = null

export async function shutdownNotificationWorker(): Promise<void> {
  if (notificationWorker) {
    log.info('Shutting down notification worker...')
    try {
      await notificationWorker.close()
      log.info('Notification worker closed')
    } catch (err) {
      log.error({ err }, 'Error closing notification worker')
    } finally {
      notificationWorker = null
    }
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  notificationWorker = new Worker<NotificationJobData>(
    QUEUES.NOTIFICATION,
    async (job: Job<NotificationJobData>) => {
      const { userId, type, title, message } = job.data

      // Validate userId before conversion
      if (!userId || !/^\d+$/.test(userId)) {
        throw new Error(`Invalid userId: ${userId}. Must be a string of digits.`)
      }

      const notification = await prisma.notification.create({
        data: {
          userId: BigInt(userId),
          type,
          title,
          message,
        },
      })

      // Emit real-time event to the user's Socket.io room
      try {
        emitToUser(userId, 'notification:new', {
          id: notification.id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt.toISOString(),
          readAt: null,
        })
      } catch (err) {
        log.error(
          { err, userId, notificationId: notification.id.toString() },
          'Failed to emit notification event',
        )
      }

      log.info({ notificationId: notification.id.toString(), userId, type }, 'Notification created')
    },
    {
      connection: getRedis(),
      concurrency: 10,
    },
  )

  notificationWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Notification job completed')
  })

  notificationWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Notification job failed')
  })
}
