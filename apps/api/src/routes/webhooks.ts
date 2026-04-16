import { Router, type Router as ExpressRouter } from 'express'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import crypto from 'crypto'

/** Zod schema for the NowPayments IPN webhook body */
const NowPaymentsBodySchema = z.object({
  payment_id: z.string().min(1),
  payment_status: z.string().min(1),
  pay_currency: z.string().min(1),
  order_id: z.string().min(1),
})

const log = createLogger('webhooks')

export const webhooksRouter: ExpressRouter = Router()

// Known NowPayments server IPs (documented at https://nowpayments.io/)
const NOWPAYMENTS_ALLOWED_IPS = ['136.243.46.162', '136.243.46.163', '136.243.46.164']

// Strict per-IP rate limiter: 20 req/min to prevent flooding of HMAC/DB path
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error_code: 'RATE_LIMITED', message: 'Too many webhook requests.' },
})

/**
 * Check if request IP is whitelisted for NowPayments.
 * Returns false if IP is not in allowlist or cannot be determined.
 */
function isNowPaymentsIp(req: any): boolean {
  const clientIp =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress
  return NOWPAYMENTS_ALLOWED_IPS.includes(clientIp)
}

// POST /v1/webhooks/nowpayments
// NowPayments IPN webhook — payment status updates
webhooksRouter.post('/nowpayments', webhookLimiter, async (req, res, next) => {
  try {
    // Whitelist IP before processing
    if (!isNowPaymentsIp(req)) {
      log.warn({ ip: req.socket.remoteAddress }, 'Webhook request from unknown IP')
      // Still process but log for monitoring
    }

    const ipnSecret = process.env['NOWPAYMENTS_IPN_SECRET']
    if (!ipnSecret) {
      log.error('NOWPAYMENTS_IPN_SECRET is not configured — rejecting webhook')
      res.status(503).json({ error: 'Webhook endpoint not configured' })
      return
    }

    const signature = req.headers['x-nowpayments-sig'] as string | undefined
    if (!signature) {
      res.status(401).json({ error: 'Missing signature' })
      return
    }

    // Verify HMAC-SHA512 signature
    const payload = JSON.stringify(req.body, Object.keys(req.body as object).sort())
    const expectedSig = crypto.createHmac('sha512', ipnSecret).update(payload).digest('hex')

    // Validate incoming signature before conversion
    const hexRegex = /^[0-9a-fA-F]+$/
    if (!hexRegex.test(signature) || signature.length % 2 !== 0) {
      log.error({ signatureLength: signature.length }, 'Invalid hex signature format')
      res.status(400).json({ error: 'Invalid signature format' })
      return
    }

    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSig, 'hex')
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    const bodyParse = NowPaymentsBodySchema.safeParse(req.body)
    if (!bodyParse.success) {
      res.status(400).json({
        error: 'Missing required fields',
        details: bodyParse.error.flatten().fieldErrors,
      })
      return
    }

    const { payment_id, payment_status, pay_currency, order_id } = bodyParse.data

    if (payment_status === 'finished' || payment_status === 'confirmed') {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Idempotency: fetch the deposit inside the transaction and check status atomically
        const deposit = await tx.deposit.findUnique({
          where: { nowpaymentsInvoiceId: order_id },
        })

        // Return silently if deposit not found, already processed, or userId missing (idempotent)
        if (!deposit || deposit.status === 'COMPLETED' || !deposit.userId) return

        const totalAmountCents = deposit.amountCents + deposit.bonusCents

        await tx.deposit.update({
          where: { id: deposit.id },
          data: { status: 'COMPLETED', nowpaymentsPaymentId: payment_id, processedAt: new Date() },
        })

        // Get current balance for snapshot
        const [bal] = await tx.$queryRaw<
          [{ balance_cents: bigint }]
        >`SELECT get_user_balance(${deposit.userId}) AS balance_cents`
        await tx.ledgerTransaction.create({
          data: {
            userId: deposit.userId,
            transactionType: 'DEPOSIT',
            amountCents: totalAmountCents,
            balanceAfterCents: (bal?.balance_cents ?? 0n) + totalAmountCents,
            referenceId: deposit.id,
            referenceType: 'DEPOSIT',
            description: `Crypto deposit: ${pay_currency}`,
          },
        })
        if (deposit.bonusCents > 0n) {
          const [bal2] = await tx.$queryRaw<
            [{ balance_cents: bigint }]
          >`SELECT get_user_balance(${deposit.userId}) AS balance_cents`
          await tx.ledgerTransaction.create({
            data: {
              userId: deposit.userId,
              transactionType: 'BONUS',
              amountCents: deposit.bonusCents,
              balanceAfterCents: bal2?.balance_cents ?? 0n,
              referenceId: deposit.id,
              referenceType: 'DEPOSIT',
              description: `Deposit bonus`,
            },
          })
        }
      })
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})
