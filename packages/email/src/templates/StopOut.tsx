import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface StopOutEmailProps {
  fullName: string
  balanceFormatted: string
  platformUrl: string
}

/**
 * Sent after a position is automatically closed due to stop-out
 * (margin level fell below the stop-out threshold).
 */
export function StopOutEmail({ fullName, balanceFormatted, platformUrl }: StopOutEmailProps) {
  const tradesUrl = `${platformUrl}/trades`
  const accountUrl = `${platformUrl}/account`

  return (
    <Layout preview="A position has been closed on your ProTraderSim account due to stop-out">
      <Text style={emailStyles.h1}>Position closed — stop-out</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your account margin level fell below the minimum required level. To protect your remaining
        funds, your largest losing position has been automatically closed by the system.
      </Text>

      <div style={emailStyles.dangerBox}>
        <Text style={emailStyles.infoBoxText}>
          <strong>Current account balance:</strong> {balanceFormatted}
        </Text>
      </div>

      <Text style={emailStyles.body}>
        This is an automated risk management action. No further positions will be closed as long as
        your margin level remains above the stop-out threshold.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={tradesUrl} style={emailStyles.button}>
          View Trade History
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        To resume trading, deposit additional funds to restore your account margin.{' '}
        <Link href={accountUrl} style={emailStyles.link}>
          Go to Account
        </Link>
      </Text>
    </Layout>
  )
}
