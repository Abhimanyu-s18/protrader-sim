import { Hr, Link, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface DepositRejectedEmailProps {
  fullName: string
  reason?: string
  supportUrl?: string
}

/**
 * Sent when a deposit cannot be processed or is rejected.
 */
export function DepositRejectedEmail({
  fullName,
  reason,
  supportUrl = process.env['SUPPORT_URL'] ?? 'https://protrader.com/support',
}: DepositRejectedEmailProps) {
  return (
    <Layout preview="Your ProTraderSim deposit could not be processed">
      <Text style={emailStyles.h1}>Deposit not processed</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Unfortunately, we were unable to process your recent deposit to your ProTraderSim account.
      </Text>

      {reason && (
        <div style={emailStyles.dangerBox}>
          <Text style={emailStyles.boxText}>
            <strong>Reason:</strong> {reason}
          </Text>
        </div>
      )}

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.body}>
        If you believe this is an error or need assistance, please{' '}
        <Link href={supportUrl} style={emailStyles.link}>
          contact our support team
        </Link>
        . We're here to help.
      </Text>

      <Text style={emailStyles.muted}>
        No funds have been deducted from your account. Any pending transaction will be returned
        within 3–5 business days.
      </Text>
    </Layout>
  )
}
