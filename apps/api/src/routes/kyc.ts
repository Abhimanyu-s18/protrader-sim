import { Router, type Router as ExpressRouter } from 'express'
import { KycDocumentCategory } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt } from '../lib/calculations.js'
import multer from 'multer'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

import crypto from 'crypto'
import path from 'path'

/** Zod schema for multipart KYC document upload body fields */
const UploadDocumentBodySchema = z.object({
  document_category: z.nativeEnum(KycDocumentCategory),
  document_type: z.string().min(1).optional(),
  is_primary: z.enum(['true', 'false']).optional(),
})

/** Zod schema for the :id param on document routes */
const DocumentIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a numeric string'),
})

export const kycRouter: ExpressRouter = Router()
kycRouter.use(requireAuth)

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are accepted.'))
  },
})

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env['CLOUDFLARE_R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env['CLOUDFLARE_R2_ACCESS_KEY_ID'] ?? '',
    secretAccessKey: process.env['CLOUDFLARE_R2_SECRET_ACCESS_KEY'] ?? '',
  },
})

// GET /v1/kyc/status
kycRouter.get('/status', async (req, res, next) => {
  try {
    if (!req.user) {
      next(Errors.unauthorized())
      return
    }
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.user_id) },
      select: { kycStatus: true },
    })
    const documents = await prisma.kycDocument.findMany({
      where: { userId: BigInt(req.user.user_id) },
      select: {
        id: true,
        documentCategory: true,
        documentType: true,
        fileName: true,
        status: true,
        isPrimary: true,
        createdAt: true,
      },
    })
    res.json(serializeBigInt({ kyc_status: user?.kycStatus, documents }))
  } catch (err) {
    next(err)
  }
})

// POST /v1/kyc/documents
kycRouter.post('/documents', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      next(Errors.validation({ file: ['File is required.'] }))
      return
    }

    const bodyParse = UploadDocumentBodySchema.safeParse(req.body)
    if (!bodyParse.success) {
      next(Errors.validation(bodyParse.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const { document_category, document_type, is_primary = 'true' } = bodyParse.data

    const category = document_category
    if (!req.user) {
      next(Errors.unauthorized())
      return
    }
    const userId = BigInt(req.user.user_id)
    const ext = path.extname(req.file.originalname).toLowerCase()
    const r2Key = `kyc/${userId}/${category.toLowerCase()}/${crypto.randomUUID()}${ext}`

    // Upload to Cloudflare R2
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env['CLOUDFLARE_R2_BUCKET_NAME'] ?? 'protrader-kyc-docs',
        Key: r2Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: { user_id: userId.toString(), category: category as string },
      }),
    )

    const doc = await prisma.kycDocument.create({
      data: {
        userId,
        documentCategory: category as KycDocumentCategory,
        documentType: document_type ?? 'other',
        r2Key,
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        isPrimary: is_primary !== 'false',
      },
    })

    // Update kyc_status to PENDING if both ID and address docs uploaded
    const idDocs = await prisma.kycDocument.count({
      where: { userId, documentCategory: 'IDENTITY', status: { not: 'REJECTED' } },
    })
    const addrDocs = await prisma.kycDocument.count({
      where: { userId, documentCategory: 'ADDRESS', status: { not: 'REJECTED' } },
    })
    if (idDocs > 0 && addrDocs > 0) {
      await prisma.user.update({ where: { id: userId }, data: { kycStatus: 'PENDING' } })
    }

    res.status(201).json(serializeBigInt(doc))
  } catch (err) {
    next(err)
  }
})

// GET /v1/kyc/documents
kycRouter.get('/documents', async (req, res, next) => {
  try {
    if (!req.user) {
      next(Errors.unauthorized())
      return
    }
    const documents = await prisma.kycDocument.findMany({
      where: { userId: BigInt(req.user.user_id) },
      orderBy: { createdAt: 'desc' },
    })
    res.json(serializeBigInt(documents))
  } catch (err) {
    next(err)
  }
})

// DELETE /v1/kyc/documents/:id
kycRouter.delete('/documents/:id', async (req, res, next) => {
  try {
    const paramsParse = DocumentIdParamsSchema.safeParse(req.params)
    if (!paramsParse.success) {
      next(Errors.validation(paramsParse.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const doc = await prisma.kycDocument.findFirst({
      where: {
        id: BigInt(paramsParse.data.id),
        userId: BigInt(req.user?.user_id || 0),
        status: 'UPLOADED',
      },
    })
    if (!doc) {
      next(Errors.notFound('Document'))
      return
    }
    // Delete file from Cloudflare R2 before removing DB record
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env['CLOUDFLARE_R2_BUCKET_NAME'] ?? 'protrader-kyc-docs',
        Key: doc.r2Key,
      }),
    )
    await prisma.kycDocument.delete({ where: { id: doc.id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
