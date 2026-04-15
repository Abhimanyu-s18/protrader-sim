import Link from 'next/link'

const FEATURES = [
  'Advanced candlestick charting with 50+ indicators',
  'One-click order execution with SL/TP',
  'Real-time P&L and margin monitoring',
  'Full trade history and analytics',
]

const PLATFORM_SVGS = [
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>,
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>,
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h18v18H3z" />
    <path d="M3 9h18M9 21V9" />
  </svg>,
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>,
]

/**
 * PlatformSection - Platform features and mockup
 */
export function PlatformSection() {
  return (
    <section id="platform" className="bg-dark-700 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left: Copy */}
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary-500">
              The Platform
            </p>
            <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
              Professional-Grade Trading Platform
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              Built for serious traders. Real-time charts, advanced order types, and risk management
              tools — all in your browser.
            </p>

            <ul className="mb-8 space-y-4">
              {FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 text-primary-500">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-sm leading-relaxed text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={process.env.NEXT_PUBLIC_PLATFORM_URL ?? '/platform'}
              className="inline-flex items-center gap-2 font-semibold text-primary-500 transition-colors duration-150 hover:text-primary-400"
            >
              Explore the Platform
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
          </div>

          {/* Right: Platform mockup */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-dark-800 shadow-2xl">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-white/10 bg-dark-900/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <div className="ml-3 flex-1 rounded bg-dark-700 px-3 py-1">
                  <span className="font-mono text-xs text-gray-500">
                    app.protradersim.com/dashboard
                  </span>
                </div>
              </div>

              {/* Inner layout */}
              <div className="flex h-72">
                {/* Sidebar */}
                <div className="flex w-14 flex-col items-center gap-4 border-r border-white/10 bg-dark-900/80 py-4">
                  {PLATFORM_SVGS.map((icon, i) => (
                    <div
                      key={i}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${i === 1 ? 'bg-primary-500/20 text-primary-500' : 'text-gray-500'}`}
                    >
                      {icon}
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="relative flex-1 bg-dark-800">
                  {/* Axis labels */}
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">EUR/USD</span>
                    <span className="text-xs text-gray-500">M15</span>
                    <span className="font-mono text-xs text-buy">1.08452 ▲</span>
                  </div>

                  {/* Fake candlestick chart */}
                  <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 380 220" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[40, 80, 120, 160, 200].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="380"
                        y2={y}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Candles — simplified group */}
                    {[
                      { x: 30, open: 160, close: 140, high: 130, low: 170, green: true },
                      { x: 55, open: 140, close: 150, high: 135, low: 158, green: false },
                      { x: 80, open: 150, close: 125, high: 118, low: 155, green: true },
                      { x: 105, open: 125, close: 110, high: 104, low: 132, green: true },
                      { x: 130, open: 110, close: 120, high: 100, low: 125, green: false },
                      { x: 155, open: 120, close: 105, high: 98, low: 127, green: true },
                      { x: 180, open: 105, close: 90, high: 84, low: 110, green: true },
                      { x: 205, open: 90, close: 98, high: 85, low: 106, green: false },
                      { x: 230, open: 98, close: 80, high: 74, low: 103, green: true },
                      { x: 255, open: 80, close: 68, high: 60, low: 85, green: true },
                      { x: 280, open: 68, close: 76, high: 62, low: 80, green: false },
                      { x: 305, open: 76, close: 60, high: 54, low: 80, green: true },
                      { x: 330, open: 60, close: 48, high: 42, low: 65, green: true },
                      { x: 355, open: 48, close: 55, high: 40, low: 60, green: false },
                    ].map((c, i) => {
                      const color = c.green ? '#1A7A3C' : '#C0392B'
                      const bodyTop = Math.min(c.open, c.close)
                      const bodyH = Math.abs(c.open - c.close)
                      return (
                        <g key={i}>
                          <line
                            x1={c.x}
                            y1={c.high}
                            x2={c.x}
                            y2={c.low}
                            stroke={color}
                            strokeWidth="1"
                          />
                          <rect
                            x={c.x - 7}
                            y={bodyTop}
                            width="14"
                            height={bodyH}
                            fill={color}
                            opacity="0.85"
                            rx="1"
                          />
                        </g>
                      )
                    })}
                    {/* Moving average line */}
                    <polyline
                      points="30,155 55,148 80,138 105,125 130,118 155,108 180,98 205,92 230,85 255,72 280,70 305,62 330,52 355,52"
                      fill="none"
                      stroke="#E8650A"
                      strokeWidth="1.5"
                      opacity="0.6"
                    />
                  </svg>
                </div>

                {/* Right panel: order form */}
                <div className="flex w-36 flex-col gap-3 border-l border-white/10 bg-dark-900/50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Order
                  </div>
                  <div className="rounded bg-white/5 p-2">
                    <div className="text-xs text-gray-500">Buy</div>
                    <div className="font-mono text-sm font-bold text-buy">1.08452</div>
                  </div>
                  <div className="rounded bg-white/5 p-2">
                    <div className="text-xs text-gray-500">Sell</div>
                    <div className="font-mono text-sm font-bold text-sell">1.08445</div>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    <div className="text-xs text-gray-500">Volume</div>
                    <div className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-white">
                      0.10
                    </div>
                    <div className="mt-1 text-xs text-gray-500">SL / TP</div>
                    <div className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-white">
                      1.080
                    </div>
                    <div className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-white">
                      1.090
                    </div>
                  </div>
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
