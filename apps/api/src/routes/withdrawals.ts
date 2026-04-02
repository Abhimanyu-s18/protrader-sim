import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { bech32, bech32m } from 'bech32'
import type { Prisma } from '@prisma/client'
import { prisma, withSerializableRetry } from '../lib/prisma.js'
import { requireAuth, requireKYC } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt, formatCents } from '../lib/calculations.js'

export const withdrawalsRouter: ExpressRouter = Router()
withdrawalsRouter.use(requireAuth)

const CreateWithdrawalSchema = z
  .object({
    amount_cents: z
      .number()
      .int()
      .min(5000, 'Minimum withdrawal is $50')
      .max(500000, 'Maximum withdrawal is $5,000 per transaction'),
    crypto_currency: z.enum(['BTC', 'ETH', 'USDT']),
    wallet_address: z.string().min(20).max(255),
    network: z.enum(['ERC20', 'TRC20']).optional(),
    reason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const { crypto_currency, wallet_address, network } = data
    if (crypto_currency === 'BTC') {
      // Legacy (1...) or SegWit (3...) — Base58Check charset, 26-35 chars total
      const base58Regex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
      // Native SegWit (bc1q...) and Taproot (bc1p...) — validated via bech32/bech32m libraries
      if (wallet_address.startsWith('bc1')) {
        let decoded: { prefix: string } | undefined
        try {
          decoded = bech32.decode(wallet_address)
        } catch {
          try {
            decoded = bech32m.decode(wallet_address)
          } catch {
            // Neither encoding succeeded
          }
        }
        if (!decoded || decoded.prefix !== 'bc') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Invalid BTC address. Must be a valid Legacy (1...), SegWit (3...), or Native SegWit (bc1...) address.',
            path: ['wallet_address'],
          })
        }
      } else if (!base58Regex.test(wallet_address)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid BTC address. Must be a valid Legacy (1...), SegWit (3...), or Native SegWit (bc1...) address.',
          path: ['wallet_address'],
        })
      }
    } else if (crypto_currency === 'ETH') {
      // 0x followed by 40 hex characters
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid ETH address. Must be 0x followed by 40 hexadecimal characters.',
          path: ['wallet_address'],
        })
      }
    } else if (crypto_currency === 'USDT') {
      // ERC-20 (0x...) or TRC-20 (T...)
      const erc20Regex = /^0x[a-fA-F0-9]{40}$/
      const trc20Regex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/
      const isErc20 = erc20Regex.test(wallet_address)
      const isTrc20 = trc20Regex.test(wallet_address)

      if (!network) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Network is required for USDT withdrawals. Specify "ERC20" or "TRC20".',
          path: ['network'],
        })
        return
      }

      // Check mismatches first — address format matches the OTHER network
      if (network === 'ERC20' && isTrc20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Network mismatch: address appears to be TRC-20 but network is ERC20.',
          path: ['network'],
        })
      } else if (network === 'TRC20' && isErc20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Network mismatch: address appears to be ERC-20 but network is TRC20.',
          path: ['network'],
        })
      } else if (network === 'ERC20' && !isErc20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid USDT ERC-20 address. Must be 0x followed by 40 hexadecimal characters.',
          path: ['wallet_address'],
        })
      } else if (network === 'TRC20' && !isTrc20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Invalid USDT TRC-20 address. Must start with T followed by 33 Base58 characters.',
          path: ['wallet_address'],
        })
      }
      // Valid cases (network === 'ERC20' && isErc20) or (network === 'TRC20' && isTrc20)
      // proceed without adding any issues
    }
  })

// POST /v1/withdrawals
withdrawalsRouter.post('/', requireKYC, async (req, res, next) => {
  try {
    const body = CreateWithdrawalSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const { amount_cents, crypto_currency, wallet_address, network, reason } = body.data
    const userId = BigInt(req.user!.user_id)
    const amountCents = BigInt(amount_cents)

    // Check available balance
    // Deduct immediately to prevent double withdrawal - within transaction with proper isolation
    // Uses serializable isolation with retry for transient conflicts
    const withdrawal = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Lock user row to serialize concurrent balance-affecting operations
          const userLock = await tx.$queryRaw<
            { id: bigint }[]
          >`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
          if (userLock.length === 0) {
            throw Errors.notFound('User')
          }

          const [balanceRow] = await tx.$queryRaw<
            [{ balance_cents: bigint }]
          >`SELECT get_user_balance(${userId}) AS balance_cents`
          if (!balanceRow) {
            throw Errors.notFound('User')
          }
          const currentBalance = balanceRow.balance_cents

          // Compute used margin from open trades (within transaction for consistent read)
          const openTrades = await tx.trade.findMany({
            where: { userId, status: 'OPEN' },
            select: { marginRequiredCents: true },
          })
          const usedMargin = openTrades.reduce(
            (s: bigint, t: (typeof openTrades)[number]) => s + t.marginRequiredCents,
            0n,
          )

          // Available balance = settled balance - used margin
          // Do NOT use cached unrealizedPnlCents as it may be stale
          const available = currentBalance - usedMargin

          if (amountCents > available) {
            throw Errors.insufficientFunds()
          }

          const newBalance = currentBalance - amountCents

          const w = await tx.withdrawal.create({
            data: {
              userId,
              amountCents,
              cryptoCurrency: crypto_currency,
              walletAddress: wallet_address,
              network: network ?? null,
              reason: reason ?? null,
            },
          })
          await tx.ledgerTransaction.create({
            data: {
              userId,
              transactionType: 'WITHDRAWAL',
              amountCents: -amountCents,
              balanceAfterCents: newBalance,
              referenceId: w.id,
              referenceType: 'WITHDRAWAL',
              description: `Withdrawal request: ${crypto_currency}`,
            },
          })
          return w
        },
        {
          isolationLevel: 'Serializable',
        },
      ),
    )

    res
      .status(201)
      .json(
        serializeBigInt({ ...withdrawal, amount_formatted: formatCents(withdrawal.amountCents) }),
      )
  } catch (err) {
    next(err)
  }
})

// GET /v1/withdrawals
withdrawalsRouter.get('/', async (req, res, next) => {
  try {
    const { cursor, limit = '50' } = req.query as Record<string, string>
    const userId = BigInt(req.user!.user_id)
    const take = Math.min(parseInt(limit, 10), 200)

    // Validate cursor is a valid positive integer string
    let cursorId: bigint | undefined
    if (cursor) {
      if (!/^\d+$/.test(cursor)) {
        next(Errors.validation({ cursor: 'Invalid cursor. Must be a positive integer.' }))
        return
      }
      cursorId = BigInt(cursor)
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId, ...(cursorId ? { id: { lt: cursorId } } : {}) },
      orderBy: { id: 'desc' },
      take: take + 1,
    })
    const hasMore = withdrawals.length > take
    const data = hasMore ? withdrawals.slice(0, take) : withdrawals
    res.json(
      serializeBigInt({
        data,
        next_cursor: hasMore ? data[data.length - 1]?.id.toString() : null,
        has_more: hasMore,
      }),
    )
  } catch (err) {
    next(err)
  }
})
