import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt } from '../lib/calculations.js'
import { getRedis } from '../lib/redis.js'
import { AlertType } from '@prisma/client'

export const alertsRouter: ExpressRouter = Router()
alertsRouter.use(requireAuth)

const VALID_ALERT_STATUSES = ['ACTIVE', 'TRIGGERED', 'EXPIRED', 'CANCELLED'] as const
const VALID_ASSET_CLASSES = ['FOREX', 'STOCK', 'INDEX', 'COMMODITY', 'CRYPTO'] as const

function validateAlertStatus(value: string): 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'CANCELLED' {
  if (!VALID_ALERT_STATUSES.includes(value as (typeof VALID_ALERT_STATUSES)[number])) {
    throw Errors.validation({ status: [`Must be one of: ${VALID_ALERT_STATUSES.join(', ')}`] })
  }
  return value as 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'CANCELLED'
}

function validateAssetClass(value: string): 'FOREX' | 'STOCK' | 'INDEX' | 'COMMODITY' | 'CRYPTO' {
  if (!VALID_ASSET_CLASSES.includes(value as (typeof VALID_ASSET_CLASSES)[number])) {
    throw Errors.validation({ asset_class: [`Must be one of: ${VALID_ASSET_CLASSES.join(', ')}`] })
  }
  return value as 'FOREX' | 'STOCK' | 'INDEX' | 'COMMODITY' | 'CRYPTO'
}

const CreateAlertSchema = z.object({
  instrument_id: z.string(),
  alert_type: z.enum([
    'PRICE_ABOVE',
    'PRICE_BELOW',
    'PRICE_REACHES',
    'PCT_CHANGE_ABOVE',
    'PCT_CHANGE_BELOW',
  ]),
  trigger_value: z.number().positive(),
  notification_channels: z.string().default('in_app,email'),
  expires_at: z.string().datetime().optional(),
})

function getAlertIndexKey(alertType: AlertType, symbol: string): string {
  if (alertType === 'PRICE_BELOW') {
    return `alert_index:price_below:${symbol}`
  }
  if (alertType === 'PRICE_ABOVE' || alertType === 'PRICE_REACHES') {
    return `alert_index:price_above:${symbol}`
  }
  if (alertType === 'PCT_CHANGE_ABOVE') {
    return `alert_index:pct_above:${symbol}`
  }
  if (alertType === 'PCT_CHANGE_BELOW') {
    return `alert_index:pct_below:${symbol}`
  }
  throw new Error(`Unsupported alert type: ${alertType}`)
}

// GET /v1/alerts
alertsRouter.get('/', async (req, res, next) => {
  try {
    const rawStatus = req.query.status
    const rawAssetClass = req.query.asset_class
    const status = typeof rawStatus === 'string' ? rawStatus : 'ACTIVE'
    const asset_class = typeof rawAssetClass === 'string' ? rawAssetClass : undefined
    const validatedStatus = validateAlertStatus(status)
    const validatedAssetClass = asset_class ? validateAssetClass(asset_class) : undefined

    const alerts = await prisma.alert.findMany({
      where: {
        userId: BigInt(req.user!.user_id),
        status: validatedStatus,
        ...(validatedAssetClass ? { instrument: { assetClass: validatedAssetClass } } : {}),
      },
      include: {
        instrument: {
          select: { symbol: true, displayName: true, assetClass: true, pipDecimalPlaces: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(serializeBigInt(alerts))
  } catch (err) {
    next(err)
  }
})

// POST /v1/alerts
alertsRouter.post('/', async (req, res, next) => {
  try {
    const body = CreateAlertSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const { instrument_id, alert_type, trigger_value, notification_channels, expires_at } =
      body.data
    const instrument = await prisma.instrument.findUnique({ where: { id: BigInt(instrument_id) } })
    if (!instrument) {
      next(Errors.notFound('Instrument'))
      return
    }

    const triggerScaled = BigInt(Math.round(trigger_value * 100000))
    const alert = await prisma.alert.create({
      data: {
        userId: BigInt(req.user!.user_id),
        instrumentId: BigInt(instrument_id),
        alertType: alert_type,
        triggerScaled,
        notificationChannels: notification_channels,
        expiresAt: expires_at ? new Date(expires_at) : null,
      },
    })

    // Add to per-type Redis sorted set for O(log n) price monitoring.
    const indexKey = getAlertIndexKey(alert_type, instrument.symbol)
    try {
      await getRedis().zadd(indexKey, Number(triggerScaled), alert.id.toString())
    } catch (redisErr) {
      // Rollback DB insert to maintain consistency
      await prisma.alert.delete({ where: { id: alert.id } })
      throw redisErr
    }

    res.status(201).json(serializeBigInt(alert))
  } catch (err) {
    next(err)
  }
})

// DELETE /v1/alerts/:id
alertsRouter.delete('/:id', async (req, res, next) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: BigInt(req.params['id']!), userId: BigInt(req.user!.user_id) },
      include: { instrument: { select: { symbol: true } } },
    })
    if (!alert) {
      next(Errors.notFound('Alert'))
      return
    }
    await prisma.alert.update({ where: { id: alert.id }, data: { status: 'CANCELLED' } })
    const indexKey = getAlertIndexKey(alert.alertType, alert.instrument.symbol)
    await getRedis().zrem(indexKey, alert.id.toString())
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
