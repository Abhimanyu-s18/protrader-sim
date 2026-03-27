import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { serializeBigInt, formatCents } from '../lib/calculations.js'
import crypto from 'crypto'

export const webhooksRouter = Router()

// POST /v1/webhooks/nowpayments
// NowPayments IPN webhook — payment status updates
webhooksRouter.post('/nowpayments', async (req, res, next) => {
  try {
    const signature = req.headers['x-nowpayments-sig'] as string | undefined
    const ipnSecret = process.env['NOWPAYMENTS_IPN_SECRET'] ?? ''

    // Verify HMAC-SHA512 signature
    if (signature && ipnSecret) {
      const payload = JSON.stringify(req.body, Object.keys(req.body as object).sort())
      const expectedSig = crypto.createHmac('sha512', ipnSecret).update(payload).digest('hex')
      if (signature !== expectedSig) {
        res.status(401).json({ error: 'Invalid signature' })
        return
      }
    }

    const { payment_id, payment_status, price_amount, price_currency, pay_currency, order_id } = req.body as {
      payment_id: string; payment_status: string; price_amount: number
      price_currency: string; pay_currency: string; order_id: string
    }

    if (payment_status === 'finished' || payment_status === 'confirmed') {
      const deposit = await prisma.deposit.findUnique({ where: { nowpaymentsInvoiceId: order_id } })
      if (!deposit || deposit.status === 'COMPLETED') { res.json({ received: true }); return }

      const totalAmountCents = deposit.amountCents + deposit.bonusCents

      await prisma.$transaction(async (tx) => {
        await tx.deposit.update({
          where: { id: deposit.id },
          data: { status: 'COMPLETED', nowpaymentsPaymentId: payment_id, processedAt: new Date() },
        })
        // Get current balance for snapshot
        const [bal] = await tx.$queryRaw<[{ balance_cents: bigint }]>`SELECT get_user_balance(${deposit.userId}) AS balance_cents`
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
          const [bal2] = await tx.$queryRaw<[{ balance_cents: bigint }]>`SELECT get_user_balance(${deposit.userId}) AS balance_cents`
          await tx.ledgerTransaction.create({
            data: {
              userId: deposit.userId, transactionType: 'BONUS', amountCents: deposit.bonusCents,
              balanceAfterCents: (bal2?.balance_cents ?? 0n), referenceId: deposit.id, referenceType: 'DEPOSIT',
              description: `Deposit bonus`,
            },
          })
        }
      })
    }

    res.json({ received: true })
  } catch (err) { next(err) }
})
