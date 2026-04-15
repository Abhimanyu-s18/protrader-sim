'use client'

import { useState, useMemo } from 'react'

import { INSTRUMENTS, type Instrument } from './instruments.data'

type Category = 'All' | 'Forex' | 'Stocks' | 'Indices' | 'Commodities' | 'Crypto'

const CATEGORY_BADGE: Record<Exclude<Category, 'All'>, string> = {
  Forex: 'bg-blue-100 text-blue-700',
  Stocks: 'bg-purple-100 text-purple-700',
  Indices: 'bg-green-100 text-green-700',
  Commodities: 'bg-yellow-100 text-yellow-800',
  Crypto: 'bg-orange-100 text-orange-700',
}

const CATEGORIES: Category[] = ['All', 'Forex', 'Stocks', 'Indices', 'Commodities', 'Crypto']

function getCategoryCounts(instruments: Instrument[]): Record<Category, number> {
  const counts: Record<Exclude<Category, 'All'>, number> = {
    Forex: 0,
    Stocks: 0,
    Indices: 0,
    Commodities: 0,
    Crypto: 0,
  }
  for (const inst of instruments) {
    counts[inst.category]++
  }
  return { All: instruments.length, ...counts }
}

const COUNTS = getCategoryCounts(INSTRUMENTS)

/** All instruments catalog with category filter and search */
export default function InstrumentsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return INSTRUMENTS.filter((i) => {
      const matchCat = activeCategory === 'All' || i.category === activeCategory
      const matchSearch =
        !q || i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [activeCategory, search])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden py-16 md:py-20"
        style={{
          background:
            'radial-gradient(ellipse at 60% 40%, rgba(232,101,10,0.1), transparent 60%), #1A2332',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-500/15 px-3 py-1.5 text-sm font-medium text-primary-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              Full Instrument Catalog
            </span>
            <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl">
              All Trading Instruments
            </h1>
            <p className="text-lg text-gray-300">
              Browse our full catalog of 150+ tradeable CFD instruments across Forex, Stocks,
              Indices, Commodities, and Crypto.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-[72px] z-10 border-b border-surface-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                    activeCategory === cat
                      ? 'bg-dark-700 text-white'
                      : 'bg-surface-alt text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                  <span
                    className={`text-xs ${activeCategory === cat ? 'text-gray-300' : 'text-gray-400'}`}
                  >
                    {COUNTS[cat]}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search instruments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search instruments"
                className="w-full rounded-lg border border-surface-border py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-alt">
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Symbol</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Category</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">
                      Typical Spread
                    </th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Max Leverage</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">
                      Trading Hours
                    </th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                        {search
                          ? `No instruments found matching "${search}"${activeCategory !== 'All' ? ` in ${activeCategory}` : ''}`
                          : `No instruments found in ${activeCategory}`}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inst, i) => (
                      <tr
                        key={inst.symbol}
                        className={`transition-colors duration-150 hover:bg-surface-alt ${i % 2 === 1 ? 'bg-surface-alt/40' : 'bg-white'}`}
                      >
                        <td className="px-6 py-4 font-semibold text-dark-700">{inst.symbol}</td>
                        <td className="px-6 py-4 text-gray-600">{inst.name}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGE[inst.category]}`}
                          >
                            {inst.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-700">
                          {inst.spread.value} {inst.spread.unit}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-dark-700">
                          {inst.leverage}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {inst.hours.kind === 'custom'
                            ? inst.hours.customRange || 'N/A'
                            : inst.hours.kind}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a
                            href="https://auth.protrader.sim/register"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary-500 transition-colors duration-150 hover:text-primary-600"
                          >
                            Trade →
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-400">
            Showing {filtered.length} representative instruments. The full catalog of 150+
            instruments is available on the trading platform.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark-700 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white">Ready to Start Trading?</h2>
          <p className="mx-auto mb-8 max-w-lg text-gray-300">
            Open a free account in minutes and access all 150+ instruments with competitive spreads
            and professional tools.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://auth.protrader.sim/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-8 py-3.5 font-semibold text-white transition-colors duration-200 hover:bg-primary-600"
            >
              Open Free Account
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
          </div>
        </div>
      </section>
    </div>
  )
}
