import type { Metadata } from 'next'
import type { SVGProps } from 'react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Stock CFD Trading',
  description:
    'Trade CFDs on 500+ global stocks from the NYSE, NASDAQ, LSE and more with leverage up to 20:1.',
}

// Shared constants to avoid duplication
const STOCK_COUNT = '500+'
const MAX_LEVERAGE = '20:1'
const EXCHANGES = 'NYSE, NASDAQ, LSE, ASX, Euronext'

// Icon components for features
function NoOwnershipIcon({
  size = 24,
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  )
}

function LongShortIcon({
  size = 24,
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
      <polyline points="17 8 21 12 17 16" />
      <polyline points="7 8 3 12 7 16" />
      <line x1="21" y1="12" x2="3" y2="12" />
    </svg>
  )
}

function FractionalLotsIcon({
  size = 24,
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function ExtendedHoursIcon({
  size = 24,
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

const STOCKS = [
  {
    symbol: 'AAPL',
    company: 'Apple Inc.',
    minSpread: '$0.02',
    maxLeverage: '20:1',
    exchange: 'NASDAQ',
    hours: '14:30–21:00 UTC',
  },
  {
    symbol: 'MSFT',
    company: 'Microsoft Corp.',
    minSpread: '$0.03',
    maxLeverage: '20:1',
    exchange: 'NASDAQ',
    hours: '14:30–21:00 UTC',
  },
  {
    symbol: 'TSLA',
    company: 'Tesla Inc.',
    minSpread: '$0.05',
    maxLeverage: '10:1',
    exchange: 'NASDAQ',
    hours: '14:30–21:00 UTC',
  },
  {
    symbol: 'GOOGL',
    company: 'Alphabet Inc.',
    minSpread: '$0.04',
    maxLeverage: '20:1',
    exchange: 'NASDAQ',
    hours: '14:30–21:00 UTC',
  },
  {
    symbol: 'AMZN',
    company: 'Amazon.com Inc.',
    minSpread: '$0.04',
    maxLeverage: '20:1',
    exchange: 'NASDAQ',
    hours: '14:30–21:00 UTC',
  },
  {
    symbol: 'META',
    company: 'Meta Platforms',
    minSpread: '$0.03',
    maxLeverage: '20:1',
    exchange: 'NASDAQ',
    hours: '14:30–21:00 UTC',
  },
  {
    symbol: 'NVDA',
    company: 'NVIDIA Corp.',
    minSpread: '$0.05',
    maxLeverage: '10:1',
    exchange: 'NASDAQ',
    hours: '14:30–21:00 UTC',
  },
  {
    symbol: 'JPM',
    company: 'JPMorgan Chase',
    minSpread: '$0.03',
    maxLeverage: '20:1',
    exchange: 'NYSE',
    hours: '14:30–21:00 UTC',
  },
] as const

const KEY_SPECS = [
  { label: 'Exchanges', value: EXCHANGES },
  { label: 'Max Leverage', value: `Up to ${MAX_LEVERAGE}` },
  { label: 'Min Trade', value: '1 share' },
  { label: 'Commission', value: 'From $0.02' },
  { label: 'Dividend Adjustments', value: 'Applied to open positions' },
  { label: 'Corporate Actions', value: 'Reflected in pricing' },
] as const

const FEATURES = [
  {
    title: 'No Ownership Required',
    description: 'Gain exposure to price movements without owning the underlying shares.',
    icon: <NoOwnershipIcon />,
  },
  {
    title: 'Long & Short',
    description: 'Profit from both rising and falling stock prices with equal ease.',
    icon: <LongShortIcon />,
  },
  {
    title: 'Fractional Lots',
    description: 'Start with as little as 1 share — no minimum lot size restrictions.',
    icon: <FractionalLotsIcon />,
  },
  {
    title: 'Extended Hours',
    description: 'Pre-market and after-hours trading available on major US stocks.',
    icon: <ExtendedHoursIcon />,
  },
] as const

const STEPS = [
  {
    number: '01',
    title: 'Open Your Account',
    description: 'Register in minutes with just your email. No documents needed to start.',
    time: '3 min',
  },
  {
    number: '02',
    title: 'Fund Your Account',
    description: 'Deposit via crypto with instant confirmation and no deposit fees.',
    time: 'Instant',
  },
  {
    number: '03',
    title: 'Select a Stock',
    description: 'Search 500+ global stocks across NYSE, NASDAQ, LSE and more.',
    time: '1 min',
  },
  {
    number: '04',
    title: 'Place Your Trade',
    description: 'Set your position size and risk parameters, then execute with one click.',
    time: '1 click',
  },
] as const

/** Stock CFD trading instrument page */
export default function StocksPage() {
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
              500+ Global Stocks
            </span>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Stock CFDs —{' '}
              <span className="text-primary-500">Trade the World&apos;s Top Companies</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-gray-300 md:text-xl">
              Get exposure to {STOCK_COUNT} stocks from the {EXCHANGES} without owning a single
              share. Go long or short with leverage up to {MAX_LEVERAGE}.
            </p>

            <div className="mb-10 flex flex-wrap gap-8">
              {[
                { label: 'Stocks Available', value: STOCK_COUNT },
                { label: 'Max Leverage', value: MAX_LEVERAGE },
                { label: 'Pricing', value: 'Real-Time' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="text-2xl font-bold text-white">{m.value}</div>
                  <div className="mt-0.5 text-sm text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="https://auth.protrader.sim/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
              >
                Start Trading Stocks
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="https://auth.protrader.sim/register?demo=true"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors duration-200 hover:border-gray-400 hover:text-white"
              >
                Open Demo Account
              </a>
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
                What are Stock CFDs?
              </h2>
              <div className="space-y-4 leading-relaxed text-gray-600">
                <p>
                  A Stock CFD (Contract for Difference) allows you to speculate on the price
                  movement of publicly listed company shares without taking ownership of the
                  underlying stock. You simply predict whether a share price will rise or fall, and
                  your profit or loss is determined by the accuracy of that prediction multiplied by
                  your position size.
                </p>
                <p>
                  Trading stock CFDs with leverage means you only need to deposit a fraction of the
                  full trade value to open a position. A 20:1 leverage ratio on a $10,000 position
                  requires only $500 in margin. This amplifies both potential profits and potential
                  losses, so robust risk management is critical.
                </p>
                <p>
                  ProTraderSim provides access to over 500 stocks across the world&apos;s leading
                  exchanges. Our real-time pricing ensures you always see accurate market data, with
                  dividend adjustments and corporate actions properly reflected in your open
                  positions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  label: 'Stocks Available',
                  value: '500+',
                  sub: 'Global equities across 5 exchanges',
                },
                { label: 'Max Leverage', value: '20:1', sub: 'On major blue-chip stocks' },
                { label: 'Exchanges', value: 'NYSE, NASDAQ, LSE, ASX', sub: 'And Euronext' },
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

      {/* Why Trade Stocks With Us */}
      <section className="bg-surface-alt py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
              Why Trade Stock CFDs With Us
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              Access global equity markets with the flexibility and efficiency of CFD trading.
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
            <h2 className="mb-2 text-3xl font-bold text-dark-700 md:text-4xl">Popular Stocks</h2>
            <p className="text-gray-500">Indicative spreads. Actual values may vary.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-alt">
                    <th scope="col" className="px-6 py-4 text-left font-medium text-gray-500">
                      Symbol
                    </th>
                    <th scope="col" className="px-6 py-4 text-left font-medium text-gray-500">
                      Company
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Min Spread
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Max Leverage
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Exchange
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Trading Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {STOCKS.map((stock, i) => (
                    <tr
                      key={stock.symbol}
                      className={`transition-colors duration-150 hover:bg-surface-alt ${i % 2 === 1 ? 'bg-surface-alt/40' : 'bg-white'}`}
                    >
                      <td className="px-6 py-4 font-semibold text-dark-700">{stock.symbol}</td>
                      <td className="px-6 py-4 text-gray-600">{stock.company}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">
                        {stock.minSpread}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-dark-700">
                        {stock.maxLeverage}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {stock.exchange}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">{stock.hours}</td>
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
              Stock CFD Specifications
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400">
              Full transparency on every parameter that affects your trading costs and conditions.
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
              How to Trade Stock CFDs
            </h2>
            <p className="text-lg text-gray-500">
              Four steps from registration to your first trade.
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
            Start Trading Stocks Today
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-orange-100">
            Access 500+ global stocks with competitive spreads and leverage up to 20:1 on the
            world&apos;s leading equity markets.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://auth.protrader.sim/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 font-semibold text-primary-600 transition-colors duration-200 hover:bg-orange-50"
            >
              Create Free Account
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <Link
              href="/trading/instruments"
              className="inline-flex items-center gap-2 rounded-lg border border-orange-200 px-8 py-3.5 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
            >
              View All Instruments
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
