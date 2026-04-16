'use client'

import Link from 'next/link'
import { useState } from 'react'
import { INSTRUMENTS_COUNT } from '../../app/trading/instruments/instruments.data'

type TabKey = 'forex' | 'stocks' | 'indices' | 'commodities' | 'crypto'

interface Instrument {
  symbol: string
  name?: string
  bid: string
  ask: string
  spread: string
  change: string
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'forex', label: 'Forex' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'indices', label: 'Indices' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'crypto', label: 'Crypto' },
]

// Count exported from instruments.data.ts to avoid bundling full array
const TOTAL_INSTRUMENTS = INSTRUMENTS_COUNT

const DATA: Record<TabKey, Instrument[]> = {
  forex: [
    { symbol: 'EUR/USD', bid: '1.08445', ask: '1.08452', spread: '0.7', change: '+0.12%' },
    { symbol: 'GBP/USD', bid: '1.26725', ask: '1.26731', spread: '0.6', change: '-0.08%' },
    { symbol: 'USD/JPY', bid: '149.810', ask: '149.821', spread: '1.1', change: '+0.31%' },
    { symbol: 'AUD/USD', bid: '0.65231', ask: '0.65238', spread: '0.7', change: '-0.15%' },
    { symbol: 'USD/CHF', bid: '0.90112', ask: '0.90120', spread: '0.8', change: '+0.04%' },
  ],
  stocks: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      bid: '189.78',
      ask: '189.84',
      spread: '0.06',
      change: '+0.67%',
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft',
      bid: '415.20',
      ask: '415.32',
      spread: '0.12',
      change: '+1.12%',
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      bid: '178.45',
      ask: '178.58',
      spread: '0.13',
      change: '-2.34%',
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet',
      bid: '175.12',
      ask: '175.28',
      spread: '0.16',
      change: '+0.45%',
    },
    {
      symbol: 'AMZN',
      name: 'Amazon',
      bid: '185.60',
      ask: '185.72',
      spread: '0.12',
      change: '+0.89%',
    },
  ],
  indices: [
    {
      symbol: 'US500',
      name: 'S&P 500',
      bid: '5185.2',
      ask: '5187.3',
      spread: '2.1',
      change: '+0.54%',
    },
    {
      symbol: 'US30',
      name: 'Dow Jones',
      bid: '38,950',
      ask: '38,958',
      spread: '8.0',
      change: '+0.41%',
    },
    {
      symbol: 'UK100',
      name: 'FTSE 100',
      bid: '7,892.3',
      ask: '7,894.5',
      spread: '2.2',
      change: '-0.23%',
    },
    { symbol: 'GER40', name: 'DAX', bid: '18,245', ask: '18,252', spread: '7.0', change: '+0.67%' },
    {
      symbol: 'JPN225',
      name: 'Nikkei',
      bid: '38,541',
      ask: '38,555',
      spread: '14.0',
      change: '+0.92%',
    },
  ],
  commodities: [
    {
      symbol: 'XAUUSD',
      name: 'Gold',
      bid: '2340.50',
      ask: '2341.50',
      spread: '1.00',
      change: '+0.22%',
    },
    {
      symbol: 'XAGUSD',
      name: 'Silver',
      bid: '27.420',
      ask: '27.445',
      spread: '0.025',
      change: '+0.38%',
    },
    {
      symbol: 'USOIL',
      name: 'Crude Oil',
      bid: '78.38',
      ask: '78.43',
      spread: '0.05',
      change: '-0.91%',
    },
    {
      symbol: 'UKOIL',
      name: 'Brent',
      bid: '82.15',
      ask: '82.21',
      spread: '0.06',
      change: '-0.78%',
    },
    {
      symbol: 'NATGAS',
      name: 'Natural Gas',
      bid: '1.845',
      ask: '1.852',
      spread: '0.007',
      change: '+1.24%',
    },
  ],
  crypto: [
    {
      symbol: 'BTC/USD',
      name: 'Bitcoin',
      bid: '67,180',
      ask: '67,240',
      spread: '60',
      change: '+1.45%',
    },
    {
      symbol: 'ETH/USD',
      name: 'Ethereum',
      bid: '3,515',
      ask: '3,521',
      spread: '6',
      change: '+2.18%',
    },
    {
      symbol: 'BNB/USD',
      name: 'BNB',
      bid: '548.20',
      ask: '549.10',
      spread: '0.90',
      change: '+0.89%',
    },
    {
      symbol: 'XRP/USD',
      name: 'Ripple',
      bid: '0.5821',
      ask: '0.5828',
      spread: '0.0007',
      change: '+0.34%',
    },
    {
      symbol: 'SOL/USD',
      name: 'Solana',
      bid: '156.40',
      ask: '156.85',
      spread: '0.45',
      change: '+3.45%',
    },
  ],
}

/**
 * InstrumentsPreview — tabbed market data table with five asset class categories.
 * Client component due to tab state.
 */
export default function InstrumentsPreview() {
  const [activeTab, setActiveTab] = useState<TabKey>('forex')
  const rows = DATA[activeTab]

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        className="mb-8 flex w-fit gap-1 rounded-xl border border-surface-border bg-surface-alt p-1"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.key}
            role="tab"
            id={`tab-${tab.key}`}
            tabIndex={activeTab === tab.key ? 0 : -1}
            aria-selected={activeTab === tab.key}
            aria-controls={`panel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                const nextIndex = (index + 1) % TABS.length
                const nextTab = TABS[nextIndex]
                if (nextTab) setActiveTab(nextTab.key)
              } else if (e.key === 'ArrowLeft') {
                const prevIndex = (index - 1 + TABS.length) % TABS.length
                const prevTab = TABS[prevIndex]
                if (prevTab) setActiveTab(prevTab.key)
              }
            }}
            className={[
              'rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'bg-dark-700 text-white shadow-sm'
                : 'text-gray-600 hover:text-dark-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="overflow-x-auto rounded-2xl border border-surface-border"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-alt">
              <th className="px-6 py-4 text-left font-medium text-gray-500">Symbol</th>
              <th className="px-6 py-4 text-right font-medium text-gray-500">Bid</th>
              <th className="px-6 py-4 text-right font-medium text-gray-500">Ask</th>
              <th className="px-6 py-4 text-right font-medium text-gray-500">Spread</th>
              <th className="px-6 py-4 text-right font-medium text-gray-500">24h Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-white">
            {rows.map((row, i) => {
              const changeValue = parseFloat(row.change.replace('%', ''))
              const isPositive = changeValue > 0
              const isNegative = changeValue < 0
              const changeClass = isPositive
                ? 'text-buy'
                : isNegative
                  ? 'text-sell'
                  : 'text-neutral'
              return (
                <tr
                  key={row.symbol ?? `${activeTab}-${i}`}
                  className="transition-colors duration-150 hover:bg-surface-alt"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-dark-700">{row.symbol}</span>
                      {row.name && <span className="mt-0.5 text-xs text-gray-400">{row.name}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-dark-700">{row.bid}</td>
                  <td className="px-6 py-4 text-right font-mono text-dark-700">{row.ask}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-500">{row.spread}</td>
                  <td className={`px-6 py-4 text-right font-mono font-semibold ${changeClass}`}>
                    {row.change}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* View all link */}
      <div className="mt-6 text-center">
        <Link
          href="/instruments"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 transition-colors duration-150 hover:text-primary-600"
        >
          View all {TOTAL_INSTRUMENTS}+ instruments
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
      </div>
    </div>
  )
}
