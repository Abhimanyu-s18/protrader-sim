import { Worker, type Job } from 'bullmq'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'
import { notificationQueue, emailQueue } from '../lib/queues.js'
import { createLogger } from '../lib/logger.js'
import { QUEUES } from '../lib/queues.js'

const log = createLogger('deposit-confirm-worker')

const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1'

const CONFIRMED_STATUSES = new Set(['finished', 'confirmed'])
const PENDING_STATUSES = new Set(['waiting', 'confirming', 'sending', 'partially_paid'])
const PRISMA_PENDING_STATUSES: Array<'PENDING' | 'CONFIRMING'> = ['PENDING', 'CONFIRMING']

export let depositConfirmWorker: Worker | null = null

if (process.env['NODE_ENV'] !== 'test') {
  depositConfirmWorker = new Worker(
    QUEUES.DEPOSIT_CONFIRM,
    async (_job: Job) => {
      const apiKey = process.env['NOWPAYMENTS_API_KEY']
      if (!apiKey) {
        log.warn('NOWPAYMENTS_API_KEY not configured - skipping deposit polling')
        return { polled: 0 }
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      const BATCH_SIZE = 100
      let processed = 0
      let confirmedCount = 0

      const processedIds = new Set<bigint>()

      while (true) {
        const batch = await prisma.deposit.findMany({
          where: {
            status: { in: ['PENDING', 'CONFIRMING'] },
            nowpaymentsInvoiceId: { not: null },
            createdAt: { lte: tenMinutesAgo },
            id: { notIn: Array.from(processedIds) },
          },
          orderBy: { createdAt: 'desc' },
          take: BATCH_SIZE,
        })

        if (batch.length === 0) break

        for (const deposit of batch) {
          processedIds.add(deposit.id)
        }

        log.info({ batchSize: batch.length }, 'Polling batch of stalled deposits')

        for (const deposit of batch) {
          if (!deposit.userId) continue

          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)

            const response = await fetch(
              `${NOWPAYMENTS_API_BASE}/payment/?orderId=${deposit.nowpaymentsInvoiceId}`,
              { headers: { 'x-api-key': apiKey }, signal: controller.signal },
            )

            clearTimeout(timeoutId)

            if (!response.ok) {
              log.warn(
                { depositId: deposit.id.toString(), status: response.status },
                'NowPayments API error while polling deposit',
              )
              continue
            }

            const data = (await response.json()) as {
              data?: Array<{
                payment_id?: string
                payment_status?: string
                pay_currency?: string
              }>
            }

            const payment = data.data?.[0]
            if (!payment?.payment_status) continue

            const paymentStatus = payment.payment_status.toLowerCase()

            if (CONFIRMED_STATUSES.has(paymentStatus)) {
              await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const fresh = await tx.deposit.findUnique({ where: { id: deposit.id } })
                if (!fresh || fresh.status === 'COMPLETED' || !fresh.userId) return

                await tx.deposit.update({
                  where: { id: fresh.id },
                  data: {
                    status: 'COMPLETED',
                    nowpaymentsPaymentId: payment.payment_id ?? fresh.nowpaymentsPaymentId,
                    processedAt: new Date(),
                  },
                })

                const [bal] = await tx.$queryRaw<
                  [{ balance_cents: bigint }]
                >`SELECT get_user_balance(${fresh.userId}) AS balance_cents`

                await tx.ledgerTransaction.create({
                  data: {
                    userId: fresh.userId,
                    transactionType: 'DEPOSIT',
                    amountCents: fresh.amountCents,
                    balanceAfterCents: (bal?.balance_cents ?? 0n) + fresh.amountCents,
                    referenceId: fresh.id,
                    referenceType: 'DEPOSIT',
                    description: `Crypto deposit confirmed via polling: ${payment.pay_currency ?? fresh.cryptoCurrency}`,
                  },
                })

                if (fresh.bonusCents > 0n) {
                  await tx.ledgerTransaction.create({
                    data: {
                      userId: fresh.userId,
                      transactionType: 'BONUS',
                      amountCents: fresh.bonusCents,
                      balanceAfterCents:
                        (bal?.balance_cents ?? 0n) + fresh.amountCents + fresh.bonusCents,
                      referenceId: fresh.id,
                      referenceType: 'DEPOSIT',
                      description: 'Deposit bonus',
                    },
                  })
                }
              })

              await notificationQueue.add('deposit-confirmed', {
                userId: deposit.userId.toString(),
                type: 'DEPOSIT_CONFIRMED',
                title: 'Deposit Confirmed',
                message: 'Your crypto deposit has been confirmed and credited to your account.',
              })

              await emailQueue.add('deposit-confirmed-email', {
                type: 'DEPOSIT_CONFIRMED',
                userId: deposit.userId.toString(),
                depositId: deposit.id.toString(),
              })

              confirmedCount++
              log.info(
                { depositId: deposit.id.toString() },
                'Deposit confirmed via polling fallback',
              )
            } else if (!PENDING_STATUSES.has(paymentStatus)) {
              await prisma.deposit.updateMany({
                where: {
                  id: deposit.id,
                  status: {
                    in: PRISMA_PENDING_STATUSES,
                  },
                },
                data: { status: 'REJECTED' },
              })
              log.info(
                { depositId: deposit.id.toString(), paymentStatus },
                'Deposit marked rejected by polling',
              )
            }
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              log.warn(
                { depositId: deposit.id.toString() },
                'NowPayments API request timeout while polling deposit',
              )
            } else {
              log.error({ depositId: deposit.id.toString(), err }, 'Error polling deposit')
            }
          }
        }

        processed += batch.length
        if (batch.length < BATCH_SIZE) break // No more batches
      }

      log.info({ processed, confirmed: confirmedCount }, 'Deposit polling run complete')
      return { polled: processed, confirmed: confirmedCount }
    },
    { connection: getRedis() },
  )

  depositConfirmWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Deposit confirm job failed')
  })
}
