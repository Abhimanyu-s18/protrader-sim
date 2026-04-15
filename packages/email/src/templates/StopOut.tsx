import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

const PLATFORM_URL_FALLBACK =
  process.env.NODE_ENV === 'development'
    ? (process.env.PLATFORM_URL ?? 'http://localhost:3000')
    : (process.env.PLATFORM_URL ?? 'https://app.protrader-sim.com')

export interface StopOutEmailProps {
  fullName: string
  balanceFormatted: string
  platformUrl: string
}

function normalizePlatformUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return PLATFORM_URL_FALLBACK
  }

  const trimmed = url.trim().replace(/\/+$/, '')

  if (!trimmed) {
    return PLATFORM_URL_FALLBACK
  }

  try {
    const parsed = new URL(trimmed)

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.warn(
        `[StopOutEmail] Invalid platformUrl protocol: "${url}" (protocol: ${parsed.protocol}) — falling back to ${PLATFORM_URL_FALLBACK}`,
      )
      return PLATFORM_URL_FALLBACK
    }

    if (!parsed.hostname || parsed.hostname.length === 0) {
      console.warn(
        `[StopOutEmail] Invalid platformUrl hostname: "${url}" — falling back to ${PLATFORM_URL_FALLBACK}`,
      )
      return PLATFORM_URL_FALLBACK
    }

    return trimmed
  } catch (err) {
    console.warn(
      `[StopOutEmail] Failed to parse platformUrl: "${url}" — error: ${(err as Error).message} — falling back to ${PLATFORM_URL_FALLBACK}`,
    )
    return PLATFORM_URL_FALLBACK
  }
}

export function StopOutEmail({ fullName, balanceFormatted, platformUrl }: StopOutEmailProps) {
  const normalizedUrl = normalizePlatformUrl(platformUrl)
  const tradesUrl = `${normalizedUrl}/trades`
  const accountUrl = `${normalizedUrl}/account`

  return (
    <Layout preview="A position has been closed on your ProTraderSim account due to stop-out">
      <Text style={emailStyles.h1}>Position closed — stop-out</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your account margin level fell below the minimum required level. To protect your remaining
        funds, your largest losing position has been automatically closed by the system.
      </Text>

      <div style={emailStyles.dangerBox}>
        <Text style={emailStyles.boxText}>
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
