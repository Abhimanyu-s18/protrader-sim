import { Resend } from 'resend'

const resend = new Resend(process.env['RESEND_API_KEY'])

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  return resend.emails.send({
    from: process.env['EMAIL_FROM'] ?? 'ProTraderSim <noreply@protrader.com>',
    to,
    subject,
    react,
  })
}
