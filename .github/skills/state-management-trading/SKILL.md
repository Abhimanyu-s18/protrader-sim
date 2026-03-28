---
name: state-management-trading
description: "Use when: building frontend state for real-time trading data, syncing data with server, managing user positions/balance, handling WebSocket updates, or implementing live dashboards. Combines Zustand client state, React Query server state, and Socket.io real-time subscriptions. Primary agents: Frontend, Coding, Architecture."
---

# State Management — Trading Dashboard

Master **Zustand (client) + React Query (server) + Socket.io (real-time)** for managing complex trading data on the platform dashboard.

---

## 🏗️ Architecture Model

```
┌─────────────────────────────────────┐
│  Component (e.g., OpenPositions)   │
├─────────────────────────────────────┤
│  ① React Query (server state)      │
│     - Fetch positions on mount      │
│     - Refetch on focus              │
│     - Cache for 30s                 │
├─────────────────────────────────────┤
│  ② Socket.io (real-time updates)   │
│     - Live price updates            │
│     - Position P&L changes          │
│     - Margin level alerts           │
├─────────────────────────────────────┤
│  ③ Zustand (client state)          │
│     - Subscribed symbols            │
│     - UI state (filters, sorting)   │
│     - Temporary optimistic updates  │
└─────────────────────────────────────┘
```

---

## 1️⃣ React Query: Server State

### Query Hooks

```typescript
// platform/src/lib/queries.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from './api'

// Fetch open positions (cached 30s)
export function useOpenPositions() {
  return useQuery({
    queryKey: ['positions', 'open'],
    queryFn: async () => {
      const response = await api.get('/api/trades/open')
      return response.data as Position[]
    },
    staleTime: 30000,  // 30s
    gcTime: 5 * 60000,  // Keep in cache 5min
    refetchOnWindowFocus: true,  // Refetch if user tabs back
    retry: 2,
    retryDelay: 1000
  })
}

// Fetch position details
export function usePosition(positionId: string) {
  return useQuery({
    queryKey: ['position', positionId],
    queryFn: async () => {
      const response = await api.get(`/api/trades/${positionId}`)
      return response.data as Position
    },
    enabled: !!positionId,  // Don't fetch if no ID
    staleTime: 30000
  })
}

// Fetch account metrics
export function useAccountMetrics() {
  return useQuery({
    queryKey: ['account', 'metrics'],
    queryFn: async () => {
      const response = await api.get('/api/users/me/account')
      return response.data as AccountMetrics
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  })
}

// Fetch instruments (rarely changes)
export function useInstruments() {
  return useQuery({
    queryKey: ['instruments'],
    queryFn: async () => {
      const response = await api.get('/api/instruments')
      return response.data as Instrument[]
    },
    staleTime: Infinity,  // Cache forever (or until manual refresh)
    gcTime: 24 * 60 * 60 * 1000  // Keep 24h
  })
}
```

### Mutation Hooks

```typescript
// mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useOpenPosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OpenPositionRequest) => {
      const response = await api.post('/api/trades', data)
      return response.data as Position
    },
    onSuccess: (newPosition) => {
      // Invalidate cached positions list
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      
      // Optimistically update if needed
      queryClient.setQueryData(['position', newPosition.id], newPosition)
    },
    onError: (error: AxiosError) => {
      console.error('Failed to open position:', error.response?.data)
    }
  })
}

export function useClosePosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ positionId }: { positionId: string }) => {
      const response = await api.post(`/api/trades/${positionId}/close`)
      return response.data
    },
    onSuccess: (_, { positionId }) => {
      // Remove from cache immediately
      queryClient.removeQueries({ queryKey: ['position', positionId] })
      
      // Refetch open positions
      queryClient.invalidateQueries({ queryKey: ['positions', 'open'] })
    }
  })
}
```

---

## 2️⃣ Socket.io: Real-Time Updates

### Socket Connection & Auth

```typescript
// platform/src/lib/socket.ts
import io from 'socket.io-client'
import { useQuery } from '@tanstack/react-query'

let socket: ReturnType<typeof io> | null = null

export function useSocket() {
  return useQuery({
    queryKey: ['socket'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      
      socket = io('http://localhost:4000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10
      })

      return socket
    },
    staleTime: Infinity,  // Keep connection forever
    refetchOnWindowFocus: false
  })
}

export function getSocket() {
  return socket
}
```

### Subscribe to Price Updates

```typescript
// hooks/usePriceUpdates.ts
import { useEffect, useState } from 'react'
import { useSocket } from '@/lib/socket'
import { usePriceStore } from '@/stores/priceStore'

export function usePriceUpdates(symbols: string[]) {
  const { data: socket } = useSocket()
  const updatePrices = usePriceStore((s) => s.updatePrices)

  useEffect(() => {
    if (!socket || !symbols.length) return

    // Subscribe to prices
    socket.emit('subscribe:prices', { symbols })

    // Listen for updates
    const handlePriceUpdate = (data: PriceUpdate) => {
      updatePrices(data)
    }

    socket.on('price:update', handlePriceUpdate)

    // Cleanup
    return () => {
      socket.emit('unsubscribe:prices', { symbols })
      socket.off('price:update', handlePriceUpdate)
    }
  }, [socket, symbols, updatePrices])
}
```

### Listen for Account Metrics

```typescript
// hooks/useAccountMetricsSocket.ts
export function useAccountMetricsSocket() {
  const { data: socket } = useSocket()
  const { setMetrics } = useAccountStore()

  useEffect(() => {
    if (!socket) return

    socket.on('account:metrics', (data: AccountMetrics) => {
      setMetrics(data)
    })

    return () => socket.off('account:metrics')
  }, [socket, setMetrics])
}
```

---

## 3️⃣ Zustand: Client State

### Price Store (Real-Time)

```typescript
// platform/src/stores/priceStore.ts
import { create } from 'zustand'

interface PriceStore {
  prices: Record<string, PriceData>
  updatePrices: (data: PriceUpdate) => void
  subscribe: (symbols: string[]) => void
  unsubscribe: (symbols: string[]) => void
}

export const usePriceStore = create<PriceStore>((set, get) => ({
  prices: {},
  
  updatePrices: (data: PriceUpdate) => {
    set((state) => ({
      prices: {
        ...state.prices,
        [data.symbol]: {
          bid: BigInt(data.bid),
          ask: BigInt(data.ask),
          mid: BigInt(data.mid),
          change_bps: data.change_bps,
          timestamp: new Date(data.ts)
        }
      }
    }))
  },

  subscribe: (symbols: string[]) => {
    const socket = getSocket()
    if (socket) {
      socket.emit('subscribe:prices', { symbols })
    }
  },

  unsubscribe: (symbols: string[]) => {
    const socket = getSocket()
    if (socket) {
      socket.emit('unsubscribe:prices', { symbols })
    }
  }
}))
```

### Account Store

```typescript
// platform/src/stores/accountStore.ts
import { create } from 'zustand'

interface AccountStore {
  metrics: AccountMetrics | null
  setMetrics: (metrics: AccountMetrics) => void
  isMarginCall: boolean
  isStopOut: boolean
}

export const useAccountStore = create<AccountStore>((set) => ({
  metrics: null,
  
  setMetrics: (metrics: AccountMetrics) => {
    const marginLevelBps = BigInt(metrics.margin_level_bps || '0')
    
    set({
      metrics,
      isMarginCall: marginLevelBps <= 10000n && marginLevelBps > 0n,  // 100%
      isStopOut: marginLevelBps <= 5000n && marginLevelBps > 0n        // 50%
    })
  }
}))

// Selector
export const useBalance = () => {
  return useAccountStore((s) => {
    if (!s.metrics) return null
    return BigInt(s.metrics.balance)
  })
}

export const useEquity = () => {
  return useAccountStore((s) => {
    if (!s.metrics) return null
    return BigInt(s.metrics.equity)
  })
}

export const useMarginLevel = () => {
  return useAccountStore((s) => s.metrics?.margin_level_bps)
}

export const useIsMarginCall = () => {
  return useAccountStore((s) => s.isMarginCall)
}
```

### UI State Store (Filters, Sorting)

```typescript
// platform/src/stores/uiStore.ts
import { create } from 'zustand'

interface UiStore {
  filters: {
    symbol: string | null
    direction: 'BUY' | 'SELL' | null
  }
  sorting: {
    field: 'openTime' | 'pnl' | 'margin' | 'symbol'
    direction: 'asc' | 'desc'
  }
  setFilters: (filters: UiStore['filters']) => void
  setSorting: (sorting: UiStore['sorting']) => void
}

export const useUiStore = create<UiStore>((set) => ({
  filters: { symbol: null, direction: null },
  sorting: { field: 'openTime', direction: 'desc' },

  setFilters: (filters) => set({ filters }),
  setSorting: (sorting) => set({ sorting })
}))
```

---

## 📦 Component: Open Positions

```typescript
// platform/src/app/trades/open-positions.tsx
import { useOpenPositions, useAccountMetrics } from '@/lib/queries'
import { usePriceUpdates, useAccountMetricsSocket } from '@/hooks'
import { usePriceStore, useAccountStore } from '@/stores'
import { useUiStore } from '@/stores/uiStore'

export function OpenPositions() {
  // Server state
  const { data: positions, isLoading, error } = useOpenPositions()
  const { data: metrics } = useAccountMetrics()

  // Real-time updates via Socket.io
  const subscribedSymbols = positions?.map(p => p.symbol) || []
  usePriceUpdates(subscribedSymbols)
  useAccountMetricsSocket()

  // Client state (Zustand)
  const prices = usePriceStore((s) => s.prices)
  const accountMetrics = useAccountStore((s) => s.metrics)
  const isMarginCall = useAccountStore((s) => s.isMarginCall)
  const filters = useUiStore((s) => s.filters)
  const sorting = useUiStore((s) => s.sorting)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading positions</div>
  if (!positions?.length) return <div>No open positions</div>

  // Filter & sort
  let filtered = positions.filter(p => {
    if (filters.symbol && p.symbol !== filters.symbol) return false
    if (filters.direction && p.direction !== filters.direction) return false
    return true
  })

  filtered = filtered.sort((a, b) => {
    const aVal = a[sorting.field]
    const bVal = b[sorting.field]
    const dir = sorting.direction === 'asc' ? 1 : -1
    return aVal > bVal ? dir : -dir
  })

  return (
    <div>
      {isMarginCall && (
        <div style={{ background: 'red', color: 'white', padding: '1rem' }}>
          ⚠️ Margin Call: Your margin level is below 100%. Close some positions immediately.
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Direction</th>
            <th>Lot Size</th>
            <th>Open Price</th>
            <th>Current Price</th>
            <th>P&L</th>
            <th>Margin</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(position => {
            const currentPrice = prices[position.symbol]
            
            // Calculate live P&L
            let pnl_cents = 0n
            if (currentPrice) {
              const priceDiff = position.direction === 'BUY'
                ? currentPrice.bid - position.open_rate_scaled
                : position.open_rate_scaled - currentPrice.ask
              
              pnl_cents = (priceDiff * position.units * BigInt(position.contract_size) * 100n) / 100000n
            }

            return (
              <tr key={position.id}>
                <td>{position.symbol}</td>
                <td>{position.direction}</td>
                <td>{position.units}</td>
                <td>${formatPrice(position.open_rate_scaled)}</td>
                <td>{currentPrice ? '$' + formatPrice(currentPrice.bid) : 'N/A'}</td>
                <td style={{ color: pnl_cents >= 0n ? 'green' : 'red' }}>
                  ${formatMoney(pnl_cents)}
                </td>
                <td>${formatMoney(position.margin_used_cents)}</td>
                <td>
                  <ClosePositionButton positionId={position.id} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <AccountMetricsCard metrics={accountMetrics} />
    </div>
  )
}

function ClosePositionButton({ positionId }: { positionId: string }) {
  const { mutate, isPending } = useClosePosition()

  return (
    <button
      onClick={() => mutate({ positionId })}
      disabled={isPending}
    >
      {isPending ? 'Closing...' : 'Close'}
    </button>
  )
}
```

---

## 🚀 Data Flow Example

1. **Component mounts** → React Query fetches `/api/trades/open`
2. **Cache populated** → Zustand price store initialized
3. **Socket connects** → Subscribe to prices for EUR_USD, GBP_USD
4. **Server sends update** → `price:update { symbol: 'EUR_USD', bid, ask }`
5. **Zustand updates** → `updatePrices()` in store
6. **Component re-renders** → New price displayed, P&L recalculated
7. **Server sends metrics** → `account:metrics { balance, equity, margin_level_bps }`
8. **Account store updates** → `setMetrics()`
9. **Component re-renders** → Margin level bar updates, margin call warning shows if needed

---

## ⚡ Performance Optimizations

### Memoization

```typescript
// Prevent unnecessary re-renders
const PositionRow = React.memo(({ position, currentPrice }: Props) => {
  return <tr>...</tr>
})

// Only re-render when price changes for this symbol
const PositionWithPrice = ({ position }: Props) => {
  const price = usePriceStore(
    (s) => s.prices[position.symbol],
    (prev, next) => prev?.timestamp === next?.timestamp  // Custom comparison
  )
  
  return <Position price={price} />
}
```

### Subscription Management

```typescript
// Only subscribe to visible positions
const visibleSymbols = useMemo(() => {
  return positions
    ?.filter(p => isVisible(p))
    .map(p => p.symbol)
}, [positions, isVisible])

usePriceUpdates(visibleSymbols)
```

---

## ✅ State Management Checklist

- [ ] **React Query**: Fetch positions on mount, refetch on focus
- [ ] **Socket.io**: Subscribe only to visible symbols
- [ ] **Zustand**: Store prices, metrics, UI filters
- [ ] **Optimistic Updates**: Close position optimistically, revert on error
- [ ] **Memoization**: Prevent row re-renders on every price update
- [ ] **Error Boundaries**: Graceful handling of failed mutations
- [ ] **Loading States**: Show skeleton loaders while fetching
- [ ] **Real-time Alerts**: Margin call / stop-out notifications
- [ ] **Memory Cleanup**: Unsubscribe from prices on unmount

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Fetch positions in every render | Use React Query with caching |
| Subscribe to all symbols | Max 20, only visible ones |
| Update all rows on price update | Memoize rows, update one at a time |
| Cache prices in memory | Use Zustand store with selectors |
| Trust price from server for P&L | Recalculate client-side (atomic) |
| No loading/error UI | Always show loader, error boundary |

---

## 📚 Related Skills

- `socket-io-real-time` — Real-time architecture
- `trading-ui-components` — Component library integration
- `api-route-creation` — API contracts for React Query
