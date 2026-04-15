import type { Metadata } from 'next'
import type { SVGProps } from 'react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Index CFD Trading',
  description:
    'Trade CFDs on 20+ global indices including the S&P 500, Dow Jones, FTSE 100, DAX and Nikkei with leverage up to 100:1.',
}

function ArrowRightIcon({
  size = 16,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function FeatureNoExpiryIcon({
  size = 24,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

function FeatureDiversifiedIcon({
  size = 24,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function FeatureLowMarginIcon({
  size = 24,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function FeatureTightSpreadsIcon({
  size = 24,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="5 12 8 9 8 15 5 12" />
      <polyline points="19 12 16 9 16 15 19 12" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

const HERO_STATS = [
  { label: 'Global Indices', value: '20+' },
  { label: 'Max Leverage', value: '100:1' },
  { label: 'Trading Hours', value: 'Extended' },
] as const

const INDICES = [
  {
    index: 'US500',
    description: 'S&P 500 Index',
    typicalSpread: '0.4',
    maxLeverage: '100:1',
    hours: '23h Mon–Fri',
  },
  {
    index: 'US30',
    description: 'Dow Jones Industrial',
    typicalSpread: '3.0',
    maxLeverage: '100:1',
    hours: '23h Mon–Fri',
  },
  {
    index: 'US100',
    description: 'NASDAQ 100',
    typicalSpread: '1.0',
    maxLeverage: '100:1',
    hours: '23h Mon–Fri',
  },
  {
    index: 'UK100',
    description: 'FTSE 100',
    typicalSpread: '1.0',
    maxLeverage: '100:1',
    hours: 'Mon–Fri ~8h',
  },
  {
    index: 'GER40',
    description: 'DAX 40',
    typicalSpread: '1.0',
    maxLeverage: '100:1',
    hours: 'Mon–Fri ~8h',
  },
  {
    index: 'FRA40',
    description: 'CAC 40',
    typicalSpread: '1.0',
    maxLeverage: '100:1',
    hours: 'Mon–Fri ~8h',
  },
  {
    index: 'JPN225',
    description: 'Nikkei 225',
    typicalSpread: '7.0',
    maxLeverage: '100:1',
    hours: 'Mon–Fri ~8h',
  },
  {
    index: 'AUS200',
    description: 'ASX 200',
    typicalSpread: '1.0',
    maxLeverage: '100:1',
    hours: 'Mon–Fri ~8h',
  },
] as const

const KEY_SPECS = [
  { label: 'Available Indices', value: '20+' },
  { label: 'Max Leverage', value: 'Up to 100:1' },
  { label: 'Min Trade Size', value: '0.1 lots' },
  { label: 'Trading Hours', value: 'Near 24h on major indices' },
  { label: 'Expiry', value: 'No expiry — perpetual CFDs' },
  { label: 'Swap', value: 'Charged nightly at 00:00 server' },
] as const

const FEATURES = [
  {
    title: 'No Expiry Dates',
    description:
      'Our index CFDs have no expiry. Hold positions as long as your strategy requires without rollovers.',
    icon: <FeatureNoExpiryIcon />,
  },
  {
    title: 'Diversified Exposure',
    description:
      'A single index position gives you diversified exposure to hundreds of constituent stocks.',
    icon: <FeatureDiversifiedIcon />,
  },
  {
    title: 'Low Margin Requirements',
    description:
      'Trade major global indices with margin requirements as low as 1% — control large positions efficiently.',
    icon: <FeatureLowMarginIcon />,
  },
  {
    title: 'Tight Spreads',
    description:
      "US500 from just 0.4 points. Trade the world's benchmark indices at institutional-grade pricing.",
    icon: <FeatureTightSpreadsIcon />,
  },
] as const

const STEPS = [
  {
    number: '01',
    title: 'Open Your Account',
    description: 'Complete registration in under 3 minutes and gain instant access to all markets.',
    time: '3 min',
  },
  {
    number: '02',
    title: 'Fund Your Account',
    description: 'Deposit via crypto with near-instant processing and zero deposit fees.',
    time: 'Instant',
  },
  {
    number: '03',
    title: 'Select an Index',
    description: 'Choose from 20+ global indices spanning the Americas, Europe and Asia-Pacific.',
    time: '1 min',
  },
  {
    number: '04',
    title: 'Place Your Trade',
    description: 'Go long or short with your desired lot size and risk management settings.',
    time: '1 click',
  },
] as const

/** Index CFD trading instrument page */
export default function IndicesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden py-24 md:py-32"
        style={{
          background:
            'radial-gradient(ellipse at 60% 30%, rgba(232,101,10,0.12), transparent 60%), #1A2332',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-500/15 px-3 py-1.5 text-sm font-medium text-primary-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              20+ Global Indices
            </span>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Index CFDs —{' '}
              <span className="text-primary-500">Trade the World&apos;s Stock Markets</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-gray-300 md:text-xl">
              Get instant diversified exposure to major economies through S&P 500, Dow Jones, FTSE
              100, DAX and more — with leverage up to 100:1 and near 24-hour access.
            </p>

            <div className="mb-10 flex flex-wrap gap-8">
              {HERO_STATS.map((m) => (
                <div key={m.label}>
                  <div className="text-2xl font-bold text-white">{m.value}</div>
                  <div className="mt-0.5 text-sm text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="https://auth.protrader.sim/register"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
                rel="noopener noreferrer"
              >
                Start Trading Indices
                <ArrowRightIcon size={16} />
              </Link>
              <Link
                href="https://auth.protrader.sim/register?demo=true"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors duration-200 hover:border-gray-400 hover:text-white"
                rel="noopener noreferrer"
              >
                Open Demo Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-dark-700 md:text-4xl">
                What are Index CFDs?
              </h2>
              <div className="space-y-4 leading-relaxed text-gray-600">
                <p>
                  A stock market index tracks the performance of a selected group of companies,
                  providing a snapshot of a particular market or sector. The S&P 500, for example,
                  represents the 500 largest US-listed companies, making it a widely used proxy for
                  the health of the American economy.
                </p>
                <p>
                  Trading an index as a CFD lets you speculate on its overall direction without
                  buying each constituent stock individually. A single trade captures the aggregate
                  performance of an entire market — making indices one of the most efficient
                  vehicles for macroeconomic positioning and portfolio hedging.
                </p>
                <p>
                  ProTraderSim offers 20+ global indices spanning North America, Europe, and
                  Asia-Pacific. Our perpetual CFD structure means there are no expiry dates to
                  manage, and near-24-hour trading windows allow you to react to breaking news and
                  earnings releases in real time.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  label: 'Indices Available',
                  value: '20+',
                  sub: 'Americas, Europe and Asia-Pacific',
                },
                { label: 'Max Leverage', value: '100:1', sub: 'On major benchmark indices' },
                { label: 'Extended Hours', value: 'Near 24h', sub: 'On US major index CFDs' },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-surface-border bg-surface-alt p-6"
                >
                  <div className="mb-1 text-sm font-medium text-gray-500">{card.label}</div>
                  <div className="mb-1 text-3xl font-bold text-dark-700">{card.value}</div>
                  <div className="text-sm text-gray-400">{card.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Trade Indices With Us */}
      <section className="bg-surface-alt py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
              Why Trade Index CFDs With Us
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              Efficient, diversified market exposure with professional-grade conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-surface-border bg-white p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-dark-700">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instruments Table */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold text-dark-700 md:text-4xl">Global Index CFDs</h2>
            <p className="text-gray-500">
              Indicative spreads in index points. Actual spreads may vary.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Global index CFDs with typical spreads, maximum leverage, and trading hours
                </caption>
                <thead>
                  <tr className="border-b border-surface-border bg-surface-alt">
                    <th scope="col" className="px-6 py-4 text-left font-medium text-gray-500">
                      Index
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-medium text-gray-500">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Typical Spread
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Max Leverage
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Trading Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {INDICES.map((idx, i) => (
                    <tr
                      key={idx.index}
                      className={`transition-colors duration-150 hover:bg-surface-alt ${i % 2 === 1 ? 'bg-surface-alt/40' : 'bg-white'}`}
                    >
                      <td className="px-6 py-4 font-semibold text-dark-700">{idx.index}</td>
                      <td className="px-6 py-4 text-gray-600">{idx.description}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">
                        {idx.typicalSpread}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-dark-700">
                        {idx.maxLeverage}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">{idx.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Key Specs */}
      <section className="bg-dark-800 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Index CFD Specifications
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400">
              Transparent conditions across all global index instruments.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {KEY_SPECS.map((spec) => (
              <div key={spec.label} className="rounded-xl border border-dark-600 bg-dark-700 p-6">
                <div className="mb-2 text-sm font-medium text-gray-400">{spec.label}</div>
                <div className="text-xl font-bold text-white">{spec.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Trade */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
              How to Trade Index CFDs
            </h2>
            <p className="text-lg text-gray-500">
              Get started on global markets in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="mb-4 text-5xl font-black leading-none text-primary-500/15">
                  {step.number}
                </div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-medium text-primary-500">
                  {step.time}
                </div>
                <h3 className="mb-2 text-base font-semibold text-dark-700">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-500 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Start Trading Indices Today
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
            Access 20+ global indices with tight spreads, high leverage, and near-24-hour market
            access — all in one platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="https://auth.protrader.sim/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 font-semibold text-primary-600 transition-colors duration-200 hover:bg-gray-50"
              rel="noopener noreferrer"
            >
              Create Free Account
              <ArrowRightIcon size={16} />
            </Link>
            <Link
              href="/trading/instruments"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-transparent px-8 py-3.5 font-semibold text-white transition-colors duration-200 hover:bg-white/10"
            >
              View All Instruments
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
