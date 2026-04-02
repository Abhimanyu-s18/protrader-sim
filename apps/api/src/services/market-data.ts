import type { Prisma } from '@prisma/client'
import WebSocket from 'ws'
import { prisma, withSerializableRetry } from '../lib/prisma.js'
import { getRedis, setCachedPrice, removeMarginWatch, addMarginWatch } from '../lib/redis.js'
import {
  calcBidAsk,
  calcPnlCents,
  calcIbCommissionCents,
  priceToScaled,
  serializeBigInt,
  formatCents,
} from '../lib/calculations.js'
import { emitPriceUpdate, emitToUser, type PriceUpdatePayload } from '../lib/socket.js'
import { createLogger } from '../lib/logger.js'
import type { Server as SocketIOServer } from 'socket.io'

const log = createLogger('market-data')

const TWELVE_DATA_WS_URL = 'wss://ws.twelvedata.com/v1/quotes/price'
const RECONNECT_DELAY_MS = 5000
const MAX_RECONNECT_ATTEMPTS = 50
const PENDING_ORDERS_CACHE_TTL_SECONDS = 60

let ws: WebSocket | null = null
let reconnectAttempts = 0
let ioRef: SocketIOServer | null = null
let instrumentMap: Map<string, InstrumentInfo> = new Map()
let isRunning = false

// ── Pending Orders Cache ────────────────────────────────────────
// The checkEntryOrders function caches pending entry orders in Redis to avoid
// querying the DB on every price tick. Cache is keyed by instrumentId.
// IMPORTANT: Any code that creates, updates, or cancels pending orders MUST
// call invalidatePendingOrdersCache(instrumentId) to maintain consistency.
// This includes:
// - Order creation routes (likely in apps/api/src/routes/trades.ts or similar)
// - Order cancellation from user API
// - Any admin/agent operations that modify order status
// ────────────────────────────────────────────────────────────────

interface InstrumentInfo {
  id: string
  symbol: string
  twelveDataSymbol: string
  contractSize: number
  leverage: number
  spreadPips: number
  pipDecimalPlaces: number
  // TODO: Use marginCallBps and stopOutBps for real-time margin monitoring
  // Future feature: detect when user equity falls below margin call (e.g., 100%) or stop out (e.g., 50%) thresholds
  marginCallBps: bigint
  stopOutBps: bigint
}

interface TickData {
  symbol: string
  price: number
  timestamp: number
  percent_change?: number
  change?: number
  open?: number
  high?: number
  low?: number
  close?: number
}

/**
 * Start the market data pipeline.
 * 1. Loads active instruments from DB
 * 2. Connects to Twelve Data WebSocket
 * 3. Subscribes to all instrument feeds
 * 4. Processes price ticks through the pipeline
 */
export async function startMarketData(socketIO: SocketIOServer): Promise<void> {
  ioRef = socketIO
  await loadInstruments()
  connect()
  log.info({ instrumentCount: instrumentMap.size }, 'Market data pipeline connection initiated')
}

/**
 * Stop the market data pipeline and clean up resources.
 */
export function stopMarketData(): void {
  isRunning = false
  if (ws) {
    ws.close(1000, 'Shutdown')
    ws = null
  }
  reconnectAttempts = 0
  ioRef = null
  instrumentMap.clear()
  log.info('Market data pipeline stopped')
}

/**
 * Get cached pending entry orders for an instrument, or fetch from DB and cache.
 * Cache key: pending_orders:{instrumentId} with TTL to minimize stale data.
 * Filters out orders that have expired (expiryAt <= now) when reading from cache or DB.
 * TTL is set to the minimum of the configured TTL and the time until earliest expiry.
 *
 * NOTE: For optimal performance with cache misses, a composite index should exist:
 *   CREATE INDEX idx_trade_pending_orders
 *   ON "Trade"(instrumentId, status, orderType)
 *   WHERE status = 'PENDING' AND orderType = 'ENTRY'
 *
 * This ensures occasional DB reads (cache misses) remain efficient.
 */
async function getCachedPendingOrders(instrumentId: string): Promise<
  Array<{
    id: bigint
    userId: bigint
    direction: 'BUY' | 'SELL'
    units: bigint
    entryRateScaled: bigint | null
    stopLossScaled: bigint | null
    takeProfitScaled: bigint | null
  }>
> {
  const redis = getRedis()
  const cacheKey = `pending_orders:${instrumentId}`
  const now = new Date()

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      const orders = JSON.parse(cached) as Array<{
        id: string
        userId: string
        direction: 'BUY' | 'SELL'
        units: string
        entryRateScaled: string | null
        stopLossScaled: string | null
        takeProfitScaled: string | null
        expiryAt: string | null
      }>

      // Filter out expired orders and convert to BigInt types
      const validOrders = orders
        .filter((o) => o.expiryAt === null || new Date(o.expiryAt) > now)
        .map((o) => ({
          id: BigInt(o.id),
          userId: BigInt(o.userId),
          direction: o.direction,
          units: BigInt(o.units),
          entryRateScaled: o.entryRateScaled ? BigInt(o.entryRateScaled) : null,
          stopLossScaled: o.stopLossScaled ? BigInt(o.stopLossScaled) : null,
          takeProfitScaled: o.takeProfitScaled ? BigInt(o.takeProfitScaled) : null,
        }))

      if (validOrders.length > 0) {
        return validOrders
      }
      // If all cached orders were expired, fall through to fetch fresh from DB
    } catch (err) {
      log.warn({ err, cacheKey }, 'Failed to parse cached pending orders, falling back to DB')
    }
  }

  // Cache miss or parse error — fetch from DB
  const orders = await prisma.trade.findMany({
    where: {
      instrumentId: BigInt(instrumentId),
      status: 'PENDING',
      orderType: 'ENTRY',
      OR: [{ expiryAt: null }, { expiryAt: { gt: now } }],
    },
    select: {
      id: true,
      userId: true,
      direction: true,
      units: true,
      entryRateScaled: true,
      stopLossScaled: true,
      takeProfitScaled: true,
      expiryAt: true,
    },
  })

  // Cache the result with TTL limited by nearest expiry
  try {
    const serialized = orders.map((o: (typeof orders)[number]) => ({
      id: o.id.toString(),
      userId: o.userId.toString(),
      direction: o.direction,
      units: o.units.toString(),
      entryRateScaled: o.entryRateScaled?.toString() ?? null,
      stopLossScaled: o.stopLossScaled?.toString() ?? null,
      takeProfitScaled: o.takeProfitScaled?.toString() ?? null,
      expiryAt: o.expiryAt?.toISOString() ?? null,
    }))

    // Calculate TTL: min(configured TTL, time until earliest expiry)
    let cacheTtl = PENDING_ORDERS_CACHE_TTL_SECONDS
    const expiringOrders = orders.filter((o) => o.expiryAt !== null)
    if (expiringOrders.length > 0) {
      const nearestExpiry = expiringOrders.reduce(
        (earliest: Date, o) => (o.expiryAt! < earliest ? o.expiryAt! : earliest),
        expiringOrders[0]!.expiryAt!,
      )

      const secondsUntilExpiry = Math.max(
        1,
        Math.ceil((nearestExpiry.getTime() - now.getTime()) / 1000),
      )
      cacheTtl = Math.min(cacheTtl, secondsUntilExpiry)
    }

    await redis.setex(cacheKey, cacheTtl, JSON.stringify(serialized))
  } catch (err) {
    log.error({ err, cacheKey }, 'Failed to cache pending orders')
  }

  return orders.map((o: (typeof orders)[number]) => ({
    id: o.id,
    userId: o.userId,
    direction: o.direction as 'BUY' | 'SELL',
    units: o.units,
    entryRateScaled: o.entryRateScaled,
    stopLossScaled: o.stopLossScaled,
    takeProfitScaled: o.takeProfitScaled,
  }))
}

/**
 * Invalidate pending orders cache for an instrument.
 * Called when orders are created, updated, or cancelled.
 * EXPORTED: Other modules (routes, services) must call this when mutating pending orders.
 */
export async function invalidatePendingOrdersCache(instrumentId: string): Promise<void> {
  const redis = getRedis()
  const cacheKey = `pending_orders:${instrumentId}`
  await redis.del(cacheKey)
}

/**
 * Load active instruments from database into memory.
 */
async function loadInstruments(): Promise<void> {
  const instruments = await prisma.instrument.findMany({
    where: { isActive: true },
    select: {
      id: true,
      symbol: true,
      twelveDataSymbol: true,
      contractSize: true,
      leverage: true,
      spreadPips: true,
      pipDecimalPlaces: true,
      marginCallBps: true,
      stopOutBps: true,
    },
  })

  instrumentMap = new Map()
  for (const inst of instruments) {
    const tdSymbol = inst.twelveDataSymbol ?? inst.symbol
    if (instrumentMap.has(tdSymbol)) {
      log.error(
        {
          tdSymbol,
          instrumentId: inst.id.toString(),
          symbol: inst.symbol,
          existingId: instrumentMap.get(tdSymbol)?.id,
        },
        'Duplicate instrument TD symbol found — skipping duplicate',
      )
      continue
    }
    instrumentMap.set(tdSymbol, {
      id: inst.id.toString(),
      symbol: inst.symbol,
      twelveDataSymbol: tdSymbol,
      contractSize: inst.contractSize,
      leverage: inst.leverage,
      spreadPips: inst.spreadPips,
      pipDecimalPlaces: inst.pipDecimalPlaces,
      marginCallBps: inst.marginCallBps,
      stopOutBps: inst.stopOutBps,
    })
  }
}

/**
 * Connect to Twelve Data WebSocket API with reconnection logic.
 */
function connect(): void {
  const apiKey = process.env['TWELVE_DATA_API_KEY']
  if (!apiKey) {
    log.error('TWELVE_DATA_API_KEY not set — market data pipeline disabled')
    return
  }

  isRunning = true
  ws = new WebSocket(`${TWELVE_DATA_WS_URL}?apikey=${apiKey}`)

  ws.on('open', () => {
    log.info('Connected to Twelve Data WebSocket')
    reconnectAttempts = 0
    subscribeAll()
  })

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as Record<string, unknown>
      handleMessage(msg)
    } catch (err) {
      log.error({ err, raw: raw.toString() }, 'Failed to parse WebSocket message')
    }
  })

  ws.on('close', (code, reason) => {
    log.warn({ code, reason: reason.toString() }, 'WebSocket connection closed')
    if (isRunning) scheduleReconnect()
  })

  ws.on('error', (err) => {
    log.error({ err }, 'WebSocket error')
    // 'close' event will follow, triggering reconnect
  })
}

/**
 * Schedule reconnection with exponential backoff.
 */
function scheduleReconnect(): void {
  if (!isRunning) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log.error('Max reconnect attempts reached — giving up')
    return
  }

  reconnectAttempts++
  // Exponential backoff: 2^n with a cap at 2^10 (1024x base delay)
  const exponent = Math.min(Math.max(reconnectAttempts - 1, 0), 10)
  const delay = RECONNECT_DELAY_MS * 2 ** exponent
  log.info(
    { attempt: reconnectAttempts, delayMs: delay },
    'Scheduling reconnect with exponential backoff',
  )
  setTimeout(() => {
    if (isRunning) connect()
  }, delay)
}

/**
 * Subscribe to price feeds for all active instruments.
 */
function subscribeAll(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  const symbols = Array.from(instrumentMap.keys())
  // Subscribe in batches of 20 to avoid overwhelming the connection
  for (let i = 0; i < symbols.length; i += 20) {
    const batch = symbols.slice(i, i + 20)
    ws.send(
      JSON.stringify({
        action: 'subscribe',
        params: { symbols: batch.join(',') },
      }),
    )
  }

  log.info({ symbolCount: symbols.length }, 'Subscribed to price feeds')
}

/**
 * Handle incoming WebSocket message.
 */
function handleMessage(msg: Record<string, unknown>): void {
  // Handle status messages
  if (msg['event'] === 'connected') {
    log.info({ status: msg['status'] }, 'Twelve Data connection confirmed')
    return
  }

  if (msg['event'] === 'heartbeat') {
    log.debug('Heartbeat received')
    return
  }

  // Handle subscription confirmation
  if (msg['event'] === 'subscribed') {
    log.debug({ symbols: msg['symbols'] }, 'Subscription confirmed')
    return
  }

  // Handle price tick
  if (msg['event'] === 'price' || (msg['symbol'] && msg['price'])) {
    const tick = parseTick(msg)
    if (tick) {
      void processTick(tick)
    }
    return
  }

  // Handle error
  if (msg['event'] === 'error') {
    log.error({ code: msg['code'], message: msg['message'] }, 'Twelve Data error')
    return
  }
}

/**
 * Parse raw message into TickData.
 */
function parseTick(msg: Record<string, unknown>): TickData | null {
  const symbol = msg['symbol']
  const price = msg['price']

  if (typeof symbol !== 'string' || (typeof price !== 'string' && typeof price !== 'number')) {
    return null
  }

  const tick: TickData = {
    symbol,
    price: typeof price === 'string' ? parseFloat(price) : price,
    timestamp: typeof msg['timestamp'] === 'number' ? msg['timestamp'] : Date.now() / 1000,
  }

  if (typeof msg['percent_change'] === 'string') {
    tick.percent_change = parseFloat(msg['percent_change'])
  } else if (typeof msg['percent_change'] === 'number') {
    tick.percent_change = msg['percent_change']
  }

  if (typeof msg['change'] === 'string') {
    tick.change = parseFloat(msg['change'])
  } else if (typeof msg['change'] === 'number') {
    tick.change = msg['change']
  }

  const maybeNum = (v: unknown): number | undefined =>
    typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : undefined

  const isValidNum = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n)

  const open = maybeNum(msg['open'])
  const high = maybeNum(msg['high'])
  const low = maybeNum(msg['low'])
  const close = maybeNum(msg['close'])
  if (isValidNum(open)) tick.open = open
  if (isValidNum(high)) tick.high = high
  if (isValidNum(low)) tick.low = low
  if (isValidNum(close)) tick.close = close
  return tick
}

/**
 * Process a single price tick through the full pipeline:
 * 1. Convert to scaled price
 * 2. Apply spread → bid/ask
 * 3. Calculate change in bps
 * 4. Cache in Redis
 * 5. Broadcast via Socket.io
 * 6. Check stop-loss / take-profit / trailing stops
 * 7. Check entry order triggers
 * 8. Check price alerts
 */
async function processTick(tick: TickData): Promise<void> {
  const inst = instrumentMap.get(tick.symbol)
  if (!inst) return

  // Convert to scaled BigInt
  const midScaled = priceToScaled(tick.price)
  const { bidScaled, askScaled } = calcBidAsk(midScaled, inst.spreadPips, inst.pipDecimalPlaces)

  // Calculate change in basis points
  const changeBps = calcChangeBps(tick.percent_change)

  const ts = new Date(tick.timestamp * 1000).toISOString()

  // Build price payload
  const priceData: PriceUpdatePayload = {
    symbol: inst.symbol,
    bid_scaled: bidScaled.toString(),
    ask_scaled: askScaled.toString(),
    mid_scaled: midScaled.toString(),
    change_bps: changeBps.toString(),
    ts,
  }

  // Cache in Redis
  await setCachedPrice(inst.symbol, {
    bid_scaled: priceData.bid_scaled,
    ask_scaled: priceData.ask_scaled,
    mid_scaled: priceData.mid_scaled,
    change_bps: priceData.change_bps,
    ts: priceData.ts,
  })

  // Broadcast via Socket.io
  if (ioRef) {
    emitPriceUpdate(ioRef, inst.symbol, priceData)
  }

  // Run price-triggered checks in parallel
  const checkNames = ['checkStopLossTakeProfit', 'checkEntryOrders', 'checkAlerts']
  const results = await Promise.allSettled([
    checkStopLossTakeProfit(inst, bidScaled, askScaled),
    checkEntryOrders(inst, bidScaled, askScaled),
    checkAlerts(inst, midScaled),
  ])

  // Log any rejected checks instead of silently swallowing errors
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result && result.status === 'rejected') {
      const rejectedResult = result as PromiseRejectedResult
      log.error(
        { error: rejectedResult.reason, checkFunction: checkNames[i], symbol: inst.symbol },
        `Price check failed: ${checkNames[i]}`,
      )
    }
  }
}

/**
 * Calculate change in basis points from percent_change.
 * Returns 0 if percent_change is not available.
 */
function calcChangeBps(percentChange: number | undefined): number {
  if (percentChange == null || !isFinite(percentChange)) return 0
  return Math.round(percentChange * 100)
}

// ── Stop Loss / Take Profit / Trailing Stop Checks ─────────────

/**
 * Check all open positions for this instrument against SL/TP/trailing stop levels.
 */
async function checkStopLossTakeProfit(
  inst: InstrumentInfo,
  bidScaled: bigint,
  askScaled: bigint,
): Promise<void> {
  const redis = getRedis()
  const userIds = await redis.smembers(`margin_watch:${inst.id}`)
  if (userIds.length === 0) return

  for (const userId of userIds) {
    const trades = await prisma.trade.findMany({
      where: { userId: BigInt(userId), instrumentId: BigInt(inst.id), status: 'OPEN' },
    })

    for (const trade of trades) {
      // Check stop loss
      if (trade.stopLossScaled != null) {
        const slTriggered =
          trade.direction === 'BUY'
            ? bidScaled <= trade.stopLossScaled
            : askScaled >= trade.stopLossScaled

        if (slTriggered) {
          await closeTradeWithReason(trade, inst, bidScaled, askScaled, 'STOP_LOSS', userId)
          continue
        }
      }

      // Check take profit
      if (trade.takeProfitScaled != null) {
        const tpTriggered =
          trade.direction === 'BUY'
            ? bidScaled >= trade.takeProfitScaled
            : askScaled <= trade.takeProfitScaled

        if (tpTriggered) {
          await closeTradeWithReason(trade, inst, bidScaled, askScaled, 'TAKE_PROFIT', userId)
          continue
        }
      }

      // Check trailing stop
      if (trade.trailingStopPips != null && trade.trailingStopPips > 0) {
        await processTrailingStop(trade, inst, bidScaled, askScaled, userId)
      }
    }
  }
}

/**
 * Process trailing stop logic for a single trade.
 * BUY: tracks peak bid price, triggers when bid drops below peak - distance
 * SELL: tracks trough ask price, triggers when ask rises above trough + distance
 */
async function processTrailingStop(
  trade: {
    id: bigint
    direction: 'BUY' | 'SELL'
    units: bigint | number
    openRateScaled: bigint
    trailingStopPips: number | null
  },
  inst: InstrumentInfo,
  bidScaled: bigint,
  askScaled: bigint,
  userId: string,
): Promise<void> {
  if (!trade.trailingStopPips) return

  const redis = getRedis()
  const pipSizeScaled = BigInt(10 ** (5 - inst.pipDecimalPlaces))
  const distanceScaled = BigInt(trade.trailingStopPips) * pipSizeScaled
  const peakKey = `trailing_peak:${trade.id.toString()}`

  if (trade.direction === 'BUY') {
    // Track highest bid seen
    const stored = await redis.get(peakKey)
    const peak = stored ? BigInt(stored) : bidScaled

    if (bidScaled > peak) {
      // New high — update peak
      await redis.set(peakKey, bidScaled.toString())
    } else {
      // Check if price dropped below peak - distance
      const triggerLevel = peak - distanceScaled
      if (bidScaled <= triggerLevel) {
        await closeTradeWithReason(trade, inst, bidScaled, askScaled, 'TRAILING_STOP', userId)
        await redis.del(peakKey)
      }
    }
  } else {
    // SELL — track lowest ask seen
    const stored = await redis.get(peakKey)
    const trough = stored ? BigInt(stored) : askScaled

    if (askScaled < trough) {
      // New low — update trough
      await redis.set(peakKey, askScaled.toString())
    } else {
      // Check if price rose above trough + distance
      const triggerLevel = trough + distanceScaled
      if (askScaled >= triggerLevel) {
        await closeTradeWithReason(trade, inst, bidScaled, askScaled, 'TRAILING_STOP', userId)
        await redis.del(peakKey)
      }
    }
  }
}

/**
 * Close a trade due to SL/TP/trailing stop trigger.
 */
async function closeTradeWithReason(
  trade: {
    id: bigint
    userId?: bigint
    direction: 'BUY' | 'SELL'
    units: bigint | number
    openRateScaled: bigint
  },
  inst: InstrumentInfo,
  bidScaled: bigint,
  askScaled: bigint,
  closedBy: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP',
  userIdStr: string,
): Promise<void> {
  const userId = trade.userId ?? BigInt(userIdStr)
  const closeRateScaled = trade.direction === 'BUY' ? bidScaled : askScaled
  const realizedPnl = calcPnlCents(
    trade.direction,
    trade.openRateScaled,
    closeRateScaled,
    BigInt(trade.units),
    inst.contractSize,
  )

  const shouldRemoveMarginWatch = await withSerializableRetry(() =>
    prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Lock user row
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`

        const [balanceRow] = await tx.$queryRaw<[{ balance_cents: bigint }]>`
        SELECT get_user_balance(${userId}) AS balance_cents
      `
        const currentBalance = balanceRow?.balance_cents ?? 0n
        const newBalance = currentBalance + realizedPnl

        const updateResult = await tx.trade.updateMany({
          where: { id: trade.id, status: 'OPEN' },
          data: {
            status: 'CLOSED',
            closeRateScaled,
            realizedPnlCents: realizedPnl,
            closeAt: new Date(),
            closedBy,
          },
        })
        if (updateResult.count !== 1) return false // Already closed by concurrent operation

        await tx.ledgerTransaction.create({
          data: {
            userId,
            transactionType: 'TRADE_CLOSE',
            amountCents: realizedPnl,
            balanceAfterCents: newBalance,
            referenceId: trade.id,
            referenceType: 'TRADE',
            description: `Trade closed by ${closedBy}: ${trade.direction} ${trade.units} ${inst.symbol}`,
          },
        })

        // Check if any open trades remain for this instrument+user atomically
        const remaining = await tx.trade.count({
          where: { userId, instrumentId: BigInt(inst.id), status: 'OPEN' },
        })
        return remaining === 0
      },
      { isolationLevel: 'Serializable' },
    ),
  )

  // Remove from margin watch if no more open positions (after transaction completes safely)
  if (shouldRemoveMarginWatch) {
    await removeMarginWatch(inst.id, userIdStr)
  }

  // Notify user via Socket.io
  if (ioRef) {
    emitToUser(
      ioRef,
      userIdStr,
      'trade:closed',
      serializeBigInt({
        trade_id: trade.id,
        symbol: inst.symbol,
        direction: trade.direction,
        closed_by: closedBy,
        realized_pnl_cents: realizedPnl.toString(),
        realized_pnl_formatted: formatCents(realizedPnl),
      }),
    )
  }

  log.info(
    { tradeId: trade.id.toString(), closedBy, pnl: realizedPnl.toString() },
    'Trade closed by trigger',
  )
}

// ── Entry Order Checks ─────────────────────────────────────────

/**
 * Check pending entry orders for this instrument against current prices.
 * BUY entry triggers when ask reaches or goes below entry rate
 * SELL entry triggers when bid reaches or goes above entry rate
 * Uses cached pending orders to avoid DB query on every tick.
 */
async function checkEntryOrders(
  inst: InstrumentInfo,
  bidScaled: bigint,
  askScaled: bigint,
): Promise<void> {
  const pendingOrders = await getCachedPendingOrders(inst.id)

  for (const order of pendingOrders) {
    if (order.entryRateScaled == null) continue

    const triggered =
      order.direction === 'BUY'
        ? askScaled <= order.entryRateScaled
        : bidScaled >= order.entryRateScaled

    if (triggered) {
      await executeEntryOrder(order, inst, bidScaled, askScaled)
    }
  }
}

/**
 * Execute a triggered entry order — convert from PENDING to OPEN.
 */
async function executeEntryOrder(
  order: {
    id: bigint
    userId: bigint
    direction: 'BUY' | 'SELL'
    units: bigint
    entryRateScaled: bigint | null
    stopLossScaled: bigint | null
    takeProfitScaled: bigint | null
  },
  inst: InstrumentInfo,
  bidScaled: bigint,
  askScaled: bigint,
): Promise<void> {
  const openRateScaled = order.direction === 'BUY' ? askScaled : bidScaled
  const marginCents =
    (BigInt(inst.contractSize) * order.units * openRateScaled * 100n) /
    (BigInt(inst.leverage) * 100000n)

  try {
    await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Lock user row
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${order.userId} FOR UPDATE`

          // Check available margin
          const [balanceRow] = await tx.$queryRaw<[{ balance_cents: bigint }]>`
          SELECT get_user_balance(${order.userId}) AS balance_cents
        `
          const openTrades = await tx.trade.findMany({
            where: { userId: order.userId, status: 'OPEN' },
            select: { marginRequiredCents: true, unrealizedPnlCents: true },
          })
          const usedMargin = openTrades.reduce(
            (sum: bigint, t: { marginRequiredCents: bigint }) => sum + t.marginRequiredCents,
            0n,
          )
          const unrealizedPnl = openTrades.reduce(
            (sum: bigint, t: { unrealizedPnlCents: bigint }) => sum + t.unrealizedPnlCents,
            0n,
          )
          const equity = (balanceRow?.balance_cents ?? 0n) + unrealizedPnl
          const available = equity - usedMargin

          if (marginCents > available) {
            // Cancel order — insufficient margin
            await tx.trade.update({
              where: { id: order.id },
              data: { status: 'CANCELLED' },
            })
            log.info(
              { orderId: order.id.toString() },
              'Entry order cancelled — insufficient margin',
            )
            return
          }

          // Update trade to OPEN
          const updateResult = await tx.trade.updateMany({
            where: { id: order.id, status: 'PENDING' },
            data: {
              status: 'OPEN',
              openRateScaled,
              marginRequiredCents: marginCents,
            },
          })
          if (updateResult.count !== 1) return // Already processed

          // Create IB commission if agent assigned
          const user = await tx.user.findUnique({
            where: { id: order.userId },
            select: { agentId: true },
          })
          if (user?.agentId) {
            const agent = await tx.staff.findUnique({
              where: { id: user.agentId },
              select: { id: true, commissionRateBps: true },
            })
            if (agent) {
              const commissionCents = calcIbCommissionCents(
                order.units,
                inst.contractSize,
                openRateScaled,
                agent.commissionRateBps,
              )
              if (commissionCents > 0n) {
                await tx.ibCommission.create({
                  data: {
                    agentId: agent.id,
                    traderId: order.userId,
                    tradeId: order.id,
                    amountCents: commissionCents,
                    rateBps: agent.commissionRateBps,
                  },
                })
              }
            }
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    // Add to margin watch immediately BEFORE any other async operations.
    // This is critical: checkStopLossTakeProfit queries the margin_watch set,
    // so the user must be added to margin watch before price ticks can check for SL/TP.
    // Otherwise a race with removeMarginWatch (from closeTradeWithReason) could cause
    // the user's position to never be monitored. Doing this before cache invalidation
    // ensures trade state and margin watch state stay synchronized.
    try {
      await addMarginWatch(inst.id, order.userId.toString())
    } catch (err) {
      log.error(
        { err, orderId: order.id.toString(), instrumentId: inst.id, symbol: inst.symbol },
        'Failed to add margin watch after entry order execution - reverting trade to PENDING',
      )
      // Compensating action: revert trade status back to PENDING since margin watch failed
      // This ensures the position won't be left unmonitored
      try {
        await prisma.trade.updateMany({
          where: { id: order.id, status: 'OPEN' },
          data: { status: 'PENDING' },
        })
        log.info(
          { orderId: order.id.toString() },
          'Trade reverted to PENDING due to margin watch failure',
        )
      } catch (revertErr) {
        log.error(
          { err: revertErr, orderId: order.id.toString() },
          'Failed to revert trade status after margin watch failure',
        )
      }
      return // Exit early since trade is no longer open
    }

    // Invalidate pending orders cache for this instrument after successful transaction
    try {
      await invalidatePendingOrdersCache(inst.id)
    } catch (err) {
      log.warn(
        { err, orderId: order.id.toString(), instrumentId: inst.id },
        'Failed to invalidate pending orders cache after entry order execution',
      )
    }

    // Notify user
    if (ioRef) {
      try {
        emitToUser(
          ioRef,
          order.userId.toString(),
          'trade:opened',
          serializeBigInt({
            trade_id: order.id,
            symbol: inst.symbol,
            direction: order.direction,
            units: order.units.toString(),
            open_rate_scaled: openRateScaled.toString(),
          }),
        )
      } catch (err) {
        log.error(
          { err, orderId: order.id.toString(), userId: order.userId.toString() },
          'Failed to emit trade:opened event',
        )
      }
    }

    log.info({ orderId: order.id.toString(), symbol: inst.symbol }, 'Entry order executed')
  } catch (err) {
    log.error({ err, orderId: order.id.toString() }, 'Failed to execute entry order')
  }
}

// ── Alert Checks ────────────────────────────────────────────────

/**
 * Check active alerts for this instrument against current price.
 * Uses Redis sorted set for efficient O(log n) range queries.
 */
async function checkAlerts(inst: InstrumentInfo, midScaled: bigint): Promise<void> {
  const redis = getRedis()
  const aboveKey = `alert_index:above:${inst.symbol}`
  const belowKey = `alert_index:below:${inst.symbol}`

  // Convert midScaled (BigInt) to string for Redis sorted set comparison.
  // Redis zrangebyscore accepts string scores and compares them numerically.
  // This preserves precision for large prices that exceed Number.MAX_SAFE_INTEGER.
  const midScaledStr = midScaled.toString()

  // Get all alerts that should trigger based on price from per-type sorted sets.
  // Each set only contains alerts of one type, so no cross-type duplicates are possible.
  const triggeredAbove = await redis.zrangebyscore(aboveKey, '-inf', midScaledStr)
  const triggeredBelow = await redis.zrangebyscore(belowKey, midScaledStr, '+inf')
  const allAlertIds = [...triggeredAbove, ...triggeredBelow]

  if (allAlertIds.length === 0) return

  for (const alertIdStr of allAlertIds) {
    const alert = await prisma.alert.findFirst({
      where: { id: BigInt(alertIdStr), status: 'ACTIVE' },
      include: { instrument: { select: { symbol: true, pipDecimalPlaces: true } } },
    })
    if (!alert) {
      await Promise.all([redis.zrem(aboveKey, alertIdStr), redis.zrem(belowKey, alertIdStr)])
      continue
    }

    // Check if alert type matches
    const shouldTrigger =
      (alert.alertType === 'PRICE_ABOVE' && midScaled >= alert.triggerScaled) ||
      (alert.alertType === 'PRICE_BELOW' && midScaled <= alert.triggerScaled) ||
      (alert.alertType === 'PRICE_REACHES' && midScaled >= alert.triggerScaled)

    if (!shouldTrigger) continue

    // Trigger the alert atomically to prevent multiple concurrent updates
    const updateResult = await prisma.alert.updateMany({
      where: { id: alert.id, status: 'ACTIVE' },
      data: { status: 'TRIGGERED', triggeredAt: new Date() },
    })
    if (updateResult.count === 0) {
      // Already triggered by concurrent operation
      continue
    }
    const indexKey = alert.alertType === 'PRICE_BELOW' ? belowKey : aboveKey
    await redis.zrem(indexKey, alertIdStr)

    // Create notification
    await prisma.notification.create({
      data: {
        userId: alert.userId,
        type: 'ALERT_TRIGGERED',
        title: 'Price Alert Triggered',
        message: `${inst.symbol} has reached ${formatCents((midScaled * 100n) / 100000n)} — alert: ${alert.alertType.replace(/_/g, ' ').toLowerCase()}`,
      },
    })

    // Notify user via Socket.io
    if (ioRef) {
      emitToUser(
        ioRef,
        alert.userId.toString(),
        'alert:triggered',
        serializeBigInt({
          alert_id: alert.id,
          symbol: inst.symbol,
          alert_type: alert.alertType,
          trigger_scaled: alert.triggerScaled.toString(),
        }),
      )
    }

    log.info({ alertId: alert.id.toString(), symbol: inst.symbol }, 'Alert triggered')
  }
}
