import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../middleware/errorHandler.js'
import { serializeBigInt } from '../lib/calculations.js'
import { getRedis } from '../lib/redis.js'

export const alertsRouter: ExpressRouter = Router()
alertsRouter.use(requireAuth)

const CreateAlertSchema = z.object({
  instrument_id: z.string(),
  alert_type: z.enum(['PRICE_ABOVE','PRICE_BELOW','PRICE_REACHES','PCT_CHANGE_ABOVE','PCT_CHANGE_BELOW']),
  trigger_value: z.number().positive(),
  notification_channels: z.string().default('in_app,email'),
  expires_at: z.string().datetime().optional(),
})

// GET /v1/alerts
alertsRouter.get('/', async (req, res, next) => {
  try {
    const { asset_class, status = 'ACTIVE' } = req.query as Record<string, string>
    const alerts = await prisma.alert.findMany({
      where: {
        userId: BigInt(req.user!.user_id),
        status: status as never,
        ...(asset_class ? { instrument: { assetClass: asset_class as never } } : {}),
      },
      include: { instrument: { select: { symbol: true, displayName: true, assetClass: true, pipDecimalPlaces: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(serializeBigInt(alerts))
  } catch (err) { next(err) }
})

// POST /v1/alerts
alertsRouter.post('/', async (req, res, next) => {
  try {
    const body = CreateAlertSchema.safeParse(req.body)
    if (!body.success) { next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>)); return }

    const { instrument_id, alert_type, trigger_value, notification_channels, expires_at } = body.data
    const instrument = await prisma.instrument.findUnique({ where: { id: BigInt(instrument_id) } })
    if (!instrument) { next(Errors.notFound('Instrument')); return }

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

    // Add to Redis sorted set for O(log n) price monitoring
    await getRedis().zadd(`alert_index:${instrument.symbol}`, Number(triggerScaled), alert.id.toString())

    res.status(201).json(serializeBigInt(alert))
  } catch (err) { next(err) }
})

// DELETE /v1/alerts/:id
alertsRouter.delete('/:id', async (req, res, next) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: BigInt(req.params['id']!), userId: BigInt(req.user!.user_id) },
      include: { instrument: { select: { symbol: true } } },
    })
    if (!alert) { next(Errors.notFound('Alert')); return }
    await prisma.alert.update({ where: { id: alert.id }, data: { status: 'CANCELLED' } })
    await getRedis().zrem(`alert_index:${alert.instrument.symbol}`, alert.id.toString())
    res.json({ success: true })
  } catch (err) { next(err) }
})
