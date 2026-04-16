'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '../../../lib/api'
import { useAccountStore } from '../../../stores/accountStore'
import { usePriceStore } from '../../../stores/priceStore'
import { subscribePrices, unsubscribePrices } from '../../../hooks/useSocket'
import type { ApiResponse, AccountMetrics, Trade, WatchlistItem } from '@protrader/types'
import { formatMoney, formatPercentage } from '@protrader/utils'

// ── Account metric card ───────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  highlight?: 'positive' | 'negative' | 'neutral'
}

function MetricCard({ label, value, sub, highlight }: MetricCardProps) {
  const color =
    highlight === 'positive'
      ? 'text-green-400'
      : highlight === 'negative'
        ? 'text-red-400'
        : 'text-white'
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

/** Compute margin level highlight based on the percentage string. */
function getMarginLevelHighlight(
  marginLevelPct: string | null | undefined,
): 'positive' | 'negative' | 'neutral' {
  if (!marginLevelPct) return 'neutral'
  const parsed = parseFloat(marginLevelPct)
  return Number.isFinite(parsed) ? (parsed < 100 ? 'negative' : 'positive') : 'neutral'
}

// ── Open position row ─────────────────────────────────────────────

function PositionRow({ trade }: { trade: Trade }) {
  const price = usePriceStore((s) => s.getPrice(trade.symbol))
  const pnlCents = BigInt(trade.unrealized_pnl_cents ?? 0)
  const isPos = pnlCents >= 0n

  return (
    <tr className="border-t border-gray-800">
      <td className="py-2 pr-4 text-sm font-medium text-white">
        <Link href={`/symbols/${trade.symbol}`} className="hover:text-blue-400">
          {trade.symbol}
        </Link>
      </td>
      <td className="py-2 pr-4 text-sm text-gray-400">{trade.direction}</td>
      <td className="py-2 pr-4 text-sm text-gray-400">{trade.units}</td>
      <td className="py-2 pr-4 text-sm text-gray-400">{trade.open_rate_display}</td>
      <td className="py-2 pr-4 text-sm text-gray-400">
        {price ? (trade.direction === 'BUY' ? price.bid_scaled : price.ask_scaled) : '—'}
      </td>
      <td className={`py-2 text-sm font-medium ${isPos ? 'text-green-400' : 'text-red-400'}`}>
        {isPos ? '+' : ''}
        {formatMoney(trade.unrealized_pnl_cents)}
      </td>
    </tr>
  )
}

// ── Watchlist row ─────────────────────────────────────────────────

function WatchlistRow({ item }: { item: WatchlistItem }) {
  const price = usePriceStore((s) => s.getPrice(item.symbol))
  const changeBps = price?.change_bps != null ? BigInt(price.change_bps) : 0n
  const isPos = changeBps >= 0n

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-white">{item.symbol}</p>
        <p className="text-xs text-gray-500">{item.display_name}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-white">{price?.bid_scaled ?? '—'}</p>
        <p className={`text-xs ${isPos ? 'text-green-400' : 'text-red-400'}`}>
          {isPos ? '+' : ''}
          {formatPercentage(price?.change_bps ?? null)}
        </p>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const storeMetrics = useAccountStore((s) => s.metrics)
  const setMetrics = useAccountStore((s) => s.setMetrics)

  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: ['account-metrics'],
    queryFn: () => api.get<ApiResponse<AccountMetrics>>('/v1/users/me/metrics'),
    refetchInterval: 30_000,
  })

  const {
    data: openTradesData,
    isLoading: openTradesLoading,
    error: openTradesError,
  } = useQuery({
    queryKey: ['trades', 'open'],
    queryFn: () => api.get<{ data: Trade[] }>('/v1/trades?status=OPEN&limit=20'),
    refetchInterval: 30_000,
  })

  const {
    data: watchlistData,
    isLoading: watchlistLoading,
    error: watchlistError,
  } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.get<{ data: WatchlistItem[] }>('/v1/watchlist'),
  })

  // Hydrate Zustand account store from REST response
  useEffect(() => {
    if (metricsData?.data) setMetrics(metricsData.data)
  }, [metricsData, setMetrics])

  // Consolidated live price subscriptions with deduped symbols
  const watchlistSymbols = useMemo(
    () => watchlistData?.data?.map((w) => w.symbol) ?? [],
    [watchlistData],
  )
  const openTradeSymbols = useMemo(
    () => [...new Set(openTradesData?.data?.map((t) => t.symbol) ?? [])],
    [openTradesData],
  )
  const symbols = useMemo(
    () => Array.from(new Set([...watchlistSymbols, ...openTradeSymbols])),
    [watchlistSymbols, openTradeSymbols],
  )

  useEffect(() => {
    if (symbols.length === 0) return undefined

    subscribePrices(symbols)
    return () => {
      unsubscribePrices(symbols)
    }
  }, [symbols])

  const metrics = storeMetrics ?? metricsData?.data
  const openTrades = openTradesData?.data ?? []
  const watchlist = watchlistData?.data ?? []

  const pnlCents = metrics?.unrealized_pnl_cents != null ? BigInt(metrics.unrealized_pnl_cents) : 0n
  const pnlHighlight = pnlCents > 0n ? 'positive' : pnlCents < 0n ? 'negative' : 'neutral'

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>

      {/* Account metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {metricsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-800 bg-gray-900 p-4"
            >
              <div className="mb-2 h-3 w-16 rounded bg-gray-700" />
              <div className="h-6 w-24 rounded bg-gray-700" />
            </div>
          ))
        ) : metricsError ? (
          <div className="col-span-full rounded-lg border border-red-900/50 bg-red-900/20 p-4">
            <p className="text-sm text-red-400">Failed to load account metrics</p>
          </div>
        ) : (
          <>
            <MetricCard label="Balance" value={metrics?.balance_formatted ?? '—'} />
            <MetricCard
              label="Unrealised P&L"
              value={metrics?.unrealized_pnl_formatted ?? '—'}
              highlight={pnlHighlight}
            />
            <MetricCard label="Equity" value={metrics?.equity_formatted ?? '—'} />
            <MetricCard label="Used Margin" value={metrics?.used_margin_formatted ?? '—'} />
            <MetricCard label="Available" value={metrics?.available_formatted ?? '—'} />
            <MetricCard
              label="Margin Level"
              value={metrics?.margin_level_pct ? `${metrics.margin_level_pct}%` : '—'}
              highlight={getMarginLevelHighlight(metrics?.margin_level_pct)}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Open positions */}
        <div className="col-span-2 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Open Positions</h2>
            <Link href="/trades" className="text-xs text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          {openTradesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-full rounded bg-gray-700" />
                </div>
              ))}
            </div>
          ) : openTradesError ? (
            <div className="rounded border border-red-900/50 bg-red-900/20 p-4">
              <p className="text-sm text-red-400">Failed to load open positions</p>
            </div>
          ) : openTrades.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No open positions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Symbol', 'Dir', 'Units', 'Open', 'Current', 'P&L'].map((h) => (
                      <th
                        key={h}
                        className="pr-4 pb-2 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map((t) => (
                    <PositionRow key={t.id} trade={t} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Watchlist</h2>
          </div>
          {watchlistLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-full rounded bg-gray-700" />
                </div>
              ))}
            </div>
          ) : watchlistError ? (
            <div className="rounded border border-red-900/50 bg-red-900/20 p-4">
              <p className="text-sm text-red-400">Failed to load watchlist</p>
            </div>
          ) : watchlist.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No items in watchlist</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {watchlist.map((item) => (
                <WatchlistRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
