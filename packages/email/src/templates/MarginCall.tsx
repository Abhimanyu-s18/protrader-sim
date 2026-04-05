import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface MarginCallEmailProps {
  fullName: string
  marginLevelPct: string
  equityFormatted: string
  platformUrl: string
}

/**
 * Urgent warning sent when a user's margin level drops to the margin call threshold.
 * Action required to avoid automatic stop-out.
 */
export function MarginCallEmail({
  fullName,
  marginLevelPct,
  equityFormatted,
  platformUrl,
}: MarginCallEmailProps) {
  const accountUrl = `${platformUrl}/account`

  return (
    <Layout preview={`Urgent: your margin level has dropped to ${marginLevelPct}% — action required`}>
      <Text style={emailStyles.h1}>Margin call warning</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your account margin level has fallen to the margin call threshold. Immediate action is
        required to prevent your positions from being automatically closed.
      </Text>

      <div style={emailStyles.dangerBox}>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Current margin level:</strong> {marginLevelPct}%
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, margin: '0' }}>
          <strong>Current equity:</strong> {equityFormatted}
        </Text>
      </div>

      <Text style={emailStyles.body}>
        <strong>To avoid stop-out, you can:</strong>
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' }}>
        &#x2022; Deposit additional funds to increase your margin
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 20px', paddingLeft: '16px' }}>
        &#x2022; Close one or more open positions to free up margin
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={accountUrl} style={emailStyles.dangerButton}>
          Manage Account Now
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        If your margin level continues to fall below the stop-out level, your largest losing
        position will be automatically closed by the system.
      </Text>
    </Layout>
  )
}
