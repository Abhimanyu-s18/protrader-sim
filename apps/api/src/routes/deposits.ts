import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireKYC } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt, formatCents } from '../lib/calculations.js'

export const depositsRouter: ExpressRouter = Router()
depositsRouter.use(requireAuth)

const CreateDepositSchema = z.object({
  amount_cents: z.number().int().min(20000, 'Minimum deposit is $200'),
  crypto_currency: z.enum(['BTC', 'ETH', 'USDT']),
})

// POST /v1/deposits
depositsRouter.post('/', requireKYC, async (req, res, next) => {
  try {
    const body = CreateDepositSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const { amount_cents, crypto_currency } = body.data
    const userId = BigInt(req.user!.user_id)

    // Create deposit record
    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amountCents: BigInt(amount_cents),
        cryptoCurrency: crypto_currency,
        cryptoAmountScaled: 0n, // Set by NowPayments response
        status: 'PENDING',
      },
    })

    // TODO: Call NowPayments API to create invoice
    // const invoice = await nowPaymentsService.createInvoice({ amount_cents, crypto_currency, deposit_id: deposit.id })
    // await prisma.deposit.update({ where: { id: deposit.id }, data: { nowpaymentsInvoiceId: invoice.id } })

    res.status(201).json(
      serializeBigInt({
        ...deposit,
        amount_formatted: formatCents(deposit.amountCents),
        payment_url: null, // Will be populated when NowPayments is configured
      }),
    )
  } catch (err) {
    next(err)
  }
})

// GET /v1/deposits
depositsRouter.get('/', async (req, res, next) => {
  try {
    const { cursor, limit = '50' } = req.query as Record<string, string>
    const userId = BigInt(req.user!.user_id)

    // Validate limit
    const limitNum = parseInt(limit, 10)
    if (!Number.isFinite(limitNum) || limitNum <= 0) {
      next(Errors.badRequest('Invalid limit parameter'))
      return
    }
    const take = Math.min(limitNum, 200)

    // Validate cursor
    if (cursor && !/^\d+$/.test(cursor)) {
      next(Errors.badRequest('Invalid cursor parameter'))
      return
    }

    const deposits = await prisma.deposit.findMany({
      where: { userId, ...(cursor ? { id: { lt: BigInt(cursor) } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    })

    const hasMore = deposits.length > take
    const data = hasMore ? deposits.slice(0, take) : deposits
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

// GET /v1/deposits/:id
depositsRouter.get('/:id', async (req, res, next) => {
  try {
    // Validate id parameter
    if (!req.params['id'] || !/^\d+$/.test(req.params['id'])) {
      next(Errors.badRequest('Invalid deposit id'))
      return
    }

    const deposit = await prisma.deposit.findFirst({
      where: { id: BigInt(req.params['id']!), userId: BigInt(req.user!.user_id) },
    })
    if (!deposit) {
      next(Errors.notFound('Deposit'))
      return
    }
    res.json(serializeBigInt(deposit))
  } catch (err) {
    next(err)
  }
})
