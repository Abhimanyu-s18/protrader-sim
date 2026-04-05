import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface AlertTriggeredEmailProps {
  fullName: string
  symbol: string
  priceLevel: string
  currentPrice: string
  direction: 'above' | 'below'
  platformUrl: string
}

/**
 * Sent when a user's price alert is triggered.
 */
export function AlertTriggeredEmail({
  fullName,
  symbol,
  priceLevel,
  currentPrice,
  direction,
  platformUrl,
}: AlertTriggeredEmailProps) {
  const symbolUrl = `${platformUrl}/symbols/${encodeURIComponent(symbol)}`
  const directionLabel = direction === 'above' ? 'risen above' : 'fallen below'

  return (
    <Layout preview={`Alert: ${symbol} has ${directionLabel} ${priceLevel}`}>
      <Text style={emailStyles.h1}>Price alert triggered</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your price alert for <strong>{symbol}</strong> has been triggered.{' '}
        The price has {directionLabel} your target level.
      </Text>

      <div style={emailStyles.infoBox}>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Symbol:</strong> {symbol}
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Alert level:</strong> {priceLevel}
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, margin: '0' }}>
          <strong>Current price:</strong> {currentPrice}
        </Text>
      </div>

      <Section style={{ textAlign: 'center' }}>
        <Link href={symbolUrl} style={emailStyles.button}>
          View {symbol} Chart
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        This alert has been automatically dismissed. Set a new alert from the{' '}
        <Link href={`${platformUrl}/alerts`} style={emailStyles.link}>
          Alerts
        </Link>{' '}
        page.
      </Text>
    </Layout>
  )
}
