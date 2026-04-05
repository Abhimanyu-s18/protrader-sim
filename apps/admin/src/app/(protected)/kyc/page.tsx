'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDateTime } from '@protrader/utils'
import type { KycDocument, KycDocumentStatus, PaginatedResponse } from '@protrader/types'

const STATUS_TABS: Array<{ label: string; value: KycDocumentStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'UPLOADED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

function statusColor(status: KycDocumentStatus) {
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

// ── Reject Modal ──────────────────────────────────────────────────────────
interface RejectModalProps {
  docId: string
  onClose: () => void
}

function RejectModal({ docId, onClose }: RejectModalProps) {
  const qc = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  onCloseRef.current = onClose

  const mutation = useMutation({
    mutationFn: () =>
      api.put(`/v1/admin/kyc/${docId}`, { status: 'REJECTED', rejection_reason: reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'kyc'] })
      onClose()
    },
    onMutate: () => setError(''),
    onError: () => setError('Failed to reject document.'),
  })

  // Focus management and keyboard handling
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    textareaRef.current?.focus()

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        onCloseRef.current()
      }
      if (evt.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (evt.shiftKey) {
          if (document.activeElement === first) {
            evt.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            evt.preventDefault()
            first?.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="presentation"
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejectDialogTitle"
      >
        <h3 id="rejectDialogTitle" className="mb-4 text-lg font-semibold text-white">
          Reject Document
        </h3>
        <label htmlFor="rejectReason" className="mb-1 block text-sm text-gray-400">
          Rejection reason
        </label>
        <textarea
          ref={textareaRef}
          id="rejectReason"
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

/** KYC documents review page with filter tabs, approve/reject actions, and document preview. */
export default function KycPage() {
  const qc = useQueryClient()
  const [activeStatus, setActiveStatus] = useState<KycDocumentStatus | ''>('')
  const [rejectDocId, setRejectDocId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const limit = 50

  function buildUrl() {
    const params = new URLSearchParams({ limit: limit.toString(), page: page.toString() })
    if (activeStatus) params.set('status', activeStatus)
    return `/v1/admin/kyc?${params.toString()}`
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'kyc', activeStatus, page],
    queryFn: () => api.get<PaginatedResponse<KycDocument>>(buildUrl()),
  })

  const approveMutation = useMutation({
    mutationFn: (docId: string) => api.put(`/v1/admin/kyc/${docId}`, { status: 'APPROVED' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'kyc'] })
      setApprovingId(null)
      setToast({ message: 'Document approved successfully', type: 'success' })
    },
    onError: (error: Error) => {
      console.error('Failed to approve KYC document:', error)
      setApprovingId(null)
      setToast({ message: `Failed to approve document: ${error.message}`, type: 'error' })
    },
    onMutate: (docId: string) => {
      setApprovingId(docId)
    },
  })

  async function previewDocument(docId: string) {
    try {
      const res = await api.get<{ url: string }>(`/v1/admin/kyc/${docId}/url`)
      window.open(res.url, '_blank')
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unknown error')
      console.error('Failed to preview document:', error)
      setToast({ message: `Failed to load document preview: ${error.message}`, type: 'error' })
    }
  }

  const docs: KycDocument[] = data?.data ?? []

  return (
    <div className="space-y-4 p-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
            toast.type === 'success'
              ? 'border-green-500/20 bg-green-900/90 text-green-200'
              : 'border-red-500/20 bg-red-900/90 text-red-200'
          }`}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className={`ml-3 hover:text-white ${
              toast.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {rejectDocId && <RejectModal docId={rejectDocId} onClose={() => setRejectDocId(null)} />}

      <h1 className="text-2xl font-bold text-white">KYC Documents</h1>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-800 pb-0">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveStatus(tab.value)
              setPage(1)
            }}
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
      {isError && <p className="text-sm text-red-400">Failed to load documents.</p>}
      {!isLoading && docs.length === 0 && !isError && (
        <p className="text-sm text-gray-500">No documents found.</p>
      )}

      {docs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="px-4 py-3 text-left font-medium text-gray-400">User ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Submitted</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-800 bg-gray-900 hover:bg-gray-800">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{doc.user_id}</td>
                  <td className="px-4 py-3 text-gray-300">{doc.document_category}</td>
                  <td className="px-4 py-3 text-gray-300">{doc.document_type}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${statusColor(doc.status)}`}>{doc.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDateTime(doc.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => previewDocument(doc.id)}
                        className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-white hover:bg-gray-600"
                      >
                        Preview
                      </button>
                      {doc.status !== 'APPROVED' && (
                        <button
                          onClick={() => approveMutation.mutate(doc.id)}
                          disabled={approveMutation.isPending && approvingId === doc.id}
                          className="rounded bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                        >
                          {approvingId === doc.id && approveMutation.isPending
                            ? 'Approving…'
                            : 'Approve'}
                        </button>
                      )}
                      {doc.status !== 'REJECTED' && (
                        <button
                          onClick={() => setRejectDocId(doc.id)}
                          className="rounded bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {docs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} · {docs.length} items shown
            {data?.total_count !== undefined && ` of ${data.total_count} total`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!(data?.has_more ?? false) || isLoading}
              className="rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
