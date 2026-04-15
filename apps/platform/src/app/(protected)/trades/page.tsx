'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '../../../lib/api'
import type { Trade } from '@protrader/types'
import { formatMoney, formatDateTime } from '@protrader/utils'

type Tab = 'open' | 'pending' | 'closed'

const HEADERS: Record<Tab, string[]> = {
  open: ['Symbol', 'Dir', 'Units', 'Open Rate', 'Opened At', 'Unrealised P&L', 'Actions'],
  pending: ['Symbol', 'Dir', 'Units', 'Entry Rate', 'Expires At', 'Actions'],
  closed: [
    'Symbol',
    'Dir',
    'Units',
    'Open Rate',
    'Close Rate',
    'Closed At',
    'Reason',
    'Realised P&L',
  ],
}

// ── DirectionBadge component ──────────────────────────────────────

function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        direction === 'BUY' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
      }`}
    >
      {direction}
    </span>
  )
}

// ── Row components ────────────────────────────────────────────────

function OpenTradeRow({
  trade,
  onClose,
  isClosing,
}: {
  trade: Trade
  onClose: (id: string) => void
  isClosing: boolean
}) {
  const pnlCents = BigInt(trade.unrealized_pnl_cents ?? '0')
  const isPos = pnlCents >= 0n
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/50">
      <td className="py-3 pr-4 text-sm font-medium text-white">
        <Link href={`/symbols/${trade.symbol}`} className="hover:text-blue-400">
          {trade.symbol}
        </Link>
      </td>
      <td className="py-3 pr-4">
        <DirectionBadge direction={trade.direction} />
      </td>
      <td className="py-3 pr-4 text-sm text-gray-300">{trade.units}</td>
      <td className="py-3 pr-4 font-mono text-sm text-gray-300">{trade.open_rate_display}</td>
      <td className="py-3 pr-4 text-sm text-gray-300">{formatDateTime(trade.open_at)}</td>
      <td className={`py-3 pr-4 text-sm font-medium ${isPos ? 'text-green-400' : 'text-red-400'}`}>
        {isPos ? '+' : ''}
        {formatMoney(trade.unrealized_pnl_cents)}
      </td>
      <td className="py-3">
        <button
          onClick={() => onClose(trade.id)}
          disabled={isClosing}
          className="rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
        >
          {isClosing ? 'Closing…' : 'Close'}
        </button>
      </td>
    </tr>
  )
}

function PendingTradeRow({
  trade,
  onCancel,
  isCancelling,
}: {
  trade: Trade
  onCancel: (id: string) => void
  isCancelling: boolean
}) {
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/50">
      <td className="py-3 pr-4 text-sm font-medium text-white">{trade.symbol}</td>
      <td className="py-3 pr-4">
        <DirectionBadge direction={trade.direction} />
      </td>
      <td className="py-3 pr-4 text-sm text-gray-300">{trade.units}</td>
      <td className="py-3 pr-4 font-mono text-sm text-gray-300">{trade.open_rate_display}</td>
      <td className="py-3 pr-4 text-sm text-gray-300">
        {trade.expiry_at ? formatDateTime(trade.expiry_at) : '—'}
      </td>
      <td className="py-3">
        <button
          onClick={() => onCancel(trade.id)}
          disabled={isCancelling}
          className="rounded bg-gray-700 px-3 py-1 text-xs font-medium text-white transition hover:bg-gray-600 disabled:opacity-50"
        >
          {isCancelling ? 'Cancelling…' : 'Cancel'}
        </button>
      </td>
    </tr>
  )
}

function ClosedTradeRow({ trade }: { trade: Trade }) {
  const pnlCents = BigInt(trade.realized_pnl_cents ?? '0')
  const isPos = pnlCents >= 0n
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/50">
      <td className="py-3 pr-4 text-sm font-medium text-white">{trade.symbol}</td>
      <td className="py-3 pr-4">
        <DirectionBadge direction={trade.direction} />
      </td>
      <td className="py-3 pr-4 text-sm text-gray-300">{trade.units}</td>
      <td className="py-3 pr-4 font-mono text-sm text-gray-300">{trade.open_rate_display}</td>
      <td className="py-3 pr-4 font-mono text-sm text-gray-300">
        {trade.close_rate_display ?? '—'}
      </td>
      <td className="py-3 pr-4 text-sm text-gray-300">
        {trade.close_at ? formatDateTime(trade.close_at) : '—'}
      </td>
      <td className="py-3 pr-4 text-xs text-gray-500">{trade.closed_by ?? '—'}</td>
      <td className={`py-3 text-sm font-medium ${isPos ? 'text-green-400' : 'text-red-400'}`}>
        {isPos ? '+' : ''}
        {formatMoney(trade.realized_pnl_cents ?? '0')}
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function TradesPage() {
  const [tab, setTab] = useState<Tab>('open')
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set())
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: openData, isLoading: openLoading } = useQuery({
    queryKey: ['trades', 'open'],
    queryFn: () => api.get<{ data: Trade[] }>('/v1/trades?status=OPEN&limit=100'),
    enabled: tab === 'open',
    staleTime: 30_000,
    refetchOnMount: 'always',
  })

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['trades', 'pending'],
    queryFn: () => api.get<{ data: Trade[] }>('/v1/trades?status=PENDING&limit=100'),
    enabled: tab === 'pending',
    staleTime: 30_000,
    refetchOnMount: 'always',
  })

  const { data: closedData, isLoading: closedLoading } = useQuery({
    queryKey: ['trades', 'closed'],
    queryFn: () => api.get<{ data: Trade[] }>('/v1/trades?status=CLOSED&limit=100'),
    enabled: tab === 'closed',
    staleTime: 30_000,
    refetchOnMount: 'always',
  })

  const closeTrade = useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/v1/trades/${id}`),
    onMutate: (id) =>
      setClosingIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      }),
    onSettled: (_data, _error, id) => {
      void qc.invalidateQueries({ queryKey: ['trades'] })
      void qc.invalidateQueries({ queryKey: ['account-metrics'] })
      setClosingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    onError: (err: Error) => {
      console.error('Failed to close trade', err)
    },
  })

  const cancelTrade = useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/v1/trades/${id}/cancel`),
    onMutate: (id) => setCancellingId(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['trades', 'pending'] }),
    onSettled: () => setCancellingId(null),
    onError: (err: Error) => {
      console.error('Failed to cancel trade', err)
    },
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'pending', label: 'Pending' },
    { key: 'closed', label: 'Closed' },
  ]

  const isLoading =
    (tab === 'open' && openLoading) ||
    (tab === 'pending' && pendingLoading) ||
    (tab === 'closed' && closedLoading)

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const tabKeys = tabs.map((t) => t.key)
    const currentIndex = tabKeys.indexOf(tab)
    let nextIndex = currentIndex
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabKeys.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabKeys.length) % tabKeys.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabKeys.length - 1
    } else {
      return
    }
    e.preventDefault()
    const nextTab = tabKeys[nextIndex]
    if (nextTab) {
      setTab(nextTab)
      document.getElementById(`tab-${nextTab}`)?.focus()
    }
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold text-white">Trades</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800" role="tablist">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={handleTabKeyDown}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-lg border border-gray-800 bg-gray-900"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {HEADERS[tab].map((h, idx) => (
                    <th
                      key={h || `col-${idx}`}
                      scope="col"
                      className="px-4 pt-4 pb-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tab === 'open' &&
                  (openData?.data ?? []).map((t) => (
                    <OpenTradeRow
                      key={t.id}
                      trade={t}
                      onClose={(id) => closeTrade.mutate(id)}
                      isClosing={closingIds.has(t.id)}
                    />
                  ))}
                {tab === 'pending' &&
                  (pendingData?.data ?? []).map((t) => (
                    <PendingTradeRow
                      key={t.id}
                      trade={t}
                      onCancel={(id) => cancelTrade.mutate(id)}
                      isCancelling={cancellingId === t.id}
                    />
                  ))}
                {tab === 'closed' &&
                  (closedData?.data ?? []).map((t) => <ClosedTradeRow key={t.id} trade={t} />)}
              </tbody>
            </table>

            {/* Empty state */}
            {((tab === 'open' && (openData?.data ?? []).length === 0) ||
              (tab === 'pending' && (pendingData?.data ?? []).length === 0) ||
              (tab === 'closed' && (closedData?.data ?? []).length === 0)) && (
              <p className="py-8 text-center text-sm text-gray-500">No trades found</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
