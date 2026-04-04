'use client'

import { useEffect, useRef } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
} from 'lightweight-charts'
import { usePriceStore } from '../stores/priceStore'

interface TradingChartProps {
  symbol: string
  candles: CandlestickData[]
}

/** Scale factor used to convert BIGINT price storage to a decimal number. */
const MID_SCALE_FACTOR = 100000

/**
 * Renders a lightweight-charts candlestick chart and appends live price ticks
 * as they arrive via the priceStore.
 */
export default function TradingChart({ symbol, candles }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const price = usePriceStore((s) => s.getPrice(symbol))

  // Initialise chart
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#030712' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1f2937' },
      timeScale: { borderColor: '#1f2937', timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    if (candles.length > 0) series.setData(candles)

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, candles])

  // Push live price tick as the latest candle close
  useEffect(() => {
    if (!price || !seriesRef.current) return

    const midScaledRaw = price.mid_scaled
    if (midScaledRaw == null) return

    let midScaled: bigint
    try {
      midScaled = BigInt(midScaledRaw)
    } catch {
      console.warn('[TradingChart] Invalid mid_scaled value:', midScaledRaw)
      return
    }

    const midFloat = Number(midScaled) / MID_SCALE_FACTOR
    const tsSeconds = Math.floor(
      Date.now() / 1000,
    ) as unknown as import('lightweight-charts').UTCTimestamp
    seriesRef.current.update({
      time: tsSeconds,
      open: midFloat,
      high: midFloat,
      low: midFloat,
      close: midFloat,
    })
  }, [price])

  return <div ref={containerRef} className="h-full w-full" />
}
