import { Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

interface VerifyEmailProps {
  fullName: string
  verifyUrl: string
  expirationHours: number
}

/**
 * Resend verification email (requested via "Resend email" on verify screen).
 */
export function VerifyEmail({ fullName, verifyUrl, expirationHours }: VerifyEmailProps) {
  return (
    <Layout preview="Verify your ProTraderSim email address">
      <Text style={emailStyles.h1}>Verify your email</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        You requested a new verification link. Click below to verify your email address and activate
        your ProTraderSim account.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={verifyUrl} style={emailStyles.button}>
          Verify Email Address
        </Link>
      </Section>

      <Text style={emailStyles.muted}>This link expires in {expirationHours} hours.</Text>

      <Text style={emailStyles.muted}>
        If you didn't request this, you can safely ignore this email. Your account will remain
        unverified until you click the link above.
      </Text>
    </Layout>
  )
}
