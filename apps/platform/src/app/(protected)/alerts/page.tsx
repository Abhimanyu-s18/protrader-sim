'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { api } from '../../../lib/api'
import type { Alert, Instrument } from '@protrader/types'
import { formatDateTime } from '@protrader/utils'

// ── Schema ────────────────────────────────────────────────────────

const AlertSchema = z.object({
  symbol: z.string().min(1, 'Select a symbol'),
  alert_type: z.enum(['PRICE_ABOVE', 'PRICE_BELOW', 'PRICE_REACHES']),
  trigger_price: z
    .string()
    .min(1, 'Enter trigger price')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Enter a valid positive number',
    }),
})

type AlertForm = z.infer<typeof AlertSchema>

// ── Status badge ──────────────────────────────────────────────────

function AlertStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'text-blue-400 bg-blue-900/30',
    TRIGGERED: 'text-green-400 bg-green-900/30',
    EXPIRED: 'text-gray-400 bg-gray-800',
    CANCELLED: 'text-red-400 bg-red-900/30',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  )
}

// ── Alert row ─────────────────────────────────────────────────────

function AlertRow({
  alert,
  onDelete,
  isDeleting,
}: {
  alert: Alert
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const handleDelete = () => {
    if (window.confirm(`Cancel alert for ${alert.symbol}?`)) {
      onDelete(alert.id)
    }
  }

  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/40">
      <td className="py-3 pr-4 text-sm font-medium text-white">{alert.symbol}</td>
      <td className="py-3 pr-4 text-xs text-gray-400">{alert.alert_type.replace(/_/g, ' ')}</td>
      <td className="py-3 pr-4 font-mono text-sm text-gray-300">{alert.trigger_display}</td>
      <td className="py-3 pr-4">
        <AlertStatusBadge status={alert.status} />
      </td>
      <td className="py-3 pr-4 text-xs text-gray-500">{formatDateTime(alert.created_at)}</td>
      <td className="py-3 pr-4 text-xs text-gray-500">
        {alert.triggered_at ? formatDateTime(alert.triggered_at) : '—'}
      </td>
      <td className="py-3">
        {alert.status === 'ACTIVE' && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded bg-red-900/40 px-2 py-1 text-xs text-red-400 transition hover:bg-red-900/70 disabled:opacity-50"
          >
            {isDeleting ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function AlertsPage() {
  const qc = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    isError: isErrorAlerts,
  } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get<{ data: Alert[] }>('/v1/alerts?limit=50'),
  })

  const { data: instrumentsData, isError: isErrorInstruments } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.get<{ data: Instrument[] }>('/v1/instruments?active=true&limit=100'),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlertForm>({
    resolver: zodResolver(AlertSchema),
    defaultValues: { alert_type: 'PRICE_ABOVE' },
  })

  const createAlert = useMutation({
    mutationFn: (data: AlertForm) =>
      api.post<unknown>('/v1/alerts', {
        symbol: data.symbol,
        alert_type: data.alert_type,
        trigger_price: data.trigger_price,
        notification_channels: ['IN_APP'],
      }),
    onSuccess: () => {
      reset()
      setFormError(null)
      void qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const deleteAlert = useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/v1/alerts/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
    onError: (err: Error) => {
      // Consider using a toast notification library instead
      alert(`Failed to cancel alert: ${err.message}`)
    },
  })

  const instruments = instrumentsData?.data ?? []
  const alerts = alertsData?.data ?? []

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-white">Price Alerts</h1>

      {/* Create alert form */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-400 uppercase">
          Create Alert
        </h2>
        <form
          onSubmit={handleSubmit((d) => createAlert.mutate(d))}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="mb-1 block text-xs text-gray-400">Symbol</label>
            <select
              {...register('symbol')}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="">Select…</option>
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.symbol}>
                  {inst.symbol}
                </option>
              ))}
            </select>
            {errors.symbol && <p className="mt-1 text-xs text-red-400">{errors.symbol.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Condition</label>
            <select
              {...register('alert_type')}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="PRICE_ABOVE">Price Above</option>
              <option value="PRICE_BELOW">Price Below</option>
              <option value="PRICE_REACHES">Price Reaches</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Trigger Price</label>
            <input
              type="text"
              placeholder="e.g. 1.08500"
              {...register('trigger_price')}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
            />
            {errors.trigger_price && (
              <p className="mt-1 text-xs text-red-400">{errors.trigger_price.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={createAlert.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {createAlert.isPending ? 'Creating…' : 'Create Alert'}
          </button>

          {formError && <p className="w-full text-xs text-red-400">{formError}</p>}
        </form>
      </div>

      {/* Alerts list */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {isErrorAlerts ? (
          <p className="py-8 text-center text-sm text-red-400">Failed to load alerts</p>
        ) : isErrorInstruments ? (
          <p className="py-8 text-center text-sm text-red-400">Failed to load instruments</p>
        ) : isLoadingAlerts ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No alerts yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {[
                    'Symbol',
                    'Condition',
                    'Trigger',
                    'Status',
                    'Created',
                    'Triggered',
                    'Actions',
                  ].map((h, index) => (
                    <th
                      key={index}
                      className="px-4 pt-4 pb-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
                    >
                      {h === 'Actions' ? <span className="sr-only">Actions</span> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onDelete={(id) => deleteAlert.mutate(id)}
                    isDeleting={deleteAlert.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
