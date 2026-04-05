import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface KycRejectedEmailProps {
  fullName: string
  reason?: string
  kycUrl: string
}

/**
 * Sent when KYC documents could not be approved.
 * Includes reason and resubmission link.
 */
export function KycRejectedEmail({ fullName, reason, kycUrl }: KycRejectedEmailProps) {
  return (
    <Layout preview="Action required: your ProTraderSim identity verification needs attention">
      <Text style={emailStyles.h1}>Verification update</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Unfortunately, we were unable to approve your identity verification submission. Your account
        will remain restricted until verification is complete.
      </Text>

      {reason && (
        <div style={emailStyles.dangerBox}>
          <Text style={emailStyles.infoBoxText}>
            <strong>Reason:</strong> {reason}
          </Text>
        </div>
      )}

      <Text style={emailStyles.body}>
        Please resubmit your documents making sure they are:
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' }}>
        &#x2022; Clear, in focus, and fully visible (no cropping)
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' }}>
        &#x2022; Valid and not expired
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 20px', paddingLeft: '16px' }}>
        &#x2022; Government-issued photo ID (passport, national ID, or driver's licence)
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={kycUrl} style={emailStyles.button}>
          Resubmit Documents
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        If you need help with the verification process, please contact our support team.
      </Text>
    </Layout>
  )
}
