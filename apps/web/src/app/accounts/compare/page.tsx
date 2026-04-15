import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Compare Accounts',
  description: 'Side-by-side comparison of ProTraderSim Standard, Pro and VIP trading accounts.',
}

const CHECK = (
  <span className="text-lg font-bold text-buy" aria-label="Yes">
    ✓
  </span>
)
const CROSS = (
  <span className="text-lg font-bold text-danger" aria-label="No">
    ✗
  </span>
)

type RowValue = string | boolean

interface Row {
  label: string
  standard: RowValue
  pro: RowValue
  vip: RowValue
}

interface Section {
  heading: string
  rows: Row[]
}

const SECTIONS: Section[] = [
  {
    heading: '💰 Account Basics',
    rows: [
      { label: 'Minimum Deposit', standard: '$100', pro: '$500', vip: '$5,000' },
      {
        label: 'Base Currencies',
        standard: 'USD, EUR, GBP',
        pro: 'USD, EUR, GBP, 10+',
        vip: 'USD, EUR, GBP, 20+',
      },
      { label: 'Demo Account', standard: true, pro: true, vip: true },
      { label: 'Swap-Free Option', standard: true, pro: true, vip: true },
      { label: 'Negative Balance Protection', standard: true, pro: true, vip: true },
    ],
  },
  {
    heading: '📊 Trading Conditions',
    rows: [
      { label: 'EUR/USD Typical Spread', standard: '1.2 pips', pro: '0.1 pips', vip: '0.0 pips' },
      { label: 'Spreads from', standard: '1.0 pips', pro: '0.0 pips', vip: '0.0 pips' },
      { label: 'Commission', standard: 'None', pro: '$3 / lot', vip: '$2 / lot' },
      { label: 'Maximum Leverage', standard: '500:1', pro: '500:1', vip: '200:1' },
      { label: 'Order Execution', standard: 'Market', pro: 'STP/ECN', vip: 'STP/ECN' },
      { label: 'Instruments', standard: '150+', pro: '150+', vip: '150+' },
      {
        label: 'Order Types',
        standard: 'Market, Limit, Stop',
        pro: 'All types',
        vip: 'All types + custom',
      },
      { label: 'Max Order Size', standard: '50 lots', pro: '100 lots', vip: 'Unlimited' },
      { label: 'Hedging Allowed', standard: true, pro: true, vip: true },
    ],
  },
  {
    heading: '⚡ Platform Access',
    rows: [
      { label: 'Web Platform', standard: true, pro: true, vip: true },
      { label: 'Mobile App (iOS & Android)', standard: true, pro: true, vip: true },
      { label: 'REST API Access', standard: false, pro: true, vip: true },
      { label: 'WebSocket Streaming', standard: false, pro: true, vip: true },
      { label: 'FIX Protocol', standard: false, pro: false, vip: true },
      { label: 'API Rate Limit', standard: '—', pro: '100 req/min', vip: '1,000 req/min' },
      { label: 'Historical Data Download', standard: '1 year', pro: '5 years', vip: 'Unlimited' },
    ],
  },
  {
    heading: '🛎 Support & Service',
    rows: [
      { label: 'Live Chat Support', standard: true, pro: true, vip: true },
      { label: 'Email Support', standard: true, pro: true, vip: true },
      { label: 'Phone Support', standard: false, pro: true, vip: true },
      { label: 'Dedicated Account Manager', standard: false, pro: false, vip: true },
      { label: 'Personal Relationship Manager', standard: false, pro: false, vip: true },
      { label: 'Response Time', standard: '< 4 hours', pro: '< 1 hour', vip: '< 15 minutes' },
      {
        label: 'Support Language',
        standard: '5 languages',
        pro: '10 languages',
        vip: '15 languages',
      },
      { label: 'Private Webinars', standard: false, pro: false, vip: true },
      { label: 'Quarterly Performance Review', standard: false, pro: false, vip: true },
    ],
  },
  {
    heading: '🔒 Security & Compliance',
    rows: [
      { label: 'Segregated Client Funds', standard: true, pro: true, vip: true },
      { label: 'Two-Factor Authentication', standard: true, pro: true, vip: true },
      { label: 'KYC Verification', standard: true, pro: true, vip: true },
      { label: 'Priority Withdrawal Processing', standard: false, pro: false, vip: true },
      {
        label: 'Withdrawal Processing Time',
        standard: '1–3 days',
        pro: '24 hours',
        vip: 'Same day',
      },
    ],
  },
]

function Cell({ value, className }: { value: RowValue; className?: string }) {
  const baseClasses = 'px-4 py-3 text-center'
  if (typeof value === 'boolean') {
    return <td className={`${baseClasses} ${className || ''}`}>{value ? CHECK : CROSS}</td>
  }
  return <td className={`${baseClasses} text-sm text-gray-700 ${className || ''}`}>{value}</td>
}

/** Detailed account comparison page */
export default function CompareAccountsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section
        className="relative overflow-hidden py-14 md:py-20"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, rgba(232,101,10,0.1), transparent 60%), #1A2332',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">Account Comparison</h1>
          <p className="mx-auto max-w-xl text-lg text-gray-300">
            Full side-by-side breakdown of every feature across Standard, Pro and VIP accounts.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-xl border border-surface-border text-sm">
              {/* Sticky column headers */}
              <thead
                className="sticky z-10"
                style={
                  {
                    top: 'var(--navbar-height, 72px)',
                  } as React.CSSProperties
                }
              >
                <tr className="border-b border-surface-border">
                  <th className="w-2/5 bg-dark-800 px-6 py-5 text-left font-medium text-gray-300">
                    Feature
                  </th>
                  <th className="bg-dark-800 px-4 py-5 text-center font-semibold text-white">
                    Standard
                    <div className="mt-0.5 text-xs font-normal text-gray-400">From $100</div>
                  </th>
                  <th className="bg-primary-500 px-4 py-5 text-center font-semibold text-white">
                    <span className="flex flex-col items-center">
                      Pro
                      <span className="mt-0.5 text-xs font-normal text-orange-200">
                        Most Popular · From $500
                      </span>
                    </span>
                  </th>
                  <th className="bg-dark-800 px-4 py-5 text-center font-semibold text-white">
                    VIP
                    <div className="mt-0.5 text-xs font-normal text-gray-400">From $5,000</div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {SECTIONS.map((section) => (
                  <React.Fragment key={section.heading}>
                    <tr key={`heading-${section.heading}`} className="bg-surface-alt">
                      <td
                        colSpan={4}
                        className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        {section.heading}
                      </td>
                    </tr>

                    {section.rows.map((row, ri) => (
                      <tr
                        key={`${section.heading}-${row.label}`}
                        className={`border-b border-surface-border ${ri % 2 === 0 ? 'bg-white' : 'bg-surface-alt/30'}`}
                      >
                        <td className="px-6 py-3 font-medium text-gray-600">{row.label}</td>
                        <Cell value={row.standard} />
                        <Cell value={row.pro} className="bg-primary-500/5 font-medium" />
                        <Cell value={row.vip} />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* CTA row */}
                <tr className="border-t-2 border-surface-border bg-surface-alt">
                  <td className="px-6 py-5" />
                  <td className="px-4 py-5 text-center">
                    <Link
                      href="https://auth.protrader.sim/register?type=standard"
                      className="inline-block rounded-lg border-2 border-primary-500 px-5 py-2.5 text-sm font-semibold text-primary-500 transition-colors duration-200 hover:bg-primary-500 hover:text-white"
                    >
                      Open Standard
                    </Link>
                  </td>
                  <td className="bg-primary-500/5 px-4 py-5 text-center">
                    <Link
                      href="https://auth.protrader.sim/register?type=pro"
                      className="inline-block rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
                    >
                      Open Pro
                    </Link>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <Link
                      href="https://auth.protrader.sim/register?type=vip"
                      className="inline-block rounded-lg border-2 border-primary-500 px-5 py-2.5 text-sm font-semibold text-primary-500 transition-colors duration-200 hover:bg-primary-500 hover:text-white"
                    >
                      Open VIP
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Spreads listed are indicative and may vary depending on market conditions. All accounts
            include access to the same 150+ instrument catalog. Leverage limits may vary by
            jurisdiction.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-dark-700 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white">Questions? Talk to Our Team.</h2>
          <p className="mx-auto mb-8 max-w-lg text-gray-300">
            Not sure which account is right for you? Our support team is here 24/5 to help you make
            the best decision.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="https://auth.protrader.sim/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-8 py-3.5 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
            >
              Open Free Account
            </Link>
            <Link
              href="/about/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-8 py-3.5 font-semibold text-gray-300 transition-colors duration-200 hover:border-gray-400 hover:text-white"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
