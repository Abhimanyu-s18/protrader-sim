import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface KycApprovedEmailProps {
  fullName: string
  platformUrl: string
}

/**
 * Sent when KYC documents are reviewed and approved.
 * Account is now fully active.
 */
export function KycApprovedEmail({ fullName, platformUrl }: KycApprovedEmailProps) {
  const dashboardUrl = `${platformUrl}/dashboard`

  return (
    <Layout preview="Your ProTraderSim account is now verified and ready to trade">
      <Text style={emailStyles.h1}>Account verified</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Great news — your identity verification has been approved. Your ProTraderSim account is now
        fully active and you can start trading.
      </Text>

      <div style={emailStyles.infoBox}>
        <Text style={emailStyles.infoBoxText}>
          &#x2705; KYC verification approved — account fully activated
        </Text>
      </div>

      <Section style={{ textAlign: 'center' }}>
        <Link href={dashboardUrl} style={emailStyles.button}>
          Go to Dashboard
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        You can now deposit funds, open positions across Forex, commodities, and indices, and access
        all platform features.
      </Text>
    </Layout>
  )
}
