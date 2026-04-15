import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface PasswordResetEmailProps {
  fullName: string
  resetUrl: string
}

/**
 * Password reset request email. Link expires in 1 hour.
 */
export function PasswordResetEmail({ fullName, resetUrl }: PasswordResetEmailProps) {
  const isValidUrl = resetUrl?.startsWith('https://') ?? false
  const safeUrl = isValidUrl ? resetUrl : undefined

  return (
    <Layout preview="Reset your ProTraderSim password — link expires in 1 hour">
      <Text style={emailStyles.h1}>Reset your password</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        We received a request to reset the password for your ProTraderSim account. Click the button
        below to choose a new password.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        {safeUrl ? (
          <Link href={safeUrl} style={emailStyles.button}>
            Reset Password
          </Link>
        ) : (
          <Text style={emailStyles.body}>
            Unable to generate reset link. Please request a new password reset from the login page.
          </Text>
        )}
      </Section>

      <div style={emailStyles.warningBox}>
        <Text style={emailStyles.boxText}>
          &#x26A0;&#xFE0F; This link expires in <strong>1 hour</strong>. If you need a new link,
          request another reset from the login page.
        </Text>
      </div>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        If you didn't request a password reset, your account is safe — no changes have been made.
        You can ignore this email.
      </Text>
    </Layout>
  )
}
