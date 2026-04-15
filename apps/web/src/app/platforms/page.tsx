import type { Metadata } from 'next'
import Link from 'next/link'
import {
  IconChart,
  IconActivity,
  IconLayers,
  IconShield,
  IconHistory,
  IconGlobe,
  IconCode,
  IconCheck,
} from '@/components/icons'

export const metadata: Metadata = {
  title: 'Trading Platform',
  description:
    'Professional-grade web trading platform with advanced charting, one-click execution and real-time market data.',
}

// ---------------------------------------------------------------------------
// Icons (re-exported for compatibility)
// ---------------------------------------------------------------------------

function IconChartExport() {
  return <IconChart />
}

function IconActivityExport() {
  return <IconActivity />
}

function IconLayersExport() {
  return <IconLayers />
}

function IconShieldExport() {
  return <IconShield />
}

function IconHistoryExport() {
  return <IconHistory />
}

function IconGlobeExport() {
  return <IconGlobe />
}

function IconCodeExport() {
  return <IconCode />
}

function IconCheckExport() {
  return <IconCheck />
}

// ---------------------------------------------------------------------------
// Platform mockup (styled HTML)
// ---------------------------------------------------------------------------

function PlatformMockup() {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-30"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(232,101,10,0.4), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-dark-800 shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-dark-900/60 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-500/70" aria-hidden="true" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/70" aria-hidden="true" />
          <div className="h-3 w-3 rounded-full bg-green-500/70" aria-hidden="true" />
          <span className="ml-3 font-mono text-xs text-gray-500">
            ProTraderSim Platform — EUR/USD
          </span>
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-dark-800 px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-white">EUR/USD</span>
            <span className="font-mono text-xs text-buy">1.08524</span>
            <span className="text-xs text-buy">+0.12%</span>
          </div>
          <div className="flex items-center gap-2">
            {['M1', 'M15', 'H1', 'H4', 'D1'].map((tf) => (
              <span
                key={tf}
                className={`rounded px-2 py-0.5 text-xs ${tf === 'H1' ? 'bg-primary-500/20 text-primary-500' : 'text-gray-500'}`}
              >
                {tf}
              </span>
            ))}
          </div>
        </div>

        {/* Chart area */}
        <div className="relative h-44 overflow-hidden bg-dark-900">
          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute w-full border-t border-white/5"
              style={{ top: `${25 + i * 20}%` }}
              aria-hidden="true"
            />
          ))}
          {/* Price labels */}
          <div className="absolute right-2 top-4 flex flex-col gap-4">
            {['1.0870', '1.0855', '1.0840', '1.0825'].map((p) => (
              <span key={p} className="font-mono text-[10px] text-gray-600">
                {p}
              </span>
            ))}
          </div>
          {/* Candlestick SVG */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 340 176"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Bullish trend line */}
            <polyline
              points="0,140 28,130 56,135 84,115 112,120 140,100 168,105 196,85 224,90 252,70 280,75 320,52"
              fill="none"
              stroke="#E8650A"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            {/* Candles — green */}
            {(
              [
                [10, 128, 142, 122],
                [38, 112, 132, 108],
                [66, 98, 118, 94],
                [94, 84, 104, 80],
                [122, 68, 92, 64],
                [150, 55, 78, 50],
                [178, 42, 66, 38],
              ] as const
            ).map(([x, top, bot, wick], idx) => (
              <g key={idx}>
                <rect
                  x={x - 4}
                  y={top}
                  width="8"
                  height={bot - top}
                  fill="#1A7A3C"
                  fillOpacity="0.8"
                  rx="1"
                />
                <line
                  x1={x}
                  y1={wick}
                  x2={x}
                  y2={top}
                  stroke="#1A7A3C"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />
                <line
                  x1={x}
                  y1={bot}
                  x2={x}
                  y2={bot + 8}
                  stroke="#1A7A3C"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />
              </g>
            ))}
            {/* A few red candles */}
            {(
              [
                [206, 82, 92, 78],
                [234, 88, 98, 84],
              ] as const
            ).map(([x, top, bot, wick], idx) => (
              <g key={`red-${idx}`}>
                <rect
                  x={x - 4}
                  y={top}
                  width="8"
                  height={bot - top}
                  fill="#C0392B"
                  fillOpacity="0.8"
                  rx="1"
                />
                <line
                  x1={x}
                  y1={wick}
                  x2={x}
                  y2={top}
                  stroke="#C0392B"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />
                <line
                  x1={x}
                  y1={bot}
                  x2={x}
                  y2={bot + 6}
                  stroke="#C0392B"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />
              </g>
            ))}
            {/* Last green candle */}
            <rect x="254" y="48" width="8" height="22" fill="#1A7A3C" fillOpacity="0.9" rx="1" />
            <line
              x1="258"
              y1="42"
              x2="258"
              y2="48"
              stroke="#1A7A3C"
              strokeWidth="1"
              strokeOpacity="0.7"
            />
            <line
              x1="258"
              y1="70"
              x2="258"
              y2="78"
              stroke="#1A7A3C"
              strokeWidth="1"
              strokeOpacity="0.7"
            />
            {/* MA line */}
            <polyline
              points="0,148 40,138 80,122 120,108 160,92 200,78 240,64 280,52 320,40"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1"
              strokeOpacity="0.5"
              strokeDasharray="4 2"
            />
            {/* Current price line */}
            <line
              x1="258"
              y1="54"
              x2="340"
              y2="54"
              stroke="#E8650A"
              strokeWidth="1"
              strokeOpacity="0.7"
              strokeDasharray="3 2"
            />
            <rect x="310" y="48" width="30" height="12" fill="#E8650A" rx="2" />
            <text
              x="325"
              y="57"
              textAnchor="middle"
              fontSize="7"
              fill="white"
              fontFamily="monospace"
            >
              1.0852
            </text>
          </svg>
        </div>

        {/* Order entry bar */}
        <div className="flex items-center gap-3 border-t border-white/10 bg-dark-800 px-4 py-3">
          <div className="flex-1">
            <div className="mb-0.5 text-[10px] text-gray-500">Volume (lots)</div>
            <div className="rounded border border-white/10 bg-dark-900 px-2 py-1 font-mono text-xs text-white">
              0.10
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-0.5 text-[10px] text-gray-500">Stop Loss</div>
            <div className="rounded border border-white/10 bg-dark-900 px-2 py-1 font-mono text-xs text-gray-400">
              —
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-0.5 text-[10px] text-gray-500">Take Profit</div>
            <div className="rounded border border-white/10 bg-dark-900 px-2 py-1 font-mono text-xs text-gray-400">
              —
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pt-3">
            <button
              className="rounded bg-buy px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              tabIndex={-1}
              aria-hidden="true"
            >
              BUY 1.0855
            </button>
            <button
              className="rounded bg-sell px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              tabIndex={-1}
              aria-hidden="true"
            >
              SELL 1.0849
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phone mockup
// ---------------------------------------------------------------------------

function PhoneMockup() {
  return (
    <div className="flex justify-center">
      <div className="relative w-48">
        {/* Phone frame */}
        <div className="overflow-hidden rounded-[2.5rem] border-4 border-dark-600 bg-dark-900 shadow-2xl">
          {/* Notch */}
          <div className="flex h-6 items-center justify-center bg-dark-900">
            <div className="h-3 w-16 rounded-full bg-dark-800" aria-hidden="true" />
          </div>
          {/* Screen content */}
          <div className="bg-dark-800 px-3 pb-6 pt-2">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Portfolio</span>
              <span className="font-mono text-[10px] text-buy">+$342.18</span>
            </div>
            {/* Balance card */}
            <div className="mb-3 rounded-xl border border-primary-500/20 bg-primary-500/10 p-2.5">
              <div className="mb-0.5 text-[9px] text-gray-400">Equity</div>
              <div className="font-mono text-sm font-bold text-white">$12,342.18</div>
              <div className="mt-0.5 text-[9px] text-buy">+2.85% today</div>
            </div>
            {/* Positions */}
            <div className="space-y-1.5">
              {[
                { sym: 'EUR/USD', dir: 'BUY', pnl: '+$124', color: 'text-buy' },
                { sym: 'GOLD', dir: 'BUY', pnl: '+$218', color: 'text-buy' },
                { sym: 'BTC/USD', dir: 'SELL', pnl: '-$0.18', color: 'text-sell' },
              ].map((pos) => (
                <div
                  key={pos.sym}
                  className="flex items-center justify-between rounded-lg bg-dark-900/60 px-2 py-1.5"
                >
                  <div>
                    <div className="text-[9px] font-semibold text-white">{pos.sym}</div>
                    <div
                      className={`text-[8px] font-medium ${pos.dir === 'BUY' ? 'text-buy' : 'text-sell'}`}
                    >
                      {pos.dir}
                    </div>
                  </div>
                  <div className={`font-mono text-[9px] font-bold ${pos.color}`}>{pos.pnl}</div>
                </div>
              ))}
            </div>
            {/* Trade button */}
            <button
              className="mt-3 w-full rounded-xl bg-primary-500 py-1.5 text-[9px] font-bold text-white"
              tabIndex={-1}
              aria-hidden="true"
            >
              New Trade
            </button>
          </div>
          {/* Home indicator */}
          <div className="flex h-5 items-center justify-center bg-dark-800">
            <div className="h-1 w-10 rounded-full bg-dark-600" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature cards data (stores component references, not JSX)
// ---------------------------------------------------------------------------

const PLATFORM_FEATURES: { icon: React.ComponentType; title: string; description: string }[] = [
  {
    icon: IconChartExport,
    title: 'Advanced Charts',
    description:
      '50+ technical indicators, multiple timeframes from M1 to MN, drawing tools and custom overlays.',
  },
  {
    icon: IconActivityExport,
    title: 'Real-Time Data',
    description: 'Live bid/ask prices streaming directly from liquidity providers with zero delay.',
  },
  {
    icon: IconLayersExport,
    title: 'Order Management',
    description:
      'Market, limit, stop, stop-limit, and trailing stop orders all supported with one-click entry.',
  },
  {
    icon: IconShieldExport,
    title: 'Risk Controls',
    description:
      'Set stop loss and take profit on every trade. Margin alerts and stop-out notifications built in.',
  },
  {
    icon: IconHistoryExport,
    title: 'Trade History',
    description:
      'Detailed logs of every trade with entry/exit price, P&L, swap charges, and duration.',
  },
  {
    icon: IconGlobeExport,
    title: 'Multi-Currency',
    description: 'View your account in USD, EUR, GBP, or any of 20 supported base currencies.',
  },
]

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function HeroSection() {
  return (
    <section
      className="relative flex items-center bg-dark-700"
      style={{ minHeight: '60vh' }}
      aria-labelledby="platforms-hero-heading"
    >
      {/* Decorative gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 40% 50%, rgba(232,101,10,0.12), transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-buy" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-300">
            Web-Based &bull; No Download Required
          </span>
        </div>

        <h1
          id="platforms-hero-heading"
          className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl"
        >
          One Platform for All Markets
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-300">
          Advanced charting, real-time prices, and one-click execution — all in your browser. No
          downloads, no installations, trade anywhere.
        </p>

        <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-primary-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors duration-150 hover:bg-primary-600"
          >
            Start Trading
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 px-8 py-3.5 text-base font-medium text-white transition-colors duration-150 hover:bg-white/10"
          >
            Create Demo Account
          </Link>
        </div>

        {/* Quick badges */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {['Real-time prices', 'Advanced charts', 'Mobile optimized'].map((label) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-primary-500">
                <IconCheckExport />
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WebPlatformSection() {
  return (
    <section className="bg-white py-20" aria-labelledby="web-platform-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-5 lg:gap-16">
          {/* Left: content (60%) */}
          <div className="lg:col-span-3">
            <h2
              id="web-platform-heading"
              className="mb-4 text-3xl font-bold leading-tight text-dark-700 md:text-4xl"
            >
              Powerful Web Trading Terminal
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-500">
              Our browser-based platform delivers the full professional trading experience without
              any software installation. Open a chart, place a trade, and manage your portfolio from
              any device.
            </p>

            <ul className="space-y-3" role="list">
              {[
                'Advanced candlestick charts with 50+ technical indicators',
                'One-click order execution with instant confirmation',
                'Real-time bid/ask prices with live P&L tracking',
                'Multi-order types: Market, Limit, Stop, Trailing Stop',
                'Risk management dashboard with margin level alerts',
                'Full trade history and detailed analytics',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-500"
                    aria-hidden="true"
                  >
                    <IconCheckExport />
                  </span>
                  <span className="text-sm leading-relaxed text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: mockup (40%) */}
          <div className="lg:col-span-2">
            <PlatformMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

function MobileTradingSection() {
  return (
    <section className="bg-[#F5F7FA] py-20" aria-labelledby="mobile-trading-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: content */}
          <div className="order-2 lg:order-1">
            <h2
              id="mobile-trading-heading"
              className="mb-4 text-3xl font-bold leading-tight text-dark-700 md:text-4xl"
            >
              Trade on Any Device
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-500">
              Our platform is fully responsive and optimized for mobile. Access your positions,
              charts and orders from anywhere — on the bus, at your desk, or on the go.
            </p>

            <ul className="mb-8 space-y-3" role="list">
              {[
                'Full portfolio management on the go',
                'Push notifications for price alerts',
                'One-touch trade execution',
                'Biometric authentication support',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-500"
                    aria-hidden="true"
                  >
                    <IconCheckExport />
                  </span>
                  <span className="text-sm leading-relaxed text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* App store badges */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Apple App Store */}
              <div className="inline-flex select-none items-center gap-3 rounded-xl border border-white/5 bg-dark-800/50 px-5 py-3 opacity-60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <div className="text-[9px] leading-none text-gray-500">Download on the</div>
                  <div className="text-sm font-semibold leading-snug text-gray-400">App Store</div>
                  <div className="mt-0.5 text-[8px] text-gray-500">Coming Soon</div>
                </div>
              </div>

              {/* Google Play */}
              <div className="inline-flex select-none items-center gap-3 rounded-xl border border-white/5 bg-dark-800/50 px-5 py-3 opacity-60">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14.4 8.5c.67.4.67 1.4 0 1.8L4.6 21.3C3.94 21.8 3 21.33 3 20.5z"
                    fill="#4CAF50"
                  />
                  <path d="M3 3.5L13.5 14 3 20.5V3.5z" fill="#81C784" />
                  <path d="M3 3.5l10.5 10.5L20.4 9.8 3 3.5z" fill="#FFB300" />
                  <path d="M3 20.5l10.5-6.5 6.9 4.2L3 20.5z" fill="#F44336" />
                </svg>
                <div>
                  <div className="text-[9px] leading-none text-gray-500">Get it on</div>
                  <div className="text-sm font-semibold leading-snug text-gray-400">
                    Google Play
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-500">Coming Soon</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="order-1 lg:order-2">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesGridSection() {
  return (
    <section className="bg-white py-20" aria-labelledby="features-grid-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2
            id="features-grid-heading"
            className="mb-4 text-3xl font-bold leading-tight text-dark-700 md:text-4xl"
          >
            Everything You Need to Trade Successfully
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-500">
            Our platform is built for both new and experienced traders, with every tool you need
            right at your fingertips.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_FEATURES.map((feature) => {
            const IconComponent = feature.icon
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-surface-border bg-white p-6 transition-all duration-300 hover:border-primary-500/30 hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 transition-colors duration-300 group-hover:bg-primary-500/20">
                  <IconComponent />
                </div>
                <h3 className="mb-2 text-base font-semibold text-dark-700">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ApiTradingSection() {
  return (
    <section className="bg-dark-700 py-20" aria-labelledby="api-trading-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: content */}
          <div>
            <h2
              id="api-trading-heading"
              className="mb-4 text-3xl font-bold leading-tight text-white md:text-4xl"
            >
              Algorithmic &amp; API Trading
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-300">
              Connect your algorithms directly to our execution engine via REST API or WebSocket
              streaming. Build, test and run automated strategies with institutional-grade tooling.
            </p>

            <ul className="mb-8 space-y-3" role="list">
              {[
                'REST API with full OpenAPI documentation',
                'WebSocket price streaming (<1ms latency)',
                'Order management endpoints',
                'Historical OHLCV data download',
                'Rate limits: 100 req/min (standard), 1000 req/min (VIP)',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-primary-500"
                    aria-hidden="true"
                  >
                    <IconCheckExport />
                  </span>
                  <span className="text-sm leading-relaxed text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-600"
              >
                Get API Access
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors duration-150 hover:text-white"
              >
                <IconCodeExport />
                <span>View API Documentation</span>
              </Link>
            </div>
          </div>

          {/* Right: code snippet */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-dark-900 shadow-2xl">
              {/* Terminal header */}
              <div className="flex items-center gap-2 border-b border-white/10 bg-dark-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" aria-hidden="true" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" aria-hidden="true" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" aria-hidden="true" />
                <span className="ml-2 font-mono text-xs text-gray-500">price-stream.js</span>
              </div>
              {/* Code */}
              <pre
                className="overflow-x-auto p-6 font-mono text-sm leading-relaxed"
                aria-label="WebSocket price streaming example code"
              >
                <code>
                  <span className="text-gray-500">{'// Connect to price stream'}</span>
                  {'\n'}
                  <span className="text-blue-400">const</span>
                  <span className="text-white"> ws </span>
                  <span className="text-blue-400">=</span>
                  <span className="text-white"> </span>
                  <span className="text-blue-400">new</span>
                  <span className="text-white"> WebSocket(</span>
                  {'\n'}
                  <span className="text-white">{'  '}</span>
                  <span className="text-green-400">{"'wss://api.protrader.sim/v1/prices'"}</span>
                  {'\n'}
                  <span className="text-white">{');\n'}</span>
                  {'\n'}
                  <span className="text-white">ws.</span>
                  <span className="text-blue-400">onmessage</span>
                  <span className="text-white"> = (event) =&gt; {'{\n'}</span>
                  <span className="text-white">{'  '}</span>
                  <span className="text-blue-400">const</span>
                  <span className="text-white"> {'{ symbol, bid, ask }'}</span>
                  <span className="text-white"> = JSON.</span>
                  <span className="text-blue-400">parse</span>
                  <span className="text-white">{'(event.data);\n'}</span>
                  <span className="text-white">{'  '}console.</span>
                  <span className="text-blue-400">log</span>
                  <span className="text-white">{'(`'}</span>
                  <span className="text-green-400">{'${symbol}'}</span>
                  <span className="text-white">{': '}</span>
                  <span className="text-green-400">{'${bid}'}</span>
                  <span className="text-white">{'/'}</span>
                  <span className="text-green-400">{'${ask}'}</span>
                  <span className="text-white">{'`);\n'}</span>
                  <span className="text-white">{'}'}</span>
                  <span className="text-white">{';\n'}</span>
                  {'\n'}
                  <span className="text-gray-500">{'// Subscribe to symbols'}</span>
                  {'\n'}
                  <span className="text-white">ws.</span>
                  <span className="text-blue-400">send</span>
                  <span className="text-white">{'('}</span>
                  {'\n'}
                  <span className="text-white">{'  '}JSON.</span>
                  <span className="text-blue-400">stringify</span>
                  <span className="text-white">{'({'}</span>
                  {'\n'}
                  <span className="text-white">{'    '}action: </span>
                  <span className="text-green-400">{"'subscribe'"}</span>
                  <span className="text-white">{','}</span>
                  {'\n'}
                  <span className="text-white">{'    '}symbols: [</span>
                  <span className="text-green-400">{"'EURUSD'"}</span>
                  <span className="text-white">{', '}</span>
                  <span className="text-green-400">{"'XAUUSD'"}</span>
                  <span className="text-white">{'],\n'}</span>
                  <span className="text-white">{'  }'}</span>
                  <span className="text-white">{')\n'}</span>
                  <span className="text-white">{')'}</span>
                  <span className="text-white">{';'}</span>
                </code>
              </pre>
              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-white/10 bg-dark-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-buy motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-gray-400">Live feed active</span>
                </div>
                <span className="text-xs text-gray-600">Latency: &lt;1ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCtaSection() {
  return (
    <section className="bg-primary-500 py-20" aria-labelledby="platforms-cta-heading">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2
          id="platforms-cta-heading"
          className="mb-4 text-3xl font-bold leading-tight text-white md:text-4xl"
        >
          Start Trading on the Most Advanced Platform
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/80">
          Join thousands of traders using ProTraderSim to access global markets with
          professional-grade tools. Open your free account in under 3 minutes.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-primary-500 shadow-md transition-colors duration-150 hover:bg-gray-50"
          >
            Open Free Account
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg border border-white/40 px-8 py-3.5 text-base font-medium text-white transition-colors duration-150 hover:bg-white/10"
          >
            Create Demo Account
          </Link>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Platforms marketing page — showcases the web trading terminal, mobile app,
 * platform features grid, and API trading capabilities.
 */
export default function PlatformsPage() {
  return (
    <>
      <HeroSection />
      <WebPlatformSection />
      <MobileTradingSection />
      <FeaturesGridSection />
      <ApiTradingSection />
      <FinalCtaSection />
    </>
  )
}
