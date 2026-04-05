'use client'

import { useQuery } from '@tanstack/react-query'
import { formatMoney, formatDateTime } from '@protrader/utils'
import { api } from '../../../lib/api'
import type {
  IbNetworkStats,
  IbCommissionSummary,
  IbNetworkStatsApiResponse,
  IbCommissionSummaryApiResponse,
  IbTrader,
} from '../../../types/ib'

function kycBadgeClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'text-green-400'
    case 'PENDING':
      return 'text-yellow-400'
    case 'REJECTED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

function accountBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-400'
    case 'SUSPENDED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

function StatusBadge({ status, type }: { status: string; type: 'kyc' | 'account' }) {
  const isKyc = type === 'kyc'
  const statusClass = isKyc ? kycBadgeClass(status) : accountBadgeClass(status)

  const getStatusIcon = () => {
    if (isKyc) {
      switch (status) {
        case 'APPROVED':
          return '✓'
        case 'PENDING':
          return '⏳'
        case 'REJECTED':
          return '✗'
        default:
          return '—'
      }
    } else {
      switch (status) {
        case 'ACTIVE':
          return '▶'
        case 'SUSPENDED':
          return '⏸'
        default:
          return '—'
      }
    }
  }

  const getStatusLabel = () => {
    return `${type === 'kyc' ? 'KYC' : 'Account'} status: ${status}`
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${statusClass}`}
      title={getStatusLabel()}
    >
      <span aria-hidden="true">{getStatusIcon()}</span>
      <span>{status}</span>
    </span>
  )
}

interface KpiCardProps {
  label: string
  value: string | number
}

function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

/** Dashboard page — KPI cards, commission summary, recent traders. */
export default function DashboardPage() {
  const statsQuery = useQuery<IbNetworkStats>({
    queryKey: ['ib', 'network-stats'],
    queryFn: async () => {
      const raw = await api.get<IbNetworkStatsApiResponse>('/v1/ib/network-stats')
      return {
        totalTraders: raw.total_traders,
        activeTraders: raw.active_traders,
        totalTradeVolume: raw.total_trade_volume,
        pendingCommissionCents: raw.pending_commission_cents,
      }
    },
  })

  const summaryQuery = useQuery<IbCommissionSummary>({
    queryKey: ['ib', 'commissions-summary'],
    queryFn: async () => {
      const raw = await api.get<IbCommissionSummaryApiResponse>('/v1/ib/commissions/summary')
      return {
        totalCents: raw.total_cents,
        totalFormatted: raw.total_formatted,
        pendingCents: raw.pending_cents,
        pendingFormatted: raw.pending_formatted,
        paidCents: raw.paid_cents,
        paidFormatted: raw.paid_formatted,
      }
    },
  })

  const tradersQuery = useQuery({
    queryKey: ['ib', 'traders'],
    queryFn: () => api.get<IbTrader[]>('/v1/ib/traders?limit=5'),
  })

  const stats = statsQuery.data
  const summary = summaryQuery.data
  const recentTraders = tradersQuery.data ?? []

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>

      {/* KPI Cards */}
      {statsQuery.isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : statsQuery.isError ? (
        <p className="text-sm text-red-400">Failed to load network stats.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Traders" value={stats?.totalTraders ?? 0} />
          <KpiCard label="Active Traders" value={stats?.activeTraders ?? 0} />
          <KpiCard
            label="Pending Commission"
            value={formatMoney(stats?.pendingCommissionCents ?? 0)}
          />
          <KpiCard label="Total Trade Volume" value={formatMoney(stats?.totalTradeVolume ?? 0)} />
        </div>
      )}

      {/* Commission Summary */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-semibold tracking-wider text-gray-400 uppercase">
          Commission Summary
        </h2>
        {summaryQuery.isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : summaryQuery.isError ? (
          <p className="text-sm text-red-400">Failed to load commission summary.</p>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500">Total Earned</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {summary?.totalFormatted ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="mt-1 text-lg font-semibold text-yellow-400">
                {summary?.pendingFormatted ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid</p>
              <p className="mt-1 text-lg font-semibold text-green-400">
                {summary?.paidFormatted ?? '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Traders */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
            Recent Traders
          </h2>
        </div>
        {tradersQuery.isLoading ? (
          <p className="p-5 text-sm text-gray-400">Loading…</p>
        ) : tradersQuery.isError ? (
          <p className="p-5 text-sm text-red-400">Failed to load traders.</p>
        ) : recentTraders.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No traders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Recent traders and account statuses</caption>
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Account
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  KYC
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentTraders.map((trader) => (
                <tr key={trader.id} className="hover:bg-gray-800/50">
                  <td className="px-5 py-3 font-mono text-gray-300">{trader.accountNumber}</td>
                  <td className="px-5 py-3 text-white">{trader.fullName}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={trader.kycStatus} type="kyc" />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={trader.accountStatus} type="account" />
                  </td>
                  <td className="px-5 py-3 text-gray-400">{formatDateTime(trader.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
