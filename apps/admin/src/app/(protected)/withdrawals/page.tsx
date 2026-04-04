'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { formatMoney, formatDateTime } from '@protrader/utils'
import type { Withdrawal, WithdrawalStatus, PaginatedResponse } from '@protrader/types'

const STATUS_TABS: Array<{ label: string; value: WithdrawalStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Rejected', value: 'REJECTED' },
]

function statusColor(status: WithdrawalStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-400'
    case 'PENDING':
      return 'text-yellow-400'
    case 'PROCESSING':
      return 'text-blue-400'
    case 'REJECTED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

// ── Reject Modal ──────────────────────────────────────────────────────────
interface RejectModalProps {
  withdrawalId: string
  statusFilter: WithdrawalStatus | ''
  onClose: () => void
}

function RejectModal({ withdrawalId, statusFilter, onClose }: RejectModalProps) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.put(`/v1/admin/withdrawals/${withdrawalId}`, {
        action: 'REJECT',
        rejection_reason: reason,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'withdrawals', statusFilter] })
      onClose()
    },
    onError: () => setError('Failed to reject withdrawal.'),
  })

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Reject Withdrawal</h3>
        <label className="mb-1 block text-sm text-gray-400">Rejection reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          placeholder="Enter reason…"
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setError('')
              mutation.mutate()
            }}
            disabled={mutation.isPending || reason.trim().length === 0}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Withdrawals management page with status filter tabs and approve/reject actions. */
export default function WithdrawalsPage() {
  const qc = useQueryClient()
  const [activeStatus, setActiveStatus] = useState<WithdrawalStatus | ''>('')
  const [rejectId, setRejectId] = useState<string | null>(null)

  function buildUrl() {
    const params = new URLSearchParams({ limit: '50' })
    if (activeStatus) params.set('status', activeStatus)
    return `/v1/admin/withdrawals?${params.toString()}`
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'withdrawals', activeStatus],
    queryFn: () => api.get<PaginatedResponse<Withdrawal>>(buildUrl()),
  })

  const [approvingId, setApprovingId] = useState<string | null>(null)

  const approveMutation = useMutation({
    mutationFn: (id: string) => {
      return api.put(`/v1/admin/withdrawals/${id}`, { action: 'APPROVE' })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'withdrawals', activeStatus] })
      setApprovingId(null)
    },
    onError: () => {
      setApprovingId(null)
    },
    onMutate: (id: string) => {
      setApprovingId(id)
    },
  })

  const withdrawals: Withdrawal[] = data?.data ?? []

  return (
    <div className="space-y-4 p-6">
      {rejectId && (
        <RejectModal
          withdrawalId={rejectId}
          statusFilter={activeStatus}
          onClose={() => setRejectId(null)}
        />
      )}

      <h1 className="text-2xl font-bold text-white">Withdrawals</h1>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-800">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
      {isError && <p className="text-sm text-red-400">Failed to load withdrawals.</p>}
      {!isLoading && withdrawals.length === 0 && !isError && (
        <p className="text-sm text-gray-500">No withdrawals found.</p>
      )}

      {withdrawals.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="px-4 py-3 text-left font-medium text-gray-400">User ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Currency</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Wallet</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((wd) => (
                <tr key={wd.id} className="border-b border-gray-800 bg-gray-900 hover:bg-gray-800">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{wd.user_id}</td>
                  <td className="px-4 py-3 text-white">{formatMoney(wd.amount_cents)}</td>
                  <td className="px-4 py-3 text-gray-300">{wd.crypto_currency}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span
                        className="max-w-[100px] truncate font-mono text-xs text-gray-400"
                        title={wd.wallet_address}
                      >
                        {wd.wallet_address}
                      </span>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(wd.wallet_address)
                        }}
                        className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                        aria-label="Copy wallet address"
                        title="Copy address"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M8 2a1 1 0 000 2h.01a1 1 0 000-2H8z" />
                          <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${statusColor(wd.status)}`}>{wd.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDateTime(wd.created_at)}</td>
                  <td className="px-4 py-3">
                    {wd.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(wd.id)}
                          disabled={approveMutation.isPending && approvingId === wd.id}
                          className="rounded bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                        >
                          {approvingId === wd.id && approveMutation.isPending
                            ? 'Approving…'
                            : 'Approve'}
                        </button>
                        <button
                          onClick={() => setRejectId(wd.id)}
                          className="rounded bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
