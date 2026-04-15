import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

const bulletStyle = { ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' } as const

const stopOutActions = [
  'Deposit additional funds to increase your margin',
  'Close one or more open positions to free up margin',
]

export interface MarginCallEmailProps {
  fullName: string
  /**
   * Numeric string representing the margin level percentage WITHOUT the '%' symbol.
   * Example: "50" (not "50%"). The '%' is appended automatically in the template.
   */
  marginLevelPct: string
  equityFormatted: string
  platformUrl: string
}

function normalizeMarginLevel(marginLevelPct: string): string {
  const trimmed = marginLevelPct?.trim() ?? ''
  const normalized = trimmed.replace(/%$/, '').trim()
  const numericValue = Number(normalized)
  if (normalized === '' || isNaN(numericValue) || numericValue < 0) {
    return ''
  }
  return normalized
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
  const displayName = fullName?.trim() || 'there'
  const normalizedMarginLevel = normalizeMarginLevel(marginLevelPct)
  const sanitizedPlatformUrl = (platformUrl ?? '').replace(/\/+$/, '')
  const accountUrl = sanitizedPlatformUrl ? `${sanitizedPlatformUrl}/account` : ''

  const marginDisplay = normalizedMarginLevel ? `${normalizedMarginLevel}%` : 'unknown'

  return (
    <Layout preview={`Urgent: your margin level has dropped to ${marginDisplay} — action required`}>
      <Text style={emailStyles.h1}>Margin call warning</Text>
      <Text style={emailStyles.greeting}>Hi {displayName},</Text>
      <Text style={emailStyles.body}>
        Your account margin level has fallen to the margin call threshold. Immediate action is
        required to prevent your positions from being automatically closed.
      </Text>

      <div style={emailStyles.dangerBox}>
        <Text style={{ ...emailStyles.boxText, marginBottom: '6px' }}>
          <strong>Current margin level:</strong> {marginDisplay}
        </Text>
        <Text style={{ ...emailStyles.boxText, margin: '0' }}>
          <strong>Current equity:</strong> {equityFormatted}
        </Text>
      </div>

      <Text style={emailStyles.body}>
        <strong>To avoid stop-out, you can:</strong>
      </Text>
      {stopOutActions.map((item) => (
        <Text key={item} style={bulletStyle}>
          &#x2022; {item}
        </Text>
      ))}

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
