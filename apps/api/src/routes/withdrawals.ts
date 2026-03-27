import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireKYC } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt, formatCents } from '../lib/calculations.js'
import { prisma as db } from '../lib/prisma.js'

export const withdrawalsRouter = Router()
withdrawalsRouter.use(requireAuth)

const CreateWithdrawalSchema = z.object({
  amount_cents: z.number().int().min(5000, 'Minimum withdrawal is $50').max(500000, 'Maximum withdrawal is $5,000 per transaction'),
  crypto_currency: z.enum(['BTC', 'ETH', 'USDT']),
  wallet_address: z.string().min(20).max(255),
  reason: z.string().max(500).optional(),
})

// POST /v1/withdrawals
withdrawalsRouter.post('/', requireKYC, async (req, res, next) => {
  try {
    const body = CreateWithdrawalSchema.safeParse(req.body)
    if (!body.success) { next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>)); return }

    const { amount_cents, crypto_currency, wallet_address, reason } = body.data
    const userId = BigInt(req.user!.user_id)
    const amountCents = BigInt(amount_cents)

    // Check available balance
    const [balanceRow] = await db.$queryRaw<[{ balance_cents: bigint }]>`SELECT get_user_balance(${userId}) AS balance_cents`
    const openTrades = await prisma.trade.findMany({ where: { userId, status: 'OPEN' }, select: { marginRequiredCents: true, unrealizedPnlCents: true } })
    const usedMargin = openTrades.reduce((s, t) => s + t.marginRequiredCents, 0n)
    const unrealized = openTrades.reduce((s, t) => s + t.unrealizedPnlCents, 0n)
    const available = balanceRow.balance_cents + unrealized - usedMargin

    if (amountCents > available) { next(Errors.insufficientFunds()); return }

    // Deduct immediately to prevent double withdrawal
    const withdrawal = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.create({
        data: { userId, amountCents, cryptoCurrency: crypto_currency, walletAddress: wallet_address, reason: reason ?? null },
      })
      const newBalance = balanceRow.balance_cents - amountCents
      await tx.ledgerTransaction.create({
        data: {
          userId, transactionType: 'WITHDRAWAL', amountCents: -amountCents,
          balanceAfterCents: newBalance, referenceId: w.id, referenceType: 'WITHDRAWAL',
          description: `Withdrawal request: ${crypto_currency}`,
        },
      })
      return w
    })

    res.status(201).json(serializeBigInt({ ...withdrawal, amount_formatted: formatCents(withdrawal.amountCents) }))
  } catch (err) { next(err) }
})

// GET /v1/withdrawals
withdrawalsRouter.get('/', async (req, res, next) => {
  try {
    const { cursor, limit = '50' } = req.query as Record<string, string>
    const userId = BigInt(req.user!.user_id)
    const take = Math.min(parseInt(limit, 10), 200)
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId, ...(cursor ? { id: { lt: BigInt(cursor) } } : {}) },
      orderBy: { createdAt: 'desc' }, take: take + 1,
    })
    const hasMore = withdrawals.length > take
    const data = hasMore ? withdrawals.slice(0, take) : withdrawals
    res.json(serializeBigInt({ data, next_cursor: hasMore ? data[data.length - 1]?.id.toString() : null, has_more: hasMore }))
  } catch (err) { next(err) }
})
