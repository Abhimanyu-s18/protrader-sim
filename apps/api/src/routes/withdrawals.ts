import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma, withSerializableRetry } from '../lib/prisma.js'
import { requireAuth, requireKYC } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt, formatCents } from '../lib/calculations.js'

export const withdrawalsRouter: ExpressRouter = Router()
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
    // Deduct immediately to prevent double withdrawal - within transaction with proper isolation
    // Uses serializable isolation with retry for transient conflicts
    const withdrawal = await withSerializableRetry(async () =>
      prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Lock user row to serialize concurrent balance-affecting operations
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`

        const [balanceRow] = await tx.$queryRaw<[{ balance_cents: bigint }]>`SELECT get_user_balance(${userId}) AS balance_cents`
        const currentBalance = balanceRow?.balance_cents ?? 0n

        // Compute used margin from open trades (within transaction for consistent read)
        const openTrades = await tx.trade.findMany({ where: { userId, status: 'OPEN' }, select: { marginRequiredCents: true } })
        const usedMargin = openTrades.reduce((s: bigint, t: typeof openTrades[number]) => s + t.marginRequiredCents, 0n)

        // Available balance = settled balance - used margin
        // Do NOT use cached unrealizedPnlCents as it may be stale
        const available = currentBalance - usedMargin

        if (amountCents > available) {
          throw Errors.insufficientFunds()
        }

        const newBalance = currentBalance - amountCents

        const w = await tx.withdrawal.create({
          data: { userId, amountCents, cryptoCurrency: crypto_currency, walletAddress: wallet_address, reason: reason ?? null },
        })
        await tx.ledgerTransaction.create({
          data: {
            userId, transactionType: 'WITHDRAWAL', amountCents: -amountCents,
            balanceAfterCents: newBalance, referenceId: w.id, referenceType: 'WITHDRAWAL',
            description: `Withdrawal request: ${crypto_currency}`,
          },
        })
        return w
      }, {
        isolationLevel: 'Serializable',
      })
    )

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
