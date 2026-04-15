import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

/** Style for bullet items in this template */
const bulletStyle = { ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' } as const

/** KYC resubmission requirements shown as bullet points */
const kycRequirements = [
  'Clear, in focus, and fully visible (no cropping)',
  'Valid and not expired',
  "Government-issued photo ID (passport, national ID, or driver's licence)",
]

export interface KycRejectedEmailProps {
  fullName: string
  reason?: string
  kycUrl: string
}

const DEFAULT_SUPPORT_EMAIL = 'support@protrader.com'
const DEFAULT_HELP_CENTER_URL = 'https://protrader.com/help'

function getSupportEmail(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.SUPPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL
  }
  return DEFAULT_SUPPORT_EMAIL
}

function getHelpCenterUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.HELP_CENTER_URL ?? DEFAULT_HELP_CENTER_URL
  }
  return DEFAULT_HELP_CENTER_URL
}

/**
 * Sent when KYC documents could not be approved.
 * Includes reason and resubmission link.
 */
export function KycRejectedEmail({ fullName, reason, kycUrl }: KycRejectedEmailProps) {
  const supportEmail = getSupportEmail()
  const helpCenterUrl = getHelpCenterUrl()

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
          <Text style={emailStyles.boxText}>
            <strong>Reason:</strong> {reason}
          </Text>
        </div>
      )}

      <Text style={emailStyles.body}>Please resubmit your documents making sure they are:</Text>
      {kycRequirements.map((item) => (
        <Text key={item} style={bulletStyle}>
          &#x2022; {item}
        </Text>
      ))}

      <Section style={{ textAlign: 'center' }}>
        <Link href={kycUrl} style={emailStyles.button}>
          Resubmit Documents
        </Link>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        If you need help with the verification process, please contact our support team at{' '}
        <Link href={`mailto:${supportEmail}`} style={emailStyles.link}>
          {supportEmail}
        </Link>{' '}
        or visit our{' '}
        <Link href={helpCenterUrl} style={emailStyles.link}>
          Help Centre
        </Link>
        .
      </Text>
    </Layout>
  )
}
