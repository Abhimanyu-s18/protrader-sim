import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeBigInt } from '../lib/calculations.js'
import { Errors } from '../middleware/errorHandler.js'

export const notificationsRouter: ExpressRouter = Router()
notificationsRouter.use(requireAuth)

// ── Schemas ───────────────────────────────────────────────────────

const ListNotificationsSchema = z.object({
  cursor: z.string().regex(/^\d+$/).optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),
  unread_only: z.enum(['true', 'false']).optional(),
})

const NotificationIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a numeric string'),
})

// ── Routes ────────────────────────────────────────────────────────

// GET /v1/notifications
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const query = ListNotificationsSchema.safeParse(req.query)
    if (!query.success) {
      next(Errors.validation(query.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const { cursor, limit = '50', unread_only } = query.data
    const user = req.user
    if (!user) {
      next(Errors.unauthorized())
      return
    }
    const userId = BigInt(user.user_id)
    const take = Math.min(parseInt(limit, 10), 200)

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unread_only === 'true' ? { isRead: false } : {}),
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    })

    const hasMore = notifications.length > take
    const data = hasMore ? notifications.slice(0, take) : notifications
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } })

    res.json(
      serializeBigInt({
        data,
        next_cursor: hasMore ? data[data.length - 1]?.id.toString() : null,
        has_more: hasMore,
        unread_count: unreadCount,
      }),
    )
  } catch (err) {
    next(err)
  }
})

// PUT /v1/notifications/:id/read
notificationsRouter.put('/:id/read', async (req, res, next) => {
  try {
    const params = NotificationIdParamSchema.safeParse(req.params)
    if (!params.success) {
      next(Errors.validation(params.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }
    const user = req.user
    if (!user) {
      next(Errors.unauthorized())
      return
    }
    await prisma.notification.updateMany({
      where: { id: BigInt(params.data.id), userId: BigInt(user.user_id) },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUT /v1/notifications/read-all
notificationsRouter.put('/read-all', async (req, res, next) => {
  try {
    const user = req.user
    if (!user) {
      next(Errors.unauthorized())
      return
    }
    await prisma.notification.updateMany({
      where: { userId: BigInt(user.user_id), isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
