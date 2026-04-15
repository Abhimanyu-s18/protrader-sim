import { Resend } from 'resend'
import { ReactElement } from 'react'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env['RESEND_API_KEY']
    if (!key) throw new Error('RESEND_API_KEY environment variable is required')
    _resend = new Resend(key)
  }
  return _resend
}

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
    return await getResend().emails.send({
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
