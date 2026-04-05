import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface KycReminderEmailProps {
  fullName: string
  kycUrl: string
}

/**
 * 3-day reminder sent to users who registered but haven't completed KYC.
 */
export function KycReminderEmail({ fullName, kycUrl }: KycReminderEmailProps) {
  return (
    <Layout preview="Complete your identity verification to start trading on ProTraderSim">
      <Text style={emailStyles.h1}>Almost there</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        You're just one step away from trading on ProTraderSim. Complete your identity verification
        to unlock full access to your account.
      </Text>

      <div style={emailStyles.warningBox}>
        <Text style={emailStyles.infoBoxText}>
          &#x23F3; Identity verification required — takes less than 5 minutes
        </Text>
      </div>

      <Text style={emailStyles.body}>Once verified you'll be able to:</Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' }}>
        &#x2022; Deposit funds and start trading
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' }}>
        &#x2022; Access live Forex, commodities, and index markets
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 20px', paddingLeft: '16px' }}>
        &#x2022; Track performance with real-time P&amp;L and analytics
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={kycUrl} style={emailStyles.button}>
          Verify My Identity
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        You'll need a government-issued photo ID and proof of address. The process takes under 5
        minutes.
      </Text>
    </Layout>
  )
}
