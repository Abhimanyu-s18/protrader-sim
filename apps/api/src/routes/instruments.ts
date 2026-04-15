import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCachedPrice } from '../lib/redis.js'
import { formatScaledPrice, serializeBigInt } from '../lib/calculations.js'
import { Errors } from '../middleware/errorHandler.js'
import type { AssetClass } from '@prisma/client'

export const instrumentsRouter: ExpressRouter = Router()

// ── Schemas ───────────────────────────────────────────────────────

const ListInstrumentsSchema = z.object({
  asset_class: z.enum(['FOREX', 'STOCK', 'INDEX', 'COMMODITY', 'CRYPTO'] as const).optional(),
})

const SymbolParamSchema = z.object({
  symbol: z.string().min(1),
})

const OhlcvQuerySchema = z.object({
  interval: z.enum(['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week']).default('1h'),
  limit: z
    .string()
    .transform((s) => parseInt(s, 10))
    .refine((n) => n >= 1, 'limit must be >= 1')
    .optional(),
})

// ── Routes ────────────────────────────────────────────────────────

// GET /v1/instruments — list all active instruments, optionally filtered by asset_class
instrumentsRouter.get('/', async (req, res, next) => {
  try {
    const query = ListInstrumentsSchema.safeParse(req.query)
    if (!query.success) {
      next(Errors.validation(query.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const { asset_class } = query.data
    const instruments = await prisma.instrument.findMany({
      where: {
        isActive: true,
        ...(asset_class ? { assetClass: asset_class as AssetClass } : {}),
      },
      orderBy: [{ assetClass: 'asc' }, { symbol: 'asc' }],
    })
    res.json(serializeBigInt(instruments))
  } catch (err) {
    next(err)
  }
})

// GET /v1/instruments/:symbol — instrument detail
instrumentsRouter.get('/:symbol', async (req, res, next) => {
  try {
    const params = SymbolParamSchema.safeParse(req.params)
    if (!params.success) {
      next(Errors.validation(params.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const instrument = await prisma.instrument.findUnique({
      where: { symbol: params.data.symbol.toUpperCase() },
    })
    if (!instrument) {
      next(Errors.notFound('Instrument'))
      return
    }
    res.json(serializeBigInt(instrument))
  } catch (err) {
    next(err)
  }
})

// GET /v1/instruments/:symbol/price — live price from Redis cache
instrumentsRouter.get('/:symbol/price', async (req, res, next) => {
  try {
    const params = SymbolParamSchema.safeParse(req.params)
    if (!params.success) {
      next(Errors.validation(params.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const symbol = params.data.symbol.toUpperCase()
    const instrument = await prisma.instrument.findUnique({
      where: { symbol },
      select: { id: true, spreadPips: true, pipDecimalPlaces: true, isActive: true },
    })
    if (!instrument || !instrument.isActive) {
      next(Errors.notFound('Instrument'))
      return
    }

    const cached = await getCachedPrice(symbol)
    if (!cached) {
      res.json({
        symbol,
        bid_scaled: null,
        ask_scaled: null,
        mid_scaled: null,
        message: 'Price not yet available',
      })
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
  } catch (err) {
    next(err)
  }
})

// GET /v1/instruments/:symbol/ohlcv — candle history for TradingView
instrumentsRouter.get('/:symbol/ohlcv', async (req, res, next) => {
  try {
    const params = SymbolParamSchema.safeParse(req.params)
    if (!params.success) {
      next(Errors.validation(params.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const symbol = params.data.symbol.toUpperCase()

    const query = OhlcvQuerySchema.safeParse(req.query)
    if (!query.success) {
      next(Errors.validation(query.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const { interval, limit = 300 } = query.data

    const instrument = await prisma.instrument.findUnique({
      where: { symbol },
      select: { id: true },
    })
    if (!instrument) {
      next(Errors.notFound('Instrument'))
      return
    }

    const candles = await prisma.ohlcvCandle.findMany({
      where: { instrumentId: instrument.id, interval },
      orderBy: { candleTime: 'desc' },
      take: Math.min(limit, 2000),
      select: {
        openScaled: true,
        highScaled: true,
        lowScaled: true,
        closeScaled: true,
        volume: true,
        candleTime: true,
      },
    })

    // Return in chronological order for TradingView
    res.json(serializeBigInt(candles.reverse()))
  } catch (err) {
    next(err)
  }
})
