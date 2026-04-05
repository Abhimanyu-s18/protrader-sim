import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireKYC } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt, formatCents } from '../lib/calculations.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('deposits')

const NowPaymentsResponseSchema = z.object({
  payment_id: z.union([z.string(), z.number()]),
  pay_address: z.string(),
  pay_amount: z.string(),
  pay_currency: z.string(),
  order_id: z.string(),
})

export const depositsRouter: ExpressRouter = Router()
depositsRouter.use(requireAuth)

const CreateDepositSchema = z.object({
  amount_cents: z.number().int().min(20000, 'Minimum deposit is $200'),
  crypto_currency: z.enum(['BTC', 'ETH', 'USDT']),
})

/** Map our currency codes to NowPayments pay_currency values */
const NOWPAYMENTS_CURRENCY_MAP: Record<string, string> = {
  BTC: 'btc',
  ETH: 'eth',
  USDT: 'usdterc20',
}

/**
 * Create a NowPayments payment for the given deposit.
 * Returns the pay_address and pay_amount on success, or null if NowPayments is not configured.
 */
async function createNowPaymentsPayment(
  depositId: bigint,
  amountCents: bigint,
  cryptoCurrency: string,
): Promise<{ pay_address: string; pay_amount: string; payment_id: string } | null> {
  const apiKey = process.env['NOWPAYMENTS_API_KEY']
  if (!apiKey) {
    log.warn('NOWPAYMENTS_API_KEY not set — skipping payment creation')
    return null
  }

  const apiUrl = process.env['API_URL']
  if (!apiUrl) {
    log.warn('API_URL not set — skipping payment creation')
    return null
  }

  let ipnCallbackUrl: string
  try {
    ipnCallbackUrl = new URL('/v1/webhooks/nowpayments', apiUrl).toString()
  } catch (err) {
    throw new Error(`Invalid API_URL for NowPayments IPN callback: ${apiUrl}`)
  }

  const payCurrency = NOWPAYMENTS_CURRENCY_MAP[cryptoCurrency] ?? cryptoCurrency.toLowerCase()
  const priceAmount = Number(amountCents) / 100 // convert cents → dollars

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: priceAmount,
        price_currency: 'usd',
        pay_currency: payCurrency,
        order_id: depositId.toString(),
        order_description: `ProTraderSim deposit #${depositId.toString()}`,
        ipn_callback_url: ipnCallbackUrl,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text()
      log.error({ status: response.status, body }, 'NowPayments API error')
      throw new Error(`NowPayments API returned ${response.status}`)
    }

    const validationResult = NowPaymentsResponseSchema.safeParse(await response.json())
    if (!validationResult.success) {
      log.error(
        { errors: validationResult.error.flatten() },
        'NowPayments response validation failed',
      )
      throw new Error('NowPayments response missing required fields')
    }

    const data = validationResult.data
    return {
      pay_address: data.pay_address,
      pay_amount: data.pay_amount,
      payment_id: String(data.payment_id),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('NowPayments request timed out after 10 seconds')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

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

    // Create deposit record. The NowPayments order_id will be set to deposit.id.toString()
    // so the IPN webhook can look it up later by deposit id.
    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amountCents: BigInt(amount_cents),
        cryptoCurrency: crypto_currency,
        cryptoAmountScaled: 0n, // Updated when NowPayments confirms payment amount
        status: 'PENDING',
      },
    })

    // Call NowPayments API to create the payment (non-fatal if not configured)
    let payAddress: string | null = null
    let payAmount: string | null = null
    try {
      const payment = await createNowPaymentsPayment(
        deposit.id,
        deposit.amountCents,
        crypto_currency,
      )
      if (payment) {
        payAddress = payment.pay_address
        payAmount = payment.pay_amount
        log.info(
          { depositId: deposit.id.toString(), paymentId: payment.payment_id },
          'Updating deposit with NowPayments payment_id',
        )
        try {
          await prisma.deposit.update({
            where: { id: deposit.id },
            data: {
              nowpaymentsPaymentId: payment.payment_id,
            },
          })
          log.info(
            { depositId: deposit.id.toString(), paymentId: payment.payment_id },
            'NowPayments payment linked to deposit',
          )
        } catch (updateErr) {
          log.error(
            {
              err: updateErr,
              depositId: deposit.id.toString(),
              paymentId: payment.payment_id,
            },
            'Failed to link NowPayments payment to deposit - manual reconciliation needed via order_id',
          )
        }
      }
    } catch (err) {
      log.error({ err, depositId: deposit.id.toString() }, 'Failed to create NowPayments payment')
    }
    // Don't fail the request — deposit record is created, admin can process manually

    res.status(201).json(
      serializeBigInt({
        ...deposit,
        amount_formatted: formatCents(deposit.amountCents),
        pay_address: payAddress,
        pay_amount: payAmount,
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
