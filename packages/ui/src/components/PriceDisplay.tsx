'use client'
import * as React from 'react'
import { cn } from '../lib/utils'

interface PriceDisplayProps {
  value: string
  className?: string
  flash?: boolean
  direction?: 'up' | 'down' | 'neutral'
}

export function PriceDisplay({ value, className, direction = 'neutral' }: PriceDisplayProps) {
  return (
    <span className={cn(
      'font-mono tabular-nums font-semibold',
      direction === 'up' && 'text-buy',
      direction === 'down' && 'text-sell',
      direction === 'neutral' && 'text-dark',
      className,
    )}>
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
    <span className={cn(
      'font-mono tabular-nums font-semibold',
      val > 0n && 'text-buy',
      val < 0n && 'text-sell',
      val === 0n && 'text-dark-400',
      className,
    )}>
      {val > 0n ? '+' : ''}{formatted}
    </span>
  )
}
