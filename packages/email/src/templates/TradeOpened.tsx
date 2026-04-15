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

const boxTextWithMargin = { ...emailStyles.boxText, marginBottom: '6px' } as const

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
  const tradesUrl = new URL(
    'trades',
    platformUrl.endsWith('/') ? platformUrl : `${platformUrl}/`,
  ).toString()
  const directionColor = direction === 'BUY' ? '#22c55e' : '#ef4444'

  return (
    <Layout preview={`Trade opened: ${direction} ${units} ${symbol} at ${openPrice}`}>
      <Text style={emailStyles.h1}>Trade opened</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your trade has been executed successfully. Here's a summary:
      </Text>

      <Section style={emailStyles.infoBox}>
        <Text style={boxTextWithMargin}>
          <strong>Symbol:</strong> {symbol}
        </Text>
        <Text style={boxTextWithMargin}>
          <strong>Direction:</strong>{' '}
          <span style={{ color: directionColor, fontWeight: '600' }}>{direction}</span>
        </Text>
        <Text style={boxTextWithMargin}>
          <strong>Units:</strong> {units}
        </Text>
        <Text style={boxTextWithMargin}>
          <strong>Open price:</strong> {openPrice}
        </Text>
        {stopLoss && (
          <Text style={boxTextWithMargin}>
            <strong>Stop loss:</strong> {stopLoss}
          </Text>
        )}
        {takeProfit && (
          <Text style={boxTextWithMargin}>
            <strong>Take profit:</strong> {takeProfit}
          </Text>
        )}
        <Text style={{ ...emailStyles.boxText, margin: '0' }}>
          <strong>Opened at:</strong> {openTime}
        </Text>
      </Section>

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
