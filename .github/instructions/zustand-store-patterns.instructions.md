---
name: zustand-store-patterns
description: Rules for client-side state management with Zustand
applyTo: 'apps/*/src/stores/**/*.ts, apps/*/src/hooks/**/*.ts'
---

# Zustand Store Patterns

## Philosophy

Zustand manages **client-side state only** — not server state. Server data comes from React Query or Socket.io.

```
┌─────────────────────────────────────────────────┐
│ Server State (API data)                         │
│ - User profile, account metrics, prices        │
│ → React Query (useQuery) or Socket.io listeners │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ Zustand Store (client state)                    │
│ - UI state (modals, filters, selected items)    │
│ - Live metrics from Socket.io subscriptions     │
└─────────────────────────────────────────────────┘
```

## Store Structure

Keep stores focused on a single concern:

```typescript
// stores/priceStore.ts
import { create } from 'zustand'

export interface PriceData {
  symbol: string
  bid_scaled: string // String representation
  ask_scaled: string
  mid_scaled: string
  change_bps: string
  ts: number
}

export interface PriceStoreState {
  // State
  prices: Record<string, PriceData>
  selectedSymbols: string[]

  // Actions
  setPrices: (updates: Record<string, PriceData>) => void
  removePrice: (symbol: string) => void
  setSelectedSymbols: (symbols: string[]) => void
  selectSymbol: (symbol: string) => void
  deselectSymbol: (symbol: string) => void
}

export const usePriceStore = create<PriceStoreState>((set) => ({
  // Initial state
  prices: {},
  selectedSymbols: [],

  // Actions
  setPrices: (updates) =>
    set((state) => ({
      prices: { ...state.prices, ...updates },
    })),

  removePrice: (symbol) =>
    set((state) => {
      const { [symbol]: _, ...rest } = state.prices
      return { prices: rest }
    }),

  setSelectedSymbols: (symbols) => set({ selectedSymbols: symbols }),

  selectSymbol: (symbol) =>
    set((state) => ({
      selectedSymbols: [...state.selectedSymbols, symbol],
    })),

  deselectSymbol: (symbol) =>
    set((state) => ({
      selectedSymbols: state.selectedSymbols.filter((s) => s !== symbol),
    })),
}))
```

## Account Metrics Store

The `accountStore` receives live updates from Socket.io `account_metrics` event:

```typescript
// stores/accountStore.ts
import { create } from 'zustand'
import type { MoneyString } from '@protrader/types'

export interface AccountMetrics {
  balance_cents: MoneyString
  unrealized_pnl_cents: MoneyString
  equity_cents: MoneyString
  used_margin_cents: MoneyString
  available_cents: MoneyString
  margin_level_bps: string // Basis points
}

export interface AccountStoreState {
  metrics: AccountMetrics | null
  isLoading: boolean
  error: string | null

  // Actions
  setMetrics: (metrics: AccountMetrics) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useAccountStore = create<AccountStoreState>((set) => ({
  metrics: null,
  isLoading: false,
  error: null,

  setMetrics: (metrics) => set({ metrics, error: null }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set({ metrics: null, isLoading: false, error: null }),
}))
```

## Socket.io Integration

Stores should be updated by Socket.io listeners, not direct API calls:

```typescript
// hooks/useAccountMetrics.ts
import { useEffect } from 'react'
import { useSocket } from './useSocket'
import { useAccountStore } from '../stores/accountStore'

/**
 * Socket.io event payload types.
 */
interface MetricsPayload {
  balance_cents: string
  unrealized_pnl_cents: string
  equity_cents: string
  used_margin_cents: string
  available_cents: string
  margin_level_bps: string | null
}

interface ErrorPayload {
  message: string
}

/**
 * Subscribe to live account metrics updates via Socket.io.
 * This hook handles WebSocket subscription and keeps Zustand store in sync.
 */
export function useAccountMetrics() {
  const socket = useSocket()
  const setMetrics = useAccountStore((state) => state.setMetrics)
  const setError = useAccountStore((state) => state.setError)

  useEffect(() => {
    if (!socket) return

    // Listen for account metrics events
    const handleMetrics = (payload: MetricsPayload) => {
      setMetrics(payload)
      setError(null)
    }

    const handleError = (err: ErrorPayload | Error) => {
      const message = err instanceof Error ? err.message : err.message
      setError(message)
    }

    socket.on('account_metrics', handleMetrics)
    socket.on('error', handleError)

    // Cleanup
    return () => {
      socket.off('account_metrics', handleMetrics)
      socket.off('error', handleError)
    }
  }, [socket, setMetrics, setError])

  return useAccountStore()
}
```

## UI State Store

For modal/drawer state, filter selections, etc.:

```typescript
// stores/uiStore.ts
import { create } from 'zustand'

export interface UIStoreState {
  // Modals
  isOpenTradeFormModal: boolean
  isOpenSettingsModal: boolean
  isOpenNotificationsPanel: boolean

  // Form state
  activeTab: 'positions' | 'history' | 'alerts'
  selectedInstrument: string | null

  // Filters
  selectedDirection: 'BUY' | 'SELL' | 'ALL'
  selectedStatus: 'OPEN' | 'CLOSED' | 'ALL'

  // Actions
  openTradeFormModal: () => void
  closeTradeFormModal: () => void
  toggleSettingsModal: () => void
  setActiveTab: (tab: 'positions' | 'history' | 'alerts') => void
  setSelectedInstrument: (symbol: string | null) => void
  setSelectedDirection: (direction: 'BUY' | 'SELL' | 'ALL') => void
  setSelectedStatus: (status: 'OPEN' | 'CLOSED' | 'ALL') => void
}

export const useUIStore = create<UIStoreState>((set) => ({
  isOpenTradeFormModal: false,
  isOpenSettingsModal: false,
  isOpenNotificationsPanel: false,
  activeTab: 'positions',
  selectedInstrument: null,
  selectedDirection: 'ALL',
  selectedStatus: 'OPEN',

  openTradeFormModal: () => set({ isOpenTradeFormModal: true }),
  closeTradeFormModal: () => set({ isOpenTradeFormModal: false }),
  toggleSettingsModal: () => set((state) => ({ isOpenSettingsModal: !state.isOpenSettingsModal })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedInstrument: (selectedInstrument) => set({ selectedInstrument }),
  setSelectedDirection: (selectedDirection) => set({ selectedDirection }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
}))
```

## Using Stores in Components

Always use selectors to prevent unnecessary re-renders:

```typescript
// components/AccountMetricsDisplay.tsx
'use client'

import { useAccountStore } from '../stores/accountStore'
import { formatMoney } from '@protrader/utils'

export function AccountMetricsDisplay() {
  // Use selector to prevent re-render when other store state changes
  const balance = useAccountStore((state) => state.metrics?.balance_cents)
  const equity = useAccountStore((state) => state.metrics?.equity_cents)
  const marginLevel = useAccountStore((state) => state.metrics?.margin_level_bps)
  const isLoading = useAccountStore((state) => state.isLoading)

  if (isLoading) return <div>Loading metrics...</div>
  if (!balance) return <div>No metrics available</div>

  // Format display
  const marginPercent = parseInt(marginLevel ?? '0') / 100
  const marginColor =
    marginPercent > 100 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="space-y-2">
      <div>Balance: {formatMoney(balance)}</div>
      <div>Equity: {formatMoney(equity)}</div>
      <div className={marginColor}>Margin Level: {marginPercent.toFixed(2)}%</div>
    </div>
  )
}
```

## Combining Stores with React Query

Use both for different concerns:

```typescript
// hooks/useTradesWithFilters.ts
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '../stores/uiStore'
import { apiClient } from '../lib/api-client'
import type { ApiResponse, Trade } from '@protrader/types'

/**
 * Fetch trades from server with React Query.
 * Apply client-side filters using Zustand store.
 */
export function useTradesWithFilters() {
  const selectedDirection = useUIStore((state) => state.selectedDirection)
  const selectedStatus = useUIStore((state) => state.selectedStatus)

  // Fetch all trades with explicit type generic
  const {
    data: response,
    isLoading,
    error,
  } = useQuery<ApiResponse<Trade[]>>({
    queryKey: ['trades'],
    queryFn: async (): Promise<ApiResponse<Trade[]>> => apiClient.get('/trades'),
  })

  const trades: Trade[] = response?.data ?? []

  // Filter client-side based on store state
  const filtered: Trade[] = trades.filter((trade) => {
    if (selectedDirection !== 'ALL' && trade.direction !== selectedDirection) {
      return false
    }
    if (selectedStatus !== 'ALL' && trade.status !== selectedStatus) {
      return false
    }
    return true
  })

  return { trades: filtered, isLoading, error }
}
```

## Testing Stores

Test actions without components:

```typescript
// stores/priceStore.test.ts
import { describe, it, expect } from '@jest/globals'
import { usePriceStore } from './priceStore'

describe('PriceStore', () => {
  it('should add prices to store', () => {
    const store = usePriceStore.getState()

    store.setPrices({
      EURUSD: {
        symbol: 'EURUSD',
        bid_scaled: '108450',
        ask_scaled: '108475',
        mid_scaled: '108462',
        change_bps: '125',
        ts: Date.now(),
      },
    })

    const { prices } = usePriceStore.getState()
    expect(prices.EURUSD).toBeDefined()
    expect(prices.EURUSD.symbol).toBe('EURUSD')
  })

  it('should remove prices from store', () => {
    const store = usePriceStore.getState()

    store.setPrices({
      EURUSD: {
        symbol: 'EURUSD',
        bid_scaled: '108450',
        ask_scaled: '108475',
        mid_scaled: '108462',
        change_bps: '-125',
        ts: Date.now(),
      },
    })
    store.removePrice('EURUSD')

    expect(usePriceStore.getState().prices.EURUSD).toBeUndefined()
  })
})
```

## Common Patterns

### Computed Selectors

Create derived state without adding to store:

```typescript
// Don't store this — compute on access
export const useMarginStatus = () => {
  const marginLevel = useAccountStore((state) => state.metrics?.margin_level_bps)

  const level = parseInt(marginLevel ?? '0')
  const status = level > 10000 ? 'healthy' : level > 5000 ? 'warning' : 'critical'

  return status
}
```

### Persist Store (Optional)

For UI preferences like theme or layout:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'protrader-preferences', // localStorage key
    },
  ),
)
```

### Reset Store

Always provide a reset action for testing:

```typescript
export const useStore = create<State>((set) => ({
  value: null,
  setValue: (v) => set({ value: v }),
  reset: () => set({ value: null }), // ← Include this
}))
```

## Checklist

- [ ] Each store focuses on one concern (prices, account, UI)
- [ ] Actions are explicit and descriptive (not generic `set()`)
- [ ] Store state uses selector pattern in components (prevents unnecessary re-renders)
- [ ] Socket.io updates handled via custom hooks (useAccountMetrics)
- [ ] No API calls in stores (use React Query or direct socket listeners)
- [ ] TypeScript types defined for all store state
- [ ] Stores reset after logout or component unmount
- [ ] Common computed selectors extracted to custom hooks
- [ ] All store data is serializable (no functions or dates as values)
- [ ] Store tested with `getState()` without component context
