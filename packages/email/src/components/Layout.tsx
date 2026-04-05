import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { ReactNode } from 'react'

const BRAND = {
  primary: '#0f172a',
  secondary: '#1e293b',
  accent: '#22c55e',
  text: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f1f5f9',
  white: '#ffffff',
}

interface LayoutProps {
  preview: string
  children: ReactNode
}

/**
 * Shared layout wrapper for all ProTraderSim transactional emails.
 * Provides consistent branding, header, footer, and unsubscribe notice.
 */
export function Layout({ preview, children }: LayoutProps) {
  const supportUrl = process.env['SUPPORT_URL'] ?? 'https://protrader.com/support'
  const platformUrl = process.env['PLATFORM_URL'] ?? 'https://app.protrader.com'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        {/* Header */}
        <Section style={styles.header}>
          <Container style={styles.headerInner}>
            <Text style={styles.logoText}>ProTraderSim</Text>
            <Text style={styles.tagline}>Professional Trading Simulation</Text>
          </Container>
        </Section>

        {/* Content */}
        <Container style={styles.container}>
          <Section style={styles.card}>{children}</Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Hr style={styles.hr} />
            <Text style={styles.footerText}>
              &copy; {new Date().getFullYear()} ProTraderSim. All rights reserved.
            </Text>
            <Text style={styles.footerLinks}>
              <Link href={supportUrl} style={styles.footerLink}>
                Support
              </Link>
              {' · '}
              <Link href={platformUrl} style={styles.footerLink}>
                Platform
              </Link>
              {' · '}
              <Link href={`${platformUrl}/settings`} style={styles.footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={styles.footerDisclaimer}>
              This email was sent to you as a registered ProTraderSim user. Trading simulation
              platform — not financial advice.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: BRAND.bg,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: '0',
    padding: '0',
  },
  header: {
    backgroundColor: BRAND.primary,
    padding: '0',
  },
  headerInner: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '28px 32px',
    textAlign: 'left' as const,
  },
  logoText: {
    color: BRAND.white,
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    margin: '0',
    padding: '0',
    lineHeight: '1',
  },
  tagline: {
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: '400',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    margin: '4px 0 0',
    padding: '0',
    lineHeight: '1',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '0 16px 32px',
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: '8px',
    padding: '40px 40px 32px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  footer: {
    padding: '0 8px',
    marginTop: '8px',
  },
  hr: {
    borderColor: BRAND.border,
    borderTopWidth: '1px',
    margin: '0 0 20px',
  },
  footerText: {
    color: BRAND.muted,
    fontSize: '12px',
    textAlign: 'center' as const,
    margin: '0 0 4px',
    lineHeight: '1.5',
  },
  footerLinks: {
    color: BRAND.muted,
    fontSize: '12px',
    textAlign: 'center' as const,
    margin: '0 0 12px',
    lineHeight: '1.5',
  },
  footerLink: {
    color: BRAND.muted,
    textDecoration: 'underline',
  },
  footerDisclaimer: {
    color: '#94a3b8',
    fontSize: '11px',
    textAlign: 'center' as const,
    margin: '0',
    lineHeight: '1.5',
  },
}

export const emailStyles = {
  h1: {
    color: BRAND.primary,
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 8px',
    lineHeight: '1.3',
    letterSpacing: '-0.3px',
  },
  greeting: {
    color: BRAND.text,
    fontSize: '15px',
    margin: '0 0 20px',
    lineHeight: '1.6',
  },
  body: {
    color: BRAND.text,
    fontSize: '15px',
    margin: '0 0 16px',
    lineHeight: '1.6',
  },
  muted: {
    color: BRAND.muted,
    fontSize: '13px',
    margin: '0 0 16px',
    lineHeight: '1.6',
  },
  baseButton: {
    borderRadius: '6px',
    color: BRAND.white,
    display: 'block',
    fontSize: '15px',
    fontWeight: '600',
    padding: '14px 28px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    margin: '24px 0',
  },
  button: {
    backgroundColor: BRAND.accent,
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderLeft: '3px solid #22c55e',
    borderRadius: '4px',
    padding: '14px 16px',
    margin: '16px 0',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderLeft: '3px solid #f59e0b',
    borderRadius: '4px',
    padding: '14px 16px',
    margin: '16px 0',
  },
  dangerBox: {
    backgroundColor: '#fef2f2',
    borderLeft: '3px solid #ef4444',
    borderRadius: '4px',
    padding: '14px 16px',
    margin: '16px 0',
  },
  infoBoxText: {
    color: BRAND.text,
    fontSize: '14px',
    margin: '0',
    lineHeight: '1.6',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
  },
  divider: {
    borderColor: BRAND.border,
    borderTopWidth: '1px',
    margin: '24px 0',
  },
  tokenBox: {
    backgroundColor: '#f8fafc',
    border: `1px solid ${BRAND.border}`,
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: BRAND.text,
    padding: '10px 14px',
    margin: '8px 0 16px',
    wordBreak: 'break-all' as const,
  },
}
