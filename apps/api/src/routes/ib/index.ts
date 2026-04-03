import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { serializeBigInt, formatCents } from '../../lib/calculations.js'

export const ibRouter: ExpressRouter = Router()
ibRouter.use(requireAuth)
ibRouter.use(requireRole('IB_TEAM_LEADER', 'AGENT', 'SUPER_ADMIN', 'ADMIN'))

// GET /v1/ib/traders — agent's assigned traders
ibRouter.get('/traders', async (req, res, next) => {
  try {
    const agentId = BigInt(req.user!.user_id)
    const traders = await prisma.user.findMany({
      where: { agentId },
      select: {
        id: true,
        fullName: true,
        email: true,
        accountNumber: true,
        kycStatus: true,
        accountStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(serializeBigInt(traders))
  } catch (err) {
    next(err)
  }
})

// GET /v1/ib/commissions — agent commissions
ibRouter.get('/commissions', async (req, res, next) => {
  try {
    const agentId = BigInt(req.user!.user_id)
    const { status, cursor, limit = '50' } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit, 10), 200)

    const commissions = await prisma.ibCommission.findMany({
      where: {
        agentId,
        ...(status ? { status: status as never } : {}),
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      include: {
        trader: { select: { fullName: true, accountNumber: true } },
        trade: {
          select: {
            direction: true,
            units: true,
            openAt: true,
            instrument: { select: { symbol: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    })
    const hasMore = commissions.length > take
    const data = hasMore ? commissions.slice(0, take) : commissions
    res.json(
      serializeBigInt({
        data,
        next_cursor: hasMore ? data[data.length - 1]?.id.toString() : null,
        has_more: hasMore,
      }),
    )
  } catch (err) {
    next(err)
  }
})

// GET /v1/ib/commissions/summary
ibRouter.get('/commissions/summary', async (req, res, next) => {
  try {
    const agentId = BigInt(req.user!.user_id)
    const [total, pending, paid] = await Promise.all([
      prisma.ibCommission.aggregate({ where: { agentId }, _sum: { amountCents: true } }),
      prisma.ibCommission.aggregate({
        where: { agentId, status: 'PENDING' },
        _sum: { amountCents: true },
      }),
      prisma.ibCommission.aggregate({
        where: { agentId, status: 'PAID' },
        _sum: { amountCents: true },
      }),
    ])
    const totalCents = total._sum.amountCents ?? 0n
    const pendingCents = pending._sum.amountCents ?? 0n
    const paidCents = paid._sum.amountCents ?? 0n
    res.json(
      serializeBigInt({
        total_cents: totalCents,
        total_formatted: formatCents(totalCents),
        pending_cents: pendingCents,
        pending_formatted: formatCents(pendingCents),
        paid_cents: paidCents,
        paid_formatted: formatCents(paidCents),
      }),
    )
  } catch (err) {
    next(err)
  }
})

// GET /v1/ib/network-stats
ibRouter.get('/network-stats', async (req, res, next) => {
  try {
    const agentId = BigInt(req.user!.user_id)
    const role = req.user!.role

    let traderIds: bigint[] = []
    if (role === 'AGENT') {
      const traders = await prisma.user.findMany({ where: { agentId }, select: { id: true } })
      traderIds = traders.map((t) => t.id)
    } else if (role === 'IB_TEAM_LEADER') {
      const agents = await prisma.staff.findMany({
        where: { teamLeaderId: agentId },
        select: { id: true },
      })
      const traders = await prisma.user.findMany({
        where: { agentId: { in: agents.map((a) => a.id) } },
        select: { id: true },
      })
      traderIds = traders.map((t) => t.id)
    }

    const [traderCount, activeTraders, totalVolume, commissionSummary] = await Promise.all([
      Promise.resolve(traderIds.length),
      prisma.user.count({ where: { id: { in: traderIds }, accountStatus: 'ACTIVE' } }),
      prisma.trade.aggregate({
        where: { userId: { in: traderIds }, status: 'CLOSED' },
        _sum: { units: true },
      }),
      prisma.ibCommission.aggregate({
        where: { agentId, status: 'PENDING' },
        _sum: { amountCents: true },
      }),
    ])

    res.json(
      serializeBigInt({
        total_traders: traderCount,
        active_traders: activeTraders,
        total_trade_volume: totalVolume._sum.units ?? 0n,
        pending_commission_cents: commissionSummary._sum.amountCents ?? 0n,
      }),
    )
  } catch (err) {
    next(err)
  }
})

// GET /v1/ib/agents — Team Leader only
ibRouter.get('/agents', requireRole('IB_TEAM_LEADER', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const tlId = BigInt(req.user!.user_id)
    const agents = await prisma.staff.findMany({
      where: { teamLeaderId: tlId, role: 'AGENT' },
      select: {
        id: true,
        fullName: true,
        email: true,
        refCode: true,
        commissionRateBps: true,
        isActive: true,
        createdAt: true,
      },
    })
    const enriched = await Promise.all(
      agents.map(async (agent) => {
        const traderCount = await prisma.user.count({ where: { agentId: agent.id } })
        const commSum = await prisma.ibCommission.aggregate({
          where: { agentId: agent.id },
          _sum: { amountCents: true },
        })
        return {
          ...agent,
          trader_count: traderCount,
          total_commission_cents: (commSum._sum.amountCents ?? 0n).toString(),
        }
      }),
    )
    res.json(serializeBigInt(enriched))
  } catch (err) {
    next(err)
  }
})
