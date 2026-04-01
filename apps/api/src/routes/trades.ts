import { Router } from 'express'
import { z } from 'zod'
import { prisma, withSerializableRetry } from '../lib/prisma.js'
import { requireAuth, requireKYC } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import {
  calcBidAsk,
  calcMarginCents,
  calcPnlCents,
  calcIbCommissionCents,
  validateEntryRate,
  serializeBigInt,
  formatCents,
  formatScaledPrice,
} from '../lib/calculations.js'
import { getCachedPrice, addMarginWatch, removeMarginWatch } from '../lib/redis.js'
import { prisma as db } from '../lib/prisma.js'

export const tradesRouter = Router()
tradesRouter.use(requireAuth)

// ── Schemas ───────────────────────────────────────────────────────
const OpenTradeSchema = z.object({
  instrument_id: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  units: z.number().int().positive(),
  order_type: z.enum(['MARKET', 'ENTRY']).default('MARKET'),
  entry_rate: z.number().optional(),       // required if order_type=ENTRY
  stop_loss: z.number().optional(),
  take_profit: z.number().optional(),
  trailing_stop_pips: z.number().int().optional(),
  is_protected: z.boolean().default(false),
  expiry_at: z.string().datetime().optional(),
})

const UpdateSlTpSchema = z.object({
  stop_loss: z.number().nullable().optional(),
  take_profit: z.number().nullable().optional(),
})

const PartialCloseSchema = z.object({
  units: z.number().int().positive(),
})

// ── POST /v1/trades — Open a trade ───────────────────────────────
tradesRouter.post('/', requireKYC, async (req, res, next) => {
  try {
    const body = OpenTradeSchema.safeParse(req.body)
    if (!body.success) { next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>)); return }

    const { instrument_id, direction, units, order_type, entry_rate,
            stop_loss, take_profit, trailing_stop_pips, is_protected, expiry_at } = body.data
    const userId = BigInt(req.user!.user_id)

    // Fetch instrument
    const instrument = await prisma.instrument.findUnique({ where: { id: BigInt(instrument_id) } })
    if (!instrument || !instrument.isActive) { next(Errors.notFound('Instrument')); return }

    // Check market hours
    const now = new Date()
    const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay()
    if (!instrument.tradingDays.includes(dayOfWeek.toString())) {
      next(Errors.marketClosed(instrument.symbol)); return
    }

    // Get live price from Redis
    const cached = await getCachedPrice(instrument.symbol)
    if (!cached) { next(Errors.marketClosed(instrument.symbol)); return }

    const midScaled = BigInt(cached.mid_scaled)
    const { bidScaled, askScaled } = calcBidAsk(midScaled, instrument.spreadPips, instrument.pipDecimalPlaces)

    // Determine open rate
    const openRateScaled = direction === 'BUY' ? askScaled : bidScaled

    // Validate entry order rate
    let entryRateScaled: bigint | null = null
    if (order_type === 'ENTRY') {
      if (entry_rate == null) { next(Errors.validation({ entry_rate: ['Required for entry orders.'] })); return }
      entryRateScaled = BigInt(Math.round(entry_rate * 100000))
      const { valid, hint } = validateEntryRate(direction, entryRateScaled, bidScaled, askScaled, 10, instrument.pipDecimalPlaces)
      if (!valid) { next(Errors.invalidRate(hint)); return }
    }

    // Calculate margin
    const unitsBig = BigInt(units)
    const marginCents = calcMarginCents(unitsBig, instrument.contractSize, openRateScaled, instrument.leverage)

    // Check available margin
    const [balanceRow] = await db.$queryRaw<[{ balance_cents: bigint }]>`SELECT get_user_balance(${userId}) AS balance_cents`
    const openTrades = await prisma.trade.findMany({
      where: { userId, status: 'OPEN' },
      select: { marginRequiredCents: true, unrealizedPnlCents: true },
    })
    const usedMargin = openTrades.reduce((sum, t) => sum + t.marginRequiredCents, 0n)
    const unrealizedPnl = openTrades.reduce((sum, t) => sum + t.unrealizedPnlCents, 0n)
    const equity = balanceRow.balance_cents + unrealizedPnl
    const available = equity - usedMargin

    if (marginCents > available) { next(Errors.insufficientMargin()); return }

    // Validate SL/TP if set
    const slScaled = stop_loss != null ? BigInt(Math.round(stop_loss * 100000)) : null
    const tpScaled = take_profit != null ? BigInt(Math.round(take_profit * 100000)) : null

    // Look up agent for commission
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { agentId: true } })
    const agent = user?.agentId ? await prisma.staff.findUnique({ where: { id: user.agentId }, select: { id: true, commissionRateBps: true, teamLeaderId: true, overrideRateBps: true } }) : null

    // Create trade + commission in transaction
    const trade = await prisma.$transaction(async (tx) => {
      const newTrade = await tx.trade.create({
        data: {
          userId,
          instrumentId: BigInt(instrument_id),
          orderType: order_type,
          direction,
          units: unitsBig,
          openRateScaled: order_type === 'ENTRY' ? entryRateScaled! : openRateScaled,
          entryRateScaled: order_type === 'ENTRY' ? entryRateScaled : null,
          stopLossScaled: slScaled,
          takeProfitScaled: tpScaled,
          trailingStopPips: trailing_stop_pips ?? null,
          isProtected: is_protected,
          marginRequiredCents: marginCents,
          status: order_type === 'ENTRY' ? 'PENDING' : 'OPEN',
          expiryAt: expiry_at ? new Date(expiry_at) : null,
        },
      })

      // Create IB commission if agent assigned
      if (agent && order_type === 'MARKET') {
        const commissionCents = calcIbCommissionCents(unitsBig, instrument.contractSize, openRateScaled, agent.commissionRateBps)
        if (commissionCents > 0n) {
          await tx.ibCommission.create({
            data: { agentId: agent.id, traderId: userId, tradeId: newTrade.id, amountCents: commissionCents, rateBps: agent.commissionRateBps },
          })
        }
      }

      return newTrade
    })

    // Track for margin monitoring (only open trades)
    if (order_type === 'MARKET') {
      await addMarginWatch(instrument_id, req.user!.user_id)
    }

    res.status(201).json(serializeBigInt({
      ...trade,
      symbol: instrument.symbol,
      open_rate_display: formatScaledPrice(trade.openRateScaled, instrument.pipDecimalPlaces),
      margin_required_formatted: formatCents(trade.marginRequiredCents),
    }))
  } catch (err) { next(err) }
})

// ── GET /v1/trades — List user trades ────────────────────────────
tradesRouter.get('/', async (req, res, next) => {
  try {
    const { status, cursor, limit = '50' } = req.query as Record<string, string>
    const userId = BigInt(req.user!.user_id)
    const take = Math.min(parseInt(limit, 10), 200)

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        ...(status ? { status: status as never } : {}),
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      include: { instrument: { select: { symbol: true, displayName: true, pipDecimalPlaces: true } } },
      orderBy: { openAt: 'desc' },
      take: take + 1,
    })

    const hasMore = trades.length > take
    const data = hasMore ? trades.slice(0, take) : trades
    const nextCursor = hasMore ? data[data.length - 1]?.id.toString() : null

    res.json(serializeBigInt({ data, next_cursor: nextCursor, has_more: hasMore }))
  } catch (err) { next(err) }
})

// ── GET /v1/trades/:id — Single trade ────────────────────────────
tradesRouter.get('/:id', async (req, res, next) => {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: BigInt(req.params['id']!), userId: BigInt(req.user!.user_id) },
      include: { instrument: true },
    })
    if (!trade) { next(Errors.notFound('Trade')); return }
    res.json(serializeBigInt(trade))
  } catch (err) { next(err) }
})

// ── POST /v1/trades/:id/close — Close open trade ─────────────────
tradesRouter.post('/:id/close', requireKYC, async (req, res, next) => {
  try {
    const userId = BigInt(req.user!.user_id)
    const tradeId = BigInt(req.params['id']!)

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId, status: 'OPEN' },
      include: { instrument: true },
    })
    if (!trade) { next(Errors.notFound('Trade')); return }

    const cached = await getCachedPrice(trade.instrument.symbol)
    if (!cached) { next(Errors.marketClosed(trade.instrument.symbol)); return }

    const midScaled = BigInt(cached.mid_scaled)
    const { bidScaled, askScaled } = calcBidAsk(midScaled, trade.instrument.spreadPips, trade.instrument.pipDecimalPlaces)
    const closeRateScaled = trade.direction === 'BUY' ? bidScaled : askScaled

    const realizedPnl = calcPnlCents(trade.direction, trade.openRateScaled, closeRateScaled, trade.units, trade.instrument.contractSize)

    // Close trade + update ledger atomically within a transaction with proper isolation
    // Uses Serializable Snapshot Isolation (SSI) to detect conflicting concurrent trades
    // and abort if conflicts occur (non-blocking); for guaranteed row-level locking use SELECT FOR UPDATE
    // Wrapped with retry handler for transient serialization conflicts (P2034 / 40001)
    const updatedTrade = await withSerializableRetry(async () =>
      prisma.$transaction(async (tx) => {
        // Query user's balance within transaction
        // Note: Serializable isolation will detect if another transaction modifies this balance
        // in a conflicting way and abort this transaction (not block it).
        // For row-level locking, use: SELECT get_user_balance(...) FOR UPDATE
        const [balanceRow] = await tx.$queryRaw<[{ balance_cents: bigint }]>`
          SELECT get_user_balance(${userId}) AS balance_cents
        `
        const currentBalance = balanceRow?.balance_cents ?? 0n
        const newBalance = currentBalance + realizedPnl

        // Update trade status atomically with status check to prevent TOCTOU
        const updateResult = await tx.trade.updateMany({
          where: { id: tradeId, status: 'OPEN' },
          data: { status: 'CLOSED', closeRateScaled, realizedPnlCents: realizedPnl, closeAt: new Date(), closedBy: 'USER' },
        })
        if (updateResult.count !== 1) {
          throw new Error('Trade already closed or not found')
        }

        // Fetch the updated trade record
        const closedTrade = await tx.trade.findUnique({
          where: { id: tradeId },
        })
        if (!closedTrade) {
          throw new Error('Failed to retrieve closed trade')
        }

        // Create ledger entry with atomically calculated balance
        await tx.ledgerTransaction.create({
          data: {
            userId,
            transactionType: 'TRADE_CLOSE',
            amountCents: realizedPnl,
            balanceAfterCents: newBalance,
            referenceId: tradeId,
            referenceType: 'TRADE',
            description: `Trade closed: ${trade.direction} ${trade.units} ${trade.instrument.symbol}`,
          },
        })

        return closedTrade
      }, {
        // Use Serializable isolation level to ensure strict consistency for financial operations
        isolationLevel: 'Serializable',
      })
    )

    await removeMarginWatch(trade.instrumentId.toString(), req.user!.user_id)

    res.json(serializeBigInt({
      ...updatedTrade,
      realized_pnl_formatted: formatCents(realizedPnl),
    }))
  } catch (err) { next(err) }
})

// ── PUT /v1/trades/:id/sl-tp ─────────────────────────────────────
tradesRouter.put('/:id/sl-tp', async (req, res, next) => {
  try {
    const body = UpdateSlTpSchema.safeParse(req.body)
    if (!body.success) { next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>)); return }

    const trade = await prisma.trade.findFirst({
      where: { id: BigInt(req.params['id']!), userId: BigInt(req.user!.user_id), status: 'OPEN' },
    })
    if (!trade) { next(Errors.notFound('Trade')); return }

    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: {
        stopLossScaled: body.data.stop_loss != null ? BigInt(Math.round(body.data.stop_loss * 100000)) : null,
        takeProfitScaled: body.data.take_profit != null ? BigInt(Math.round(body.data.take_profit * 100000)) : null,
      },
    })
    res.json(serializeBigInt(updated))
  } catch (err) { next(err) }
})

// ── DELETE /v1/trades/:id — Cancel pending entry order ───────────
tradesRouter.delete('/:id', async (req, res, next) => {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: BigInt(req.params['id']!), userId: BigInt(req.user!.user_id), status: 'PENDING' },
    })
    if (!trade) { next(Errors.notFound('Trade')); return }

    await prisma.trade.update({ where: { id: trade.id }, data: { status: 'CANCELLED' } })
    res.json({ success: true })
  } catch (err) { next(err) }
})
