import express, { type Express } from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'

import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { instrumentsRouter } from './routes/instruments.js'
import { tradesRouter } from './routes/trades.js'
import { depositsRouter } from './routes/deposits.js'
import { withdrawalsRouter } from './routes/withdrawals.js'
import { kycRouter } from './routes/kyc.js'
import { alertsRouter } from './routes/alerts.js'
import { watchlistRouter } from './routes/watchlist.js'
import { notificationsRouter } from './routes/notifications.js'
import { signalsRouter } from './routes/signals.js'
import { adminRouter } from './routes/admin/index.js'
import { ibRouter } from './routes/ib/index.js'
import { webhooksRouter } from './routes/webhooks.js'

import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { registerSocketHandlers } from './lib/socket.js'
import { prisma } from './lib/prisma.js'
import { getRedis } from './lib/redis.js'
import { createLogger } from './lib/logger.js'
import { scheduleRecurringJobs } from './lib/queues.js'
import { startMarketData, stopMarketData } from './services/market-data.js'
import './workers/rollover.js'

const log = createLogger('server')

const app: Express = express()
const httpServer = createServer(app)

// ── Readiness State ───────────────────────────────────────────────
let appReady = false
let startupErrors: string[] = []

// ── Socket.io ─────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      process.env['PLATFORM_URL'] ?? 'http://localhost:3002',
      process.env['ADMIN_URL'] ?? 'http://localhost:3003',
      process.env['IB_PORTAL_URL'] ?? 'http://localhost:3004',
      process.env['AUTH_APP_URL'] ?? 'http://localhost:3005',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

registerSocketHandlers(io)

// ── Global Middleware ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdn.tradingview.com'],
    },
  },
}))

app.use(cors({
  origin: [
    process.env['WEB_URL'] ?? 'http://localhost:3000',
    process.env['AUTH_URL'] ?? 'http://localhost:3001',
    process.env['PLATFORM_URL'] ?? 'http://localhost:3002',
    process.env['ADMIN_URL'] ?? 'http://localhost:3003',
    process.env['IB_PORTAL_URL'] ?? 'http://localhost:3004',
    process.env['AUTH_APP_URL'] ?? 'http://localhost:3005',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}))

app.use(compression())
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))
app.use(requestLogger)

// ── Rate Limiting ─────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error_code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error_code: 'RATE_LIMITED', message: 'Too many auth attempts. Try again in 15 minutes.' },
})

app.use('/v1', globalLimiter)
app.use('/v1/auth/login', authLimiter)
app.use('/v1/auth/register', authLimiter)
app.use('/v1/auth/forgot-password', authLimiter)
app.use('/v1/auth/change-password', authLimiter)

// ── Health Check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'protrader-api' })
})

// ── Readiness Check ───────────────────────────────────────────────
app.get('/ready', (_req, res) => {
  if (!appReady) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      errors: startupErrors,
    })
  }
  return res.json({ status: 'ready', timestamp: new Date().toISOString() })
})

// ── API Routes ────────────────────────────────────────────────────
app.use('/v1/auth', authRouter)
app.use('/v1/users', usersRouter)
app.use('/v1/instruments', instrumentsRouter)
app.use('/v1/trades', tradesRouter)
app.use('/v1/deposits', depositsRouter)
app.use('/v1/withdrawals', withdrawalsRouter)
app.use('/v1/kyc', kycRouter)
app.use('/v1/alerts', alertsRouter)
app.use('/v1/watchlist', watchlistRouter)
app.use('/v1/notifications', notificationsRouter)
app.use('/v1/signals', signalsRouter)
app.use('/v1/admin', adminRouter)
app.use('/v1/ib', ibRouter)
app.use('/v1/webhooks', webhooksRouter)

// ── Error Handler (must be last) ──────────────────────────────────
app.use(errorHandler)

// ── Start ─────────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '4000', 10)

httpServer.listen(PORT, async () => {
  log.info({ port: PORT, env: process.env['NODE_ENV'] ?? 'development' }, 'ProTraderSim API started, initializing critical services...')

  try {
    // Schedule BullMQ recurring jobs (rollover, PnL snapshot, KYC reminder)
    log.info('Scheduling recurring jobs...')
    await scheduleRecurringJobs()
    log.info('Recurring jobs scheduled successfully')
  } catch (err) {
    const msg = `Failed to schedule recurring jobs: ${err instanceof Error ? err.message : String(err)}`
    log.error({ err }, msg)
    startupErrors.push(msg)
  }

  try {
    // Start market data pipeline (Twelve Data WebSocket → Redis → Socket.io)
    log.info('Starting market data pipeline...')
    await startMarketData(io)
    log.info('Market data pipeline started successfully')
  } catch (err) {
    const msg = `Failed to start market data pipeline: ${err instanceof Error ? err.message : String(err)}`
    log.error({ err }, msg)
    startupErrors.push(msg)
  }

  // Mark app as ready only if no startup errors occurred
  if (startupErrors.length === 0) {
    appReady = true
    log.info('All critical services initialized successfully. Server is ready.')
  } else {
    log.warn({ errors: startupErrors }, 'Server started with warnings but is not ready for traffic.')
  }
})

// ── Graceful Shutdown ─────────────────────────────────────────────
let isShuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  log.info({ signal }, 'Graceful shutdown initiated')

  // Stop market data pipeline
  stopMarketData()

  // Create Promises for httpServer.close and io.close with timeout
  const closeHttpServer = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('HTTP server close timeout'))
    }, 10000) // 10 second timeout
    
    httpServer.close((err) => {
      clearTimeout(timeout)
      if (err) {
        log.error({ err }, 'Error closing HTTP server')
        reject(err)
      } else {
        log.info('HTTP server closed')
        resolve()
      }
    })
  })

  const closeSocketIO = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket.io close timeout'))
    }, 10000) // 10 second timeout
    
    io.close(() => {
      clearTimeout(timeout)
      log.info('Socket.io closed')
      resolve()
    })
  })

  // Await both server closures in parallel
  try {
    await Promise.all([closeHttpServer, closeSocketIO])
  } catch (err) {
    log.error({ err }, 'Error closing servers during shutdown')
  }

  // Disconnect Prisma
  try {
    await prisma.$disconnect()
    log.info('Prisma disconnected')
  } catch (err) {
    log.error({ err }, 'Error disconnecting Prisma')
  }

  // Close Redis
  try {
    await getRedis().quit()
    log.info('Redis disconnected')
  } catch (err) {
    log.error({ err }, 'Error disconnecting Redis')
  }

  log.info('Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

export default app
