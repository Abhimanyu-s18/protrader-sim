import { useState, useEffect } from 'react'
import { TICKER_ITEMS } from '../constants'
import { isPositiveChange } from '../utils'

/**
 * TickerBar - Scrolling ticker with market prices
 */
export function TickerBar() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div className="overflow-hidden border-y border-white/10 bg-dark-800 py-3">
      <div
        className={`flex ${prefersReducedMotion ? '' : 'animate-ticker-scroll'}`}
        style={{ width: 'max-content' }}
      >
        {items.map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center gap-3 whitespace-nowrap px-8">
            <span className="text-xs font-medium text-gray-400">{item.symbol}</span>
            <span className="font-mono text-sm font-medium text-white">{item.price}</span>
            <span
              className={`font-mono text-xs font-semibold ${isPositiveChange(item.change) ? 'text-buy' : 'text-sell'}`}
            >
              {item.change}
            </span>
            <span className="ml-2 text-white/20">|</span>
          </div>
        ))}
      </div>
    </div>
  )
}
