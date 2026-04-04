'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatMoney, formatDateTime } from '@protrader/utils'
import { api } from '../../../lib/api'
import type { IbCommission, IbCommissionSummary, IbCommissionsResponse } from '../../../types/ib'

type StatusFilter = 'ALL' | 'PENDING' | 'PAID'

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'text-green-400'
    case 'PENDING':
      return 'text-yellow-400'
    default:
      return 'text-gray-400'
  }
}

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Paid', value: 'PAID' },
]

/** Commissions page with summary totals, filter tabs, and paginated table. */
export default function CommissionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [cursor, setCursor] = useState<string | null>(null)
  const [allItems, setAllItems] = useState<IbCommission[]>([])

  const summaryQuery = useQuery({
    queryKey: ['ib', 'commissions-summary'],
    queryFn: () => api.get<IbCommissionSummary>('/v1/ib/commissions/summary'),
  })

  const commissionsQuery = useQuery({
    queryKey: ['ib', 'commissions', statusFilter, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (cursor) params.set('cursor', cursor)
      const result = await api.get<IbCommissionsResponse>(`/v1/ib/commissions?${params.toString()}`)
      return result
    },
  })

  // Sync query data to accumulated items
  useEffect(() => {
    if (commissionsQuery.data) {
      if (!cursor) {
        setAllItems(commissionsQuery.data.data)
      } else {
        setAllItems((prev) => [...prev, ...commissionsQuery.data.data])
      }
    }
  }, [commissionsQuery.data, cursor])

  // Sync query data to accumulated items
  useEffect(() => {
    if (commissionsQuery.data) {
      if (!cursor) {
        setAllItems(commissionsQuery.data.data)
      } else {
        setAllItems((prev) => [...prev, ...commissionsQuery.data.data])
      }
    }
  }, [commissionsQuery.data, cursor])

  function handleTabChange(tab: StatusFilter) {
    setStatusFilter(tab)
    setCursor(null)
    setAllItems([])
  }

  function handleLoadMore() {
    if (commissionsQuery.data?.nextCursor) {
      setCursor(commissionsQuery.data.nextCursor)
    }
  }

  const summary = summaryQuery.data
  const hasMore = commissionsQuery.data?.hasMore ?? false

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-white">Commissions</h1>

      {/* Summary Bar */}
      {summaryQuery.isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : summaryQuery.isError ? (
        <p className="text-sm text-red-400">Failed to load commission summary.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">Total Earned</p>
            <p className="mt-1 text-xl font-bold text-white">{summary?.totalFormatted ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="mt-1 text-xl font-bold text-yellow-400">
              {summary?.pendingFormatted ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">Paid</p>
            <p className="mt-1 text-xl font-bold text-green-400">{summary?.paidFormatted ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div
        role="tablist"
        className="flex gap-1 border-b border-gray-800"
        aria-label="Commission status filter"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            id={`tab-${tab.value}`}
            role="tab"
            aria-selected={statusFilter === tab.value}
            aria-controls="commissions-tabpanel"
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${statusFilter === tab.value ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        role="tabpanel"
        id="commissions-tabpanel"
        aria-labelledby={`tab-${statusFilter}`}
        className="rounded-lg border border-gray-800 bg-gray-900"
      >
        {commissionsQuery.isLoading && allItems.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">Loading…</p>
        ) : commissionsQuery.isError ? (
          <p className="p-5 text-sm text-red-400">Failed to load commissions.</p>
        ) : allItems.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No commissions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Trader
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Symbol
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Direction
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Units
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Rate (bps)
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {allItems.map((commission) => (
                <tr key={commission.id} className="hover:bg-gray-800/50">
                  <td className="px-5 py-3">
                    <p className="text-white">{commission.trader.fullName}</p>
                    <p className="font-mono text-xs text-gray-500">
                      {commission.trader.accountNumber}
                    </p>
                  </td>
                  <td className="px-5 py-3 font-mono text-gray-300">
                    {commission.trade.instrument.symbol}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        commission.trade.direction === 'BUY' ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {commission.trade.direction}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{commission.trade.units}</td>
                  <td className="px-5 py-3 font-medium text-white">
                    {formatMoney(commission.amountCents)}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{commission.rateBps}</td>
                  <td className={`px-5 py-3 font-medium ${statusBadgeClass(commission.status)}`}>
                    {commission.status}
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {formatDateTime(commission.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{allItems.length} shown</p>
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={commissionsQuery.isFetching}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
          >
            {commissionsQuery.isFetching ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}
