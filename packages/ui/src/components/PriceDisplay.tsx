'use client'
import * as React from 'react'
import { cn } from '../lib/utils'

interface PriceDisplayProps {
  value: string
  className?: string
  flash?: boolean
  direction?: 'up' | 'down' | 'neutral'
}

export function PriceDisplay({
  value,
  className,
  flash = false,
  direction = 'neutral',
}: PriceDisplayProps) {
  const [isFlashing, setIsFlashing] = React.useState(false)
  const prevValueRef = React.useRef(value)

  React.useEffect(() => {
    if (flash && value !== prevValueRef.current) {
      setIsFlashing(true)
      const timer = setTimeout(() => {
        setIsFlashing(false)
      }, 300)
      prevValueRef.current = value
      return () => clearTimeout(timer)
    }
    prevValueRef.current = value
  }, [value, flash])

  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        direction === 'up' && 'text-buy',
        direction === 'down' && 'text-sell',
        direction === 'neutral' && 'text-dark',
        isFlashing && 'bg-yellow-100 transition-colors duration-300 dark:bg-yellow-900/30',
        className,
      )}
    >
      {value}
    </span>
  )
}

interface PnlDisplayProps {
  cents: string
  formatted: string
  className?: string
}

export function PnlDisplay({ cents, formatted, className }: PnlDisplayProps) {
  const val = BigInt(cents)
  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        val > 0n && 'text-buy',
        val < 0n && 'text-sell',
        val === 0n && 'text-dark-400',
        className,
      )}
    >
      {val > 0n ? '+' : ''}
      {formatted}
    </span>
  )
}
