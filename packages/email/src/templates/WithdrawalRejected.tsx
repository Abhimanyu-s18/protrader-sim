import { Hr, Link, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface WithdrawalRejectedEmailProps {
  fullName: string
  reason?: string
  supportUrl?: string
}

/**
 * Sent when a withdrawal request cannot be processed.
 */
export function WithdrawalRejectedEmail({
  fullName,
  reason,
  supportUrl = 'https://protrader.com/support',
}: WithdrawalRejectedEmailProps) {
  return (
    <Layout preview="Your ProTraderSim withdrawal request could not be processed">
      <Text style={emailStyles.h1}>Withdrawal not processed</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Unfortunately, we were unable to process your recent withdrawal request.
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
        No funds have been deducted from your account. If you believe this is an error or need
        assistance, please{' '}
        <Link href={supportUrl} style={emailStyles.link}>
          contact our support team
        </Link>
        .
      </Text>
    </Layout>
  )
}
