import { Worker, type Job } from 'bullmq'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'
import { getSocketIO, emitToUser } from '../lib/socket.js'

const log = createLogger('notification-worker')

export interface NotificationJobData {
  userId: string
  type: string
  title: string
  message: string
}

export let notificationWorker: Worker<NotificationJobData> | null = null

if (process.env['NODE_ENV'] !== 'test') {
  notificationWorker = new Worker<NotificationJobData>(
    QUEUES.NOTIFICATION,
    async (job: Job<NotificationJobData>) => {
      const { userId, type, title, message } = job.data

      const notification = await prisma.notification.create({
        data: {
          userId: BigInt(userId),
          type,
          title,
          message,
        },
      })

      // Emit real-time event to the user's Socket.io room
      const io = getSocketIO()
      if (io) {
        emitToUser(io, userId, 'notification:new', {
          id: notification.id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt.toISOString(),
          readAt: null,
        })
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
