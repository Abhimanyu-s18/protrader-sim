import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeBigInt } from '../lib/calculations.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

// GET /v1/notifications
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const { cursor, limit = '50', unread_only } = req.query as Record<string, string>
    const userId = BigInt(req.user!.user_id)
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

    res.json(serializeBigInt({ data, next_cursor: hasMore ? data[data.length - 1]?.id.toString() : null, has_more: hasMore, unread_count: unreadCount }))
  } catch (err) { next(err) }
})

// PUT /v1/notifications/:id/read
notificationsRouter.put('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: BigInt(req.params['id']!), userId: BigInt(req.user!.user_id) },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// PUT /v1/notifications/read-all
notificationsRouter.put('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: BigInt(req.user!.user_id), isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ success: true })
  } catch (err) { next(err) }
})
