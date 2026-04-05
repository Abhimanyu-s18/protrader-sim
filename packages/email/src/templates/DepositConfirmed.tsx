import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

interface DepositConfirmedEmailProps {
  fullName: string
  amountFormatted: string
  currency: string
  txId?: string
  platformUrl: string
}

export function DepositConfirmedEmail({
  fullName,
  amountFormatted,
  currency,
  txId,
  platformUrl,
}: DepositConfirmedEmailProps) {
  return (
    <Layout preview="Deposit Confirmed">
      <Text style={emailStyles.h1}>Deposit Confirmed</Text>
      <Section>
        <Text>Hi {fullName},</Text>
        <Text>
          Your deposit of <strong>{amountFormatted}</strong> {currency} has been confirmed and
          credited to your trading account.
        </Text>
        {txId && (
          <Text>
            <strong>Transaction ID:</strong> {txId}
          </Text>
        )}
        <Text>You can now use these funds to open positions on the platform.</Text>
      </Section>
      <Hr />
      <Section>
        <Link href={platformUrl}>Go to Trading Platform</Link>
      </Section>
    </Layout>
  )
}
