import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface TradeOpenedEmailProps {
  fullName: string
  symbol: string
  direction: 'BUY' | 'SELL'
  units: string
  openPrice: string
  openTime: string
  platformUrl: string
  stopLoss?: string
  takeProfit?: string
}

/**
 * Optional confirmation sent when a trade is opened.
 */
export function TradeOpenedEmail({
  fullName,
  symbol,
  direction,
  units,
  openPrice,
  openTime,
  platformUrl,
  stopLoss,
  takeProfit,
}: TradeOpenedEmailProps) {
  const tradesUrl = `${platformUrl}/trades`
  const directionColor = direction === 'BUY' ? '#22c55e' : '#ef4444'

  return (
    <Layout preview={`Trade opened: ${direction} ${units} ${symbol} at ${openPrice}`}>
      <Text style={emailStyles.h1}>Trade opened</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your trade has been executed successfully. Here's a summary:
      </Text>

      <div style={emailStyles.infoBox}>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Symbol:</strong> {symbol}
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Direction:</strong>{' '}
          <span style={{ color: directionColor, fontWeight: '600' }}>{direction}</span>
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Units:</strong> {units}
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Open price:</strong> {openPrice}
        </Text>
        {stopLoss && (
          <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
            <strong>Stop loss:</strong> {stopLoss}
          </Text>
        )}
        {takeProfit && (
          <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
            <strong>Take profit:</strong> {takeProfit}
          </Text>
        )}
        <Text style={{ ...emailStyles.infoBoxText, margin: '0' }}>
          <strong>Opened at:</strong> {openTime}
        </Text>
      </div>

      <Section style={{ textAlign: 'center' }}>
        <Link href={tradesUrl} style={emailStyles.button}>
          View Open Positions
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        Monitor your position and manage risk from the{' '}
        <Link href={tradesUrl} style={emailStyles.link}>
          Trades
        </Link>{' '}
        page.
      </Text>
    </Layout>
  )
}
