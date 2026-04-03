import type { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/auth.js'

const JWT_PUBLIC_KEY = process.env['JWT_PUBLIC_KEY'] ?? ''

export function registerSocketHandlers(io: SocketIOServer): void {
  // ── Auth Middleware ──────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined

    if (!token) {
      next(new Error('UNAUTHORIZED'))
      return
    }

    try {
      const payload = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as JwtPayload
      socket.data.user = payload
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  // ── Connection Handler ───────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload
    const userId = user.user_id

    // Every authenticated user joins their private room
    void socket.join(`user:${userId}`)

    // ── Subscribe to price feeds ─────────────────────────────────
    socket.on('subscribe:prices', (data: { symbols: string[] }) => {
      if (!Array.isArray(data.symbols)) return
      // Limit to 20 subscriptions per connection to prevent abuse
      const symbols = data.symbols.slice(0, 20)
      symbols.forEach((symbol) => {
        if (typeof symbol === 'string' && /^[A-Z0-9]{3,12}$/.test(symbol)) {
          void socket.join(`prices:${symbol}`)
        }
      })
    })

    // ── Unsubscribe from price feeds ────────────────────────────
    socket.on('unsubscribe:prices', (data: { symbols: string[] }) => {
      if (!Array.isArray(data.symbols)) return
      data.symbols.forEach((symbol) => {
        void socket.leave(`prices:${symbol}`)
      })
    })

    socket.on('disconnect', () => {
      // Socket.io auto-removes from all rooms on disconnect
    })
  })
}

// ── Server reference (set once on startup, accessed by workers/services) ─────

let _io: SocketIOServer | null = null

/** Called by index.ts after the Socket.io server is created. */
export function setSocketServer(io: SocketIOServer): void {
  _io = io
}

/** Returns the active Socket.io server, or null before startup. */
export function getSocketIO(): SocketIOServer | null {
  return _io
}

// ── Emit helpers (used by services) ──────────────────────────────

// Broadcast price update to all subscribers of a symbol
export function emitPriceUpdate(
  io: SocketIOServer,
  symbol: string,
  data: PriceUpdatePayload,
): void {
  io.to(`prices:${symbol}`).emit('price:update', data)
}

// Send private event to a specific trader
export function emitToUser(io: SocketIOServer, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data)
}

// Send to all admin panel connections
export function emitToAdmin(io: SocketIOServer, event: string, data: unknown): void {
  io.to('admin:panel').emit(event, data)
}

// ── Payload types ────────────────────────────────────────────────
export interface PriceUpdatePayload {
  symbol: string
  bid_scaled: string // BigInt as string
  ask_scaled: string
  mid_scaled: string
  change_bps: string
  ts: string
}

export interface TradeOpenedPayload {
  trade_id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  units: string
  open_rate_scaled: string
}

export interface AccountMetricsPayload {
  balance_cents: string
  unrealized_pnl_cents: string
  equity_cents: string
  used_margin_cents: string
  available_cents: string
  margin_level_bps: string | null
}
