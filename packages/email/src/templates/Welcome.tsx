import { Hr, Link, Section, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface WelcomeEmailProps {
  fullName: string
  verifyUrl: string
}

/**
 * Sent immediately after registration.
 * Contains email verification link and platform intro.
 */
export function WelcomeEmail({ fullName, verifyUrl }: WelcomeEmailProps) {
  return (
    <Layout preview={`Welcome to ProTraderSim, ${fullName} — verify your email to get started`}>
      <Text style={emailStyles.h1}>Welcome to ProTraderSim</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your account has been created. Before you can start trading, please verify your email
        address by clicking the button below.
      </Text>

      <Section style={{ textAlign: 'center' }}>
        <Link href={verifyUrl} style={emailStyles.button}>
          Verify Email Address
        </Link>
      </Section>

      <Text style={emailStyles.muted}>This link expires in 24 hours.</Text>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.body}>Once verified, you'll be able to:</Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' }}>
        &#x2022; Complete your KYC identity verification
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 6px', paddingLeft: '16px' }}>
        &#x2022; Fund your simulated trading account
      </Text>
      <Text style={{ ...emailStyles.body, margin: '0 0 16px', paddingLeft: '16px' }}>
        &#x2022; Trade Forex, commodities, and indices in real market conditions
      </Text>

      <Text style={emailStyles.muted}>
        If you didn't create a ProTraderSim account, you can safely ignore this email.
      </Text>
    </Layout>
  )
}
