import { Router, type Router as ExpressRouter } from 'express'
import type { TransactionType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { calcAccountMetrics, calcPnlCents, formatCents, serializeBigInt } from '../lib/calculations.js'
import { getCachedPrice } from '../lib/redis.js'


export const usersRouter: ExpressRouter = Router()

// All user routes require auth
usersRouter.use(requireAuth)

// ── GET /v1/users/me ────────────────────────────────────────────
usersRouter.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user!.user_id) },
      select: {
        id: true, accountNumber: true, leadId: true, email: true,
        fullName: true, phone: true, country: true, addressLine1: true,
        addressCity: true, addressCountry: true, dateOfBirth: true,
        tradingExperience: true, profession: true, languagePreference: true,
        kycStatus: true, accountStatus: true, emailVerified: true,
        popupSoundEnabled: true, avatarUrl: true, agentId: true,
        createdAt: true, updatedAt: true,
      },
    })
    if (!user) { next(Errors.notFound('User')); return }
    res.json(serializeBigInt(user))
  } catch (err) { next(err) }
})

// ── PUT /v1/users/me ────────────────────────────────────────────
const UpdateProfileSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  phone: z.string().min(6).max(30).optional(),
  address_line1: z.string().max(255).optional(),
  address_city: z.string().max(100).optional(),
  address_country: z.string().max(100).optional(),
  date_of_birth: z.string().optional(),
  trading_experience: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Professional']).optional(),
  profession: z.string().max(100).optional(),
  language_preference: z.string().max(10).optional(),
  popup_sound_enabled: z.boolean().optional(),
})

usersRouter.put('/me', async (req, res, next) => {
  try {
    const body = UpdateProfileSchema.safeParse(req.body)
    if (!body.success) { next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>)); return }

    const updated = await prisma.user.update({
      where: { id: BigInt(req.user!.user_id) },
      data: {
        ...(body.data.full_name && { fullName: body.data.full_name }),
        ...(body.data.phone && { phone: body.data.phone }),
        ...(body.data.address_line1 !== undefined && { addressLine1: body.data.address_line1 }),
        ...(body.data.address_city !== undefined && { addressCity: body.data.address_city }),
        ...(body.data.address_country !== undefined && { addressCountry: body.data.address_country }),
        ...(body.data.date_of_birth && { dateOfBirth: new Date(body.data.date_of_birth) }),
        ...(body.data.trading_experience && { tradingExperience: body.data.trading_experience }),
        ...(body.data.profession !== undefined && { profession: body.data.profession }),
        ...(body.data.language_preference && { languagePreference: body.data.language_preference }),
        ...(body.data.popup_sound_enabled !== undefined && { popupSoundEnabled: body.data.popup_sound_enabled }),
      },
      select: { id: true, fullName: true, phone: true, languagePreference: true, popupSoundEnabled: true, updatedAt: true },
    })

    res.json(serializeBigInt(updated))
  } catch (err) { next(err) }
})

// ── GET /v1/users/me/account-metrics ────────────────────────────
usersRouter.get('/me/account-metrics', async (req, res, next) => {
  try {
    const userId = BigInt(req.user!.user_id)

    // Balance from ledger
    const [{ balance }] = await prisma.$queryRaw<[{ balance: bigint }]>`
      SELECT get_user_balance(${userId}) as balance
    `

    // Open trades with live PnL
    const openTrades = await prisma.trade.findMany({
      where: { userId, status: 'OPEN' },
      include: { instrument: { select: { symbol: true, pipDecimalPlaces: true, contractSize: true } } },
    })

    let unrealizedPnl = 0n
    let usedMargin = 0n
    let exposure = 0n

    for (const trade of openTrades) {
      usedMargin += trade.marginRequiredCents
      const cached = await getCachedPrice(trade.instrument.symbol)
      if (cached) {
        const currentPrice = trade.direction === 'BUY'
          ? BigInt(cached.bid_scaled)
          : BigInt(cached.ask_scaled)
        const pnl = calcPnlCents(
          trade.direction,
          trade.openRateScaled,
          currentPrice,
          trade.units,
          trade.instrument.contractSize,
        )
        unrealizedPnl += pnl
        exposure += (trade.units * BigInt(trade.instrument.contractSize) * BigInt(cached.mid_scaled) * 100n) / 100000n
      } else {
        unrealizedPnl += trade.unrealizedPnlCents
        exposure += (trade.units * BigInt(trade.instrument.contractSize) * trade.openRateScaled * 100n) / 100000n
      }
    }

    const metrics = calcAccountMetrics(balance, unrealizedPnl, usedMargin, exposure)

    // Realized P&L from closed trades
    const realizedResult = await prisma.trade.aggregate({
      where: { userId, status: 'CLOSED' },
      _sum: { realizedPnlCents: true },
    })
    const realizedPnl = realizedResult._sum.realizedPnlCents ?? 0n

    res.json({
      balance_cents: metrics.balanceCents.toString(),
      balance_formatted: formatCents(metrics.balanceCents),
      unrealized_pnl_cents: metrics.unrealizedPnlCents.toString(),
      unrealized_pnl_formatted: formatCents(metrics.unrealizedPnlCents),
      equity_cents: metrics.equityCents.toString(),
      equity_formatted: formatCents(metrics.equityCents),
      used_margin_cents: metrics.usedMarginCents.toString(),
      used_margin_formatted: formatCents(metrics.usedMarginCents),
      available_cents: metrics.availableCents.toString(),
      available_formatted: formatCents(metrics.availableCents),
      margin_level_bps: metrics.marginLevelBps?.toString() ?? null,
      margin_level_pct: metrics.marginLevelBps
        ? (Number(metrics.marginLevelBps) / 100).toFixed(2)
        : null,
      exposure_cents: metrics.exposureCents.toString(),
      exposure_formatted: formatCents(metrics.exposureCents),
      realized_pnl_cents: realizedPnl.toString(),
      realized_pnl_formatted: formatCents(realizedPnl),
    })
  } catch (err) { next(err) }
})

// ── GET /v1/users/me/financial-summary ──────────────────────────
usersRouter.get('/me/financial-summary', async (req, res, next) => {
  try {
    const userId = BigInt(req.user!.user_id)

    // Aggregate ledger by transaction type
    const summaryRows = await prisma.ledgerTransaction.groupBy({
      by: ['transactionType'],
      where: { userId },
      _sum: { amountCents: true },
    })

    const byType = Object.fromEntries(
      summaryRows.map((r: typeof summaryRows[number]) => [r.transactionType, r._sum.amountCents ?? 0n])
    ) as Record<TransactionType, bigint>

    const get = (type: TransactionType) => byType[type] ?? 0n

    res.json({
      deposits_cents: get('DEPOSIT').toString(),
      deposits_formatted: formatCents(get('DEPOSIT')),
      withdrawals_cents: (-(get('WITHDRAWAL'))).toString(),
      withdrawals_formatted: formatCents(-(get('WITHDRAWAL'))),
      rollover_paid_cents: (-(get('ROLLOVER'))).toString(),
      rollover_paid_formatted: formatCents(-(get('ROLLOVER'))),
      trading_benefits_cents: get('TRADING_BENEFIT').toString(),
      cashback_cents: get('CASHBACK').toString(),
      manual_adjustments_cents: get('MANUAL_ADJUSTMENT').toString(),
      cash_dividends_cents: get('DIVIDEND').toString(),
      taxes_cents: (-(get('TAX'))).toString(),
      commissions_cents: (-(get('COMMISSION'))).toString(),
      fees_cents: (-(get('FEE'))).toString(),
      stock_split_rounding_cents: get('STOCK_SPLIT_ROUNDING').toString(),
      transfers_cents: get('TRANSFER').toString(),
    })
  } catch (err) { next(err) }
})

// ── GET /v1/users/me/ledger ──────────────────────────────────────
usersRouter.get('/me/ledger', async (req, res, next) => {
  try {
    const userId = BigInt(req.user!.user_id)
    const { cursor, limit = '50', type } = req.query
    const take = Math.min(parseInt(limit as string, 10), 200)

    const transactions = await prisma.ledgerTransaction.findMany({
      where: {
        userId,
        ...(cursor ? { id: { lt: BigInt(cursor as string) } } : {}),
        ...(type ? { transactionType: type as TransactionType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      select: {
        id: true, transactionType: true, amountCents: true,
        balanceAfterCents: true, description: true, referenceType: true, createdAt: true,
      },
    })

    const hasMore = transactions.length > take
    const items = hasMore ? transactions.slice(0, take) : transactions
    const nextCursor = hasMore ? items[items.length - 1]?.id.toString() : null

    res.json({
      data: serializeBigInt(items.map((t: typeof items[number]) => ({
        ...t,
        amount_formatted: formatCents(t.amountCents),
        balance_after_formatted: formatCents(t.balanceAfterCents),
      }))),
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (err) { next(err) }
})
