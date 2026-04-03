import { Worker, type Job } from 'bullmq'
import { getRedis } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'

const log = createLogger('email-worker')

/**
 * Job data shapes for each email type.
 * Add new types here as email templates are built in Phase 5.
 */
export type EmailJobData =
  | { type: 'welcome'; to: string; fullName: string; verifyToken: string }
  | { type: 'verify-email'; to: string; fullName: string; verifyToken: string }
  | { type: 'password-reset'; to: string; fullName: string; resetToken: string }
  | { type: 'password-changed'; to: string; fullName: string }
  | { type: 'deposit-confirmed'; to: string; fullName: string; amountFormatted: string; currency: string }
  | { type: 'deposit-rejected'; to: string; fullName: string; reason?: string }
  | { type: 'kyc-approved'; to: string; fullName: string }
  | { type: 'kyc-rejected'; to: string; fullName: string; reason?: string }
  | { type: 'kyc-reminder'; to: string; fullName: string }
  | { type: 'margin-call'; to: string; fullName: string; marginLevelPct: string; equityFormatted: string }
  | { type: 'stop-out'; to: string; fullName: string; balanceFormatted: string }
  | { type: 'withdrawal-approved'; to: string; fullName: string; amountFormatted: string; walletAddress: string }
  | { type: 'withdrawal-rejected'; to: string; fullName: string; reason?: string }

/**
 * Generate a plain-text email body for the given job type.
 * Replace with React Email templates in Phase 5.
 */
function buildEmail(data: EmailJobData): { subject: string; html: string } | null {
  const apiUrl = process.env['AUTH_APP_URL'] ?? 'http://localhost:3001'
  const platformUrl = process.env['PLATFORM_URL'] ?? 'http://localhost:3002'

  switch (data.type) {
    case 'welcome':
    case 'verify-email':
      return {
        subject: 'Welcome to ProTraderSim — Verify your email',
        html: `<p>Hi ${data.fullName},</p>
<p>Welcome to ProTraderSim! Please verify your email address by clicking the link below:</p>
<p><a href="${apiUrl}/verify-email?token=${data.verifyToken}">Verify Email</a></p>
<p>This link expires in 24 hours.</p>`,
      }

    case 'password-reset':
      return {
        subject: 'ProTraderSim — Reset your password',
        html: `<p>Hi ${data.fullName},</p>
<p>We received a request to reset your ProTraderSim password. Click the link below (valid for 1 hour):</p>
<p><a href="${apiUrl}/reset-password?token=${data.resetToken}">Reset Password</a></p>
<p>If you did not request this, you can safely ignore this email.</p>`,
      }

    case 'password-changed':
      return {
        subject: 'ProTraderSim — Your password has been changed',
        html: `<p>Hi ${data.fullName},</p>
<p>Your ProTraderSim password was successfully changed. If you did not make this change, please contact support immediately.</p>`,
      }

    case 'deposit-confirmed':
      return {
        subject: 'ProTraderSim — Deposit confirmed',
        html: `<p>Hi ${data.fullName},</p>
<p>Your deposit of ${data.amountFormatted} (${data.currency}) has been confirmed and added to your trading account.</p>
<p><a href="${platformUrl}/account">View your account</a></p>`,
      }

    case 'deposit-rejected':
      return {
        subject: 'ProTraderSim — Deposit not processed',
        html: `<p>Hi ${data.fullName},</p>
<p>Unfortunately your deposit could not be processed${data.reason ? `: ${data.reason}` : ''}. Please contact support if you need assistance.</p>`,
      }

    case 'kyc-approved':
      return {
        subject: 'ProTraderSim — Your account is verified',
        html: `<p>Hi ${data.fullName},</p>
<p>Your identity verification has been approved. Your account is now fully active and you can start trading.</p>
<p><a href="${platformUrl}/dashboard">Go to dashboard</a></p>`,
      }

    case 'kyc-rejected':
      return {
        subject: 'ProTraderSim — KYC verification update',
        html: `<p>Hi ${data.fullName},</p>
<p>Unfortunately your KYC submission could not be approved${data.reason ? `: ${data.reason}` : ''}.</p>
<p>Please <a href="${apiUrl}/kyc">resubmit your documents</a> to complete verification.</p>`,
      }

    case 'kyc-reminder':
      return {
        subject: 'ProTraderSim — Complete your identity verification',
        html: `<p>Hi ${data.fullName},</p>
<p>You're almost ready to trade. Complete your identity verification to activate your account.</p>
<p><a href="${apiUrl}/kyc">Verify identity now</a></p>`,
      }

    case 'margin-call':
      return {
        subject: 'ProTraderSim — Urgent: Margin call warning',
        html: `<p>Hi ${data.fullName},</p>
<p><strong>Your margin level has dropped to ${data.marginLevelPct}%.</strong></p>
<p>Your current equity is ${data.equityFormatted}. Please deposit additional funds or close some positions to avoid automatic stop-out.</p>
<p><a href="${platformUrl}/account">Manage your account</a></p>`,
      }

    case 'stop-out':
      return {
        subject: 'ProTraderSim — Position closed due to stop-out',
        html: `<p>Hi ${data.fullName},</p>
<p>Your margin level fell below the minimum required level. A position has been automatically closed to protect your account.</p>
<p>Your current balance is ${data.balanceFormatted}.</p>
<p><a href="${platformUrl}/trades">View trade history</a></p>`,
      }

    case 'withdrawal-approved':
      return {
        subject: 'ProTraderSim — Withdrawal approved',
        html: `<p>Hi ${data.fullName},</p>
<p>Your withdrawal of ${data.amountFormatted} has been approved and sent to ${data.walletAddress}.</p>`,
      }

    case 'withdrawal-rejected':
      return {
        subject: 'ProTraderSim — Withdrawal update',
        html: `<p>Hi ${data.fullName},</p>
<p>Your withdrawal request could not be processed${data.reason ? `: ${data.reason}` : ''}. Please contact support if you need assistance.</p>`,
      }

    default:
      return null
  }
}

export let emailWorker: Worker<EmailJobData> | null = null

if (process.env['NODE_ENV'] !== 'test') {
  emailWorker = new Worker<EmailJobData>(
    QUEUES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const data = job.data

      const email = buildEmail(data)
      if (!email) {
        log.warn({ type: data.type }, 'No email template found for type — skipping')
        return
      }

      const resendKey = process.env['RESEND_API_KEY']
      if (!resendKey) {
        log.warn({ type: data.type, to: data.to }, 'RESEND_API_KEY not set — email not sent')
        return
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env['EMAIL_FROM'] ?? 'ProTraderSim <noreply@protrader.com>',
          to: data.to,
          subject: email.subject,
          html: email.html,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        log.error({ status: response.status, body, type: data.type }, 'Resend API error')
        throw new Error(`Resend API returned ${response.status}`)
      }

      log.info({ type: data.type, to: data.to }, 'Email sent successfully')
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  )

  emailWorker.on('completed', (job) => {
    log.info({ jobId: job.id, type: job.data.type }, 'Email job completed')
  })

  emailWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, type: job?.data.type, err }, 'Email job failed')
  })
}
