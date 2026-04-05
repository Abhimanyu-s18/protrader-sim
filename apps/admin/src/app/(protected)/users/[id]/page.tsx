'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { formatMoney, formatDateTime } from '@protrader/utils'
import type {
  User,
  KycDocument,
  Deposit,
  Withdrawal,
  AccountStatus,
  KycDocumentStatus,
  KycStatus,
} from '@protrader/types'

// ── Types ──────────────────────────────────────────────────────────────────
interface UserDetailData {
  user: User
  kyc_documents: KycDocument[]
  recent_deposits: Deposit[]
  recent_withdrawals: Withdrawal[]
}

// ── Schemas ────────────────────────────────────────────────────────────────
const adjustmentSchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT']),
  amount_cents: z.preprocess(
    (val) => ((typeof val === 'number' && Number.isNaN(val)) || val === '' ? undefined : val),
    z
      .number()
      .int()
      .positive('Amount must be positive')
      .max(100_000_000, 'Amount exceeds maximum allowed'),
  ),
  description: z.string().min(1, 'Description is required'),
})
type AdjustmentFormValues = z.infer<typeof adjustmentSchema>

// ── Helpers ────────────────────────────────────────────────────────────────
function kycDocStatusColor(status: KycDocumentStatus) {
  switch (status) {
    case 'APPROVED':
      return 'text-green-400'
    case 'REJECTED':
      return 'text-red-400'
    case 'UNDER_REVIEW':
      return 'text-blue-400'
    case 'UPLOADED':
      return 'text-yellow-400'
    default:
      return 'text-gray-400'
  }
}

function userKycStatusColor(status: KycStatus) {
  switch (status) {
    case 'APPROVED':
      return 'text-green-400'
    case 'REJECTED':
      return 'text-red-400'
    case 'PENDING':
      return 'text-blue-400'
    case 'ADDITIONAL_REQUIRED':
      return 'text-yellow-400'
    case 'NOT_STARTED':
    default:
      return 'text-gray-400'
  }
}

function accountStatusColor(status: AccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-400'
    case 'SUSPENDED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

// ── Reject KYC Modal ───────────────────────────────────────────────────────
interface RejectKycModalProps {
  docId: string
  userId: string
  onClose: () => void
}

function RejectKycModal({ docId, userId, onClose }: RejectKycModalProps) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!first || !last) return
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>('textarea')?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      api.put(`/v1/admin/kyc/${docId}`, { status: 'REJECTED', rejection_reason: reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'user', userId] })
      onClose()
    },
    onError: () => setError('Failed to reject document.'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-dialog-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="reject-dialog-title" className="mb-4 text-lg font-semibold text-white">
          Reject Document
        </h3>
        <label htmlFor="rejection-reason" className="mb-1 block text-sm text-gray-400">
          Rejection reason
        </label>
        <textarea
          id="rejection-reason"
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
            onClick={() => mutation.mutate()}
            disabled={!reason.trim() || mutation.isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
/** User detail page: profile, status toggle, balance adjustment, KYC docs, deposits, withdrawals. */
export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const userId = params.id ?? ''
  const qc = useQueryClient()

  if (!userId) {
    return <div className="p-6 text-sm text-red-400">Invalid user ID.</div>
  }

  const [rejectDocId, setRejectDocId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState('')
  const [adjustmentSuccess, setAdjustmentSuccess] = useState('')
  const [adjustmentError, setAdjustmentError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => api.get<UserDetailData>(`/v1/admin/users/${userId}`),
    enabled: !!userId,
  })

  // Status toggle mutation
  const statusMutation = useMutation({
    mutationFn: (status: AccountStatus) => api.put(`/v1/admin/users/${userId}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'user', userId] })
      setStatusError('')
    },
    onError: () => setStatusError('Failed to update status.'),
  })

  const [approvingId, setApprovingId] = useState<string | null>(null)

  // KYC approve mutation
  const approveKycMutation = useMutation({
    mutationFn: (docId: string) => api.put(`/v1/admin/kyc/${docId}`, { status: 'APPROVED' }),
    onMutate: (docId) => setApprovingId(docId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'user', userId] })
    },
    onSettled: () => setApprovingId(null),
  })

  // Balance adjustment form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { type: 'CREDIT', amount_cents: 0, description: '' },
  })

  async function onAdjustmentSubmit(values: AdjustmentFormValues) {
    setAdjustmentError('')
    setAdjustmentSuccess('')
    try {
      await api.post(`/v1/admin/users/${userId}/adjustment`, values)
      setAdjustmentSuccess('Balance adjustment applied.')
      reset()
      void qc.invalidateQueries({ queryKey: ['admin', 'user', userId] })
    } catch (err) {
      console.error(`Failed to apply adjustment for user ${userId}:`, err)
      setAdjustmentError('Failed to apply adjustment.')
    }
  }

  // Preview KYC document
  async function previewDocument(docId: string) {
    try {
      const res = await api.get<{ url: string }>(`/v1/admin/kyc/${docId}/url`)
      window.open(res.url, '_blank')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Failed to preview document ${docId}:`, err)
      window.alert(`Failed to load document preview: ${message}`)
    }
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Loading…</div>
  if (isError || !data) return <div className="p-6 text-sm text-red-400">Failed to load user.</div>

  const { user, kyc_documents, recent_deposits, recent_withdrawals } = data

  const toggleStatus: AccountStatus = user.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'

  return (
    <div className="space-y-6 p-6">
      {rejectDocId && (
        <RejectKycModal docId={rejectDocId} userId={userId} onClose={() => setRejectDocId(null)} />
      )}

      <h1 className="text-2xl font-bold text-white">User: {user.full_name}</h1>

      {/* Profile */}
      <section className="space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-gray-400">Account #</p>
            <p className="font-mono text-white">{user.account_number}</p>
          </div>
          <div>
            <p className="text-gray-400">Email</p>
            <p className="text-white">{user.email}</p>
          </div>
          <div>
            <p className="text-gray-400">Phone</p>
            <p className="text-white">{user.phone || '—'}</p>
          </div>
          <div>
            <p className="text-gray-400">Country</p>
            <p className="text-white">{user.country || '—'}</p>
          </div>
          <div>
            <p className="text-gray-400">KYC Status</p>
            <p className={`font-medium ${userKycStatusColor(user.kyc_status)}`}>
              {user.kyc_status}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Account Status</p>
            <p className={`font-medium ${accountStatusColor(user.account_status)}`}>
              {user.account_status}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Registered</p>
            <p className="text-white">{formatDateTime(user.created_at)}</p>
          </div>
        </div>

        {/* Status toggle */}
        <div className="pt-2">
          <button
            onClick={() => statusMutation.mutate(toggleStatus)}
            disabled={statusMutation.isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              user.account_status === 'ACTIVE'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {statusMutation.isPending
              ? 'Updating…'
              : user.account_status === 'ACTIVE'
                ? 'Suspend Account'
                : 'Activate Account'}
          </button>
          {statusError && <p className="mt-1 text-sm text-red-400">{statusError}</p>}
        </div>
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Balance Adjustment</h2>
        <form onSubmit={handleSubmit(onAdjustmentSubmit)} className="space-y-4">
          <div>
            <label htmlFor="adjustment-type" className="mb-1 block text-sm text-gray-400">
              Type
            </label>
            <select
              id="adjustment-type"
              {...register('type')}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="CREDIT">CREDIT</option>
              <option value="DEBIT">DEBIT</option>
            </select>
          </div>
          <div>
            <label htmlFor="adjustment-amount" className="mb-1 block text-sm text-gray-400">
              Amount (cents)
            </label>
            <input
              id="adjustment-amount"
              type="number"
              {...register('amount_cents', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="e.g. 10000 = $100.00"
            />
            {errors.amount_cents && (
              <p className="mt-1 text-sm text-red-400">{errors.amount_cents.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="adjustment-description" className="mb-1 block text-sm text-gray-400">
              Description
            </label>
            <input
              id="adjustment-description"
              type="text"
              {...register('description')}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="Reason for adjustment"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Applying…' : 'Apply Adjustment'}
          </button>
          {adjustmentSuccess && <p className="text-sm text-green-400">{adjustmentSuccess}</p>}
          {adjustmentError && <p className="text-sm text-red-400">{adjustmentError}</p>}
        </form>
      </section>

      {/* KYC Documents */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">KYC Documents</h2>
        {kyc_documents.length === 0 && (
          <p className="text-sm text-gray-500">No documents uploaded.</p>
        )}
        {kyc_documents.length > 0 && (
          <div className="space-y-3">
            {kyc_documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-700 bg-gray-800 px-4 py-3"
              >
                <div className="text-sm">
                  <p className="font-medium text-white">
                    {doc.document_category} — {doc.document_type}
                  </p>
                  <p className="text-gray-400">{doc.file_name}</p>
                  <p className={`font-medium ${kycDocStatusColor(doc.status)}`}>{doc.status}</p>
                  {doc.rejection_reason && (
                    <p className="text-red-400">Reason: {doc.rejection_reason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => previewDocument(doc.id)}
                    className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600"
                  >
                    Preview
                  </button>
                  {doc.status !== 'APPROVED' && (
                    <button
                      onClick={() => approveKycMutation.mutate(doc.id)}
                      disabled={approveKycMutation.isPending && approvingId === doc.id}
                      className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {doc.status !== 'REJECTED' && (
                    <button
                      onClick={() => setRejectDocId(doc.id)}
                      className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Deposits */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Deposits</h2>
        {recent_deposits.length === 0 && <p className="text-sm text-gray-500">No deposits.</p>}
        {recent_deposits.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-2 text-left font-medium text-gray-400">Amount</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Currency</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Status</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent_deposits.map((dep) => (
                  <tr key={dep.id} className="border-b border-gray-700">
                    <td className="py-2 text-white">{formatMoney(dep.amount_cents)}</td>
                    <td className="py-2 text-gray-300">{dep.crypto_currency}</td>
                    <td className="py-2 text-gray-300">{dep.status}</td>
                    <td className="py-2 text-gray-400">{formatDateTime(dep.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Withdrawals */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Withdrawals</h2>
        {recent_withdrawals.length === 0 && (
          <p className="text-sm text-gray-500">No withdrawals.</p>
        )}
        {recent_withdrawals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-2 text-left font-medium text-gray-400">Amount</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Currency</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Status</th>
                  <th className="pb-2 text-left font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent_withdrawals.map((wd) => (
                  <tr key={wd.id} className="border-b border-gray-700">
                    <td className="py-2 text-white">{formatMoney(wd.amount_cents)}</td>
                    <td className="py-2 text-gray-300">{wd.crypto_currency}</td>
                    <td className="py-2 text-gray-300">{wd.status}</td>
                    <td className="py-2 text-gray-400">{formatDateTime(wd.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
