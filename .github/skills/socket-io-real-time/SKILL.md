---
name: socket-io-real-time
description: "Use when: implementing real-time features, setting up WebSocket price feeds, managing user subscriptions, broadcasting market data, or handling live position updates. Ensures proper room management, authentication, and scalable broadcasting. Primary agents: Coding, Frontend, Architecture."
---

# Socket.io Real-Time — ProTraderSim

Master WebSocket implementation for **real-time price feeds and live position updates**. Scale from 10 to 10,000+ concurrent traders.

---

## 🏗️ Socket.io Architecture

### Setup in Express Server

```typescript
// apps/api/src/index.ts
import express from 'express'
import http from 'http'
import { Server as SocketServer } from 'socket.io'

const app = express()
const server = http.createServer(app)

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://app.protrader.com',
  'https://platform.protrader.com'
]

const io = new SocketServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('CORS_NOT_ALLOWED'))
      }
    },
    credentials: true
  },
  transports: ['websocket', 'polling'],  // Fallback to polling
  maxHttpBufferSize: 1e6  // 1 MB max message
})

// Export for use in routes
export { io }

server.listen(4000, () => {
  console.log('Server + Socket.io listening on :4000')
})
```

### Authentication Middleware

```typescript
// lib/socket.ts
import jwt from 'jsonwebtoken'
import { io } from '../index'

// Load JWT public key for token verification
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY
if (!JWT_PUBLIC_KEY) {
  throw new Error('JWT_PUBLIC_KEY environment variable is required')
}

// Authenticate on connection
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    
    if (!token) {
      return next(new Error('NO_TOKEN'))
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY) as any
    
    // Attach user to socket
    socket.data.userId = decoded.sub
    socket.data.userEmail = decoded.email
    socket.data.roles = decoded.roles
    
    next()
  } catch (err) {
    next(new Error('INVALID_TOKEN'))
  }
})

// Handle connection errors
io.on('connection_error', (error) => {
  console.error('Socket.io connection error:', error.message)
})

export { io }
```

---

## 🔌 Room Management

### Room Naming Conventions

```typescript
// Private user rooms
const userRoom = `user:${userId}`              // user:user_123
const userPositionsRoom = `user:${userId}:positions`

// Broadcast rooms (price feeds)
const priceRoom = `prices:${symbol}`           // prices:EUR_USD
const instrumentRoom = `instruments:${symbol}` // Overall instrument updates

// Admin rooms
const adminRoom = 'admin:panel'
const auditRoom = 'admin:audit'
```

### Joining Rooms

```typescript
// Price feed: Trader subscribes to EUR/USD prices
io.on('connection', (socket) => {
  // User joins their private room automatically
  socket.join(`user:${socket.data.userId}`)
  
  socket.on('subscribe:prices', ({ symbols }: { symbols: string[] }) => {
    // Validate: max 20 symbols per connection
    if (symbols.length > 20) {
      socket.emit('error', { code: 'TOO_MANY_SUBSCRIPTIONS' })
      return
    }
    
    // Join price rooms
    symbols.forEach(symbol => {
      socket.join(`prices:${symbol}`)
    })
    
    socket.emit('subscribed', { symbols })
  })
  
  socket.on('unsubscribe:prices', ({ symbols }: { symbols: string[] }) => {
    symbols.forEach(symbol => {
      socket.leave(`prices:${symbol}`)
    })
  })
})
```

---

## 📡 Broadcasting Events

### Price Updates (To All Interested Traders)

```typescript
// Emit price update to all traders watching EUR/USD
export function emitPriceUpdate(
  symbol: string,
  data: {
    bid_scaled: bigint
    ask_scaled: bigint
    mid_scaled: bigint
    change_bps: number
    timestamp: Date
  }
) {
  io.to(`prices:${symbol}`).emit('price:update', {
    symbol,
    bid: data.bid_scaled.toString(),       // MoneyString
    ask: data.ask_scaled.toString(),
    mid: data.mid_scaled.toString(),
    change_bps: data.change_bps,
    ts: data.timestamp.toISOString()
  })
}

// Usage in price feed service
async function updatePrices() {
  const prices = await twelve_data.getLatestPrices()
  
  for (const price of prices) {
    const bid = price.bid * PRICE_SCALE
    const ask = price.ask * PRICE_SCALE
    const mid = (bid + ask) / 2n
    
    emitPriceUpdate(price.symbol, {
      bid_scaled: bid,
      ask_scaled: ask,
      mid_scaled: mid,
      change_bps: price.changeBps,
      timestamp: new Date()
    })
  }
}
```

### Account Metrics (To Specific User)

```typescript
export function emitAccountMetrics(
  userId: string,
  metrics: {
    balance_cents: bigint
    unrealized_pnl_cents: bigint
    equity_cents: bigint
    used_margin_cents: bigint
    available_cents: bigint
    margin_level_bps: bigint | null
  }
) {
  io.to(`user:${userId}`).emit('account:metrics', {
    balance: metrics.balance_cents.toString(),
    unrealized_pnl: metrics.unrealized_pnl_cents.toString(),
    equity: metrics.equity_cents.toString(),
    used_margin: metrics.used_margin_cents.toString(),
    available: metrics.available_cents.toString(),
    margin_level_bps: metrics.margin_level_bps?.toString() ?? null
  })
}

// Usage: After every position change
async function openPosition(traderId: string, ...) {
  // Open trade...
  const metrics = await calculateMetrics(traderId)
  emitAccountMetrics(traderId, metrics)
}
```

### Trade Updates (To Trader Only)

```typescript
export function emitToUser(
  userId: string,
  event: string,
  data: any
) {
  io.to(`user:${userId}`).emit(event, data)
}

// Usage
socket.on('close:position', async ({ position_id }) => {
  try {
    const position = await positionsService.closeTrade(
      socket.data.userId,
      position_id
    )
    
    // Notify trader
    emitToUser(socket.data.userId, 'position:closed', {
      position_id: position.id,
      close_price: position.close_rate_scaled.toString(),
      pnl: position.pnl_cents.toString()
    })
    
    // Notify admin (if monitoring)
    io.to('admin:panel').emit('trade:closed', {
      user_id: socket.data.userId,
      position_id: position.id
    })
  } catch (err) {
    socket.emit('error', { code: err.code, message: err.message })
  }
})
```

### Margin Call Alerts

```typescript
export function emitMarginCall(userId: string) {
  io.to(`user:${userId}`).emit('margin:call', {
    level: 'WARNING',
    message: 'Your margin level has fallen below 100%. Please close some positions.',
    timestamp: new Date().toISOString()
  })
}

// Background job that runs frequently
async function checkMarginCalls() {
  const users = await getUsersWithOpenPositions()
  
  for (const user of users) {
    const metrics = await calculateMetrics(user.id)
    
    if (metrics.margin_level_bps <= 10000n) {  // 100%
      emitMarginCall(user.id)
    }
    
    if (metrics.margin_level_bps <= 5000n) {   // 50% — auto-close
      await autoClosePositions(user.id)
      emitToUser(user.id, 'stop:out', {
        message: 'Positions auto-closed due to stop-out.',
        timestamp: new Date().toISOString()
      })
    }
  }
}
```

---

## 🚀 Scaling Considerations

### Redis Adapter (Multi-Server Broadcasting)

```typescript
// When running multiple Node instances
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ host: 'redis-host', port: 6379 })
const subClient = pubClient.duplicate()

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient))
})

// Now all instances broadcast to the same Redis
// 10 servers, 1,000 traders each = 10,000 concurrent connections
```

### Connection Limits

```typescript
// Monitor connections per user
const MAX_CONNECTIONS_PER_USER = 3  // Allow 3 devices

io.use((socket, next) => {
  const userId = socket.data.userId
  // Convert iterator to array before filtering
  const existingConnections = Array.from(io.sockets.sockets.values())
    .filter(s => s.data.userId === userId)
  
  if (existingConnections.length >= MAX_CONNECTIONS_PER_USER) {
    return next(new Error('TOO_MANY_CONNECTIONS'))
  }
  
  next()
})
```

### Bandwidth Throttling

```typescript
// Limit price update frequency to 100ms per symbol
const PRICE_UPDATE_INTERVALS = new Map<string, number>()
const MIN_INTERVAL = 100  // milliseconds

export function emitPriceUpdate(symbol: string, data: any) {
  const lastUpdate = PRICE_UPDATE_INTERVALS.get(symbol) || 0
  const now = Date.now()
  
  if (now - lastUpdate < MIN_INTERVAL) {
    return  // Skip this update
  }
  
  PRICE_UPDATE_INTERVALS.set(symbol, now)
  io.to(`prices:${symbol}`).emit('price:update', data)
}
```

---

## 🔐 Security Patterns

### Prevent Cross-User Access

```typescript
// Client requests another user's data
socket.on('get:user-balance', ({ user_id }) => {
  // Always verify ownership
  if (user_id !== socket.data.userId) {
    socket.emit('error', { code: 'FORBIDDEN' })
    return
  }
  
  // OK, return data
  const balance = await getBalance(user_id)
  socket.emit('user:balance', { balance })
})
```

### Admin-Only Rooms

```typescript
// Only admins can join audit room
socket.on('join:admin', () => {
  if (!socket.data.roles.includes('ADMIN')) {
    socket.emit('error', { code: 'FORBIDDEN' })
    return
  }
  
  socket.join('admin:audit')
})
```

---

## 📊 Client-Side Usage (Frontend Skill)

```typescript
// frontend/lib/socket.ts
import io from 'socket.io-client'

const socket = io('http://localhost:4000', {
  auth: {
    token: getAuthToken()  // JWT from localStorage
  }
})

// Subscribe to prices
socket.emit('subscribe:prices', { symbols: ['EUR_USD', 'GBP_USD'] })

// Listen for price updates
socket.on('price:update', (data) => {
  // Update React state
  setPrices(data)
})

// Listen for account metrics
socket.on('account:metrics', (metrics) => {
  setBalance(metrics.balance)
  setMarginLevel(metrics.margin_level_bps)
})

// Close position
const closePosition = (positionId) => {
  socket.emit('close:position', { position_id: positionId })
}

// Listen for confirmation
socket.on('position:closed', (data) => {
  showNotification(`Position closed. P&L: $${data.pnl}`)
})
```

---

## ✅ Socket.io Checklist

- [ ] **Authentication**: JWT verified on connection
- [ ] **Room Isolation**: Users can't subscribe to other users' rooms
- [ ] **Subscription Limits**: Max 20 price subscriptions per connection
- [ ] **Bandwidth**: Price updates throttled (100ms+)
- [ ] **Error Handling**: Connection defaults to polling if WS fails
- [ ] **Scaling**: Redis adapter for multi-server setup
- [ ] **Monitoring**: Log connection count, message volume
- [ ] **Tests**: Test subscription, broadcasting, error cases

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Trust room from client | Verify in middleware (use socket.data) |
| No subscription limits | Max 20 per connection |
| Broadcast without auth | Always verify user ownership |
| Send large messages | Limit to 1 MB |
| No fallback transport | Include polling as fallback |
| Cache prices in memory | Broadcast fresh data each tick |

---

## 📚 Related Skills

- `api-route-creation` — REST endpoints that trigger Socket.io events
- `state-management-trading` — Frontend state updates from Socket.io
- `performance-profiling-api` — Monitor bandwidth & latency
