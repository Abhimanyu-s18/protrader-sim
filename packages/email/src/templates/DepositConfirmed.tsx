import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

interface DepositConfirmedEmailProps {
  fullName: string
  amountFormatted: string
  currency: string
  txId?: string
  platformUrl: string
}

/**
 * Sent when a crypto deposit is confirmed and credited to the trading account.
 */
export function DepositConfirmedEmail({
  fullName,
  amountFormatted,
  currency,
  txId,
  platformUrl,
}: DepositConfirmedEmailProps) {
  const accountUrl = `${platformUrl}/account`

  return (
    <Layout preview={`Your deposit of ${amountFormatted} has been confirmed`}>
      <Text style={emailStyles.h1}>Deposit confirmed</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your deposit has been confirmed and credited to your ProTraderSim trading account.
      </Text>

      <div style={emailStyles.infoBox}>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Amount:</strong> {amountFormatted}
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: txId ? '6px' : '0' }}>
          <strong>Currency:</strong> {currency}
        </Text>
        {txId && (
          <Text style={{ ...emailStyles.infoBoxText, margin: '0' }}>
            <strong>Transaction ID:</strong>
          </Text>
        )}
        {txId && <Text style={emailStyles.tokenBox}>{txId}</Text>}
      </div>

      <Section style={{ textAlign: 'center' }}>
        <Link href={accountUrl} style={emailStyles.button}>
          View Account
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        Funds are available for trading immediately. If you have any questions about this deposit,
        please contact support.
      </Text>
    </Layout>
  )
}

/**
 * Sent when a crypto deposit is confirmed and credited to the trading account.
 */
export function DepositConfirmedEmail({
  fullName,
  amountFormatted,
  currency,
  txId,
  platformUrl,
}: DepositConfirmedEmailProps) {
  const accountUrl = `${platformUrl}/account`

  return (
    <Layout preview={`Your deposit of ${amountFormatted} has been confirmed`}>
      <Text style={emailStyles.h1}>Deposit confirmed</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your deposit has been confirmed and credited to your ProTraderSim trading account.
      </Text>

      <div style={emailStyles.infoBox}>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Amount:</strong> {amountFormatted}
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: txId ? '6px' : '0' }}>
          <strong>Currency:</strong> {currency}
        </Text>
        {txId && (
          <Text style={{ ...emailStyles.infoBoxText, margin: '0' }}>
            <strong>Transaction ID:</strong>
          </Text>
        )}
        {txId && <Text style={emailStyles.tokenBox}>{txId}</Text>}
      </div>

      <Section style={{ textAlign: 'center' }}>
        <Link href={accountUrl} style={emailStyles.button}>
          View Account
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        Funds are available for trading immediately. If you have any questions about this deposit,
        please contact support.
      </Text>
    </Layout>
  )
}
