import { Resend } from 'resend'
import { ReactElement } from 'react'

if (!process.env['RESEND_API_KEY']) {
  throw new Error('RESEND_API_KEY environment variable is required')
}

const resend = new Resend(process.env['RESEND_API_KEY'])

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: ReactElement
}) {
  if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to.trim())) {
    throw new Error(`Invalid email recipient: ${String(to)}`)
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    throw new Error('Invalid email subject: subject must be non-empty')
  }

  if (!react) {
    throw new Error('Invalid email content: react element is required')
  }

  try {
    return await resend.emails.send({
      from: process.env['EMAIL_FROM'] ?? 'ProTraderSim <noreply@protrader.com>',
      to: to.trim(),
      subject: subject.trim(),
      react,
    })
  } catch (err) {
    console.error('sendEmail failed', {
      to,
      subject,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    })
    throw err
  }
}
