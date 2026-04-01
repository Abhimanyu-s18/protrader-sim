import type { Prisma } from '@prisma/client'
import WebSocket from 'ws'
import { prisma, withSerializableRetry } from '../lib/prisma.js'
import { getRedis, setCachedPrice } from '../lib/redis.js'
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

let ws: WebSocket | null = null
let reconnectAttempts = 0
let ioRef: SocketIOServer | null = null
let instrumentMap: Map<string, InstrumentInfo> = new Map()
let isRunning = false

interface InstrumentInfo {
  id: string
  symbol: string
  twelveDataSymbol: string
  contractSize: number
  leverage: number
  spreadPips: number
  pipDecimalPlaces: number
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
  log.info({ instrumentCount: instrumentMap.size }, 'Market data pipeline started')
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
  log.info('Market data pipeline stopped')
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
  const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts, 10)
  log.info({ attempt: reconnectAttempts, delayMs: delay }, 'Scheduling reconnect')
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
    ws.send(JSON.stringify({
      action: 'subscribe',
      params: { symbols: batch.join(',') },
    }))
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

  if (typeof symbol !== 'string' || typeof price !== 'string' && typeof price !== 'number') {
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

  if (typeof msg['open'] === 'string') tick.open = parseFloat(msg['open'])
  if (typeof msg['high'] === 'string') tick.high = parseFloat(msg['high'])
  if (typeof msg['low'] === 'string') tick.low = parseFloat(msg['low'])
  if (typeof msg['close'] === 'string') tick.close = parseFloat(msg['close'])

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
  await Promise.allSettled([
    checkStopLossTakeProfit(inst, bidScaled, askScaled),
    checkEntryOrders(inst, bidScaled, askScaled),
    checkAlerts(inst, midScaled),
  ])
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
        const slTriggered = trade.direction === 'BUY'
          ? bidScaled <= trade.stopLossScaled
          : askScaled >= trade.stopLossScaled

        if (slTriggered) {
          await closeTradeWithReason(trade, inst, bidScaled, askScaled, 'STOP_LOSS', userId)
          continue
        }
      }

      // Check take profit
      if (trade.takeProfitScaled != null) {
        const tpTriggered = trade.direction === 'BUY'
          ? askScaled >= trade.takeProfitScaled
          : bidScaled <= trade.takeProfitScaled

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
  trade: { id: bigint; direction: 'BUY' | 'SELL'; units: bigint | number; openRateScaled: bigint; trailingStopPips: number | null },
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
  trade: { id: bigint; userId?: bigint; direction: 'BUY' | 'SELL'; units: bigint | number; openRateScaled: bigint },
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

  await withSerializableRetry(() =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
      if (updateResult.count !== 1) return // Already closed by concurrent operation

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
    }, { isolationLevel: 'Serializable' }),
  )

  // Remove from margin watch if no more open positions
  const remaining = await prisma.trade.count({
    where: { userId, instrumentId: BigInt(inst.id), status: 'OPEN' },
  })
  if (remaining === 0) {
    const { removeMarginWatch } = await import('../lib/redis.js')
    await removeMarginWatch(inst.id, userIdStr)
  }

  // Notify user via Socket.io
  if (ioRef) {
    emitToUser(ioRef, userIdStr, 'trade:closed', serializeBigInt({
      trade_id: trade.id,
      symbol: inst.symbol,
      direction: trade.direction,
      closed_by: closedBy,
      realized_pnl_cents: realizedPnl.toString(),
      realized_pnl_formatted: formatCents(realizedPnl),
    }))
  }

  log.info({ tradeId: trade.id.toString(), closedBy, pnl: realizedPnl.toString() }, 'Trade closed by trigger')
}

// ── Entry Order Checks ─────────────────────────────────────────

/**
 * Check pending entry orders for this instrument against current prices.
 * BUY entry triggers when ask reaches or goes below entry rate
 * SELL entry triggers when bid reaches or goes above entry rate
 */
async function checkEntryOrders(
  inst: InstrumentInfo,
  bidScaled: bigint,
  askScaled: bigint,
): Promise<void> {
  const pendingOrders = await prisma.trade.findMany({
    where: {
      instrumentId: BigInt(inst.id),
      status: 'PENDING',
      orderType: 'ENTRY',
      OR: [
        { expiryAt: null },
        { expiryAt: { gt: new Date() } },
      ],
    },
  })

  for (const order of pendingOrders) {
    if (order.entryRateScaled == null) continue

    const triggered = order.direction === 'BUY'
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
  const marginCents = (BigInt(inst.contractSize) * order.units * openRateScaled * 100n)
    / (BigInt(inst.leverage) * 100000n)

  try {
    await withSerializableRetry(() =>
      prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        const usedMargin = openTrades.reduce((sum: bigint, t: { marginRequiredCents: bigint }) => sum + t.marginRequiredCents, 0n)
        const unrealizedPnl = openTrades.reduce((sum: bigint, t: { unrealizedPnlCents: bigint }) => sum + t.unrealizedPnlCents, 0n)
        const equity = (balanceRow?.balance_cents ?? 0n) + unrealizedPnl
        const available = equity - usedMargin

        if (marginCents > available) {
          // Cancel order — insufficient margin
          await tx.trade.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          })
          log.info({ orderId: order.id.toString() }, 'Entry order cancelled — insufficient margin')
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
      }, { isolationLevel: 'Serializable' }),
    )

    // Add to margin watch
    const { addMarginWatch } = await import('../lib/redis.js')
    await addMarginWatch(inst.id, order.userId.toString())

    // Notify user
    if (ioRef) {
      emitToUser(ioRef, order.userId.toString(), 'trade:opened', serializeBigInt({
        trade_id: order.id,
        symbol: inst.symbol,
        direction: order.direction,
        units: order.units.toString(),
        open_rate_scaled: openRateScaled.toString(),
      }))
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
async function checkAlerts(
  inst: InstrumentInfo,
  midScaled: bigint,
): Promise<void> {
  const redis = getRedis()
  const alertIndexKey = `alert_index:${inst.symbol}`
  const midNum = Number(midScaled)

  // Get all alerts that should trigger based on price
  // PRICE_ABOVE / PRICE_REACHES: trigger when mid >= trigger
  // PRICE_BELOW: trigger when mid <= trigger
  const triggeredAbove = await redis.zrangebyscore(alertIndexKey, '-inf', midNum)
  const allAlertIds = [...new Set(triggeredAbove)]

  if (allAlertIds.length === 0) return

  for (const alertIdStr of allAlertIds) {
    const alert = await prisma.alert.findFirst({
      where: { id: BigInt(alertIdStr), status: 'ACTIVE' },
      include: { instrument: { select: { symbol: true, pipDecimalPlaces: true } } },
    })
    if (!alert) {
      await redis.zrem(alertIndexKey, alertIdStr)
      continue
    }

    // Check if alert type matches
    const shouldTrigger =
      (alert.alertType === 'PRICE_ABOVE' && midScaled >= alert.triggerScaled) ||
      (alert.alertType === 'PRICE_BELOW' && midScaled <= alert.triggerScaled) ||
      (alert.alertType === 'PRICE_REACHES' && midScaled >= alert.triggerScaled)

    if (!shouldTrigger) continue

    // Trigger the alert
    await prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'TRIGGERED', triggeredAt: new Date() },
    })
    await redis.zrem(alertIndexKey, alertIdStr)

    // Create notification
    await prisma.notification.create({
      data: {
        userId: alert.userId,
        type: 'ALERT_TRIGGERED',
        title: 'Price Alert Triggered',
        message: `${inst.symbol} has reached ${formatCents(midScaled * 100n / 100000n)} — alert: ${alert.alertType.replace(/_/g, ' ').toLowerCase()}`,
      },
    })

    // Notify user via Socket.io
    if (ioRef) {
      emitToUser(ioRef, alert.userId.toString(), 'alert:triggered', serializeBigInt({
        alert_id: alert.id,
        symbol: inst.symbol,
        alert_type: alert.alertType,
        trigger_scaled: alert.triggerScaled.toString(),
      }))
    }

    log.info({ alertId: alert.id.toString(), symbol: inst.symbol }, 'Alert triggered')
  }
}
