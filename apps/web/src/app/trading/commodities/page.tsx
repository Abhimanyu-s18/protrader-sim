import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Commodity CFD Trading',
  description:
    'Trade Gold, Silver, Crude Oil, Natural Gas and 30+ other commodities as CFDs with competitive spreads and high leverage.',
}

interface Commodity {
  symbol: string
  name: string
  typicalSpread: string
  maxLeverage: string
  contractSize: string
  hours: string
}

const COMMODITY_VALUES = {
  goldSpread: '$0.35',
  goldLeverage: '200:1',
}

const COMMODITIES: readonly Commodity[] = [
  {
    symbol: 'XAUUSD',
    name: 'Gold',
    typicalSpread: COMMODITY_VALUES.goldSpread,
    maxLeverage: COMMODITY_VALUES.goldLeverage,
    contractSize: '100 oz',
    hours: '23/5',
  },
  {
    symbol: 'XAGUSD',
    name: 'Silver',
    typicalSpread: '$0.03',
    maxLeverage: '100:1',
    contractSize: '5,000 oz',
    hours: '23/5',
  },
  {
    symbol: 'USOIL',
    name: 'Crude Oil WTI',
    typicalSpread: '$0.05',
    maxLeverage: '100:1',
    contractSize: '1,000 bbl',
    hours: '23/5',
  },
  {
    symbol: 'UKOIL',
    name: 'Brent Crude',
    typicalSpread: '$0.05',
    maxLeverage: '100:1',
    contractSize: '1,000 bbl',
    hours: '23/5',
  },
  {
    symbol: 'NATGAS',
    name: 'Natural Gas',
    typicalSpread: '$0.003',
    maxLeverage: '100:1',
    contractSize: '10,000 MMBTU',
    hours: '23/5',
  },
  {
    symbol: 'XPTUSD',
    name: 'Platinum',
    typicalSpread: '$2.00',
    maxLeverage: '100:1',
    contractSize: '100 oz',
    hours: '23/5',
  },
  {
    symbol: 'COFFEE',
    name: 'Coffee',
    typicalSpread: '$0.05',
    maxLeverage: '50:1',
    contractSize: '37,500 lbs',
    hours: 'Mon–Fri',
  },
  {
    symbol: 'WHEAT',
    name: 'Wheat',
    typicalSpread: '$2.00',
    maxLeverage: '50:1',
    contractSize: '5,000 bushels',
    hours: 'Mon–Fri',
  },
] as const

const KEY_SPECS = [
  { label: 'Gold Spread from', value: `${COMMODITY_VALUES.goldSpread} per oz` },
  { label: 'Min Trade Size', value: '0.01 lots' },
  { label: 'Oil Leverage', value: 'Up to 100:1' },
  { label: 'Gold Leverage', value: 'Up to 200:1' },
  { label: 'Swap', value: 'Charged at 00:00 server time' },
  { label: 'Trading Hours', value: 'Up to 23 hours/day' },
] as const

const FEATURES = [
  {
    title: 'Inflation Hedge',
    description:
      'Commodities like Gold and Silver have historically served as stores of value during periods of economic uncertainty.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: 'Physical Equivalent',
    description:
      'Our Gold CFDs track the spot price directly, giving you exposure equivalent to holding the physical metal.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    title: 'Gold from 0.35 Spread',
    description:
      'Ultra-competitive spreads on precious metals with no additional commissions on Standard accounts.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    title: 'Energy Sector Exposure',
    description:
      'Trade Crude Oil, Brent, and Natural Gas to capitalise on geopolitical events and supply dynamics.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
] as const

const STEPS = [
  {
    number: '01',
    title: 'Open Your Account',
    description: 'Create your free account in under 3 minutes with just your email address.',
    time: '3 min',
  },
  {
    number: '02',
    title: 'Fund Your Account',
    description: 'Deposit via crypto with near-instant confirmation. No deposit fees.',
    time: 'Instant',
  },
  {
    number: '03',
    title: 'Select a Commodity',
    description: 'Browse Gold, Silver, Oil and 30+ other commodities in our instrument library.',
    time: '1 min',
  },
  {
    number: '04',
    title: 'Place Your Trade',
    description: 'Set your position size, stop loss and take profit, then execute.',
    time: '1 click',
  },
] as const

const GOLD_STATS = [
  { label: 'Gold spread from', value: COMMODITY_VALUES.goldSpread },
  { label: 'Gold leverage up to', value: COMMODITY_VALUES.goldLeverage },
  { label: 'Commodities available', value: '30+' },
] as const

/** Commodities CFD trading page */
export default function CommoditiesPage() {
  // Validate NEXT_PUBLIC_AUTH_URL with fallback
  let authBaseUrl = process.env.NEXT_PUBLIC_AUTH_URL

  if (!authBaseUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_AUTH_URL environment variable is required in production')
    }
    // Development fallback with warning
    console.warn('NEXT_PUBLIC_AUTH_URL not set, using localhost default for development only')
    authBaseUrl = 'http://localhost:3001'
  }

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
              30+ Commodities
            </span>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Commodity CFDs —{' '}
              <span className="text-primary-500">Gold, Oil, Silver &amp; More</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-gray-300 md:text-xl">
              Trade precious metals, energy, and agricultural commodities as CFDs with competitive
              spreads, no expiry dates, and leverage up to 200:1.
            </p>

            <div className="mb-10 flex flex-wrap gap-8">
              {GOLD_STATS.map((m) => (
                <div key={m.label}>
                  <div className="text-2xl font-bold text-white">{m.value}</div>
                  <div className="mt-0.5 text-sm text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href={`${authBaseUrl}/register`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
              >
                Start Trading Commodities
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
                href={`${authBaseUrl}/register?demo=true`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors duration-200 hover:border-gray-400 hover:text-white"
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
                What are Commodity CFDs?
              </h2>
              <div className="space-y-4 leading-relaxed text-gray-600">
                <p>
                  Commodity CFDs allow you to speculate on the price movements of physical goods —
                  from precious metals like Gold and Silver to energy products like Crude Oil and
                  Natural Gas — without physically owning the underlying asset. You gain full price
                  exposure with the flexibility to go long or short.
                </p>
                <p>
                  Unlike futures contracts, our commodity CFDs have no fixed expiry dates. Positions
                  can be held as long as you have sufficient margin, with overnight swap rates
                  applied to reflect the cost of financing. This makes them ideal for both
                  short-term speculation and longer-term strategic positioning.
                </p>
                <p>
                  Commodities are heavily influenced by macroeconomic forces: central bank policy,
                  geopolitical events, supply and demand dynamics, and currency movements.
                  ProTraderSim gives you the tools to capitalise on these opportunities with
                  precision and speed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  label: 'Commodities Available',
                  value: '30+',
                  sub: 'Metals, energy & agriculture',
                },
                { label: 'Gold Max Leverage', value: '200:1', sub: 'On precious metals' },
                { label: 'Gold Spread from', value: '$0.35', sub: 'Per troy ounce' },
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

      {/* Why Trade */}
      <section className="bg-surface-alt py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
              Why Trade Commodities With Us
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              Access global commodity markets with the same tools used by professional traders.
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
            <h2 className="mb-2 text-3xl font-bold text-dark-700 md:text-4xl">
              Popular Commodity Instruments
            </h2>
            <p className="text-gray-500">Live indicative spreads. Actual spreads may vary.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Popular commodity trading instruments with spreads, leverage, and trading hours
                </caption>
                <thead>
                  <tr className="border-b border-surface-border bg-surface-alt">
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Symbol</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Commodity</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">
                      Typical Spread
                    </th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Max Leverage</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">
                      Contract Size
                    </th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">
                      Trading Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {COMMODITIES.map((c, i) => (
                    <tr
                      key={c.symbol}
                      className={`transition-colors duration-150 hover:bg-surface-alt ${i % 2 === 1 ? 'bg-surface-alt/40' : 'bg-white'}`}
                    >
                      <td className="px-6 py-4 font-semibold text-dark-700">{c.symbol}</td>
                      <td className="px-6 py-4 text-gray-600">{c.name}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">
                        {c.typicalSpread}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-dark-700">
                        {c.maxLeverage}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">{c.contractSize}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{c.hours}</td>
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
              Commodity Trading Specifications
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400">
              Transparent contract specs with no hidden fees or surprises.
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
              How to Trade Commodities
            </h2>
            <p className="text-lg text-gray-500">Get started in four simple steps.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.number}>
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
            Start Trading Commodities Today
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-orange-100">
            Access global commodity markets — Gold, Oil, Silver and more — with competitive spreads
            and professional tools.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={`${authBaseUrl}/register`}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 font-semibold text-primary-600 transition-colors duration-200 hover:bg-orange-50"
            >
              Create Free Account
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
