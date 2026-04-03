---
name: state-management-trading
description: 'Use when: building frontend state for real-time trading data, syncing data with server, managing user positions/balance, handling WebSocket updates, or implementing live dashboards. Combines Zustand client state, React Query server state, and Socket.io real-time subscriptions. Primary agents: Frontend, Coding, Architecture.'
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
    staleTime: 30000, // 30s
    gcTime: 5 * 60000, // Keep in cache 5min
    refetchOnWindowFocus: true, // Refetch if user tabs back
    retry: 2,
    retryDelay: 1000,
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
    enabled: !!positionId, // Don't fetch if no ID
    staleTime: 30000,
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
    refetchOnWindowFocus: true,
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
    staleTime: Infinity, // Cache forever (or until manual refresh)
    gcTime: 24 * 60 * 60 * 1000, // Keep 24h
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
    },
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
    },
  })
}
```

---

## 2️⃣ Socket.io: Real-Time Updates

### Socket Connection Manager

```typescript
// platform/src/lib/socket.ts
import io, { Socket } from 'socket.io-client'

let socket: Socket | null = null
let connectionPromise: Promise<Socket> | null = null

/**
 * Initialize or return existing socket connection
 * Handles token updates and automatic reconnection
 */
export async function initializeSocket(token: string): Promise<Socket> {
  // Return existing connected socket if available and same token
  if (socket?.connected && (socket as any).auth?.token === token) {
    return socket
  }

  // Disconnect old socket if token changed
  if (socket) {
    socket.disconnect()
    socket = null
  }

  // Return pending connection if already initiated
  if (connectionPromise) {
    return connectionPromise
  }

  // Create new connection
  connectionPromise = new Promise((resolve, reject) => {
    try {
      socket = io('http://localhost:4000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
      })

      socket.on('connect', () => {
        console.log('Socket connected')
        connectionPromise = null
        resolve(socket!)
      })

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err)
        connectionPromise = null
        reject(err)
      })
    } catch (err) {
      connectionPromise = null
      reject(err)
    }
  })

  return connectionPromise
}

/**
 * Get current socket instance (does not create new connection)
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Disconnect socket and clean up
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  connectionPromise = null
}
```

### Hook: Manage Socket Lifecycle

```typescript
// hooks/useSocketManager.ts
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { initializeSocket, disconnectSocket } from '@/lib/socket'

/**
 * Initialize socket connection on mount, reconnect when auth token changes
 */
export function useSocketManager() {
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) {
      // No token = disconnect
      disconnectSocket()
      return
    }

    // Initialize or reconnect with new token
    initializeSocket(token).catch((err) => console.error('Failed to connect socket:', err))

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount; keep connection alive across components
      // Only disconnect when token becomes null/undefined
    }
  }, [token])
}
```

### Subscribe to Price Updates

```typescript
// hooks/usePriceUpdates.ts
import { useEffect, useRef } from 'react'
import { getSocket } from '@/lib/socket'
import { usePriceStore } from '@/stores/priceStore'

export function usePriceUpdates(symbols: string[]) {
  const updatePrices = usePriceStore((s) => s.updatePrices)
  const previousSymbolsRef = useRef<string[]>([])

  useEffect(() => {
    const socket = getSocket()
    if (!socket?.connected) {
      console.warn('Socket not connected, price updates unavailable')
      return
    }

    // Only re-subscribe if symbols actually changed (deep equality)
    const symbolsChanged = JSON.stringify(symbols) !== JSON.stringify(previousSymbolsRef.current)

    if (!symbolsChanged || !symbols.length) {
      return
    }

    // Unsubscribe from old symbols
    if (previousSymbolsRef.current.length > 0) {
      socket.emit('unsubscribe:prices', { symbols: previousSymbolsRef.current })
    }

    // Subscribe to new symbols
    socket.emit('subscribe:prices', { symbols })
    previousSymbolsRef.current = [...symbols]

    // Handle price updates
    const handlePriceUpdate = (data: PriceUpdate) => {
      updatePrices(data)
    }

    socket.on('price:update', handlePriceUpdate)

    // Cleanup
    return () => {
      socket.off('price:update', handlePriceUpdate)
    }
  }, [symbols, updatePrices])
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
          timestamp: new Date(data.ts),
        },
      },
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
  },
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
      isMarginCall: marginLevelBps <= 10000n && marginLevelBps > 0n, // 100%
      isStopOut: marginLevelBps <= 5000n && marginLevelBps > 0n, // 50%
    })
  },
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
  setSorting: (sorting) => set({ sorting }),
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

// Helper function to get sort value from position, handling computed fields
function getSortValue(
  position: Position,
  field: 'openTime' | 'pnl' | 'margin' | 'symbol',
  currentPrice?: PriceData
): number | string {
  switch (field) {
    case 'openTime':
      return new Date(position.created_at).getTime()
    case 'pnl':
      // Compute P&L from current price
      if (!currentPrice) return 0
      const priceDiff = position.direction === 'BUY'
        ? currentPrice.bid - position.open_rate_scaled
        : position.open_rate_scaled - currentPrice.ask
      return Number(
        (priceDiff * position.units * BigInt(position.contract_size) * 100n) / 100000n
      )
    case 'margin':
      return Number(position.margin_used_cents)
    case 'symbol':
      return position.symbol.toLowerCase()
    default:
      return 0
  }
}

// Type-safe comparison function
function compareValues(a: number | string, b: number | string, ascending: boolean): number {
  const direction = ascending ? 1 : -1

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b) * direction
  }

  const aNum = typeof a === 'number' ? a : 0
  const bNum = typeof b === 'number' ? b : 0
  return (aNum - bNum) * direction
}

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
    const aVal = getSortValue(a, sorting.field, prices[a.symbol])
    const bVal = getSortValue(b, sorting.field, prices[b.symbol])
    const isAscending = sorting.direction === 'asc'
    return compareValues(aVal, bVal, isAscending)
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
  return positions?.filter((p) => isVisible(p)).map((p) => p.symbol)
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

| ❌ Wrong                        | ✅ Correct                         |
| ------------------------------- | ---------------------------------- |
| Fetch positions in every render | Use React Query with caching       |
| Subscribe to all symbols        | Max 20, only visible ones          |
| Update all rows on price update | Memoize rows, update one at a time |
| Cache prices in memory          | Use Zustand store with selectors   |
| Trust price from server for P&L | Recalculate client-side (atomic)   |
| No loading/error UI             | Always show loader, error boundary |

---

## 📚 Related Skills

- `socket-io-real-time` — Real-time architecture
- `trading-ui-components` — Component library integration
- `api-route-creation` — API contracts for React Query
