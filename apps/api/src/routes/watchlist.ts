import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt, calcBidAsk, formatScaledPrice } from '../lib/calculations.js'
import { getCachedPrice } from '../lib/redis.js'

export const watchlistRouter: ExpressRouter = Router()
watchlistRouter.use(requireAuth)

// GET /v1/watchlist
watchlistRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.watchlistItem.findMany({
      where: { userId: BigInt(req.user!.user_id) },
      include: { instrument: true },
      orderBy: { sortOrder: 'asc' },
    })

    // Enrich with live prices
    const enriched = await Promise.all(
      items.map(async (item) => {
        const cached = await getCachedPrice(item.instrument.symbol)
        let live_price = null
        if (cached) {
          const mid = BigInt(cached.mid_scaled)
          const { bidScaled, askScaled } = calcBidAsk(
            mid,
            item.instrument.spreadPips,
            item.instrument.pipDecimalPlaces,
          )
          live_price = {
            bid_scaled: bidScaled.toString(),
            ask_scaled: askScaled.toString(),
            bid_display: formatScaledPrice(bidScaled, item.instrument.pipDecimalPlaces),
            ask_display: formatScaledPrice(askScaled, item.instrument.pipDecimalPlaces),
            change_bps: cached.change_bps,
            ts: cached.ts,
          }
        }
        return serializeBigInt({ ...item, live_price })
      }),
    )

    res.json(enriched)
  } catch (err) {
    next(err)
  }
})

// POST /v1/watchlist
watchlistRouter.post('/', async (req, res, next) => {
  try {
    const { instrument_id } = z.object({ instrument_id: z.string() }).parse(req.body)
    const instrument = await prisma.instrument.findUnique({ where: { id: BigInt(instrument_id) } })
    if (!instrument) {
      next(Errors.notFound('Instrument'))
      return
    }

    const item = await prisma.watchlistItem.upsert({
      where: {
        userId_instrumentId: {
          userId: BigInt(req.user!.user_id),
          instrumentId: BigInt(instrument_id),
        },
      },
      update: {},
      create: { userId: BigInt(req.user!.user_id), instrumentId: BigInt(instrument_id) },
      include: { instrument: { select: { symbol: true, displayName: true } } },
    })
    res.status(201).json(serializeBigInt(item))
  } catch (err) {
    next(err)
  }
})

// DELETE /v1/watchlist/:instrument_id
watchlistRouter.delete('/:instrument_id', async (req, res, next) => {
  try {
    await prisma.watchlistItem.deleteMany({
      where: {
        userId: BigInt(req.user!.user_id),
        instrumentId: BigInt(req.params['instrument_id']!),
      },
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUT /v1/watchlist/reorder
watchlistRouter.put('/reorder', async (req, res, next) => {
  try {
    const { order } = z.object({ order: z.array(z.string()) }).parse(req.body)
    const userId = BigInt(req.user!.user_id)

    // Validate that all IDs exist and belong to the user
    const existingItems = await prisma.watchlistItem.findMany({
      where: { id: { in: order.map(BigInt) }, userId },
      select: { id: true },
    })
    if (existingItems.length !== order.length) {
      res.status(400).json({ error: 'Invalid watchlist item IDs' })
      return
    }

    await prisma.$transaction(
      order.map((id, index) =>
        prisma.watchlistItem.updateMany({
          where: { id: BigInt(id), userId },
          data: { sortOrder: index },
        }),
      ),
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
