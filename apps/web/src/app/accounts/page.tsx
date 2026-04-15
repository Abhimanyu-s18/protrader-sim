import Link from 'next/link'
import { FaqAccordion } from './faq-accordion'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CrossIcon({ className = 'inline h-5 w-5 text-danger' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

interface ComparisonRow {
  label: string
  standard: string | boolean
  pro: string | boolean
  vip: string | boolean
}

const STANDARD_FEATURES = [
  'Access to 150+ instruments',
  'Real-time market data',
  'Web & mobile trading platform',
  'Educational resources & guides',
  'Demo account included',
]

const PRO_FEATURES = [
  'Everything in Standard',
  'Raw ECN spreads from 0.1 pips',
  'Priority STP/ECN execution',
  'Advanced order types',
  'API trading access',
  'Phone & priority chat support',
  'Dedicated account manager',
]

const VIP_FEATURES = [
  'Everything in Pro',
  'Ultra-low institutional spreads',
  'FIX API protocol access',
  'Reduced commission ($2/lot)',
  'Personal relationship manager',
  'Custom leverage settings',
  'Priority withdrawal processing',
  'Quarterly performance reviews',
  'Access to private webinars',
]

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: 'Minimum Deposit', standard: '$100', pro: '$500', vip: '$5,000' },
  { label: 'EUR/USD Typical Spread', standard: '1.0 pips', pro: '0.1 pips', vip: '0.0 pips' },
  { label: 'Commission', standard: 'None', pro: '$3 / lot', vip: '$2 / lot' },
  { label: 'Maximum Leverage', standard: '500:1', pro: '500:1', vip: '200:1' },
  { label: 'Order Execution', standard: 'Market', pro: 'STP/ECN', vip: 'STP/ECN' },
  { label: 'Instruments', standard: '150+', pro: '150+', vip: '150+' },
  { label: 'API Access', standard: false, pro: true, vip: true },
  { label: 'FIX Protocol', standard: false, pro: false, vip: true },
  { label: 'Dedicated Manager', standard: false, pro: false, vip: true },
  { label: 'Phone Support', standard: false, pro: true, vip: true },
  { label: 'Priority Withdrawals', standard: false, pro: false, vip: true },
]

const FAQS = [
  {
    q: 'How do I open an account?',
    a: 'Click "Open Account", enter your email, verify it, and complete your profile in under 3 minutes. Full KYC verification is required before your first withdrawal.',
  },
  {
    q: 'What documents are required for verification?',
    a: 'We require a government-issued photo ID (passport or national ID) and proof of address (utility bill or bank statement) dated within the last 3 months.',
  },
  {
    q: 'How quickly can I deposit funds?',
    a: 'Cryptocurrency deposits are confirmed on-chain instantly (typically 1–3 confirmations). Bank transfers typically take 1–3 business days depending on your bank.',
  },
  {
    q: 'Can I upgrade my account type?',
    a: 'Yes. Contact our support team at any time to upgrade from Standard to Pro or from Pro to VIP. You only need to meet the minimum deposit requirement for the new account type.',
  },
  {
    q: 'Is there a free demo account?',
    a: 'Yes. All account types include an unlimited free demo account with $100,000 in virtual funds. Switch between demo and live trading at any time with a single click.',
  },
  {
    q: 'What leverage is available and are there restrictions?',
    a: 'Standard and Pro accounts offer up to 500:1 on major Forex pairs. VIP accounts offer up to 200:1. Leverage limits may vary by instrument and jurisdiction. Please review the instrument specifications for full details.',
  },
]

/** Account types page with comparison table and FAQ accordion */
export default function AccountsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 md:py-28"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(232,101,10,0.1), transparent 60%), #1A2332',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            Choose the Account That Fits{' '}
            <span className="text-primary-500">Your Trading Style</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-300 md:text-xl">
            Whether you&apos;re just starting out or an experienced professional, we have an account
            tailored to your needs.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Standard', 'Pro', 'VIP'].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-dark-600 px-5 py-2 text-sm font-medium text-gray-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Account Cards */}
      <section className="bg-surface-alt py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
            {/* Standard */}
            <div className="flex flex-col rounded-2xl border border-surface-border bg-white p-8">
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-dark-700">Standard</h2>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Beginner Friendly
                  </span>
                </div>
                <div className="mb-1 text-3xl font-bold text-dark-700">From $100</div>
                <div className="text-sm text-gray-400">Minimum deposit</div>
              </div>

              <dl className="mb-8 space-y-3 border-t border-surface-border pt-6">
                {[
                  { label: 'Spreads from', value: '1.0 pips' },
                  { label: 'Commission', value: 'Zero' },
                  { label: 'Max Leverage', value: '500:1' },
                  { label: 'Execution', value: 'Market' },
                  { label: 'Platforms', value: 'Web, Mobile' },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{r.label}</dt>
                    <dd className="font-medium text-dark-700">{r.value}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mb-8 flex-1 space-y-2.5">
                {STANDARD_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckIcon className="inline h-5 w-5 text-buy" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="https://auth.protrader.sim/register"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border-2 border-primary-500 px-6 py-3 text-center font-semibold text-primary-500 transition-colors duration-200 hover:bg-primary-500 hover:text-white"
              >
                Open Standard Account
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className="relative flex flex-col rounded-2xl border border-dark-600 bg-dark-700 p-8 shadow-2xl lg:-mt-4 lg:mb-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Pro</h2>
                </div>
                <div className="mb-1 text-3xl font-bold text-white">From $500</div>
                <div className="text-sm text-gray-400">Minimum deposit</div>
              </div>

              <dl className="mb-8 space-y-3 border-t border-white/10 pt-6">
                {[
                  { label: 'Spreads from', value: '0.1 pips' },
                  { label: 'Commission', value: '$3 / lot' },
                  { label: 'Max Leverage', value: '500:1' },
                  { label: 'Execution', value: 'STP/ECN' },
                  { label: 'Platforms', value: 'Web, Mobile, API' },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <dt className="text-gray-400">{r.label}</dt>
                    <dd className="font-medium text-white">{r.value}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mb-8 flex-1 space-y-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <CheckIcon className="mt-px h-5 w-5 shrink-0 text-primary-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="https://auth.protrader.sim/register"
                className="block rounded-lg bg-primary-500 px-6 py-3 text-center font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
              >
                Open Pro Account
              </Link>
            </div>

            {/* VIP */}
            <div className="flex flex-col rounded-2xl border border-surface-border bg-white p-8">
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-dark-700">VIP</h2>
                  <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-500">
                    Professional
                  </span>
                </div>
                <div className="mb-1 text-3xl font-bold text-dark-700">From $5,000</div>
                <div className="text-sm text-gray-400">Minimum deposit</div>
              </div>

              <dl className="mb-8 space-y-3 border-t border-surface-border pt-6">
                {[
                  { label: 'Spreads from', value: '0.0 pips' },
                  { label: 'Commission', value: '$2 / lot' },
                  { label: 'Max Leverage', value: '200:1' },
                  { label: 'Execution', value: 'STP/ECN' },
                  { label: 'Platforms', value: 'Web, Mobile, API, FIX' },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{r.label}</dt>
                    <dd className="font-medium text-dark-700">{r.value}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mb-8 flex-1 space-y-2.5">
                {VIP_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckIcon className="inline h-5 w-5 text-buy" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="https://auth.protrader.sim/register"
                className="block rounded-lg border-2 border-primary-500 px-6 py-3 text-center font-semibold text-primary-500 transition-colors duration-200 hover:bg-primary-500 hover:text-white"
              >
                Open VIP Account
              </Link>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/accounts/compare"
              className="font-medium text-primary-500 transition-colors duration-150 hover:text-primary-600"
            >
              Compare all account features in detail →
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
              Full Feature Comparison
            </h2>
            <p className="text-gray-500">A side-by-side view of all account features.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="w-1/2 px-6 py-4 text-left font-medium text-gray-500">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-dark-700">Standard</th>
                    <th className="bg-dark-700 px-4 py-4 text-center font-semibold text-white">
                      Pro
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-dark-700">VIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 1 ? 'bg-surface-alt/40' : 'bg-white'}>
                      <td className="px-6 py-4 font-medium text-gray-600">{row.label}</td>
                      <td className="px-4 py-4 text-center text-gray-700">
                        {typeof row.standard === 'boolean' ? (
                          row.standard ? (
                            <>
                              <CheckIcon className="inline h-5 w-5 text-buy" />
                              <span className="sr-only">Available</span>
                            </>
                          ) : (
                            <>
                              <CrossIcon />
                              <span className="sr-only">Not available</span>
                            </>
                          )
                        ) : (
                          row.standard
                        )}
                      </td>
                      <td className="bg-dark-700/5 px-4 py-4 text-center font-medium text-gray-700">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? (
                            <>
                              <CheckIcon className="inline h-5 w-5 text-buy" />
                              <span className="sr-only">Available</span>
                            </>
                          ) : (
                            <>
                              <CrossIcon />
                              <span className="sr-only">Not available</span>
                            </>
                          )
                        ) : (
                          row.pro
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-700">
                        {typeof row.vip === 'boolean' ? (
                          row.vip ? (
                            <>
                              <CheckIcon className="inline h-5 w-5 text-buy" />
                              <span className="sr-only">Available</span>
                            </>
                          ) : (
                            <>
                              <CrossIcon />
                              <span className="sr-only">Not available</span>
                            </>
                          )
                        ) : (
                          row.vip
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface-alt py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <FaqAccordion faqs={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-500 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Open Your Trading Account Today
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-orange-100">
            Join 50,000+ traders. Create your free account in minutes — no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="https://auth.protrader.sim/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 font-semibold text-primary-600 transition-colors duration-200 hover:bg-orange-50"
            >
              Open Free Account
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/accounts/compare"
              className="inline-flex items-center gap-2 rounded-lg border border-orange-200 px-8 py-3.5 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
            >
              Compare All Accounts
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
