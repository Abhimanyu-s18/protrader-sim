'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { api } from '../../../lib/api'
import { useAccountStore } from '../../../stores/accountStore'
import type {
  ApiResponse,
  AccountMetrics,
  Deposit,
  Withdrawal,
  LedgerTransaction,
} from '@protrader/types'
import { formatMoney, formatDateTime } from '@protrader/utils'

// ── Schemas ───────────────────────────────────────────────────────

const CRYPTO_CURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC', 'LTC'] as const

const DepositSchema = z.object({
  amount: z.coerce.number().positive('Enter a positive amount').min(10, 'Minimum deposit is $10'),
  crypto_currency: z.enum(CRYPTO_CURRENCIES),
})

const WithdrawSchema = z
  .object({
    amount: z.coerce
      .number()
      .positive('Enter a positive amount')
      .min(10, 'Minimum withdrawal is $10'),
    crypto_currency: z.enum(CRYPTO_CURRENCIES),
    wallet_address: z.string().min(1, 'Wallet address is required'),
  })
  .refine(
    (data) => {
      const address = data.wallet_address.trim()
      switch (data.crypto_currency) {
        case 'ETH':
        case 'USDC':
          return /^0x[a-fA-F0-9]{40}$/.test(address)
        case 'BTC':
          // Legacy (1...), P2SH (3...), and native SegWit (bc1...)
          return (
            /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
            /^bc1[a-z0-9]{39,59}$/.test(address)
          )
        case 'USDT':
          return (
            /^0x[a-fA-F0-9]{40}$/.test(address) ||
            /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
            /^T[a-zA-HJ-NP-Z1-9]{33}$/.test(address) // TRC-20
          )
        case 'LTC':
          return (
            /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(address) ||
            /^ltc1[a-z0-9]{39,59}$/.test(address)
          )
        default:
          return address.length >= 10
      }
    },
    {
      message: 'Invalid wallet address format',
      path: ['wallet_address'],
    },
  )

type DepositForm = z.infer<typeof DepositSchema>
type WithdrawForm = z.infer<typeof WithdrawSchema>

/** Converts a decimal USD amount to integer cents safely. */
function toCents(amount: number): number {
  // Round to nearest cent, then use string conversion to avoid
  // floating-point precision issues in the final integer
  const rounded = Math.round(amount * 100) / 100
  const amountStr = rounded.toFixed(2)
  const parts = amountStr.split('.')
  const whole = parts[0] ?? '0'
  const fraction = parts[1] ?? '00'
  return parseInt(whole + fraction, 10)
}

// ── Sub-components ────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      {children}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'text-yellow-400 bg-yellow-900/30',
    CONFIRMING: 'text-blue-400 bg-blue-900/30',
    COMPLETED: 'text-green-400 bg-green-900/30',
    REJECTED: 'text-red-400 bg-red-900/30',
    EXPIRED: 'text-gray-400 bg-gray-800',
  }
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-800 text-gray-400'}`}
    >
      {status}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function AccountPage() {
  const qc = useQueryClient()
  const storeMetrics = useAccountStore((s) => s.metrics)
  const [depositResult, setDepositResult] = useState<{
    pay_address?: string
    pay_amount?: string
  } | null>(null)
  const [depositError, setDepositError] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  useEffect(() => {
    if (!withdrawSuccess) return
    const timer = setTimeout(() => setWithdrawSuccess(false), 5000)
    return () => clearTimeout(timer)
  }, [withdrawSuccess])

  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useQuery({
    queryKey: ['account-metrics'],
    queryFn: () => api.get<ApiResponse<AccountMetrics>>('/v1/users/me/metrics'),
    initialData: storeMetrics ? { data: storeMetrics } : undefined,
    refetchOnMount: 'always',
    staleTime: 15_000,
  })

  const {
    data: depositsData,
    isLoading: depositsLoading,
    isError: depositsError,
  } = useQuery({
    queryKey: ['deposits'],
    queryFn: () => api.get<{ data: Deposit[] }>('/v1/deposits?limit=10'),
  })

  const {
    data: withdrawalsData,
    isLoading: withdrawalsLoading,
    isError: withdrawalsError,
  } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: () => api.get<{ data: Withdrawal[] }>('/v1/withdrawals?limit=10'),
  })

  const {
    data: ledgerData,
    isLoading: ledgerLoading,
    isError: ledgerError,
  } = useQuery({
    queryKey: ['ledger'],
    queryFn: () => api.get<{ data: LedgerTransaction[] }>('/v1/users/me/ledger?limit=20'),
  })

  const deposits = depositsData?.data ?? []
  const withdrawals = withdrawalsData?.data ?? []
  const ledgerTxs = ledgerData?.data ?? []

  const depositForm = useForm<DepositForm>({
    resolver: zodResolver(DepositSchema),
    defaultValues: { crypto_currency: 'USDT' },
  })

  const createDeposit = useMutation({
    mutationFn: (data: DepositForm) =>
      api.post<{ pay_address?: string; pay_amount?: string }>('/v1/deposits', {
        amount_cents: toCents(data.amount),
        crypto_currency: data.crypto_currency,
      }),
    onMutate: () => {
      setDepositResult(null)
      setDepositError(null)
    },
    onSuccess: (result) => {
      setDepositResult(result)
      depositForm.reset()
      void qc.invalidateQueries({ queryKey: ['deposits'] })
    },
    onError: (err: Error) => {
      setDepositError(err.message)
    },
  })

  const withdrawForm = useForm<WithdrawForm>({
    resolver: zodResolver(WithdrawSchema),
    defaultValues: { crypto_currency: 'USDT' },
  })

  const createWithdrawal = useMutation({
    mutationFn: (data: WithdrawForm) =>
      api.post<unknown>('/v1/withdrawals', {
        amount_cents: toCents(data.amount),
        crypto_currency: data.crypto_currency,
        wallet_address: data.wallet_address,
      }),
    onMutate: () => {
      setWithdrawSuccess(false)
      setWithdrawError(null)
    },
    onSuccess: () => {
      setWithdrawSuccess(true)
      withdrawForm.reset()
      void qc.invalidateQueries({ queryKey: ['withdrawals'] })
    },
    onError: (err: Error) => {
      setWithdrawError(err.message)
      setWithdrawSuccess(false)
    },
  })

  const metrics = metricsData?.data

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-white">Account</h1>

      {/* Balance summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metricsLoading ? (
          <div className="col-span-full rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-sm text-gray-400">Loading account metrics…</p>
          </div>
        ) : metricsError ? (
          <div className="col-span-full rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-sm text-red-400">Failed to load account metrics.</p>
          </div>
        ) : (
          [
            { label: 'Balance', value: metrics?.balance_formatted },
            { label: 'Equity', value: metrics?.equity_formatted },
            { label: 'Unrealised P&L', value: metrics?.unrealized_pnl_formatted },
            { label: 'Used Margin', value: metrics?.used_margin_formatted },
            { label: 'Available', value: metrics?.available_formatted },
            {
              label: 'Margin Level',
              value: metrics?.margin_level_pct ? `${metrics.margin_level_pct}%` : '—',
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-base font-semibold text-white">{value ?? '—'}</p>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Deposit */}
        <SectionCard title="Deposit">
          <form
            onSubmit={depositForm.handleSubmit((d) => createDeposit.mutate(d))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="deposit-amount" className="mb-1 block text-xs text-gray-400">
                  Amount (USD)
                </label>
                <input
                  id="deposit-amount"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 100.00"
                  {...depositForm.register('amount')}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                />
                {depositForm.formState.errors.amount && (
                  <p className="mt-1 text-xs text-red-400">
                    {depositForm.formState.errors.amount.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="deposit-currency" className="mb-1 block text-xs text-gray-400">
                  Currency
                </label>
                <select
                  id="deposit-currency"
                  {...depositForm.register('crypto_currency')}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                >
                  {CRYPTO_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {depositError && <p className="text-xs text-red-400">{depositError}</p>}
            {depositResult && (
              <div className="rounded border border-green-700 bg-green-900/20 p-3">
                <p className="text-xs font-medium text-green-400">Deposit initiated</p>
                {depositResult.pay_address && (
                  <p className="mt-1 break-all font-mono text-xs text-gray-300">
                    Send to: {depositResult.pay_address}
                  </p>
                )}
                {depositResult.pay_amount && (
                  <p className="font-mono text-xs text-gray-300">
                    Amount: {depositResult.pay_amount}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={createDeposit.isPending}
              className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {createDeposit.isPending ? 'Creating…' : 'Create Deposit'}
            </button>
          </form>
        </SectionCard>

        {/* Withdrawal */}
        <SectionCard title="Withdrawal">
          <form
            onSubmit={withdrawForm.handleSubmit((d) => createWithdrawal.mutate(d))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="withdraw-amount" className="mb-1 block text-xs text-gray-400">
                  Amount (USD)
                </label>
                <input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  {...withdrawForm.register('amount')}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                />
                {withdrawForm.formState.errors.amount && (
                  <p className="mt-1 text-xs text-red-400">
                    {withdrawForm.formState.errors.amount.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="withdraw-currency" className="mb-1 block text-xs text-gray-400">
                  Currency
                </label>
                <select
                  id="withdraw-currency"
                  {...withdrawForm.register('crypto_currency')}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                >
                  {CRYPTO_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="withdraw-wallet" className="mb-1 block text-xs text-gray-400">
                Wallet Address
              </label>
              <input
                id="withdraw-wallet"
                type="text"
                {...withdrawForm.register('wallet_address')}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
              />
              {withdrawForm.formState.errors.wallet_address && (
                <p className="mt-1 text-xs text-red-400">
                  {withdrawForm.formState.errors.wallet_address.message}
                </p>
              )}
            </div>

            {withdrawError && <p className="text-xs text-red-400">{withdrawError}</p>}
            {withdrawSuccess && (
              <p className="text-xs text-green-400">
                Withdrawal submitted — pending admin approval.
              </p>
            )}

            <button
              type="submit"
              disabled={createWithdrawal.isPending}
              className="w-full rounded bg-gray-700 py-2 text-sm font-medium text-white transition hover:bg-gray-600 disabled:opacity-50"
            >
              {createWithdrawal.isPending ? 'Submitting…' : 'Request Withdrawal'}
            </button>
          </form>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent deposits */}
        <SectionCard title="Recent Deposits">
          {depositsLoading ? (
            <p className="text-sm text-gray-400">Loading deposits…</p>
          ) : depositsError ? (
            <p className="text-sm text-red-400">Failed to load deposits.</p>
          ) : deposits.length === 0 ? (
            <p className="text-sm text-gray-500">No deposits yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Date', 'Amount', 'Currency', 'Status'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="pb-2 pr-3 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id} className="border-t border-gray-800">
                    <td className="py-2 pr-3 text-xs text-gray-400">
                      {formatDateTime(d.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-sm text-white">{d.amount_formatted}</td>
                    <td className="py-2 pr-3 text-sm text-gray-400">{d.crypto_currency}</td>
                    <td className="py-2">
                      <StatusChip status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Recent withdrawals */}
        <SectionCard title="Recent Withdrawals">
          {withdrawalsLoading ? (
            <p className="text-sm text-gray-400">Loading withdrawals…</p>
          ) : withdrawalsError ? (
            <p className="text-sm text-red-400">Failed to load withdrawals.</p>
          ) : withdrawals.length === 0 ? (
            <p className="text-sm text-gray-500">No withdrawals yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Date', 'Amount', 'Currency', 'Status'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="pb-2 pr-3 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-gray-800">
                    <td className="py-2 pr-3 text-xs text-gray-400">
                      {formatDateTime(w.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-sm text-white">{w.amount_formatted}</td>
                    <td className="py-2 pr-3 text-sm text-gray-400">{w.crypto_currency}</td>
                    <td className="py-2">
                      <StatusChip status={w.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
      {/* Ledger */}
      <SectionCard title="Transaction History">
        {ledgerLoading ? (
          <p className="text-sm text-gray-400">Loading transactions…</p>
        ) : ledgerError ? (
          <p className="text-sm text-red-400">Failed to load transactions.</p>
        ) : ledgerTxs.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions</p>
        ) : (
          <div className="space-y-2">
            {ledgerTxs.map((tx) => {
              const amountCents = tx.amount_cents ? Number(tx.amount_cents) : 0
              const balanceAfterCents = tx.balance_after_cents ? Number(tx.balance_after_cents) : 0
              const isPositive = amountCents >= 0
              return (
                <div key={tx.id} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-white">{tx.transaction_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        isPositive ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatMoney(amountCents)}
                    </p>
                    <p className="text-xs text-gray-500">Bal: {formatMoney(balanceAfterCents)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
