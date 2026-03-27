import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeBigInt } from '../lib/calculations.js'

export const signalsRouter = Router()
signalsRouter.use(requireAuth)

// GET /v1/signals
signalsRouter.get('/', async (req, res, next) => {
  try {
    const { asset_class, watchlist_only } = req.query as Record<string, string>
    let instrumentIds: bigint[] | undefined

    if (watchlist_only === 'true') {
      const wl = await prisma.watchlistItem.findMany({ where: { userId: BigInt(req.user!.user_id) }, select: { instrumentId: true } })
      instrumentIds = wl.map((w) => w.instrumentId)
    }

    const signals = await prisma.signal.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        ...(instrumentIds ? { instrumentId: { in: instrumentIds } } : {}),
        ...(asset_class ? { instrument: { assetClass: asset_class as never } } : {}),
      },
      include: { instrument: { select: { symbol: true, displayName: true, assetClass: true, pipDecimalPlaces: true } } },
      orderBy: { generatedAt: 'desc' },
      take: 100,
    })
    res.json(serializeBigInt(signals))
  } catch (err) { next(err) }
})
