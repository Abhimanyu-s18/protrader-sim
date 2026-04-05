import { Hr, Link, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface PasswordChangedEmailProps {
  fullName: string
  changedAt: string | Date
  supportUrl?: string
}

/**
 * Security confirmation sent after a successful password change.
 */
export function PasswordChangedEmail({
  fullName,
  changedAt,
  supportUrl = 'https://protrader.com/support',
}: PasswordChangedEmailProps) {
  const date = new Date(changedAt)
  const formattedDate = isNaN(date.getTime())
    ? 'recently'
    : date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

  return (
    <Layout preview="Your ProTraderSim password has been changed">
      <Text style={emailStyles.h1}>Password changed</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your ProTraderSim account password was successfully changed. This change is effective
        immediately.
      </Text>

      <div style={emailStyles.infoBox}>
        <Text style={emailStyles.infoBoxText}>
          &#x2705; Password updated successfully on {formattedDate}
        </Text>
      </div>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.body}>
        <strong>Didn't make this change?</strong>
      </Text>
      <Text style={emailStyles.body}>
        If you did not change your password, your account may be compromised. Please{' '}
        <Link href={supportUrl} style={emailStyles.link}>
          contact support immediately
        </Link>{' '}
        to secure your account.
      </Text>
    </Layout>
  )
}
