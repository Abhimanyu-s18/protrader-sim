import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'ProTraderSim Privacy Policy — how we collect, use, and protect your data.',
}

const LAST_UPDATED = 'Last updated: January 1, 2025'

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `ProTraderSim Ltd ("we", "us", "our") is committed to protecting your personal data. This Privacy Policy explains what information we collect, how we use it, who we share it with, and what rights you have regarding your data. This policy applies to all users of the ProTraderSim website and trading platform. We process personal data in accordance with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, and other applicable data protection laws. By using our Service, you acknowledge that you have read and understood this Privacy Policy.`,
  },
  {
    id: 'data-collected',
    title: '2. Data We Collect',
    content: `We collect personal data that you provide directly to us, including: account registration data (name, email address, phone number, date of birth, nationality); identity verification documents (government-issued ID, proof of address); financial information (source of funds declarations, deposit and withdrawal history); trading activity (orders placed, positions held, trade history, P&L). We also collect data automatically when you use our platform: device and browser information, IP address, session data, and interaction logs. We use cookies and similar tracking technologies as described in Section 6.`,
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Data',
    content: `We use your personal data for the following purposes: to create and manage your trading account; to verify your identity and comply with KYC/AML regulatory obligations; to process deposits, withdrawals and trading transactions; to provide customer support and respond to enquiries; to detect, prevent and investigate fraud and financial crime; to send you service communications, account alerts and security notifications; to send marketing communications (you may opt out at any time); to improve our platform and develop new features; to comply with legal and regulatory obligations. We process your data on the basis of contractual necessity, legal obligation, and legitimate interests.`,
  },
  {
    id: 'sharing',
    title: '4. Data Sharing',
    content: `We do not sell your personal data to third parties. We share your data with the following categories of recipients: payment processors and cryptocurrency service providers (to process deposits and withdrawals); identity verification providers (for KYC compliance); liquidity providers (aggregated, anonymised trading data only); regulatory authorities and law enforcement (where legally required); our technology infrastructure providers (cloud hosting, security, analytics); professional advisors (lawyers, accountants, auditors under confidentiality obligations). All third-party recipients are subject to appropriate data protection agreements and are prohibited from using your data for their own marketing purposes.`,
  },
  {
    id: 'security',
    title: '5. Data Security',
    content: `We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, disclosure, alteration, or destruction. These measures include: AES-256 encryption for data at rest; TLS 1.3 encryption for data in transit; multi-factor authentication for all staff system access; regular penetration testing and security audits; role-based access controls limiting data access to authorised personnel only. In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify you and the relevant supervisory authority within 72 hours of becoming aware of the breach, as required by law.`,
  },
  {
    id: 'cookies',
    title: '6. Cookies',
    content: `We use the following categories of cookies: Strictly Necessary Cookies — required for the platform to function (session management, authentication, security). These cannot be disabled. Functional Cookies — remember your preferences and settings to enhance your experience. Analytics Cookies — help us understand how you use our platform so we can improve it (Google Analytics with IP anonymisation). Marketing Cookies — used to deliver relevant advertisements. You can opt out of these via the cookie preference centre. You can control cookies through your browser settings; however, disabling certain cookies may affect platform functionality. A full list of cookies used is available in our Cookie Policy.`,
  },
  {
    id: 'rights',
    title: '7. Your Rights',
    content: `Under the UK GDPR, you have the following rights regarding your personal data: Right of Access — you may request a copy of all personal data we hold about you. Right to Rectification — you may request correction of inaccurate or incomplete data. Right to Erasure ("Right to be Forgotten") — you may request deletion of your data, subject to legal retention requirements. Right to Restriction — you may request that we limit how we use your data in certain circumstances. Right to Data Portability — you may request your data in a structured, machine-readable format. Right to Object — you may object to processing based on legitimate interests. To exercise any of these rights, please contact privacy@protrader.sim.`,
  },
  {
    id: 'retention',
    title: '8. Data Retention',
    content: `We retain your personal data for as long as your account is active and for a period afterwards as required by applicable laws and regulations. Specifically: account and identity documents are retained for 7 years after account closure, in accordance with AML regulations; trading records and financial transaction data are retained for 7 years; marketing data is retained until you withdraw consent or opt out; server logs and security data are retained for 90 days. When data is no longer required, it is securely deleted or anonymised.`,
  },
  {
    id: 'transfers',
    title: '9. International Data Transfers',
    content: `As a global service, we may transfer your personal data to countries outside the United Kingdom and European Economic Area. Where such transfers occur, we ensure appropriate safeguards are in place, including: Standard Contractual Clauses approved by the Information Commissioner's Office; adequacy decisions recognising equivalent data protection standards; or other lawful transfer mechanisms. Our primary data processing occurs on servers located in the United Kingdom, the European Union, and the United States. By using the Service, you consent to these transfers as described in this Policy.`,
  },
  {
    id: 'contact-dpo',
    title: '10. Contact & Data Protection Officer',
    content: `If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your personal data, please contact our Data Protection Officer: Email: privacy@protrader.sim. Postal address: Data Protection Officer, ProTraderSim Ltd, Suite 1402, 1 Financial Street, London, EC2V 8BT, United Kingdom. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk if you believe your data protection rights have been violated. We will respond to all legitimate requests within 30 days.`,
  },
] as const

/** Privacy Policy page with sidebar TOC */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section
        className="relative overflow-hidden py-14 md:py-16 bg-dark"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">Privacy Policy</h1>
          <p className="text-gray-400">{LAST_UPDATED}</p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                Contents
              </p>
              <nav className="space-y-1" aria-label="Privacy policy table of contents">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block py-1 text-sm text-gray-500 transition-colors duration-150 hover:text-primary-500"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>

              <div className="mt-8 border-t border-surface-border pt-8">
                <p className="mb-3 text-xs text-gray-400">Related</p>
                <Link
                  href="/legal/terms"
                  className="mb-2 block text-sm text-primary-500 hover:text-primary-600"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/about/contact"
                  className="block text-sm text-primary-500 hover:text-primary-600"
                >
                  Contact DPO
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="max-w-3xl">
            <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Your privacy matters.</span> This policy explains
                exactly what data we collect and how it is used. You can contact our DPO at{' '}
                <a href="mailto:privacy@protrader.sim" className="underline">
                  privacy@protrader.sim
                </a>{' '}
                with any questions.
              </p>
            </div>

            <div className="space-y-10">
              {SECTIONS.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="mb-4 text-xl font-bold text-dark-700">{s.title}</h2>
                  <p className="leading-relaxed text-gray-600">{s.content}</p>
                </section>
              ))}
            </div>

            <div className="mt-12 border-t border-surface-border pt-8">
              <p className="text-sm text-gray-400">
                Questions about your data? Contact our Data Protection Officer at{' '}
                <a href="mailto:privacy@protrader.sim" className="text-primary-500 hover:underline">
                  privacy@protrader.sim
                </a>
                .
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
