import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma, withSerializableRetry } from '../lib/prisma.js'
import { requireAuth, requireKYC, getAuthenticatedUser } from '../middleware/auth.js'
import { Errors, AppError } from '../middleware/errorHandler.js'
import { createLogger } from '../lib/logger.js'
import {
  calcBidAsk,
  calcMarginCents,
  calcPnlCents,
  calcIbCommissionCents,
  validateEntryRate,
  serializeBigInt,
  formatCents,
  formatScaledPrice,
  priceToScaled,
} from '../lib/calculations.js'
import { getCachedPrice, addMarginWatch, removeMarginWatch } from '../lib/redis.js'
import { invalidatePendingOrdersCache } from '../services/market-data.js'
import { validateLeverage } from '../lib/leverage-limits.js'

export const tradesRouter: ExpressRouter = Router()
tradesRouter.use(requireAuth)

const log = createLogger('trades')

// ── Database Table Mappings ──────────────────────────────────────
// Prisma model Trade maps to physical table "trades" via @@map("trades")
// Update this constant if the @@map directive in packages/db/prisma/schema.prisma changes
const DB_TABLE_TRADE = 'trades'

// ── Safe BigInt Parsing Helpers ──────────────────────────────────
/**
 * Safely parse a string to BigInt. Returns null if parsing fails.
 * @param value - String value to parse
 * @returns BigInt on success, null on error
 */
function parseBigInt(value: string | string[] | undefined): bigint | null {
  if (!value || Array.isArray(value)) return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

// ── Schemas ───────────────────────────────────────────────────────
const OpenTradeSchema = z.object({
  instrument_id: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  units: z.number().int().positive(),
  order_type: z.enum(['MARKET', 'ENTRY']).default('MARKET'),
  entry_rate: z.number().optional(), // required if order_type=ENTRY
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

const TrailingStopSchema = z.object({
  trailing_stop_pips: z.number().int().positive().nullable().optional(),
})

// ── POST /v1/trades — Open a trade ───────────────────────────────
tradesRouter.post('/', requireKYC, async (req, res, next) => {
  try {
    const body = OpenTradeSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const {
      instrument_id,
      direction,
      units,
      order_type,
      entry_rate,
      stop_loss,
      take_profit,
      trailing_stop_pips,
      is_protected,
      expiry_at,
    } = body.data

    const userIdParam = getAuthenticatedUser(req).user_id
    const userId = parseBigInt(userIdParam)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    // Fetch instrument
    const instrumentId = parseBigInt(instrument_id)
    if (!instrumentId) {
      next(Errors.validation({ instrument_id: ['Invalid instrument ID format'] }))
      return
    }

    const instrument = await prisma.instrument.findUnique({ where: { id: instrumentId } })
    if (!instrument || !instrument.isActive) {
      next(Errors.notFound('Instrument'))
      return
    }

    // Fetch user and validate leverage compliance
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      next(Errors.notFound('User'))
      return
    }

    // Validate asset class at runtime before casting to the narrowed type
    if (!['FOREX', 'STOCK', 'INDEX', 'COMMODITY', 'CRYPTO'].includes(instrument.assetClass)) {
      next(Errors.badRequest(`Unsupported asset class: ${instrument.assetClass}`))
      return
    }
    const assetClassForLeverage = instrument.assetClass as
      | 'FOREX'
      | 'STOCK'
      | 'INDEX'
      | 'COMMODITY'
      | 'CRYPTO'

    // Validate leverage compliance
    const leverageValidation = validateLeverage(
      user.jurisdiction,
      assetClassForLeverage,
      instrument.leverage,
    )
    if (!leverageValidation.allowed) {
      next(
        new AppError(
          'LEVERAGE_VIOLATION',
          `Leverage Compliance Violation: ${leverageValidation.message}. Max allowed leverage for your jurisdiction is ${leverageValidation.maxLeverage}:1.`,
          403,
        ),
      )
      return
    }

    // Check market hours
    const now = new Date()
    const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay()
    if (!instrument.tradingDays.includes(dayOfWeek.toString())) {
      next(Errors.marketClosed(instrument.symbol))
      return
    }

    // Get live price from Redis
    const cached = await getCachedPrice(instrument.symbol)
    if (!cached) {
      next(Errors.marketClosed(instrument.symbol))
      return
    }

    const midScaled = BigInt(cached.mid_scaled)
    const { bidScaled, askScaled } = calcBidAsk(
      midScaled,
      instrument.spreadPips,
      instrument.pipDecimalPlaces,
    )

    // Determine open rate
    const openRateScaled = direction === 'BUY' ? askScaled : bidScaled

    // Validate entry order rate
    let entryRateScaled: bigint | null = null
    if (order_type === 'ENTRY') {
      if (entry_rate == null) {
        next(Errors.validation({ entry_rate: ['Required for entry orders.'] }))
        return
      }
      entryRateScaled = priceToScaled(entry_rate)
      const { valid, hint } = validateEntryRate(
        direction,
        entryRateScaled,
        bidScaled,
        askScaled,
        10,
        instrument.pipDecimalPlaces,
      )
      if (!valid) {
        next(Errors.invalidRate(hint))
        return
      }
    }

    // Calculate margin
    const unitsBig = BigInt(units)
    const marginCents = calcMarginCents(
      unitsBig,
      instrument.contractSize,
      openRateScaled,
      instrument.leverage,
    )

    // Check available margin
    const [balanceRow] = await prisma.$queryRaw<
      [{ balance_cents: bigint }]
    >`SELECT get_user_balance(${userId}) AS balance_cents`
    const openTrades = await prisma.trade.findMany({
      where: { userId, status: 'OPEN' },
      select: { marginRequiredCents: true, unrealizedPnlCents: true },
    })
    const usedMargin = openTrades.reduce(
      (sum: bigint, t: (typeof openTrades)[number]) => sum + t.marginRequiredCents,
      0n,
    )
    const unrealizedPnl = openTrades.reduce(
      (sum: bigint, t: (typeof openTrades)[number]) => sum + t.unrealizedPnlCents,
      0n,
    )
    const equity = balanceRow.balance_cents + unrealizedPnl
    const available = equity - usedMargin

    if (marginCents > available) {
      next(Errors.insufficientMargin())
      return
    }

    // Validate SL/TP if set
    const slScaled = stop_loss != null ? priceToScaled(stop_loss) : null
    const tpScaled = take_profit != null ? priceToScaled(take_profit) : null

    // Look up agent for commission (use already-fetched user)
    const agent = user.agentId
      ? await prisma.staff.findUnique({
          where: { id: user.agentId },
          select: { id: true, commissionRateBps: true, teamLeaderId: true, overrideRateBps: true },
        })
      : null

    // Create trade + commission in transaction
    const trade = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newTrade = await tx.trade.create({
        data: {
          userId,
          instrumentId,
          orderType: order_type,
          direction,
          units: unitsBig,
          openRateScaled:
            order_type === 'ENTRY' && entryRateScaled != null ? entryRateScaled : openRateScaled,
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
        const commissionCents = calcIbCommissionCents(
          unitsBig,
          instrument.contractSize,
          openRateScaled,
          agent.commissionRateBps,
        )
        if (commissionCents > 0n) {
          await tx.ibCommission.create({
            data: {
              agentId: agent.id,
              traderId: userId,
              tradeId: newTrade.id,
              amountCents: commissionCents,
              rateBps: agent.commissionRateBps,
            },
          })
        }
      }

      return newTrade
    })

    // Track for margin monitoring (only open trades)
    if (order_type === 'MARKET') {
      await addMarginWatch(instrumentId.toString(), userIdParam)
    }

    // Invalidate pending orders cache asynchronously (fire-and-forget)
    if (order_type === 'ENTRY') {
      // Don't await — capture cache invalidation errors separately
      invalidatePendingOrdersCache(instrumentId.toString()).catch((err) => {
        log.warn(
          { instrumentId: instrumentId.toString(), error: String(err) },
          'Failed to invalidate pending orders cache',
        )
      })
    }

    res.status(201).json(
      serializeBigInt({
        ...trade,
        symbol: instrument.symbol,
        open_rate_display: formatScaledPrice(trade.openRateScaled, instrument.pipDecimalPlaces),
        margin_required_formatted: formatCents(trade.marginRequiredCents),
      }),
    )
  } catch (err) {
    next(err)
  }
})

// ── GET /v1/trades — List user trades ────────────────────────────
tradesRouter.get('/', async (req, res, next) => {
  try {
    const { status, cursor, limit = '50' } = req.query as Record<string, string>

    const userIdParam = getAuthenticatedUser(req).user_id
    const userId = parseBigInt(userIdParam)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    const parsedLimit = parseInt(limit, 10)
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
      next(Errors.validation({ limit: ['Invalid limit. Must be a positive integer.'] }))
      return
    }
    const take = Math.min(parsedLimit, 200)

    // Safely parse cursor if provided
    const cursorId = cursor ? parseBigInt(cursor) : undefined
    if (cursor && !cursorId) {
      next(Errors.validation({ cursor: ['Invalid cursor format'] }))
      return
    }

    // Validate status against TradeStatus enum
    const validStatuses = ['OPEN', 'CLOSED', 'PENDING', 'CANCELLED'] as const
    type TradeStatus = (typeof validStatuses)[number]
    let validatedStatus: TradeStatus | undefined
    if (status) {
      if (!validStatuses.includes(status as TradeStatus)) {
        next(
          Errors.validation({
            status: [`Invalid status. Must be one of: ${validStatuses.join(', ')}`],
          }),
        )
        return
      }
      validatedStatus = status as TradeStatus
    }

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        ...(validatedStatus ? { status: validatedStatus } : {}),
        ...(cursorId ? { id: { lt: cursorId } } : {}),
      },
      include: {
        instrument: { select: { symbol: true, displayName: true, pipDecimalPlaces: true } },
      },
      orderBy: { openAt: 'desc' },
      take: take + 1,
    })

    const hasMore = trades.length > take
    const data = hasMore ? trades.slice(0, take) : trades
    const nextCursor = hasMore ? data[data.length - 1]?.id.toString() : null

    res.json(serializeBigInt({ data, next_cursor: nextCursor, has_more: hasMore }))
  } catch (err) {
    next(err)
  }
})

// ── GET /v1/trades/:id — Single trade ────────────────────────────
tradesRouter.get('/:id', async (req, res, next) => {
  try {
    const tradeIdParam = req.params['id']
    const tradeId = parseBigInt(tradeIdParam)
    if (!tradeId) {
      next(Errors.validation({ id: ['Invalid ID format'] }))
      return
    }

    const userIdParam = getAuthenticatedUser(req).user_id
    const userId = parseBigInt(userIdParam)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      include: { instrument: true },
    })
    if (!trade) {
      next(Errors.notFound('Trade'))
      return
    }
    res.json(serializeBigInt(trade))
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/trades/:id/close — Close open trade ─────────────────
tradesRouter.post('/:id/close', requireKYC, async (req, res, next) => {
  try {
    const userIdParam = getAuthenticatedUser(req).user_id
    const userId = parseBigInt(userIdParam)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    const tradeIdParam = req.params['id']
    const tradeId = parseBigInt(tradeIdParam)
    if (!tradeId) {
      next(Errors.validation({ id: ['Invalid ID format'] }))
      return
    }

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId, status: 'OPEN' },
      include: { instrument: true },
    })
    if (!trade) {
      next(Errors.notFound('Trade'))
      return
    }

    const cached = await getCachedPrice(trade.instrument.symbol)
    if (!cached) {
      next(Errors.marketClosed(trade.instrument.symbol))
      return
    }

    const midScaled = BigInt(cached.mid_scaled)
    const { bidScaled, askScaled } = calcBidAsk(
      midScaled,
      trade.instrument.spreadPips,
      trade.instrument.pipDecimalPlaces,
    )
    const closeRateScaled = trade.direction === 'BUY' ? bidScaled : askScaled

    const realizedPnl = calcPnlCents(
      trade.direction,
      trade.openRateScaled,
      closeRateScaled,
      trade.units,
      trade.instrument.contractSize,
    )

    // Close trade + update ledger atomically within a transaction with proper isolation
    // Uses Serializable Snapshot Isolation (SSI) to detect conflicting concurrent trades
    // and abort if conflicts occur (non-blocking); for guaranteed row-level locking use SELECT FOR UPDATE
    // Wrapped with retry handler for transient serialization conflicts (P2034 / 40001)
    const updatedTrade = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Lock user row to serialize concurrent balance-affecting operations
          // This ensures sequential execution of balance computation + ledger writes per user
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`

          const [balanceRow] = await tx.$queryRaw<[{ balance_cents: bigint }]>`
          SELECT get_user_balance(${userId}) AS balance_cents
        `
          const currentBalance = balanceRow?.balance_cents ?? 0n
          const newBalance = currentBalance + realizedPnl

          // Update trade status atomically with status check to prevent TOCTOU
          const updateResult = await tx.trade.updateMany({
            where: { id: tradeId, status: 'OPEN' },
            data: {
              status: 'CLOSED',
              closeRateScaled,
              realizedPnlCents: realizedPnl,
              closeAt: new Date(),
              closedBy: 'USER',
            },
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
        },
        {
          // Use Serializable isolation level to ensure strict consistency for financial operations
          isolationLevel: 'Serializable',
        },
      ),
    )

    await removeMarginWatch(trade.instrumentId.toString(), userIdParam)

    res.json(
      serializeBigInt({
        ...updatedTrade,
        realized_pnl_formatted: formatCents(realizedPnl),
      }),
    )
  } catch (err) {
    next(err)
  }
})

// ── PUT /v1/trades/:id/sl-tp ─────────────────────────────────────
tradesRouter.put('/:id/sl-tp', async (req, res, next) => {
  try {
    const body = UpdateSlTpSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const tradeId = parseBigInt(req.params['id'])
    if (!tradeId) {
      next(Errors.validation({ id: ['Invalid ID format'] }))
      return
    }

    const userId = parseBigInt(getAuthenticatedUser(req).user_id)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId, status: 'OPEN' },
    })
    if (!trade) {
      next(Errors.notFound('Trade'))
      return
    }

    const updateData: Prisma.TradeUpdateInput = {}
    if (body.data.stop_loss !== undefined) {
      updateData.stopLossScaled =
        body.data.stop_loss != null ? priceToScaled(body.data.stop_loss) : null
    }
    if (body.data.take_profit !== undefined) {
      updateData.takeProfitScaled =
        body.data.take_profit != null ? priceToScaled(body.data.take_profit) : null
    }

    // Skip DB round-trip when no changes provided
    if (Object.keys(updateData).length === 0) {
      res.json(serializeBigInt(trade))
      return
    }

    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: updateData,
    })
    res.json(serializeBigInt(updated))
  } catch (err) {
    next(err)
  }
})

// ── PUT /v1/trades/:id/trailing-stop ───────────────────────────
tradesRouter.put('/:id/trailing-stop', async (req, res, next) => {
  try {
    const body = TrailingStopSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const tradeId = parseBigInt(req.params['id'])
    if (!tradeId) {
      next(Errors.validation({ id: ['Invalid ID format'] }))
      return
    }

    const userId = parseBigInt(getAuthenticatedUser(req).user_id)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId, status: 'OPEN' },
    })
    if (!trade) {
      next(Errors.notFound('Trade'))
      return
    }

    const updateData: Prisma.TradeUpdateInput = {}
    if (body.data.trailing_stop_pips !== undefined) {
      updateData.trailingStopPips = body.data.trailing_stop_pips
    }

    if (Object.keys(updateData).length === 0) {
      res.json(serializeBigInt(trade))
      return
    }

    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: updateData,
    })

    res.json(serializeBigInt(updated))
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/trades/:id/partial-close ─────────────────────────
tradesRouter.post('/:id/partial-close', requireKYC, async (req, res, next) => {
  try {
    const body = PartialCloseSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const userIdParam = getAuthenticatedUser(req).user_id
    const userId = parseBigInt(userIdParam)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    const tradeIdParam = req.params['id']
    const tradeId = parseBigInt(tradeIdParam)
    if (!tradeId) {
      next(Errors.validation({ id: ['Invalid ID format'] }))
      return
    }

    const closeUnits = BigInt(body.data.units)

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId, status: 'OPEN' },
      include: { instrument: true },
    })
    if (!trade) {
      next(Errors.notFound('Trade'))
      return
    }

    const cached = await getCachedPrice(trade.instrument.symbol)
    if (!cached) {
      next(Errors.marketClosed(trade.instrument.symbol))
      return
    }

    const midScaled = BigInt(cached.mid_scaled)
    const { bidScaled, askScaled } = calcBidAsk(
      midScaled,
      trade.instrument.spreadPips,
      trade.instrument.pipDecimalPlaces,
    )
    const closeRateScaled = trade.direction === 'BUY' ? bidScaled : askScaled

    // Calculate pro-rata P&L for the partial close
    const partialPnl = calcPnlCents(
      trade.direction,
      trade.openRateScaled,
      closeRateScaled,
      closeUnits,
      trade.instrument.contractSize,
    )

    const updatedTrade = await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Lock user row
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`

          // Lock trade and verify conditions atomically within transaction
          const tradeSnapshot = await tx.$queryRawUnsafe<
            [{ id: bigint; units: bigint; margin_required_cents: bigint; status: string }]
          >(
            `SELECT id, units, margin_required_cents, status FROM "${DB_TABLE_TRADE}" WHERE id = $1 FOR UPDATE`,
            tradeId,
          )

          if (!tradeSnapshot || !tradeSnapshot[0]) {
            throw new Error('Trade not found')
          }

          const {
            units: tradeUnits,
            margin_required_cents: marginRequiredCents,
            status,
          } = tradeSnapshot[0]

          // Validate close units inside transaction to prevent race condition
          if (closeUnits >= tradeUnits) {
            throw new Error(
              'Partial close units must be less than total position units. Use /close to close entire position.',
            )
          }

          if (status !== 'OPEN') {
            throw new Error('Trade is not open')
          }

          // Calculate margin with floor division to prevent drift
          // Earlier check ensures closeUnits < tradeUnits, so remainingUnits will always be > 0
          const remainingUnits = tradeUnits - closeUnits
          const closedMargin = (marginRequiredCents * closeUnits) / tradeUnits

          // Perform atomic update with status and units check, returning updated row for verification
          const updateResult = await tx.$queryRawUnsafe<
            [{ units: bigint; margin_required_cents: bigint }]
          >(
            `UPDATE "${DB_TABLE_TRADE}"
           SET units = units - $1,
               margin_required_cents = margin_required_cents - $2
           WHERE id = $3 AND status = 'OPEN' AND units >= $1
           RETURNING units, margin_required_cents`,
            closeUnits,
            closedMargin,
            tradeId,
          )

          if (!updateResult || !updateResult[0]) {
            throw new Error('Failed to update trade units — possible concurrent close')
          }

          // Verify the returned values match expectations
          const updatedRow = updateResult[0]
          const expectedMargin = marginRequiredCents - closedMargin
          if (
            updatedRow.units !== remainingUnits ||
            updatedRow.margin_required_cents !== expectedMargin
          ) {
            throw new Error(
              'Trade update verification failed — values do not match expected results',
            )
          }

          // Get current balance and create ledger entry
          const [balanceRow] = await tx.$queryRaw<[{ balance_cents: bigint }]>`
          SELECT get_user_balance(${userId}) AS balance_cents
        `
          const currentBalance = balanceRow?.balance_cents ?? 0n
          const newBalance = currentBalance + partialPnl

          await tx.ledgerTransaction.create({
            data: {
              userId,
              transactionType: 'TRADE_CLOSE',
              amountCents: partialPnl,
              balanceAfterCents: newBalance,
              referenceId: tradeId,
              referenceType: 'TRADE',
              description: `Partial close: ${trade.direction} ${closeUnits} ${trade.instrument.symbol}`,
            },
          })

          // Return updated trade
          const updated = await tx.trade.findUnique({ where: { id: tradeId } })
          if (!updated) throw new Error('Failed to retrieve updated trade')
          return updated
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    res.json(
      serializeBigInt({
        ...updatedTrade,
        partial_close_units: closeUnits.toString(),
        partial_pnl_cents: partialPnl.toString(),
        partial_pnl_formatted: formatCents(partialPnl),
      }),
    )
  } catch (err) {
    next(err)
  }
})

// ── DELETE /v1/trades/:id — Cancel pending entry order ───────────
tradesRouter.delete('/:id', async (req, res, next) => {
  try {
    const tradeIdParam = req.params['id']
    const tradeId = parseBigInt(tradeIdParam)
    if (!tradeId) {
      next(Errors.validation({ id: ['Invalid ID format'] }))
      return
    }

    const userIdParam = getAuthenticatedUser(req).user_id
    const userId = parseBigInt(userIdParam)
    if (!userId) {
      next(Errors.validation({ userId: ['Invalid user ID'] }))
      return
    }

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      include: { instrument: true },
    })
    if (!trade) {
      next(Errors.notFound('Trade'))
      return
    }

    const updated = await prisma.trade.updateMany({
      where: { id: trade.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })

    if (updated.count === 0) {
      next(Errors.conflict('Trade already processed'))
      return
    }

    // Invalidate pending orders cache asynchronously (fire-and-forget)
    invalidatePendingOrdersCache(trade.instrument.id.toString()).catch((err) => {
      log.warn(
        { instrumentId: trade.instrument.id.toString(), error: String(err) },
        'Failed to invalidate pending orders cache after order cancel',
      )
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
