import { Worker, type Job } from 'bullmq'
import { render } from '@react-email/components'
import React from 'react'
import { getRedis } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'
import {
  WelcomeEmail,
  VerifyEmail,
  PasswordResetEmail,
  PasswordChangedEmail,
  DepositConfirmedEmail,
  DepositRejectedEmail,
  KycApprovedEmail,
  KycRejectedEmail,
  KycReminderEmail,
  MarginCallEmail,
  StopOutEmail,
  WithdrawalApprovedEmail,
  WithdrawalRejectedEmail,
  AlertTriggeredEmail,
} from '@protrader/email'

const log = createLogger('email-worker')

const AUTH_APP_URL = process.env['AUTH_APP_URL'] ?? 'http://localhost:3001'
const PLATFORM_URL = process.env['PLATFORM_URL'] ?? 'http://localhost:3002'
const SUPPORT_URL = process.env['SUPPORT_URL'] ?? 'https://protrader.com/support'

/**
 * Job data shapes for each email type.
 */
export type EmailJobData =
  | { type: 'welcome'; to: string; fullName: string; verifyToken: string }
  | {
      type: 'verify-email'
      to: string
      fullName: string
      verifyToken: string
      expirationHours: number
    }
  | { type: 'password-reset'; to: string; fullName: string; resetToken: string }
  | { type: 'password-changed'; to: string; fullName: string; changedAt?: string }
  | {
      type: 'deposit-confirmed'
      to: string
      fullName: string
      amountFormatted: string
      currency: string
      txId?: string
    }
  | { type: 'deposit-rejected'; to: string; fullName: string; reason?: string }
  | { type: 'kyc-approved'; to: string; fullName: string }
  | { type: 'kyc-rejected'; to: string; fullName: string; reason?: string }
  | { type: 'kyc-reminder'; to: string; fullName: string }
  | {
      type: 'margin-call'
      to: string
      fullName: string
      /**
       * Numeric string representing the margin level percentage WITHOUT the '%' symbol.
       * Example: "50" (not "50%"). The '%' is appended automatically in the email template.
       */
      marginLevelPct: string
      equityFormatted: string
    }
  | { type: 'stop-out'; to: string; fullName: string; balanceFormatted: string }
  | {
      type: 'withdrawal-approved'
      to: string
      fullName: string
      amountFormatted: string
      walletAddress: string
      txHash?: string
    }
  | { type: 'withdrawal-rejected'; to: string; fullName: string; reason?: string }
  | {
      type: 'alert-triggered'
      to: string
      fullName: string
      symbol: string
      priceLevel: string
      currentPrice: string
      direction: 'above' | 'below'
    }

/**
 * Build a React Email element and subject for the given job type.
 * Returns null if the type is unrecognised.
 */
function buildEmailElement(
  data: EmailJobData,
): { subject: string; element: React.ReactElement } | null {
  switch (data.type) {
    case 'welcome':
      return {
        subject: 'Welcome to ProTraderSim — verify your email',
        element: React.createElement(WelcomeEmail, {
          fullName: data.fullName,
          verifyUrl: `${AUTH_APP_URL}/verify-email?token=${encodeURIComponent(data.verifyToken)}`,
        }),
      }

    case 'verify-email':
      const expirationHours =
        typeof data.expirationHours === 'number' &&
        Number.isFinite(data.expirationHours) &&
        data.expirationHours > 0
          ? data.expirationHours
          : 24
      return {
        subject: 'ProTraderSim — verify your email address',
        element: React.createElement(VerifyEmail, {
          fullName: data.fullName,
          verifyUrl: `${AUTH_APP_URL}/verify-email?token=${encodeURIComponent(data.verifyToken)}`,
          expirationHours,
        }),
      }

    case 'password-reset':
      return {
        subject: 'ProTraderSim — reset your password',
        element: React.createElement(PasswordResetEmail, {
          fullName: data.fullName,
          resetUrl: `${AUTH_APP_URL}/reset-password?token=${encodeURIComponent(data.resetToken)}`,
        }),
      }

    case 'password-changed':
      return {
        subject: 'ProTraderSim — your password has been changed',
        element: React.createElement(PasswordChangedEmail, {
          fullName: data.fullName,
          changedAt: data.changedAt ?? new Date().toISOString(),
          supportUrl: SUPPORT_URL,
        }),
      }

    case 'deposit-confirmed':
      return {
        subject: 'ProTraderSim — deposit confirmed',
        element: React.createElement(DepositConfirmedEmail, {
          fullName: data.fullName,
          amountFormatted: data.amountFormatted,
          currency: data.currency,
          platformUrl: PLATFORM_URL,
          ...(data.txId !== undefined ? { txId: data.txId } : {}),
        }),
      }

    case 'deposit-rejected':
      return {
        subject: 'ProTraderSim — deposit not processed',
        element: React.createElement(DepositRejectedEmail, {
          fullName: data.fullName,
          supportUrl: SUPPORT_URL,
          ...(data.reason !== undefined ? { reason: data.reason } : {}),
        }),
      }

    case 'kyc-approved':
      return {
        subject: 'ProTraderSim — your account is verified',
        element: React.createElement(KycApprovedEmail, {
          fullName: data.fullName,
          platformUrl: PLATFORM_URL,
        }),
      }

    case 'kyc-rejected':
      return {
        subject: 'ProTraderSim — KYC verification update',
        element: React.createElement(KycRejectedEmail, {
          fullName: data.fullName,
          kycUrl: `${AUTH_APP_URL}/kyc`,
          ...(data.reason !== undefined ? { reason: data.reason } : {}),
        }),
      }

    case 'kyc-reminder':
      return {
        subject: 'ProTraderSim — complete your identity verification',
        element: React.createElement(KycReminderEmail, {
          fullName: data.fullName,
          kycUrl: `${AUTH_APP_URL}/kyc`,
        }),
      }

    case 'margin-call':
      return {
        subject: 'ProTraderSim — urgent: margin call warning',
        element: React.createElement(MarginCallEmail, {
          fullName: data.fullName,
          marginLevelPct: data.marginLevelPct,
          equityFormatted: data.equityFormatted,
          platformUrl: PLATFORM_URL,
        }),
      }

    case 'stop-out':
      return {
        subject: 'ProTraderSim — position closed due to stop-out',
        element: React.createElement(StopOutEmail, {
          fullName: data.fullName,
          balanceFormatted: data.balanceFormatted,
          platformUrl: PLATFORM_URL,
        }),
      }

    case 'withdrawal-approved':
      return {
        subject: 'ProTraderSim — withdrawal approved',
        element: React.createElement(WithdrawalApprovedEmail, {
          fullName: data.fullName,
          amountFormatted: data.amountFormatted,
          walletAddress: data.walletAddress,
          ...(data.txHash !== undefined ? { txHash: data.txHash } : {}),
        }),
      }

    case 'withdrawal-rejected':
      return {
        subject: 'ProTraderSim — withdrawal not processed',
        element: React.createElement(WithdrawalRejectedEmail, {
          fullName: data.fullName,
          supportUrl: SUPPORT_URL,
          ...(data.reason !== undefined ? { reason: data.reason } : {}),
        }),
      }

    case 'alert-triggered':
      return {
        subject: `ProTraderSim — price alert: ${data.symbol}`,
        element: React.createElement(AlertTriggeredEmail, {
          fullName: data.fullName,
          symbol: data.symbol,
          priceLevel: data.priceLevel,
          currentPrice: data.currentPrice,
          direction: data.direction,
          platformUrl: PLATFORM_URL,
        }),
      }

    default:
      return null
  }
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return '***'
  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex)
  const maskedLocal = localPart.length > 2 ? `${localPart.slice(0, 2)}***` : '***'
  return maskedLocal + domain
}

export let emailWorker: Worker<EmailJobData> | null = null

if (process.env['NODE_ENV'] !== 'test') {
  emailWorker = new Worker<EmailJobData>(
    QUEUES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const data = job.data

      const built = buildEmailElement(data)
      if (!built) {
        log.warn({ type: data.type }, 'No email template found for type — skipping')
        return
      }

      const resendKey = process.env['RESEND_API_KEY']
      if (!resendKey) {
        log.warn(
          { type: data.type, to: maskEmail(data.to) },
          'RESEND_API_KEY not set — email not sent',
        )
        return
      }

      const html = await render(built.element)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            from: process.env['EMAIL_FROM'] ?? 'ProTraderSim <noreply@protrader.com>',
            to: data.to,
            subject: built.subject,
            html,
          }),
        })

        clearTimeout(timeout)

        if (!response.ok) {
          const body = await response.text()
          log.error({ status: response.status, body, type: data.type }, 'Resend API error')
          throw new Error(`Resend API returned ${response.status}`)
        }

        log.info({ type: data.type, to: maskEmail(data.to) }, 'Email sent successfully')
      } catch (error) {
        clearTimeout(timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          log.error({ type: data.type, to: maskEmail(data.to) }, 'Resend API request timed out')
          throw new Error('Resend API request timed out')
        }
        throw error
      }
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
