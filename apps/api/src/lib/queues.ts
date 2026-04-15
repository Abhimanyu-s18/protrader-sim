import { Queue } from 'bullmq'
import { getRedis } from './redis.js'
import { createLogger } from './logger.js'

const log = createLogger('queues')

// ── Queue names ───────────────────────────────────────────────────
export const QUEUES = {
  ROLLOVER_DAILY: 'rollover-daily',
  ALERT_CHECK: 'alert-check',
  ENTRY_ORDER_EXPIRY: 'entry-order-expiry',
  KYC_REMINDER: 'kyc-reminder',
  DEPOSIT_CONFIRM: 'deposit-confirm',
  PNL_SNAPSHOT: 'pnl-snapshot',
  REPORT_GENERATOR: 'report-generator',
  EMAIL: 'email',
  NOTIFICATION: 'notification',
} as const

const connection = { connection: getRedis() }

// ── Queues ────────────────────────────────────────────────────────
export const rolloverQueue = new Queue(QUEUES.ROLLOVER_DAILY, connection)
export const alertQueue = new Queue(QUEUES.ALERT_CHECK, connection)
export const entryOrderExpiryQueue = new Queue(QUEUES.ENTRY_ORDER_EXPIRY, connection)
export const kycReminderQueue = new Queue(QUEUES.KYC_REMINDER, connection)
export const depositConfirmQueue = new Queue(QUEUES.DEPOSIT_CONFIRM, connection)
export const pnlSnapshotQueue = new Queue(QUEUES.PNL_SNAPSHOT, connection)
export const reportQueue = new Queue(QUEUES.REPORT_GENERATOR, connection)
export const emailQueue = new Queue(QUEUES.EMAIL, {
  ...connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { age: 24 * 60 * 60 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
})
export const notificationQueue = new Queue(QUEUES.NOTIFICATION, {
  ...connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    removeOnComplete: { age: 24 * 60 * 60 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
})

// ── Scheduled jobs (cron) ─────────────────────────────────────────
export async function scheduleRecurringJobs(): Promise<void> {
  // Daily rollover at 22:00 UTC Mon, Tue, Thu, Fri (skip Wed — handled by wednesday-triple)
  await rolloverQueue.upsertJobScheduler(
    'rollover-daily-job',
    { pattern: '0 22 * * 1,2,4,5', tz: 'UTC' },
    { name: 'process-rollover', data: {} },
  )

  // Wednesday 3x swap rollover at 22:00 UTC (triple swap charged on Wed due to Forex 3-day settlement)
  await rolloverQueue.upsertJobScheduler(
    'rollover-wednesday-triple-job',
    { pattern: '0 22 * * 3', tz: 'UTC' },
    { name: 'process-rollover-triple', data: {} },
  )

  // Daily P&L snapshot at midnight UTC
  await pnlSnapshotQueue.upsertJobScheduler(
    'pnl-snapshot-job',
    { pattern: '0 0 * * *', tz: 'UTC' },
    { name: 'snapshot-pnl', data: {} },
  )

  // KYC reminder check daily at 09:00 UTC
  await kycReminderQueue.upsertJobScheduler(
    'kyc-reminder-job',
    { pattern: '0 9 * * *', tz: 'UTC' },
    { name: 'send-kyc-reminders', data: {} },
  )

  // Entry order expiry check every 5 minutes
  await entryOrderExpiryQueue.upsertJobScheduler(
    'entry-order-expiry-job',
    { pattern: '*/5 * * * *', tz: 'UTC' },
    { name: 'expire-entry-orders', data: {} },
  )

  // Deposit polling fallback every 5 minutes (catches missed IPN webhooks)
  await depositConfirmQueue.upsertJobScheduler(
    'deposit-confirm-job',
    { pattern: '*/5 * * * *', tz: 'UTC' },
    { name: 'poll-pending-deposits', data: {} },
  )

  // Monthly account statement on the 1st of each month at 01:00 UTC
  await reportQueue.upsertJobScheduler(
    'monthly-report-job',
    { pattern: '0 1 1 * *', tz: 'UTC' },
    { name: 'generate-monthly-reports', data: {} },
  )

  log.info('Recurring jobs scheduled')
}
