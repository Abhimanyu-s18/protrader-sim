import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt } from '../lib/calculations.js'

export const signalsRouter: ExpressRouter = Router()
signalsRouter.use(requireAuth)

// ── Schemas ───────────────────────────────────────────────────────

const ListSignalsSchema = z.object({
  asset_class: z
    .nativeEnum({
      FOREX: 'FOREX',
      STOCK: 'STOCK',
      INDEX: 'INDEX',
      COMMODITY: 'COMMODITY',
      CRYPTO: 'CRYPTO',
    } as const)
    .optional(),
  watchlist_only: z.enum(['true', 'false']).optional(),
})

// ── Routes ────────────────────────────────────────────────────────

// GET /v1/signals
signalsRouter.get('/', async (req, res, next) => {
  try {
    const query = ListSignalsSchema.safeParse(req.query)
    if (!query.success) {
      next(Errors.validation(query.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const { asset_class, watchlist_only } = query.data
    let instrumentIds: bigint[] | undefined

    if (watchlist_only === 'true' && req.user) {
      const wl = await prisma.watchlistItem.findMany({
        where: { userId: BigInt(req.user.user_id) },
        select: { instrumentId: true },
      })
      instrumentIds = wl.map((w) => w.instrumentId)
    }

    const signals = await prisma.signal.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        ...(instrumentIds ? { instrumentId: { in: instrumentIds } } : {}),
        ...(asset_class ? { instrument: { assetClass: asset_class } } : {}),
      },
      include: {
        instrument: {
          select: { symbol: true, displayName: true, assetClass: true, pipDecimalPlaces: true },
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: 100,
    })
    res.json(serializeBigInt(signals))
  } catch (err) {
    next(err)
  }
})
