import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { Errors, AppError } from '../../middleware/errorHandler.js'
import { serializeBigInt, formatCents } from '../../lib/calculations.js'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const adminRouter: ExpressRouter = Router()
adminRouter.use(requireAuth)
adminRouter.use(requireRole('SUPER_ADMIN', 'ADMIN'))

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env['CLOUDFLARE_R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env['CLOUDFLARE_R2_ACCESS_KEY_ID'] ?? '',
    secretAccessKey: process.env['CLOUDFLARE_R2_SECRET_ACCESS_KEY'] ?? '',
  },
})

// ── USERS ─────────────────────────────────────────────────────────
adminRouter.get('/users', async (req, res, next) => {
  try {
    const {
      q,
      kyc_status,
      account_status,
      cursor,
      limit = '50',
    } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit, 10), 200)
    const users = await prisma.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { fullName: { contains: q, mode: 'insensitive' } },
                { accountNumber: { contains: q } },
              ],
            }
          : {}),
        ...(kyc_status ? { kycStatus: kyc_status as never } : {}),
        ...(account_status ? { accountStatus: account_status as never } : {}),
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      select: {
        id: true,
        accountNumber: true,
        leadId: true,
        fullName: true,
        phone: true,
        country: true,
        kycStatus: true,
        accountStatus: true,
        emailVerified: true,
        agentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    })
    const hasMore = users.length > take
    res.json(
      serializeBigInt({
        data: hasMore ? users.slice(0, take) : users,
        next_cursor: hasMore ? users[take - 1]?.id.toString() : null,
        has_more: hasMore,
      }),
    )
  } catch (err) {
    next(err)
  }
})

adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.params['id']!) },
      include: {
        kycDocuments: true,
        deposits: { take: 10, orderBy: { createdAt: 'desc' } },
        withdrawals: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!user) {
      next(Errors.notFound('User'))
      return
    }
    res.json(serializeBigInt(user))
  } catch (err) {
    next(err)
  }
})

adminRouter.put('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = z
      .object({ status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']) })
      .parse(req.body)
    const user = await prisma.user.update({
      where: { id: BigInt(req.params['id']!) },
      data: { accountStatus: status },
      select: { id: true, accountStatus: true },
    })
    res.json(serializeBigInt(user))
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/users/:id/adjustment', async (req, res, next) => {
  try {
    const { amount_cents, description } = z
      .object({ amount_cents: z.number().int(), description: z.string().min(5) })
      .parse(req.body)
    const userId = BigInt(req.params['id']!)
    await prisma.$transaction(
      async (tx) => {
        const [bal] = await tx.$queryRaw<
          [{ balance_cents: bigint }]
        >`SELECT get_user_balance(${userId}) AS balance_cents`
        await tx.ledgerTransaction.create({
          data: {
            userId,
            transactionType: 'MANUAL_ADJUSTMENT',
            amountCents: BigInt(amount_cents),
            balanceAfterCents: (bal?.balance_cents ?? 0n) + BigInt(amount_cents),
            description,
            createdBy: BigInt(req.user!.user_id),
          },
        })
      },
      { isolationLevel: 'Serializable' },
    )
    res.json({ success: true, amount_formatted: formatCents(BigInt(amount_cents)) })
  } catch (err) {
    next(err)
  }
})

// ── KYC ──────────────────────────────────────────────────────────
const kycDocumentStatusSchema = z.enum(['UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ADDITIONAL_REQUIRED', 'EXPIRED'])

adminRouter.get('/kyc/count', async (req, res, next) => {
  try {
    const parsed = z.object({ status: kycDocumentStatusSchema.optional() }).safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid status parameter' })
    }
    const count = await prisma.kycDocument.count({
      where: parsed.data.status ? { status: parsed.data.status as never } : {},
    })
    return res.json(serializeBigInt({ count }))
  } catch (err) {
    return next(err)
  }
})

adminRouter.get('/kyc', async (req, res, next) => {
  try {
    const { status = 'UPLOADED', cursor, limit = '50' } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit, 10), 200)
    const docs = await prisma.kycDocument.findMany({
      where: { status: status as never, ...(cursor ? { id: { lt: BigInt(cursor) } } : {}) },
      include: { user: { select: { id: true, fullName: true, accountNumber: true } } },
      orderBy: { createdAt: 'asc' },
      take: take + 1,
    })
    const hasMore = docs.length > take
    res.json(
      serializeBigInt({
        data: hasMore ? docs.slice(0, take) : docs,
        next_cursor: hasMore ? docs[take - 1]?.id.toString() : null,
        has_more: hasMore,
      }),
    )
  } catch (err) {
    next(err)
  }
})

adminRouter.put('/kyc/:doc_id', async (req, res, next) => {
  try {
    const { status, rejection_reason } = z
      .object({
        status: z.enum(['APPROVED', 'REJECTED', 'ADDITIONAL_REQUIRED', 'UNDER_REVIEW']),
        rejection_reason: z.string().optional(),
      })
      .parse(req.body)

    const doc = await prisma.kycDocument.update({
      where: { id: BigInt(req.params['doc_id']!) },
      data: {
        status: status as never,
        rejectionReason: rejection_reason ?? null,
        reviewedBy: BigInt(req.user!.user_id),
        reviewedAt: new Date(),
      },
      include: { user: { select: { id: true, kycStatus: true } } },
    })

    // Check if all mandatory docs are approved → set user KYC to APPROVED
    if (status === 'APPROVED') {
      const userId = doc.userId
      const idApproved = await prisma.kycDocument.count({
        where: { userId, documentCategory: 'IDENTITY', status: 'APPROVED' },
      })
      const addrApproved = await prisma.kycDocument.count({
        where: { userId, documentCategory: 'ADDRESS', status: 'APPROVED' },
      })
      if (idApproved > 0 && addrApproved > 0) {
        await prisma.user.update({ where: { id: userId }, data: { kycStatus: 'APPROVED' } })
      }
    } else if (status === 'REJECTED') {
      await prisma.user.update({ where: { id: doc.userId }, data: { kycStatus: 'REJECTED' } })
    }

    // Generate signed URL for admin to view
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: process.env['CLOUDFLARE_R2_BUCKET_NAME'] ?? 'protrader-kyc-docs',
        Key: doc.r2Key,
      }),
      { expiresIn: 900 },
    )
    res.json(serializeBigInt({ ...doc, signed_url: signedUrl }))
  } catch (err) {
    next(err)
  }
})

// ── DEPOSITS ─────────────────────────────────────────────────────
const depositStatusSchema = z.enum(['PENDING', 'CONFIRMING', 'COMPLETED', 'REJECTED', 'EXPIRED'])

adminRouter.get('/deposits/count', async (req, res, next) => {
  try {
    const parsed = z.object({ status: depositStatusSchema.optional() }).safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid status parameter' })
    }
    const count = await prisma.deposit.count({
      where: parsed.data.status ? { status: parsed.data.status as never } : {},
    })
    return res.json(serializeBigInt({ count }))
  } catch (err) {
    return next(err)
  }
})

adminRouter.get('/deposits', async (req, res, next) => {
  try {
    const { status, cursor, limit = '50' } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit, 10), 200)
    const deposits = await prisma.deposit.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      include: { user: { select: { fullName: true, accountNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    })
    const hasMore = deposits.length > take
    res.json(
      serializeBigInt({
        data: hasMore ? deposits.slice(0, take) : deposits,
        next_cursor: hasMore ? deposits[take - 1]?.id.toString() : null,
        has_more: hasMore,
      }),
    )
  } catch (err) {
    next(err)
  }
})

adminRouter.put('/deposits/:id', async (req, res, next) => {
  try {
    const { status, bonus_cents = 0 } = z
      .object({
        status: z.enum(['COMPLETED', 'REJECTED']),
        bonus_cents: z.number().int().min(0).default(0),
      })
      .parse(req.body)
    const depositId = BigInt(req.params['id']!)

    // Process deposit completion within a transaction with proper isolation
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Re-fetch deposit inside transaction with locking read
        const deposit = await tx.deposit.findUnique({
          where: { id: depositId },
          select: { id: true, userId: true, amountCents: true, status: true },
        })
        if (!deposit || deposit.status !== 'PENDING') {
          throw new AppError(
            'INVALID_STATE',
            `Deposit can only be processed when in PENDING status. Current status: ${deposit?.status ?? 'unknown'}.`,
            409,
          )
        }

        await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: status as never,
            bonusCents: BigInt(bonus_cents),
            processedBy: BigInt(req.user!.user_id),
            processedAt: new Date(),
          },
        })
        if (status === 'COMPLETED') {
          const total = deposit.amountCents + BigInt(bonus_cents)
          // Lock balance calculation within transaction
          const [bal] = await tx.$queryRaw<
            [{ balance_cents: bigint }]
          >`SELECT get_user_balance(${deposit.userId}) AS balance_cents`
          const newBalance = (bal?.balance_cents ?? 0n) + total
          await tx.ledgerTransaction.create({
            data: {
              userId: deposit.userId,
              transactionType: 'DEPOSIT',
              amountCents: total,
              balanceAfterCents: newBalance,
              referenceId: deposit.id,
              referenceType: 'DEPOSIT',
              description: 'Manual deposit approval',
              createdBy: BigInt(req.user!.user_id),
            },
          })
        }
      },
      {
        // Serializable isolation for financial consistency
        isolationLevel: 'Serializable',
      },
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// ── WITHDRAWALS ───────────────────────────────────────────────────
adminRouter.get('/withdrawals', async (req, res, next) => {
  try {
    const { status, cursor, limit = '50' } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit, 10), 200)
    const items = await prisma.withdrawal.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      include: { user: { select: { fullName: true, accountNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    })
    const hasMore = items.length > take
    res.json(
      serializeBigInt({
        data: hasMore ? items.slice(0, take) : items,
        next_cursor: hasMore ? items[take - 1]?.id.toString() : null,
        has_more: hasMore,
      }),
    )
  } catch (err) {
    next(err)
  }
})

adminRouter.put('/withdrawals/:id', async (req, res, next) => {
  try {
    const { status, rejection_reason } = z
      .object({
        status: z.enum(['PROCESSING', 'COMPLETED', 'REJECTED']),
        rejection_reason: z.string().optional(),
      })
      .parse(req.body)
    const withdrawalId = BigInt(req.params['id']!)

    // Process withdrawal within a transaction with proper isolation
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Re-fetch withdrawal inside transaction with locking read
        const withdrawal = await tx.withdrawal.findUnique({
          where: { id: withdrawalId },
          select: { id: true, userId: true, amountCents: true, status: true },
        })
        if (!withdrawal) {
          throw Errors.notFound('Withdrawal')
        }

        // Validate allowed state transitions
        const allowedTransitions: Record<string, string[]> = {
          PENDING: ['PROCESSING', 'COMPLETED', 'REJECTED'],
          PROCESSING: ['COMPLETED', 'REJECTED'],
        }
        const allowed = allowedTransitions[withdrawal.status] ?? []
        if (!allowed.includes(status)) {
          throw new AppError(
            'INVALID_STATE',
            `Cannot transition withdrawal from ${withdrawal.status} to ${status}.`,
            409,
          )
        }

        // Update withdrawal atomically
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: status as never,
            rejectionReason: rejection_reason ?? null,
            processedBy: BigInt(req.user!.user_id),
            processedAt: new Date(),
          },
        })

        // Only create reversal if transitioning to REJECTED (not already rejected)
        if (status === 'REJECTED' && withdrawal.status !== 'REJECTED') {
          // Reverse the balance deduction - lock balance calculation within transaction
          const [bal] = await tx.$queryRaw<
            [{ balance_cents: bigint }]
          >`SELECT get_user_balance(${withdrawal.userId}) AS balance_cents`
          const newBalance = (bal?.balance_cents ?? 0n) + withdrawal.amountCents
          await tx.ledgerTransaction.create({
            data: {
              userId: withdrawal.userId,
              transactionType: 'WITHDRAWAL_REVERSAL',
              amountCents: withdrawal.amountCents,
              balanceAfterCents: newBalance,
              referenceId: withdrawal.id,
              referenceType: 'WITHDRAWAL',
              description: 'Withdrawal rejected — funds returned',
              createdBy: BigInt(req.user!.user_id),
            },
          })
        }
      },
      {
        // Serializable isolation for financial consistency
        isolationLevel: 'Serializable',
      },
    )

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
