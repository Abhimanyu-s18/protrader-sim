---
name: trading-ui-components
description: "Use when: building trading interface components, displaying price charts, designing order forms, creating data tables, or implementing trading-specific UI patterns. Uses lightweight-charts, CVA (Class Variance Authority), Terminal Precision design system, and responsive layouts. Primary agents: Frontend, UI/UX Designer, Coding."
---

# Trading UI Components — ProTraderSim

Master **Terminal Precision** design system for **professional, data-dense trading dashboards** using lightweight-charts, CVA, and Tailwind.

---

## 🎨 Design System: Terminal Precision

### Color Palette

```typescript
// tailwind.config.ts
export default {
  theme: {
    colors: {
      // Terminal Precision: Dark, Professional, Data-Dense
      background: '#0f1419',        // Deep black
      surface: '#1a1f29',           // Slightly lighter
      surface_alt: '#232b38',       // For contrast
      border: '#3a414f',            // Subtle borders
      text_primary: '#e5e7eb',      // Almost white
      text_secondary: '#9ca3af',    // Muted gray
      text_tertiary: '#6b7280',     // Dimmer gray
      
      // Trading Colors
      bullish: '#10b981',           // Green (BUY, profit)
      bearish: '#ef4444',           // Red (SELL, loss)
      neutral: '#8b5cf6',           // Purple (neutral moves)
      warning: '#f59e0b',           // Amber (margin call)
      info: '#3b82f6',              // Blue (info)
      
      // Semantic
      success: '#10b981',
      error: '#ef4444',
      attention: '#f59e0b'
    },
    borderRadius: {
      none: '0',
      sm: '4px',
      md: '6px',
      lg: '8px',
      full: '9999px'
    },
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['13px', { lineHeight: '18px' }],
      base: ['14px', { lineHeight: '20px' }],
      lg: ['16px', { lineHeight: '24px' }],
      xl: ['18px', { lineHeight: '28px' }],
      '2xl': ['20px', { lineHeight: '28px' }]
    }
  }
}
```

---

## 📊 TradingView Lightweight Charts

### Price Chart Component

```typescript
// components/PriceChart.tsx
import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { usePriceStore } from '@/stores'

interface PriceChartProps {
  symbol: string
  height?: number
}

export function PriceChart({ symbol, height = 400 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  // Fetch candle data on mount
  const [candles, setCandles] = useState([])
  useEffect(() => {
    async function fetchCandles() {
      try {
        const res = await fetch(`/api/instruments/${symbol}/candles?timeframe=1H&limit=100`)
        const data = await res.json()
        setCandles(data.data)
      } catch (err) {
        console.error('Failed to fetch candles:', err)
      }
    }
    fetchCandles()
  }, [symbol])

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f1419' },
        textColor: '#e5e7eb'
      },
      width: containerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false
      }
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: true,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    })

    // Add historical candles
    candlestickSeries.setData(
      candles.map(c => ({
        time: Math.floor(c.timestamp.getTime() / 1000),
        open: Number(c.open_scaled) / 100000,
        high: Number(c.high_scaled) / 100000,
        low: Number(c.low_scaled) / 100000,
        close: Number(c.close_scaled) / 100000
      }))
    )

    // Auto-scale
    chart.timeScale().fitContent()

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [height])

  // Update with real-time prices
  const prices = usePriceStore((s) => s.prices[symbol])
  useEffect(() => {
    if (!prices || !seriesRef.current) return

    const lastTimestamp = Math.floor(Date.now() / 1000)
    const mid = (Number(prices.bid) + Number(prices.ask)) / 2 / 100000

    // Add or update latest candle (1-minute candle)
    seriesRef.current.update({
      time: lastTimestamp,
      close: mid,
      open: mid,
      high: mid,
      low: mid
    })
  }, [symbol, prices])

  return <div ref={containerRef} />
}
```

### Volume + RSI Overlay

```typescript
// components/ChartWithIndicators.tsx
export function ChartWithIndicators({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0f1419' } },
      height: 500,
      width: containerRef.current.clientWidth
    })

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444'
    })

    // Volume series (histogram)
    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: { type: 'volume' }
    })

    // RSI line series (separate scale)
    const rsiSeries = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      priceScale: 'right'  // Use right-side scale
    })

    // Fetch candles + indicators
    fetch(`/api/instruments/${symbol}/candles?indicators=rsi,volume`)
      .then(res => res.json())
      .then(data => {
        candleSeries.setData(data.candles)
        volumeSeries.setData(data.volume)
        rsiSeries.setData(data.rsi)
        chart.timeScale().fitContent()
      })

    chartRef.current = chart
    return () => chart.remove()
  }, [symbol])

  return <div ref={containerRef} />
}
```

---

## 📋 Order Form Component (CVA)

### Order Form with Variants

```typescript
// components/OrderForm.tsx
import { useState } from 'react'
import { cva } from 'class-variance-authority'
import { Button } from '@protrader/ui'
import { useOpenPosition } from '@/lib/queries'

// CVA variants
const formContainerVariants = cva('p-6 rounded-lg border', {
  variants: {
    intent: {
      buy: 'border-bullish bg-bullish/5',
      sell: 'border-bearish bg-bearish/5'
    }
  },
  defaultVariants: { intent: 'buy' }
})

const inputFieldVariants = cva(
  'w-full px-3 py-2 rounded-md border text-base transition-colors',
  {
    variants: {
      state: {
        default: 'border-border text-text_primary placeholder-text_tertiary focus:border-info focus:outline-none',
        error: 'border-error bg-error/5 text-error',
        success: 'border-success bg-success/5 text-success'
      }
    },
    defaultVariants: { state: 'default' }
  }
)

interface OrderFormProps {
  symbol: string
  currentPrice: number
}

export function OrderForm({ symbol, currentPrice }: OrderFormProps) {
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [lotSize, setLotSize] = useState('1')
  const [leverage, setLeverage] = useState('1')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate: openPosition, isPending } = useOpenPosition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    
    const size = parseFloat(lotSize)
    if (isNaN(size) || size <= 0) {
      newErrors.lotSize = 'Must be > 0'
    }
    if (size > 100) {
      newErrors.lotSize = 'Max 100 lots'
    }

    const lev = parseFloat(leverage)
    if (isNaN(lev) || lev < 1 || lev > 500) {
      newErrors.leverage = 'Must be 1-500'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    // Submit
    openPosition({
      symbol,
      direction,
      units: BigInt(Math.floor(size)),
      leverage: BigInt(Math.floor(lev)),
      stop_loss_pips: stopLoss ? parseFloat(stopLoss) : null,
      take_profit_pips: takeProfit ? parseFloat(takeProfit) : null
    })
  }

  const buttonColor = direction === 'BUY' ? 'bullish' : 'bearish'

  return (
    <form onSubmit={handleSubmit} className={formContainerVariants({ intent: direction.toLowerCase() as 'buy' | 'sell' })}>
      <h2 className="text-lg font-semibold mb-4 text-text_primary">
        {direction === 'BUY' ? '📈 Open Buy' : '📉 Open Sell'}
      </h2>

      {/* Direction Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDirection('BUY')}
          className={`flex-1 py-2 rounded-md transition-colors ${
            direction === 'BUY'
              ? 'bg-bullish text-white'
              : 'bg-surface border border-border text-text_secondary hover:text-text_primary'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setDirection('SELL')}
          className={`flex-1 py-2 rounded-md transition-colors ${
            direction === 'SELL'
              ? 'bg-bearish text-white'
              : 'bg-surface border border-border text-text_secondary hover:text-text_primary'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Current Price Display */}
      <div className="mb-4 p-3 bg-surface rounded-md border border-border">
        <div className="text-sm text-text_secondary">Current Price</div>
        <div className="text-xl font-semibold text-text_primary">${currentPrice.toFixed(5)}</div>
      </div>

      {/* Lot Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text_secondary mb-2">
          Lot Size (units)
        </label>
        <input
          type="number"
          value={lotSize}
          onChange={(e) => setLotSize(e.target.value)}
          placeholder="1"
          min="0.01"
          step="0.01"
          className={inputFieldVariants({ state: errors.lotSize ? 'error' : 'default' })}
        />
        {errors.lotSize && <div className="text-error text-xs mt-1">{errors.lotSize}</div>}
      </div>

      {/* Leverage */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text_secondary mb-2">
          Leverage (1-500)
        </label>
        <input
          type="number"
          value={leverage}
          onChange={(e) => setLeverage(e.target.value)}
          placeholder="1"
          min="1"
          max="500"
          className={inputFieldVariants({ state: errors.leverage ? 'error' : 'default' })}
        />
        {errors.leverage && <div className="text-error text-xs mt-1">{errors.leverage}</div>}
      </div>

      {/* Stop Loss (optional) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text_secondary mb-2">
          Stop Loss (pips, optional)
        </label>
        <input
          type="number"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          placeholder="e.g. 50"
          step="1"
          className={inputFieldVariants({ state: 'default' })}
        />
      </div>

      {/* Take Profit (optional) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text_secondary mb-2">
          Take Profit (pips, optional)
        </label>
        <input
          type="number"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          placeholder="e.g. 100"
          step="1"
          className={inputFieldVariants({ state: 'default' })}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPending}
        intent={direction.toLowerCase() as 'bullish' | 'bearish'}
        size="lg"
        className="w-full"
      >
        {isPending ? 'Opening...' : `Open ${direction}`}
      </Button>
    </form>
  )
}
```

---

## 📊 Data Table: Open Positions

```typescript
// components/OpenPositionsTable.tsx
import { useMemo, useState } from 'react'
import { cva } from 'class-variance-authority'
import { OpenPositions, usePriceStore } from '@/stores'

const tableRowVariants = cva('border-t border-border hover:bg-surface_alt transition-colors', {
  variants: {
    pnlState: {
      profit: 'bg-bullish/5',
      loss: 'bg-bearish/5',
      neutral: ''
    }
  },
  defaultVariants: { pnlState: 'neutral' }
})

const pnlBadgeVariants = cva('px-2 py-1 rounded-md text-sm font-semibold', {
  variants: {
    state: {
      profit: 'bg-bullish/10 text-bullish',
      loss: 'bg-bearish/10 text-bearish',
      neutral: 'bg-neutral/10 text-neutral'
    }
  }
})

interface OpenPositionsTableProps {
  positions: Position[]
}

export function OpenPositionsTable({ positions }: OpenPositionsTableProps) {
  const [sortBy, setSortBy] = useState<'symbol' | 'pnl' | 'margin' | 'openTime'>('openTime')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const prices = usePriceStore((s) => s.prices)

  const sortedPositions = useMemo(() => {
    const sorted = [...positions].sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortBy === 'symbol') {
        aVal = a.symbol
        bVal = b.symbol
      } else if (sortBy === 'openTime') {
        aVal = a.created_at.getTime()
        bVal = b.created_at.getTime()
      } else if (sortBy === 'pnl') {
        const priceA = prices[a.symbol]
        const priceB = prices[b.symbol]
        aVal = calculatePnl(a, priceA)
        bVal = calculatePnl(b, priceB)
      } else if (sortBy === 'margin') {
        aVal = a.margin_used_cents
        bVal = b.margin_used_cents
      }

      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })

    return sorted
  }, [positions, prices, sortBy, sortDir])

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface_alt border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-text_secondary font-medium">
              <button
                onClick={() => {
                  if (sortBy === 'symbol') setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                  else { setSortBy('symbol'); setSortDir('asc') }
                }}
              >
                Symbol {sortBy === 'symbol' && (sortDir === 'asc' ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-3 text-center text-text_secondary font-medium">Direction</th>
            <th className="px-4 py-3 text-right text-text_secondary font-medium">Open Price</th>
            <th className="px-4 py-3 text-right text-text_secondary font-medium">Current Price</th>
            <th className="px-4 py-3 text-right text-text_secondary font-medium">
              <button
                onClick={() => {
                  if (sortBy === 'pnl') setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                  else { setSortBy('pnl'); setSortDir('desc') }
                }}
              >
                P&L {sortBy === 'pnl' && (sortDir === 'asc' ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-3 text-right text-text_secondary font-medium">
              <button
                onClick={() => {
                  if (sortBy === 'margin') setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                  else { setSortBy('margin'); setSortDir('desc') }
                }}
              >
                Margin Used {sortBy === 'margin' && (sortDir === 'asc' ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-3 text-center text-text_secondary font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedPositions.map(position => {
            const price = prices[position.symbol]
            const pnl = calculatePnl(position, price)
            const pnlState = pnl > 0n ? 'profit' : pnl < 0n ? 'loss' : 'neutral'

            return (
              <tr
                key={position.id}
                className={tableRowVariants({ pnlState })}
              >
                <td className="px-4 py-3 text-text_primary font-semibold">{position.symbol}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    position.direction === 'BUY'
                      ? 'bg-bullish/10 text-bullish'
                      : 'bg-bearish/10 text-bearish'
                  }`}>
                    {position.direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-text_primary">${formatPrice(position.open_rate_scaled)}</td>
                <td className="px-4 py-3 text-right text-text_primary">
                  {price ? `$${formatPrice(price.mid)}` : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={pnlBadgeVariants({ state: pnlState })}>
                    {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-text_primary">${formatMoney(position.margin_used_cents)}</td>
                <td className="px-4 py-3 text-center">
                  <CloseButton positionId={position.id} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CloseButton({ positionId }: { positionId: string }) {
  const { mutate, isPending } = useClosePosition()

  return (
    <button
      onClick={() => mutate({ positionId })}
      disabled={isPending}
      className="px-3 py-1 rounded text-sm font-semibold bg-bearish text-white hover:bg-bearish/90 disabled:opacity-50"
    >
      {isPending ? '...' : 'Close'}
    </button>
  )
}
```

---

## ✅ Trading UI Components Checklist

- [ ] **Terminal Precision Colors**: Dark theme, high contrast, professional
- [ ] **Responsive Layout**: Works on desktop and tablet (mobile secondary)
- [ ] **Lightweight Charts**: Renders smoothly with real-time updates
- [ ] **Order Form**: Validates inputs, shows margin preview
- [ ] **Data Tables**: Sortable, filterable, highlight P&L state
- [ ] **Loading States**: Skeleton loaders, disabled buttons during mutation
- [ ] **Error States**: Show validation errors in red
- [ ] **Accessibility**: Proper labels, focus states, semantic HTML
- [ ] **Performance**: Memoized rows, virtualized large lists

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Colors too bright | Use dark palette with muted colors |
| Re-render entire table on price update | Memoize rows, update one at a time |
| No input validation | Validate before submit, show errors |
| No loading states | Show skeleton loaders |
| Chatty API calls | Batch updates, use local state |
| Charts lag with updates | Update candles incrementally, not full re-render |

---

## 📚 Related Skills

- `state-management-trading` — Zustand/React Query integration
- `socket-io-real-time` — Real-time price updates
- `api-route-creation` — API contracts for components
