import type { Metadata } from 'next'
import Link from 'next/link'

const CRYPTO_STATS = {
  totalCryptos: '40+',
  btcLeverage: '10:1',
  altcoinLeverage: '5:1',
  marketHours: '24/7',
  btcSpread: '$40',
} as const

function ArrowRightIcon() {
  return (
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
  )
}

export const metadata: Metadata = {
  title: 'Cryptocurrency CFD Trading',
  description:
    'Trade Bitcoin, Ethereum and 40+ cryptocurrency CFDs 24/7. No wallet required — just a trading account.',
}

const CRYPTOS = [
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    typicalSpread: CRYPTO_STATS.btcSpread,
    maxLeverage: CRYPTO_STATS.btcLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum',
    typicalSpread: '$3.00',
    maxLeverage: CRYPTO_STATS.btcLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
  {
    symbol: 'BNB/USD',
    name: 'BNB',
    typicalSpread: '$0.50',
    maxLeverage: CRYPTO_STATS.altcoinLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
  {
    symbol: 'XRP/USD',
    name: 'Ripple',
    typicalSpread: '$0.0003',
    maxLeverage: CRYPTO_STATS.altcoinLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
  {
    symbol: 'SOL/USD',
    name: 'Solana',
    typicalSpread: '$0.20',
    maxLeverage: CRYPTO_STATS.altcoinLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
  {
    symbol: 'ADA/USD',
    name: 'Cardano',
    typicalSpread: '$0.0002',
    maxLeverage: CRYPTO_STATS.altcoinLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
  {
    symbol: 'DOGE/USD',
    name: 'Dogecoin',
    typicalSpread: '$0.0001',
    maxLeverage: CRYPTO_STATS.altcoinLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
  {
    symbol: 'DOT/USD',
    name: 'Polkadot',
    typicalSpread: '$0.005',
    maxLeverage: CRYPTO_STATS.altcoinLeverage,
    hours: CRYPTO_STATS.marketHours,
  },
] as const

const KEY_SPECS = [
  { label: 'Bitcoin Spread from', value: CRYPTO_STATS.btcSpread },
  { label: 'Bitcoin Leverage', value: `Up to ${CRYPTO_STATS.btcLeverage}` },
  { label: 'Altcoin Leverage', value: `Up to ${CRYPTO_STATS.altcoinLeverage}` },
  { label: 'Min Trade Size', value: '0.01 lots' },
  { label: 'Trading Hours', value: `${CRYPTO_STATS.marketHours}, 365 days` },
  { label: 'Cryptos Available', value: CRYPTO_STATS.totalCryptos },
] as const

const FEATURES = [
  {
    title: '24/7 Market Access',
    description:
      'Crypto markets never close. Trade Bitcoin and Ethereum any time of day, any day of the week — including weekends and holidays.',
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
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'No Wallet Required',
    description:
      'Trade cryptocurrency price movements as CFDs. No private keys, no wallet setup, no security risks from self-custody.',
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
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    title: 'Long & Short',
    description:
      'Go long when you expect prices to rise or short when you expect them to fall — profit from both bull and bear markets.',
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
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
  {
    title: 'Top 40+ Cryptos',
    description:
      'Access Bitcoin, Ethereum, BNB, Solana, XRP, Cardano, and 34+ more leading digital assets all in one account.',
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
] as const

const STEPS = [
  {
    number: '01',
    title: 'Open Your Account',
    description: 'Register in under 3 minutes. No credit card or verification delays.',
    time: '3 min',
  },
  {
    number: '02',
    title: 'Fund Your Account',
    description: 'Deposit with cryptocurrency — Bitcoin, USDT, ETH and more supported.',
    time: 'Instant',
  },
  {
    number: '03',
    title: 'Choose Your Crypto',
    description: 'Select from 40+ cryptocurrency CFDs — from Bitcoin to emerging altcoins.',
    time: '1 min',
  },
  {
    number: '04',
    title: 'Place Your Trade',
    description: 'Set leverage, stop loss and take profit, then execute at real-time price.',
    time: '1 click',
  },
] as const

/** Crypto CFD trading page */
export default function CryptoPage() {
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
              40+ Cryptocurrencies
            </span>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Crypto CFDs —{' '}
              <span className="text-primary-500">Trade Bitcoin, Ethereum &amp; More</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-gray-300 md:text-xl">
              Speculate on cryptocurrency price movements 24/7 without a wallet. Go long or short on
              Bitcoin, Ethereum and 40+ top digital assets with leverage up to 10:1.
            </p>

            <div className="mb-10 flex flex-wrap gap-8">
              {[
                { label: 'Cryptos available', value: CRYPTO_STATS.totalCryptos },
                { label: 'Bitcoin leverage', value: CRYPTO_STATS.btcLeverage },
                { label: 'Market hours', value: CRYPTO_STATS.marketHours },
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
                Start Trading Crypto
                <ArrowRightIcon />
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

      {/* Risk Warning */}
      <div className="border-y border-yellow-200 bg-yellow-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Risk Warning:</span> Cryptocurrency CFDs are highly
            volatile instruments. Prices can move significantly in short periods. Please ensure you
            fully understand the risks involved before trading.
          </p>
        </div>
      </div>

      {/* Overview */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-dark-700 md:text-4xl">
                What are Crypto CFDs?
              </h2>
              <div className="space-y-4 leading-relaxed text-gray-600">
                <p>
                  Cryptocurrency CFDs (Contracts for Difference) allow you to speculate on the price
                  movements of digital assets without actually owning the underlying cryptocurrency.
                  This means no wallets, no private keys, and no exchange accounts — just a single
                  ProTraderSim account gives you access to the entire crypto market.
                </p>
                <p>
                  Crypto CFDs offer the unique advantage of being able to profit from both rising
                  and falling markets. When you believe Bitcoin&apos;s price will increase, you open
                  a buy (long) position. When you anticipate a decline, you open a sell (short)
                  position. Leverage amplifies both gains and losses, so careful risk management is
                  paramount.
                </p>
                <p>
                  Unlike buying actual cryptocurrency, there are no blockchain transfer fees, no
                  custody risks, and instant settlement. Your positions are always liquid — close at
                  any time during market hours, which for crypto is around the clock, every day of
                  the year.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  label: 'Cryptos Available',
                  value: CRYPTO_STATS.totalCryptos,
                  sub: 'Including BTC, ETH, BNB, SOL and more',
                },
                {
                  label: 'Bitcoin Leverage',
                  value: CRYPTO_STATS.btcLeverage,
                  sub: 'Control larger positions',
                },
                {
                  label: 'Market Hours',
                  value: `${CRYPTO_STATS.marketHours}/365`,
                  sub: 'Never misses a market move',
                },
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
              Why Trade Crypto With Us
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              Trade cryptocurrency price movements as CFDs with competitive spreads and high
              leverage.
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
              Popular Crypto Instruments
            </h2>
            <p className="text-gray-500">Live indicative spreads. Actual spreads may vary.</p>
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
                      Name
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
                  {CRYPTOS.map((c, i) => (
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
              Crypto Trading Specifications
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400">
              Transparent contract specs on all cryptocurrency CFDs.
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
              How to Trade Crypto CFDs
            </h2>
            <p className="text-lg text-gray-500">Start in four simple steps — no wallet needed.</p>
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
            Start Trading Crypto Today
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-orange-100">
            Open a live account or explore our full range of instruments.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://auth.protrader.sim/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 font-semibold text-primary-600 transition-colors duration-200 hover:bg-orange-50"
            >
              Open Live Account
              <ArrowRightIcon />
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
