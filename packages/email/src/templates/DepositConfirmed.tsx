import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

const ALLOWED_ORIGINS = ['https://protrader.com', 'https://app.protrader.com']
const FALLBACK_PLATFORM_URL = 'https://app.protrader.com'

/**
 * Returns true if the URL's origin is in the allowlist, false otherwise.
 * Used to prevent open redirect attacks when a caller-supplied URL is used in email links.
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_ORIGINS.some((origin) => parsed.origin === origin)
  } catch {
    return false
  }
}

export interface DepositConfirmedEmailProps {
  fullName: string
  amountFormatted: string
  currency: string
  txId?: string
  platformUrl: string
}

/**
 * Sent to a user when their crypto deposit has been confirmed and credited.
 * The `platformUrl` prop is validated against an allowlist before use.
 */
export function DepositConfirmedEmail({
  fullName,
  amountFormatted,
  currency,
  txId,
  platformUrl,
}: DepositConfirmedEmailProps) {
  const safeUrl = isSafeUrl(platformUrl) ? platformUrl : FALLBACK_PLATFORM_URL

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
        <Link href={safeUrl}>Go to Trading Platform</Link>
      </Section>
    </Layout>
  )
}
