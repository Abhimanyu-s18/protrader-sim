'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { formatMoney, formatDateTime } from '@protrader/utils'
import type { Deposit, DepositStatus, PaginatedResponse } from '@protrader/types'

const STATUS_TABS: Array<{ label: string; value: DepositStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirming', value: 'CONFIRMING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Expired', value: 'EXPIRED' },
]

function statusColor(status: DepositStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-400'
    case 'PENDING':
      return 'text-yellow-400'
    case 'CONFIRMING':
      return 'text-blue-400'
    case 'REJECTED':
    case 'EXPIRED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

// ── Approve Modal ─────────────────────────────────────────────────────────
interface ApproveModalProps {
  depositId: string
  statusFilter: DepositStatus | ''
  onClose: () => void
}

function ApproveModal({ depositId, statusFilter, onClose }: ApproveModalProps) {
  const qc = useQueryClient()
  const [bonusCents, setBonusCents] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: () => {
      const bonus = bonusCents ? parseInt(bonusCents, 10) : undefined
      if (bonus !== undefined && (Number.isNaN(bonus) || bonus < 0)) {
        return Promise.reject(new Error('Invalid bonus amount'))
      }
      return api.put(`/v1/admin/deposits/${depositId}`, {
        action: 'APPROVE',
        ...(bonus !== undefined ? { bonus_cents: bonus } : {}),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'deposits', statusFilter] })
      onClose()
    },
    onError: () => setError('Failed to approve deposit.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Approve Deposit</h3>
        <label className="mb-1 block text-sm text-gray-400">Bonus (cents, optional)</label>
        <input
          type="number"
          value={bonusCents}
          onChange={(e) => setBonusCents(e.target.value)}
          placeholder="e.g. 1000 = $10.00"
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
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
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────
interface RejectModalProps {
  depositId: string
  statusFilter: DepositStatus | ''
  onClose: () => void
}

function RejectModal({ depositId, statusFilter, onClose }: RejectModalProps) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: () => {
      if (!reason.trim()) {
        return Promise.reject(new Error('Rejection reason is required'))
      }
      return api.put(`/v1/admin/deposits/${depositId}`, {
        action: 'REJECT',
        rejection_reason: reason,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'deposits', statusFilter] })
      onClose()
    },
    onError: () => setError('Failed to reject deposit.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Reject Deposit</h3>
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
              if (!reason.trim()) {
                setError('Please enter a rejection reason')
                return
              }
              mutation.mutate()
            }}
            disabled={mutation.isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Deposits management page with status filter tabs and approve/reject actions. */
export default function DepositsPage() {
  const [activeStatus, setActiveStatus] = useState<DepositStatus | ''>('')
  const [approveId, setApproveId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)

  function buildUrl(pageToken?: string | null) {
    const params = new URLSearchParams({ limit: '50' })
    if (activeStatus) params.set('status', activeStatus)
    if (pageToken) params.set('cursor', pageToken)
    return `/v1/admin/deposits?${params.toString()}`
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'deposits', activeStatus, cursor],
    queryFn: () => api.get<PaginatedResponse<Deposit>>(buildUrl(cursor)),
  })

  const deposits: Deposit[] = data?.data ?? []
  const nextCursor = (data as PaginatedResponse<Deposit> | undefined)?.next_cursor ?? null
  const hasMore = (data as PaginatedResponse<Deposit> | undefined)?.has_more ?? false

  return (
    <div className="space-y-4 p-6">
      {approveId && (
        <ApproveModal
          depositId={approveId}
          statusFilter={activeStatus}
          onClose={() => setApproveId(null)}
        />
      )}
      {rejectId && (
        <RejectModal
          depositId={rejectId}
          statusFilter={activeStatus}
          onClose={() => setRejectId(null)}
        />
      )}

      <h1 className="text-2xl font-bold text-white">Deposits</h1>

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
      {isError && <p className="text-sm text-red-400">Failed to load deposits.</p>}
      {!isLoading && deposits.length === 0 && !isError && (
        <p className="text-sm text-gray-500">No deposits found.</p>
      )}

      {deposits.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="px-4 py-3 text-left font-medium text-gray-400">User ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Currency</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((dep) => (
                  <tr
                    key={dep.id}
                    className="border-b border-gray-800 bg-gray-900 hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{dep.user_id}</td>
                    <td className="px-4 py-3 text-white">{formatMoney(dep.amount_cents)}</td>
                    <td className="px-4 py-3 text-gray-300">{dep.crypto_currency}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${statusColor(dep.status)}`}>{dep.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(dep.created_at)}</td>
                    <td className="px-4 py-3">
                      {dep.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setApproveId(dep.id)}
                            className="rounded bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectId(dep.id)}
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

          {/* Pagination */}
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setCursor(null)}
              disabled={!cursor}
              className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => nextCursor && setCursor(nextCursor)}
              disabled={!hasMore}
              className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
