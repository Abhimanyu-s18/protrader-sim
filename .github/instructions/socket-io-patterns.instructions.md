---
name: socket-io-patterns
description: Rules for implementing real-time features with Socket.io
applyTo: 'apps/api/src/lib/socket.ts, apps/api/src/routes/**/*.ts, apps/*/src/hooks/**/*.ts'
---

# Socket.io Patterns

## Room Naming

Use consistent naming for all Socket.io rooms to ensure frontend subscriptions work correctly:

| Room Pattern      | Usage                                                                    | Example                                 |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `user:{userId}`   | Private user events (trade updates, account metrics)                     | `user:clEURjfk123`                      |
| `prices:{symbol}` | Price feed for specific instrument (max 20 subscriptions per connection) | `prices:EURUSD`, `prices:BTCUSD`        |
| `admin:panel`     | Admin broadcast channel (all admins receive events)                      | Admin notifications, trader suspensions |

## Authentication

All Socket.io connections require JWT RS256 authentication:

```typescript
// Frontend: Pass token in connection options
import { io } from 'socket.io-client'

const socket = io('http://localhost:4000', {
  auth: {
    token: localStorage.getItem('accessToken'),
  },
})

// Backend: Verify in middleware (lib/socket.ts)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication token required'))
    }
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
    }) as { sub: string }
    if (typeof decoded.sub !== 'string') {
      return next(new Error('Invalid token payload'))
    }
    socket.data.userId = decoded.sub
    next()
  } catch (error) {
    next(new Error('Invalid or expired token'))
  }
})
```

export function emitPriceUpdate(
io: SocketServer,
symbol: string,
data: {
bid_scaled: string // Price strings (scaled ×100000)
ask_scaled: string
mid_scaled: string
change_bps?: string // Optional: basis points change from previous close
ts: number
}
): void {
io.to(`prices:${symbol}`).emit('price_update', {
symbol,
...data,
})
}
data: {
bid_scaled: string // Price strings (scaled ×100000)
ask_scaled: string
mid_scaled: string
ts: number
},
): void {
io.to(`prices:${symbol}`).emit('price_update', {
symbol,
...data,
})
}

/\*\*

- Emit account metrics to specific user
  \*/
  export function emitToUser(io: SocketServer, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data)
  }

/\*\*

- Emit to all admins
  \*/
  export function emitToAdmin(io: SocketServer, event: string, data: unknown): void {
  io.to('admin:panel').emit(event, data)
  }

````

### Client → Server Events (Subscriptions)

Handle subscription requests from frontend with validation:

```typescript
// lib/socket.ts — Connection handler

io.on('connection', (socket) => {
  // Price subscription
  socket.on('subscribe:prices', (data: { symbols: string[] }) => {
    const { symbols } = data

    // Validate
    if (!Array.isArray(symbols) || symbols.length === 0) {
      socket.emit('error', { message: 'Symbols must be a non-empty array' })
      return
    }
    if (symbols.length > 20) {
      socket.emit('error', { message: 'Max 20 price subscriptions per connection' })
      return
    }

    // Validate, normalize and deduplicate symbols
    const validSymbols = new Set<string>()
    for (const symbol of symbols) {
      if (typeof symbol === 'string' && /^[A-Z0-9]{3,12}$/.test(symbol.toUpperCase())) {
        validSymbols.add(symbol.toUpperCase())
      }
    }

    if (validSymbols.size === 0) {
      socket.emit('error', { code: 'VALIDATION_ERROR', message: 'No valid symbols provided' })
      return
    }

    // Join rooms for each valid symbol
    validSymbols.forEach((symbol) => socket.join(`prices:${symbol}`))

    // Send current cached price for each symbol (must await async operation)
    ;(async () => {
      for (const symbol of validSymbols) {
        const cachedPrice = await getCachedPrice(symbol)
        if (cachedPrice) {
          socket.emit('price_snapshot', { symbol, ...cachedPrice })
        }
      }
    })()
  })

  // Price unsubscription
  socket.on('unsubscribe:prices', (data: { symbols: string[] }) => {
    data.symbols.forEach((symbol) => socket.leave(`prices:${symbol}`))
  })

  // Auto-join user room on connection
  const userId = socket.data.userId
  if (!userId) {
    console.error('Socket missing userId')
    socket.disconnect(true)
    return
  }
  socket.join(`user:${userId}`)
})
````

## Payload Shapes

All payload shapes are defined as shared TypeScript interfaces in the backend (`apps/api/src/lib/socket.ts`) and exported to the frontend via `@protrader/utils`. Use these types for type-safe Socket.io handlers:

### PriceUpdatePayload

Sent by `emitPriceUpdate()` to `prices:{symbol}` room:

```typescript
export interface PriceUpdatePayload {
  symbol: string
  bid_scaled: string // String representation scaled ×100000
  ask_scaled: string
  mid_scaled: string
  change_bps: string // Basis points from previous close
  ts: string // Timestamp in ms
}
```

### AccountMetricsPayload

Sent by trade operations to `user:{userId}` room:

```typescript
export interface AccountMetricsPayload {
  balance_cents: string // String in cents
  unrealized_pnl_cents: string
  equity_cents: string
  used_margin_cents: string
  available_cents: string
  margin_level_bps: string | null // Basis points (4627 = 46.27%), null if no open positions
}
```

### TradeOpenedPayload

Sent after trade creation to `user:{userId}` room:

```typescript
export interface TradeOpenedPayload {
  trade_id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  units: string
  open_rate_scaled: string // String scaled ×100000
}
```

**Import these types in your frontend/backend code**:

```typescript
import type {
  PriceUpdatePayload,
  AccountMetricsPayload,
  TradeOpenedPayload,
} from '@protrader/utils'
```

## Frontend Hooks

### useMarketData Hook

````typescript
// apps/platform/src/hooks/useMarketData.ts
import { useEffect } from 'react'
import { useSocket } from './useSocket'
import { usePriceStore } from '../stores/priceStore'
import type { PriceUpdatePayload } from '@protrader/utils'  // Export from shared types

interface SubscribeRequest {
  symbols: string[]
}

export function useMarketData(symbols: string[]) {
  const socket = useSocket()
  const setPrices = usePriceStore((state) => state.setPrices)

  useEffect(() => {
    if (!socket || symbols.length === 0) return

    // Subscribe to prices with typed request
    const subscribeRequest: SubscribeRequest = { symbols }
    socket.emit('subscribe:prices', subscribeRequest)

    // Listen for snapshots (initial prices) with proper type
    const handleSnapshot = (payload: PriceUpdatePayload) => {
      setPrices({ [payload.symbol]: payload })
    }
    socket.on('price_snapshot', handleSnapshot)

    // Listen for updates (continuous stream) with proper type
    const handleUpdate = (payload: PriceUpdatePayload) => {
      setPrices({ [payload.symbol]: payload })
    }
    socket.on('price_update', handleUpdate)

    // Cleanup
    return () => {
      socket.emit('unsubscribe:prices', subscribeRequest)
      socket.off('price_snapshot', handleSnapshot)
      socket.off('price_update', handleUpdate)
    }
  }, [socket, symbols, setPrices])
}```
````

### useAccountMetrics Hook

````typescript
// apps/platform/src/hooks/useAccountMetrics.ts
import { useEffect } from 'react'
import { useSocket } from './useSocket'
import { useAccountStore } from '../stores/accountStore'
import type { AccountMetricsPayload } from '@protrader/utils'  // Import shared type

export function useAccountMetrics() {
  const socket = useSocket()
  const setMetrics = useAccountStore((state) => state.setMetrics)

  useEffect(() => {
    if (!socket) return

    const handleMetrics = (payload: AccountMetricsPayload) => {
      setMetrics(payload)
    }

    socket.on('account_metrics', handleMetrics)

    return () => {
      socket.off('account_metrics', handleMetrics)
    }
  }, [socket, setMetrics])
}```
````

## Common Patterns

### Broadcasting After Trade Creation

After opening a trade, emit to both the user and all connected price subscribers:

````typescript
// routes/trades.ts
XRouter.post('/trades/open', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { symbol, direction, units } = req.body

    const result = await tradingService.openPosition({
      userId,
      symbol,
      direction,
      units,
    })

    // 1. Emit account metrics update to user
    emitToUser(io, userId, 'account_metrics', {
      balance_cents: result.accountMetrics.balance_cents,
      equity_cents: result.accountMetrics.equity_cents,
      used_margin_cents: result.accountMetrics.used_margin_cents,
      available_cents: result.accountMetrics.available_cents,
      margin_level_bps: result.accountMetrics.margin_level_bps,
    })

    // 2. Emit trade update to user
    emitToUser(io, userId, 'trade_update', {
      tradeId: result.trade.id,
      status: 'OPEN',
      direction: result.trade.direction,
      instrument: result.trade.instrument,
      units: result.trade.units.toString(),
      entryRate: result.trade.entryRate,
      currentRate: result.trade.currentRate,
      pnlCents: '0',
    })

    res.status(201).json({ data: serializeBigInt(result.trade) })
  } catch (error) {
    next(error)
  }
})

### Price Cache Management

Always maintain Redis cache for recent prices to serve snapshots:

```typescript
// lib/redis.ts
export async function setCachedPrice(
  symbol: string,
  data: { bid_scaled: string; ask_scaled: string; mid_scaled: string; ts: number }
): Promise<void> {
  await redis.setex(`prices:${symbol}`, 60, JSON.stringify(data)) // 60s TTL
}

/** Get cached price for a symbol; returns null if not found or on error. */
export async function getCachedPrice(symbol: string): Promise<PriceUpdatePayload | null> {
  try {
    const cached = await redis.get(`prices:${symbol}`)
    if (!cached) return null
    return JSON.parse(cached) as PriceUpdatePayload
  } catch (error) {
    console.error(`Failed to get cached price for ${symbol}:`, error)
    return null
  }
}
````

## Error Handling

### Error Codes

Emit errors to client with standardized codes so they can handle failures programmatically:

| Error Code             | HTTP Status | Cause                                         | Client Action                             |
| ---------------------- | ----------- | --------------------------------------------- | ----------------------------------------- |
| `AUTHENTICATION_ERROR` | 401         | JWT missing, invalid, or expired              | Redirect to login; refresh token          |
| `VALIDATION_ERROR`     | 400         | Invalid symbols, missing fields, wrong types  | Validate input; show user message         |
| `RATE_LIMIT_ERROR`     | 429         | Too many subscriptions (>20), or request spam | Reduce subscriptions; exponential backoff |
| `INTERNAL_ERROR`       | 500         | Unexpected server error (Redis, database)     | Retry after delay; report to support      |

### Error Payload Format

```typescript
interface ErrorPayload {
  code: 'AUTHENTICATION_ERROR' | 'VALIDATION_ERROR' | 'RATE_LIMIT_ERROR' | 'INTERNAL_ERROR'
  message: string // Human-readable description
}

// Example
socket.emit('error', {
  code: 'VALIDATION_ERROR',
  message: 'Symbols must be an array of 1-20 strings matching pattern [A-Z0-9]{3,12}',
})
```

## Testing

Socket.io connections should be tested with integration tests using a real server with proper setup/teardown:

```typescript
import { Server as HTTPServer } from 'http'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { io as ioClient } from 'socket.io-client'
import type { Socket as ClientSocket } from 'socket.io-client'
import { registerSocketHandlers, emitPriceUpdate, setSocketServer } from '../lib/socket'
import type { PriceUpdatePayload } from '../lib/socket'

describe('Socket.io', () => {
  let server: HTTPServer
  let io: SocketIOServer
  let clientSocket: ClientSocket
  const validJWT = 'your-test-jwt-token'

  beforeAll((done) => {
    // Create HTTP server and attach Socket.io
    server = createServer()
    io = new SocketIOServer(server)
    registerSocketHandlers(io)
    setSocketServer(io)

    server.listen(() => {
      const addr = server.address()
      const port = typeof addr === 'object' ? addr.port : 3000
      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: validJWT },
      })
      clientSocket.on('connect', done)
    })
  })

  afterEach(() => {
    // Clean up client subscription state between tests
    if (clientSocket.connected) {
      clientSocket.emit('unsubscribe:prices', { symbols: ['EURUSD'] })
    }
  })

  afterAll((done) => {
    // Disconnect client and close server
    clientSocket.disconnect()
    io.close()
    server.close(done)
  })

  it('should emit price updates to subscribed clients', (done) => {
    clientSocket.emit('subscribe:prices', { symbols: ['EURUSD'] })

    // Verify client receives initial snapshot from cache
    clientSocket.once('price_snapshot', (payload: PriceUpdatePayload) => {
      expect(payload.symbol).toBe('EURUSD')

      // Simulate price update from market data service
      emitPriceUpdate('EURUSD', {
        symbol: 'EURUSD',
        bid_scaled: '108450',
        ask_scaled: '108475',
        mid_scaled: '108462',
        change_bps: '-125',
        ts: Date.now().toString(),
      })

      // Verify client receives update
      clientSocket.once('price_update', (updatePayload: PriceUpdatePayload) => {
        expect(updatePayload.symbol).toBe('EURUSD')
        expect(updatePayload.bid_scaled).toBe('108450')
        done()
      })
    })
  })
})
```

## Checklist

### Authentication & Security

- [ ] JWT token verified before accepting any connections
- [ ] RS256 algorithm explicitly verified in Socket.io middleware (reject non-RS256 tokens)
- [ ] Connection middleware includes proper error handling (reference middleware in registerSocketHandlers)
- [ ] socket.data.userId validated before using in room joins (check for null/undefined)

### Type Safety & Validation

- [ ] All payload types defined in shared module (`packages/types/src/`) and imported by frontend/backend
- [ ] Frontend hooks import PriceUpdatePayload, AccountMetricsPayload, TradeOpenedPayload types
- [ ] Backend emit functions use typed payloads (no `any` types)
- [ ] Symbol validation enforces alphanumeric + safe regex pattern (`^[A-Z0-9]{3,12}$`)
- [ ] Symbol normalization (toUpperCase) and deduplication before joining rooms
- [ ] Subscribe handler validates and reports invalid symbols with VALIDATION_ERROR code
- [ ] Handler callbacks annotated with concrete payload types (not `any`)

### Error Handling

- [ ] Error events sent to client with standardized error codes (AUTHENTICATION_ERROR, VALIDATION_ERROR, RATE_LIMIT_ERROR, INTERNAL_ERROR)
- [ ] getCachedPrice and other async functions include try/catch error handling
- [ ] Errors logged with context (symbol, userId) for debugging
- [ ] Client error payloads include both code and human-readable message

### Async & Performance

- [ ] Price snapshot retrieval uses async/await or Promise.all (no unawaited Promises)
- [ ] getCachedPrice awaited before emitting price_snapshot
- [ ] Symbol subscription loop properly async (for...of with await or Promise.all)

### Room Management & Events

- [ ] All room names follow `user:{userId}`, `prices:{symbol}`, or `admin:panel` pattern
- [ ] All server events emitted via helper functions (emitToUser, emitPriceUpdate, emitToAdmin)
- [ ] Frontend hooks unsubscribe on cleanup (socket.off and emit unsubscribe:prices)

### Caching & State

- [ ] Message payloads use string representations for money/prices (BigInt serialized as strings)
- [ ] Price cache maintains 60s TTL in Redis with fallback on read errors
- [ ] Subscriptions limited to max 20 symbols per connection (validated and truncated in handler)

### Testing

- [ ] Integration tests start HTTP server and initialize Socket.io in beforeAll
- [ ] Tests teardown with server.close() and io.close() in afterAll
- [ ] Client disconnection handled in afterEach
- [ ] Tests verify subscription flow (subscribe → snapshot → unsubscribe)
- [ ] Tests verify price update broadcasting to subscribed clients
- [ ] Tests use proper type imports (Server, Socket, payload types)
