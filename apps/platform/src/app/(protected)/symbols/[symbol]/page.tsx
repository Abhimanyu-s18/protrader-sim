'use client'

import { use, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import dynamic from 'next/dynamic'
import { api } from '../../../../lib/api'
import { subscribePrices, unsubscribePrices } from '../../../../hooks/useSocket'
import type { UTCTimestamp } from 'lightweight-charts'
import { usePriceStore } from '../../../../stores/priceStore'
import type { ApiResponse, Instrument, Trade, User } from '@protrader/types'
import { formatMoney } from '@protrader/utils'

const TradingChart = dynamic(() => import('../../../../components/TradingChart'), { ssr: false })

// ── Order form schema ─────────────────────────────────────────────

const OrderSchema = z
  .object({
    order_type: z.enum(['MARKET', 'ENTRY']),
    direction: z.enum(['BUY', 'SELL']),
    units: z.coerce.number().positive('Units must be positive'),
    entry_rate: z
      .string()
      .optional()
      .refine((val) => val === undefined || val.trim() !== '', {
        message: 'Entry rate cannot be empty',
      }),
    stop_loss: z.string().optional(),
    take_profit: z.string().optional(),
    trailing_stop_pips: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) => data.order_type !== 'ENTRY' || (data.entry_rate && data.entry_rate.trim() !== ''),
    { message: 'Entry rate is required for ENTRY orders', path: ['entry_rate'] },
  )

type OrderForm = z.infer<typeof OrderSchema>

// ── Sub-components ────────────────────────────────────────────────

interface PriceBadgeProps {
  label: string
  value: string
  color: string
}

function PriceBadge({ label, value, color }: PriceBadgeProps) {
  return (
    <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function SymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params)
  const qc = useQueryClient()
  const [orderError, setOrderError] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<OrderForm>({
    resolver: zodResolver(OrderSchema),
    defaultValues: { order_type: 'MARKET', direction: 'BUY', units: 0.01 },
  })

  const price = usePriceStore((s) => s.getPrice(symbol))

  // Fetch user to get jurisdiction
  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get<ApiResponse<User>>('/v1/users/me'),
  })

  const { data: instrumentData } = useQuery({
    queryKey: ['instrument', symbol],
    queryFn: () => api.get<ApiResponse<Instrument>>(`/v1/instruments/${symbol}`),
  })

  const { data: candlesData } = useQuery({
    queryKey: ['candles', symbol],
    queryFn: () =>
      api.get<{ data: { time: number; open: number; high: number; low: number; close: number }[] }>(
        `/v1/instruments/${symbol}/ohlcv?interval=1h&limit=200`,
      ),
  })

  const { data: openPositionData } = useQuery({
    queryKey: ['trades', 'open', symbol],
    queryFn: () => api.get<{ data: Trade[] }>(`/v1/trades?status=OPEN&symbol=${symbol}`),
  })

  const user = userData?.data
  const instrument = instrumentData?.data
  const candles = candlesData?.data ?? []
  const openPosition = openPositionData?.data?.[0]

  // Calculate max leverage for user
  const maxLeverage: number | null = user && instrument ? instrument.leverage : null

  useEffect(() => {
    subscribePrices([symbol])
    return () => {
      unsubscribePrices([symbol])
    }
  }, [symbol])

  const orderType = watch('order_type')

  const openTrade = useMutation({
    mutationFn: (data: OrderForm) =>
      api.post<ApiResponse<Trade>>('/v1/trades', {
        symbol,
        order_type: data.order_type,
        direction: data.direction,
        units: data.units,
        ...(data.order_type === 'ENTRY' && data.entry_rate ? { entry_rate: data.entry_rate } : {}),
        ...(data.stop_loss ? { stop_loss: data.stop_loss } : {}),
        ...(data.take_profit ? { take_profit: data.take_profit } : {}),
        ...(data.trailing_stop_pips ? { trailing_stop_pips: data.trailing_stop_pips } : {}),
      }),
    onSuccess: () => {
      setOrderSuccess('Trade opened successfully')
      setOrderError(null)
      reset()
      void qc.invalidateQueries({ queryKey: ['trades'] })
      void qc.invalidateQueries({ queryKey: ['account-metrics'] })
    },
    onError: (err: Error) => {
      setOrderError(err.message)
      setOrderSuccess(null)
    },
  })

  const closeTrade = useMutation({
    mutationFn: (tradeId: string) => api.del<ApiResponse<Trade>>(`/v1/trades/${tradeId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trades'] })
      void qc.invalidateQueries({ queryKey: ['account-metrics'] })
    },
    onError: (err: Error) => {
      setOrderError(err.message)
      setOrderSuccess(null)
    },
  })

  const onSubmit = (data: OrderForm) => {
    setOrderError(null)
    setOrderSuccess(null)
    openTrade.mutate(data)
  }

  const bidDisplay = price
    ? (Number(BigInt(price.bid_scaled)) / 100000).toFixed(instrument?.pip_decimal_places ?? 5)
    : '—'
  const askDisplay = price
    ? (Number(BigInt(price.ask_scaled)) / 100000).toFixed(instrument?.pip_decimal_places ?? 5)
    : '—'
  const midDisplay = price
    ? (Number(BigInt(price.mid_scaled)) / 100000).toFixed(instrument?.pip_decimal_places ?? 5)
    : '—'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-6 border-b border-gray-800 px-6 py-3">
        <h1 className="text-lg font-semibold text-white">{symbol}</h1>
        {instrument && user && (
          <span className="text-xs text-gray-500">
            {instrument.display_name} · Leverage up to {maxLeverage}:1{' '}
            {user.jurisdiction && <span className="text-gray-600">({user.jurisdiction})</span>}
          </span>
        )}
        {instrument && !user && (
          <span className="text-xs text-gray-500">
            {instrument.display_name} · Leverage {instrument.leverage}:1
          </span>
        )}
        <div className="flex gap-3">
          <PriceBadge label="BID" value={bidDisplay} color="text-red-400" />
          <PriceBadge label="MID" value={midDisplay} color="text-white" />
          <PriceBadge label="ASK" value={askDisplay} color="text-green-400" />
        </div>
      </div>

      {/* Chart + Order panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart */}
        <div className="flex-1 overflow-hidden">
          <TradingChart
            symbol={symbol}
            candles={candles.map((c) => ({
              time: c.time as UTCTimestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            }))}
          />
        </div>

        {/* Order panel */}
        <div className="w-72 space-y-4 overflow-y-auto border-l border-gray-800 bg-gray-900 p-4">
          {/* Open position */}
          {openPosition && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
              <p className="mb-1 text-xs font-medium text-gray-400 uppercase">Open Position</p>
              <p className="text-sm text-white">
                {openPosition.direction} {openPosition.units} @ {openPosition.open_rate_display}
              </p>
              <p
                className={`text-sm font-medium ${BigInt(openPosition.unrealized_pnl_cents) >= 0n ? 'text-green-400' : 'text-red-400'}`}
              >
                P&L: {formatMoney(openPosition.unrealized_pnl_cents)}
              </p>
              <button
                onClick={() => closeTrade.mutate(openPosition.id)}
                disabled={closeTrade.isPending}
                className="mt-2 w-full rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {closeTrade.isPending ? 'Closing…' : 'Close Position'}
              </button>
            </div>
          )}

          {/* New order form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">New Order</p>

            {/* Order type */}
            <div>
              <label className="mb-1 block text-xs text-gray-400">Type</label>
              <select
                {...register('order_type')}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              >
                <option value="MARKET">Market</option>
                <option value="ENTRY">Entry (Limit)</option>
              </select>
            </div>

            {/* Direction */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-center rounded border border-gray-700 px-3 py-2 text-sm font-medium has-[:checked]:border-green-500 has-[:checked]:bg-green-900/30 has-[:checked]:text-green-400">
                <input type="radio" value="BUY" {...register('direction')} className="sr-only" />
                BUY
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded border border-gray-700 px-3 py-2 text-sm font-medium has-[:checked]:border-red-500 has-[:checked]:bg-red-900/30 has-[:checked]:text-red-400">
                <input type="radio" value="SELL" {...register('direction')} className="sr-only" />
                SELL
              </label>
            </div>

            {/* Units */}
            <div>
              <label className="mb-1 block text-xs text-gray-400">Units (lots)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('units')}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              />
              {errors.units && <p className="mt-1 text-xs text-red-400">{errors.units.message}</p>}
            </div>

            {/* Entry rate (only for ENTRY orders) */}
            {orderType === 'ENTRY' && (
              <div>
                <label className="mb-1 block text-xs text-gray-400">Entry Rate</label>
                <input
                  type="text"
                  placeholder={midDisplay}
                  {...register('entry_rate')}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
                />
                {errors.entry_rate && (
                  <p className="mt-1 text-xs text-red-400">{errors.entry_rate.message}</p>
                )}
              </div>
            )}

            {/* Stop Loss */}
            <div>
              <label className="mb-1 block text-xs text-gray-400">Stop Loss (optional)</label>
              <input
                type="text"
                {...register('stop_loss')}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
              />
            </div>

            {/* Take Profit */}
            <div>
              <label className="mb-1 block text-xs text-gray-400">Take Profit (optional)</label>
              <input
                type="text"
                {...register('take_profit')}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
              />
            </div>

            {orderError && (
              <div className="rounded border border-red-600 bg-red-900/30 p-2 text-xs text-red-200">
                {orderError}
                {orderError.includes('Leverage Compliance') && (
                  <p className="mt-1 text-xs text-red-300">
                    Your jurisdiction ({user?.jurisdiction ?? 'N/A'}) limits leverage on{' '}
                    {instrument?.asset_class ?? 'this asset'}. Contact support if you need an
                    override.
                  </p>
                )}
              </div>
            )}
            {orderSuccess && <p className="text-xs text-green-400">{orderSuccess}</p>}

            <button
              type="submit"
              disabled={openTrade.isPending}
              className="w-full rounded bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {openTrade.isPending ? 'Placing…' : 'Place Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
