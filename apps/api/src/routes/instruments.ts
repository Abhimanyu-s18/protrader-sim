import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import { getCachedPrice } from '../lib/redis.js'
import { formatScaledPrice, serializeBigInt } from '../lib/calculations.js'
import { Errors } from '../middleware/errorHandler.js'

export const instrumentsRouter: ExpressRouter = Router()

// GET /v1/instruments — list all active instruments, optionally filtered by asset_class
instrumentsRouter.get('/', async (req, res, next) => {
  try {
    const { asset_class } = req.query
    const instruments = await prisma.instrument.findMany({
      where: {
        isActive: true,
        ...(asset_class ? { assetClass: asset_class as string as never } : {}),
      },
      orderBy: [{ assetClass: 'asc' }, { symbol: 'asc' }],
    })
    res.json(serializeBigInt(instruments))
  } catch (err) { next(err) }
})

// GET /v1/instruments/:symbol — instrument detail
instrumentsRouter.get('/:symbol', async (req, res, next) => {
  try {
    const instrument = await prisma.instrument.findUnique({
      where: { symbol: req.params['symbol']?.toUpperCase() },
    })
    if (!instrument) { next(Errors.notFound('Instrument')); return }
    res.json(serializeBigInt(instrument))
  } catch (err) { next(err) }
})

// GET /v1/instruments/:symbol/price — live price from Redis cache
instrumentsRouter.get('/:symbol/price', async (req, res, next) => {
  try {
    const symbol = req.params['symbol']?.toUpperCase() ?? ''
    const instrument = await prisma.instrument.findUnique({
      where: { symbol },
      select: { id: true, spreadPips: true, pipDecimalPlaces: true, isActive: true },
    })
    if (!instrument || !instrument.isActive) { next(Errors.notFound('Instrument')); return }

    const cached = await getCachedPrice(symbol)
    if (!cached) {
      res.json({ symbol, bid_scaled: null, ask_scaled: null, mid_scaled: null, message: 'Price not yet available' })
      return
    }

    res.json({
      symbol,
      bid_scaled: cached.bid_scaled,
      ask_scaled: cached.ask_scaled,
      mid_scaled: cached.mid_scaled,
      bid_display: formatScaledPrice(BigInt(cached.bid_scaled), instrument.pipDecimalPlaces),
      ask_display: formatScaledPrice(BigInt(cached.ask_scaled), instrument.pipDecimalPlaces),
      change_bps: cached.change_bps,
      ts: cached.ts,
    })
  } catch (err) { next(err) }
})

// GET /v1/instruments/:symbol/ohlcv — candle history for TradingView
instrumentsRouter.get('/:symbol/ohlcv', async (req, res, next) => {
  try {
    const symbol = req.params['symbol']?.toUpperCase() ?? ''
    const { interval = '1h', limit = '300' } = req.query

    const instrument = await prisma.instrument.findUnique({ where: { symbol }, select: { id: true } })
    if (!instrument) { next(Errors.notFound('Instrument')); return }

    const candles = await prisma.ohlcvCandle.findMany({
      where: { instrumentId: instrument.id, interval: interval as string },
      orderBy: { candleTime: 'desc' },
      take: Math.min(parseInt(limit as string, 10), 2000),
      select: {
        openScaled: true, highScaled: true, lowScaled: true,
        closeScaled: true, volume: true, candleTime: true,
      },
    })

    // Return in chronological order for TradingView
    res.json(serializeBigInt(candles.reverse()))
  } catch (err) { next(err) }
})
