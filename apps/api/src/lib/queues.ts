import { Queue, Worker, QueueEvents } from 'bullmq'
import { getRedis } from './redis.js'

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
export const emailQueue = new Queue(QUEUES.EMAIL, connection)
export const notificationQueue = new Queue(QUEUES.NOTIFICATION, connection)

// ── Scheduled jobs (cron) ─────────────────────────────────────────
export async function scheduleRecurringJobs(): Promise<void> {
  // Daily rollover at 22:00 UTC Mon–Fri
  await rolloverQueue.upsertJobScheduler(
    'rollover-daily-job',
    { pattern: '0 22 * * 1-5', tz: 'UTC' },
    { name: 'process-rollover', data: {} },
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

  console.log('[BullMQ] Recurring jobs scheduled')
}
