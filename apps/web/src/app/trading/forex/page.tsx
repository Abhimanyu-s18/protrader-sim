import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'
import { type TradingContent, getTradingContent } from '../../../data/forex-trading'

export const metadata: Metadata = {
  title: 'Forex Trading',
  description: 'Trade major, minor and exotic Forex pairs with ultra-low spreads from 0.0 pips.',
}

/** Forex trading instrument page */
export default async function ForexPage() {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL
  if (!authUrl) {
    throw new Error('NEXT_PUBLIC_AUTH_URL environment variable is required')
  }

  let content: TradingContent

  try {
    // TODO: Replace with actual CMS/API integration when ready
    content = await getTradingContent()
  } catch (error) {
    // Log error and rethrow for Next.js error boundary
    console.error('Failed to load forex trading content:', error)
    throw error
  }

  const { forexPairs, keySpecs, features, steps } = content

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-dark-700 py-24 md:py-32"
        style={{
          background:
            'radial-gradient(ellipse at 60% 30%, rgba(232,101,10,0.12), transparent 60%), #1A2332',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-500/15 px-3 py-1.5 text-sm font-medium text-primary-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              60+ Currency Pairs
            </span>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Forex Trading —{' '}
              <span className="text-primary-500">The World&apos;s Largest Market</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-gray-300 md:text-xl">
              Trade major, minor and exotic currency pairs with spreads from 0.0 pips and leverage
              up to 500:1 on the world&apos;s most liquid financial market.
            </p>

            {/* Metrics */}
            <div className="mb-10 flex flex-wrap gap-8">
              {[
                { label: 'Spreads from', value: '0.0 pips' },
                { label: 'Up to', value: '500:1 Leverage' },
                { label: 'Trading Hours', value: '24/5' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="text-2xl font-bold text-white">{m.value}</div>
                  <div className="mt-0.5 text-sm text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href={authUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
              >
                Start Trading Forex
                <ArrowRightIcon />
              </Link>
              <Link
                href={`${authUrl}?demo=true`}
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
                What is Forex Trading?
              </h2>
              <div className="space-y-4 leading-relaxed text-gray-600">
                <p>
                  The foreign exchange market — commonly known as Forex or FX — is the global
                  marketplace for trading national currencies against one another. With a daily
                  trading volume exceeding $7.5 trillion, it is by far the largest and most liquid
                  financial market in the world, operating around the clock five days a week across
                  major financial centres.
                </p>
                <p>
                  When you trade Forex as a CFD, you speculate on the price movement of a currency
                  pair without taking physical delivery of the underlying currencies. You profit
                  when your prediction of the exchange rate direction is correct, and your potential
                  gains are amplified by leverage — as is your potential for loss, which is why
                  disciplined risk management is essential.
                </p>
                <p>
                  ProTraderSim gives you access to 60+ currency pairs spanning major, minor and
                  exotic categories. Whether you are scalping EUR/USD during the London open or
                  swing-trading emerging-market pairs, our execution engine delivers
                  institutional-grade speed with transparent, raw pricing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'Daily Volume', value: '$7.5 Trillion', sub: 'Global FX market turnover' },
                { label: 'Pairs Available', value: '60+', sub: '60+ currency pairs' },
                { label: 'Max Leverage', value: '500:1', sub: 'On major currency pairs' },
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

      {/* Why Trade Forex With Us */}
      <section className="bg-surface-alt py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
              Why Trade Forex With Us
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              Everything you need to trade the world&apos;s currency markets with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-surface-border bg-white p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
              >
                {f.icon && typeof f.icon === 'function' && (
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                    <f.icon />
                  </div>
                )}
                {f.icon && typeof f.icon !== 'function' && (
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                    {f.icon}
                  </div>
                )}
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
              Popular Forex Pairs
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
                      Description
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-medium text-gray-500">
                      Min Spread
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
                  {forexPairs.map((pair, i) => (
                    <tr
                      key={pair.symbol}
                      className={`transition-colors duration-150 hover:bg-surface-alt ${i % 2 === 1 ? 'bg-surface-alt/40' : 'bg-white'}`}
                    >
                      <td className="px-6 py-4 font-semibold text-dark-700">{pair.symbol}</td>
                      <td className="px-6 py-4 text-gray-600">{pair.description}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">
                        {pair.minSpread}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">
                        {pair.typicalSpread}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-dark-700">
                        {pair.maxLeverage}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">{pair.hours}</td>
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
              Forex Trading Specifications
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400">
              Transparent contract specifications with no hidden fees or surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {keySpecs.map((spec) => (
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
              How to Trade Forex
            </h2>
            <p className="text-lg text-gray-500">Get started in four simple steps.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
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
            Start Trading Forex Today
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-orange-100">
            Join thousands of traders accessing the world&apos;s largest market with
            ultra-competitive spreads and professional tools.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={authUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 font-semibold text-primary-600 transition-colors duration-200 hover:bg-orange-50"
            >
              Create Free Account
              <ArrowRightIcon />
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
