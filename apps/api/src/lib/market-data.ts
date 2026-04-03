import WebSocket from 'ws'
import { setCachedPrice } from './redis.js'
import { calcBidAsk } from './calculations.js'
import { createLogger } from './logger.js'
import { emitPriceUpdate } from './socket.js'
import { io } from '../index.js'

const log = createLogger('market-data')

// ── Configuration ─────────────────────────────────────────────
const TWELVE_DATA_WS_URL =
  process.env['TWELVE_DATA_WS_URL'] ?? 'wss://ws.twelvedata.com/v1/quotes/price'
const TWELVE_DATA_API_KEY = process.env['TWELVE_DATA_API_KEY']
const RECONNECT_INTERVAL_MS = 5000
const MAX_RECONNECT_ATTEMPTS = 10
const HEARTBEAT_INTERVAL_MS = 30000

// ── State ─────────────────────────────────────────────────────
let ws: WebSocket | null = null
let reconnectAttempts = 0
let heartbeatTimer: NodeJS.Timeout | null = null
let isConnected = false
let subscribedSymbols = new Set<string>()

// ── Twelve Data Message Types ──────────────────────────────────
interface TwelveDataAuthMessage {
  action: 'auth'
  key: string
}

interface TwelveDataSubscribeMessage {
  action: 'subscribe'
  params: {
    symbols: string[]
  }
}

interface TwelveDataPriceUpdate {
  event: 'price'
  symbol: string
  price: number
  timestamp: number
  volume?: number
  change?: number
  change_percent?: number
}

// ── Connection Management ──────────────────────────────────────
export function startMarketData(): void {
  if (!TWELVE_DATA_API_KEY) {
    log.error('TWELVE_DATA_API_KEY not configured — skipping market data connection')
    return
  }

  log.info('Starting market data pipeline')
  connect()
}

export function stopMarketData(): void {
  log.info('Stopping market data pipeline')

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  if (ws) {
    ws.close()
    ws = null
  }

  isConnected = false
  reconnectAttempts = 0
}

function connect(): void {
  if (ws) {
    ws.close()
  }

  log.info({ attempt: reconnectAttempts + 1 }, 'Connecting to Twelve Data WebSocket')

  ws = new WebSocket(TWELVE_DATA_WS_URL)

  ws.on('open', () => {
    log.info('WebSocket connected')
    isConnected = true
    reconnectAttempts = 0

    // Authenticate
    const authMessage: TwelveDataAuthMessage = {
      action: 'auth',
      key: TWELVE_DATA_API_KEY!,
    }
    ws!.send(JSON.stringify(authMessage))

    // Start heartbeat
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping()
      }
    }, HEARTBEAT_INTERVAL_MS)
  })

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())

      if (message.event === 'auth' && message.status === 'ok') {
        log.info('Authenticated successfully')
        subscribeToAllInstruments()
      } else if (message.event === 'price') {
        handlePriceUpdate(message as TwelveDataPriceUpdate)
      } else if (message.event === 'error') {
        log.error({ error: message }, 'Twelve Data error')
      }
    } catch (error) {
      log.error({ error, data: data.toString() }, 'Failed to parse WebSocket message')
    }
  })

  ws.on('close', (code, reason) => {
    log.warn({ code, reason: reason.toString() }, 'WebSocket closed')
    isConnected = false

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    // Reconnect if not intentional close
    if (code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++
      setTimeout(connect, RECONNECT_INTERVAL_MS * reconnectAttempts)
    }
  })

  ws.on('error', (error) => {
    log.error({ error }, 'WebSocket error')
  })

  ws.on('ping', () => {
    // Respond to ping
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.pong()
    }
  })
}

// ── Subscription Management ────────────────────────────────────
async function subscribeToAllInstruments(): Promise<void> {
  // Get all instruments from database
  const { prisma } = await import('./prisma.js')

  const instruments = await prisma.instrument.findMany({
    select: { symbol: true, twelveDataSymbol: true },
  })

  const symbols = instruments.map((inst) => inst.twelveDataSymbol || inst.symbol)
  subscribedSymbols = new Set(symbols)

  log.info({ symbolCount: symbols.length }, 'Subscribing to instruments')

  // Twelve Data allows batch subscription
  const subscribeMessage: TwelveDataSubscribeMessage = {
    action: 'subscribe',
    params: {
      symbols,
    },
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(subscribeMessage))
  }
}

// ── Price Processing Pipeline ──────────────────────────────────
function handlePriceUpdate(update: TwelveDataPriceUpdate): Promise<void> {
  return processPriceUpdate(update.symbol, update.price, update.timestamp, update.change_percent)
}

export async function processPriceUpdate(
  twelveDataSymbol: string,
  price: number,
  timestamp: number,
  changePercent?: number,
): Promise<void> {
  try {
    // Find our internal symbol
    const { prisma } = await import('./prisma.js')
    const instrument = await prisma.instrument.findFirst({
      where: {
        OR: [{ twelveDataSymbol }, { symbol: twelveDataSymbol }],
      },
      select: {
        symbol: true,
        spreadPips: true,
        pipDecimalPlaces: true,
      },
    })

    if (!instrument) {
      log.debug({ twelveDataSymbol }, 'Received price for unknown instrument')
      return
    }

    const { symbol, spreadPips, pipDecimalPlaces } = instrument

    // Convert price to our scaled format (×100000)
    const midScaled = BigInt(Math.round(price * 100000))

    // Apply spread to get bid/ask
    const { bidScaled, askScaled } = calcBidAsk(midScaled, spreadPips, pipDecimalPlaces)

    // Calculate change in basis points
    const changeBps = changePercent ? BigInt(Math.round(changePercent * 100)) : 0n

    const priceData = {
      symbol,
      bid_scaled: bidScaled.toString(),
      ask_scaled: askScaled.toString(),
      mid_scaled: midScaled.toString(),
      change_bps: changeBps.toString(),
      ts: timestamp.toString(),
    }

    // Cache in Redis
    await setCachedPrice(symbol, priceData)

    // Broadcast via Socket.io
    emitPriceUpdate(io, symbol, priceData)

    log.debug(
      { symbol, price: price.toFixed(5), bid: bidScaled.toString(), ask: askScaled.toString() },
      'Price updated',
    )
  } catch (error) {
    log.error({ error, twelveDataSymbol, price }, 'Failed to process price update')
  }
}

// ── Health Check ──────────────────────────────────────────────
export function getMarketDataStatus(): {
  connected: boolean
  subscribedSymbols: number
  reconnectAttempts: number
} {
  return {
    connected: isConnected,
    subscribedSymbols: subscribedSymbols.size,
    reconnectAttempts,
  }
}
