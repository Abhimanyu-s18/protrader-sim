import Link from 'next/link'
import { TICKER_ITEMS } from '../constants'
import { isPositiveChange } from '../utils'

/**
 * HeroSection - Main hero banner with trading terminal mockup
 */
export function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden bg-dark-700 pt-16"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M60 0v60M0 60h60' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Radial gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 70% 20%, rgba(232,101,10,0.15), transparent 60%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: Copy */}
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-500">
              ✦ Trusted by 50,000+ Traders Worldwide
            </div>

            {/* H1 */}
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Trade Global Markets <span className="text-primary-500">with Confidence</span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300 md:text-xl">
              Access 150+ instruments across Forex, Stocks, Indices, Commodities &amp; Crypto.
              Ultra-low spreads, up to 500:1 leverage, and professional execution.
            </p>

            {/* CTA row */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-primary-600 hover:shadow-primary-500/25"
              >
                Open Free Account
                <svg
                  width="18"
                  height="18"
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
                href="/register?demo=true"
                className="inline-flex items-center rounded-lg border border-white/30 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-white/10"
              >
                Try Demo Account
              </Link>
            </div>

            {/* Trust row */}
            <p className="mt-5 text-sm text-gray-400">
              No credit card required&nbsp;&bull;&nbsp;Free forever&nbsp;&bull;&nbsp;Instant access
            </p>
          </div>

          {/* Right: Trading terminal mockup */}
          <div className="hidden justify-center lg:flex">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-dark-800 shadow-2xl">
              {/* Terminal header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-dark-900/50 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <div className="h-3 w-3 rounded-full bg-green-500/70" />
                </div>
                <span className="font-mono text-xs text-gray-400">ProTraderSim — Live Markets</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-buy" />
                  <span className="text-xs text-buy">LIVE</span>
                </div>
              </div>

              {/* Fake price rows */}
              <div className="space-y-1 p-4">
                {TICKER_ITEMS.slice(0, 5).map((item, i) => (
                  <div
                    key={item.symbol}
                    className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-white/5"
                  >
                    <span className="w-20 text-sm font-medium text-white">{item.symbol}</span>
                    {/* Fake sparkline */}
                    <div className="relative mx-4 h-6 flex-1 overflow-hidden">
                      <svg
                        className="h-full w-full"
                        preserveAspectRatio="none"
                        viewBox="0 0 100 24"
                      >
                        {isPositiveChange(item.change) ? (
                          <polyline
                            points={`0,18 15,16 30,14 45,${12 + (i % 3) * 2} 60,10 75,8 85,6 100,4`}
                            fill="none"
                            stroke="var(--color-buy)"
                            strokeWidth="1.5"
                            opacity="0.7"
                          />
                        ) : (
                          <polyline
                            points={`0,6 15,8 30,10 45,${12 - (i % 2)} 60,14 75,16 85,18 100,20`}
                            fill="none"
                            stroke="var(--color-sell)"
                            strokeWidth="1.5"
                            opacity="0.7"
                          />
                        )}
                      </svg>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white">{item.price}</div>
                      <div
                        className={`font-mono text-xs font-medium ${isPositiveChange(item.change) ? 'text-buy' : 'text-sell'}`}
                      >
                        {item.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini order panel */}
              <div className="border-t border-white/10 bg-dark-900/30 p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
                  Quick Order
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <div className="text-xs text-gray-400">Volume</div>
                    <div className="mt-0.5 font-mono text-sm text-white">0.10 lots</div>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <div className="text-xs text-gray-400">Margin</div>
                    <div className="mt-0.5 font-mono text-sm text-white">$21.69</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg bg-buy py-2.5 text-sm font-bold tracking-wide text-white disabled:cursor-not-allowed"
                  >
                    BUY 1.08452
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg bg-sell py-2.5 text-sm font-bold tracking-wide text-white disabled:cursor-not-allowed"
                  >
                    SELL 1.08445
                  </button>
                </div>
              </div>

              {/* Bottom status bar */}
              <div className="flex items-center gap-6 border-t border-white/10 bg-dark-900/50 px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-buy" />
                  <span className="text-xs text-gray-400">Balance: $10,000.00</span>
                </div>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs text-gray-400">Equity: $10,241.50</span>
                <span className="text-xs text-gray-600">|</span>
                <span className="font-mono text-xs text-buy">P&amp;L: +$241.50</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
