---
name: 'socket-io-debugging'
description: 'Use when: troubleshooting WebSocket connections, diagnosing real-time update failures, debugging Socket.io room issues, investigating authentication failures, or fixing price feed problems. Ensures systematic diagnosis of real-time features with proper logging and verification steps. Primary agents: @debug, @frontend, @coding.'
---

# Skill: Socket.io Debugging

**Scope**: WebSocket connection issues, real-time update failures, room management problems, authentication errors
**Primary Agents**: @debug, @frontend, @coding
**When to Use**: Price feeds not updating, position updates delayed, connection drops, authentication failures

---

## Core Principles

### 1. Systematic Diagnosis Approach

Follow this order when debugging Socket.io issues:

1. **Connection** — Is the WebSocket connected?
2. **Authentication** — Is the JWT valid?
3. **Subscription** — Is the client subscribed to the right room?
4. **Broadcast** — Is the server emitting to the right room?
5. **Payload** — Is the data shape correct?

### 2. Enable Verbose Logging Temporarily

```typescript
// Server-side: Add logging to socket.ts
io.on('connection', (socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`)
  console.log(`[SOCKET] User: ${socket.data.userId}`)
  console.log(`[SOCKET] Rooms: ${Array.from(socket.rooms).join(', ')}`)

  socket.on('subscribe:prices', (data) => {
    console.log(`[SOCKET] Subscribe to prices: ${data.symbols.join(', ')}`)
    data.symbols.forEach((symbol) => {
      socket.join(`prices:${symbol}`)
    })
  })

  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET] Disconnected: ${socket.id}, reason: ${reason}`)
  })
})

// Client-side: Enable Socket.io debug
import { io } from 'socket.io-client'
const socket = io('http://localhost:4000', {
  auth: { token },
  transports: ['websocket'],
})

socket.onAny((event, ...args) => {
  console.log(`[SOCKET] Event: ${event}`, args)
})
```

### 3. Verify Room Membership

```typescript
// Check which rooms a socket is in
console.log('Socket rooms:', Array.from(socket.rooms))

// Check all sockets in a room
const roomSockets = io.sockets.adapter.rooms.get(`user:${userId}`)
console.log(`Room user:${userId} has ${roomSockets?.size || 0} sockets`)
```

---

## Common Issues and Fixes

### Issue 1: Connection Fails

**Symptoms**: Client shows "disconnected", no events received

**Diagnosis**:

```bash
# Check if server is running
curl -v http://localhost:4000/socket.io/?EIO=4&transport=polling

# Check CORS headers
curl -I -X OPTIONS http://localhost:4000/socket.io/ \
  -H "Origin: http://localhost:3002"
```

**Common causes**:

- Server not running on port 4000
- CORS blocking the connection
- Wrong transport protocol (websocket vs polling)
- Firewall blocking WebSocket upgrade

**Fix**:

```typescript
// Server: Verify CORS configuration
const io = new SocketServer(server, {
  cors: {
    origin: ['http://localhost:3002'], // Match your frontend URL
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Allow fallback
})
```

### Issue 2: Authentication Fails

**Symptoms**: Connection error "INVALID_TOKEN" or "NO_TOKEN"

**Diagnosis**:

```typescript
// Client: Verify token is being sent
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-here' },
})

// Server: Log token verification
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  console.log('[AUTH] Token received:', token?.substring(0, 20) + '...')

  try {
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY)
    console.log('[AUTH] Decoded:', decoded)
    socket.data.userId = decoded.sub
    next()
  } catch (err) {
    console.error('[AUTH] Verification failed:', err.message)
    next(new Error('INVALID_TOKEN'))
  }
})
```

**Common causes**:

- Token not passed in `auth` object (not in query string)
- Token expired
- JWT_PUBLIC_KEY doesn't match the key that signed the token
- Token format incorrect (should be raw JWT string, not "Bearer ...")

**Fix**:

```typescript
// Client: Correct token passing
const socket = io('http://localhost:4000', {
  auth: { token: accessToken }, // NOT "Bearer " prefix
})
```

### Issue 3: Not Receiving Price Updates

**Symptoms**: Connected and authenticated, but no price events

**Diagnosis**:

```typescript
// 1. Verify subscription
socket.on('subscribe:prices', (data) => {
  console.log('[SUBSCRIBE] Symbols:', data.symbols)
  data.symbols.forEach((symbol) => {
    socket.join(`prices:${symbol}`)
    console.log(`[SUBSCRIBE] Joined room: prices:${symbol}`)
  })
})

// 2. Verify emission
function emitPriceUpdate(symbol: string, data: PriceUpdate) {
  console.log(`[EMIT] Price update for ${symbol}:`, data)
  io.to(`prices:${symbol}`).emit('price:update', {
    symbol,
    ...data,
  })
}

// 3. Check room membership
const room = io.sockets.adapter.rooms.get(`prices:EURUSD`)
console.log(`[ROOM] prices:EURUSD has ${room?.size || 0} subscribers`)
```

**Common causes**:

- Client not subscribing to symbols
- Server emitting to wrong room name
- Symbol name mismatch (case-sensitive: "EURUSD" vs "eurusd")
- Price feed worker not running

**Fix**:

```typescript
// Client: Subscribe correctly
socket.emit('subscribe:prices', { symbols: ['EURUSD', 'GBPUSD'] })

// Server: Emit to correct room
io.to(`prices:${symbol}`).emit('price:update', data)
```

### Issue 4: User-Specific Events Not Received

**Symptoms**: Trade updates, account metrics not reaching specific user

**Diagnosis**:

```typescript
// Verify user room
const userRoom = io.sockets.adapter.rooms.get(`user:${userId}`)
console.log(`[ROOM] user:${userId} has ${userRoom?.size || 0} sockets`)

// Verify emission
function emitToUser(userId: string, event: string, data: unknown) {
  console.log(`[EMIT] To user:${userId}, event: ${event}`, data)
  io.to(`user:${userId}`).emit(event, data)
}
```

**Common causes**:

- User ID mismatch between JWT and room name
- Multiple connections for same user (race condition)
- Socket disconnected before event emitted

**Fix**:

```typescript
// Server: Ensure consistent user ID
io.on('connection', (socket) => {
  const userId = socket.data.userId
  socket.join(`user:${userId}`)
  console.log(`[JOIN] user:${userId}`)
})
```

### Issue 5: Memory Leak from Room Accumulation

**Symptoms**: Server memory grows over time, performance degrades

**Diagnosis**:

```typescript
// Monitor room count
setInterval(() => {
  const rooms = io.sockets.adapter.rooms
  console.log(`[MONITOR] Active rooms: ${rooms.size}`)
  rooms.forEach((sockets, room) => {
    if (sockets.size === 0) {
      console.log(`[MONITOR] Empty room: ${room}`)
    }
  })
}, 60000) // Every minute
```

**Common causes**:

- Sockets not leaving rooms on disconnect
- Orphaned rooms from crashed connections
- Not cleaning up on user logout

**Fix**:

```typescript
// Server: Clean up on disconnect
socket.on('disconnect', (reason) => {
  console.log(`[DISCONNECT] ${socket.id}, reason: ${reason}`)

  // Leave all rooms except default
  const rooms = Array.from(socket.rooms)
  rooms.forEach((room) => {
    if (room !== socket.id) {
      socket.leave(room)
    }
  })
})
```

---

## Debugging Checklist

When troubleshooting Socket.io issues:

- [ ] Server running and accessible on port 4000
- [ ] CORS allows frontend origin
- [ ] Client connects with `auth: { token }` (not query string)
- [ ] JWT is valid and not expired
- [ ] JWT_PUBLIC_KEY matches the signing key
- [ ] Client subscribes to correct symbols
- [ ] Server emits to correct room names
- [ ] Symbol names match exactly (case-sensitive)
- [ ] User ID consistent between JWT and room names
- [ ] No empty rooms accumulating (memory leak check)
- [ ] Price feed worker is running
- [ ] Redis adapter configured (if multi-server)

---

## Testing Socket.io Locally

### Manual Testing with Socket.io Client

```bash
# Install CLI tool
npm install -g wscat

# Test connection
wscat -c "ws://localhost:4000/socket.io/?EIO=4&transport=websocket"
```

### Automated Testing

```typescript
// apps/api/src/__tests__/socket.test.ts
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { io as ioc, Socket as ClientSocket } from 'socket.io-client'
import jwt from 'jsonwebtoken'

describe('Socket.io', () => {
  let httpServer: ReturnType<typeof createServer>
  let io: SocketServer
  let clientSocket: ClientSocket

  beforeEach((done) => {
    httpServer = createServer()
    io = new SocketServer(httpServer)

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port

      // Create valid token
      const token = jwt.sign({ sub: 'user123', email: 'test@example.com' }, JWT_PRIVATE_KEY, {
        algorithm: 'RS256',
      })

      clientSocket = ioc(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket'],
      })

      clientSocket.on('connect', done)
    })
  })

  afterEach(() => {
    io.close()
    clientSocket.close()
  })

  it('should authenticate with valid JWT', () => {
    expect(clientSocket.connected).toBe(true)
  })

  it('should receive price updates after subscription', (done) => {
    clientSocket.emit('subscribe:prices', { symbols: ['EURUSD'] })

    io.to('prices:EURUSD').emit('price:update', {
      symbol: 'EURUSD',
      bid: '108500',
      ask: '108520',
    })

    clientSocket.on('price:update', (data) => {
      expect(data.symbol).toBe('EURUSD')
      expect(data.bid).toBe('108500')
      done()
    })
  })
})
```

---

## Production Debugging

### Enable Socket.io Debug Logging

```bash
# Server-side
DEBUG=socket.io* node apps/api/src/index.ts

# Client-side
localStorage.debug = 'socket.io-client:socket'
```

### Monitor Active Connections

```typescript
// Admin endpoint to check socket status
router.get('/admin/sockets', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  const rooms = Array.from(io.sockets.adapter.rooms.entries())
  const connections = io.sockets.sockets.size

  res.json({
    data: {
      connections,
      rooms: rooms.map(([name, sockets]) => ({
        name,
        sockets: sockets.size,
      })),
    },
  })
})
```

### Redis Adapter Monitoring

If using Redis adapter for multi-server:

```typescript
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()

await Promise.all([pubClient.connect(), subClient.connect()])

io.adapter(createAdapter(pubClient, subClient))

// Monitor Redis keys
const keys = await pubClient.keys('socket.io*')
console.log('Socket.io Redis keys:', keys)
```
