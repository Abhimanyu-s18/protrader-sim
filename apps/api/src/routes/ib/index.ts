import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { Errors } from '../../middleware/errorHandler.js'
import { serializeBigInt, formatCents } from '../../lib/calculations.js'

export const ibRouter: ExpressRouter = Router()
ibRouter.use(requireAuth)
ibRouter.use(requireRole('IB_TEAM_LEADER', 'AGENT', 'SUPER_ADMIN', 'ADMIN'))

// GET /v1/ib/traders — agent's assigned traders (paginated)
ibRouter.get('/traders', async (req, res, next) => {
  try {
    const agentId = BigInt(req.user!.user_id)
    const { cursor, limit = '50' } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit, 10), 200)

    // Validate cursor
    if (cursor && !/^\d+$/.test(cursor)) {
      return next(Errors.badRequest('Invalid cursor parameter'))
    }

    const traders = await prisma.user.findMany({
      where: { agentId, ...(cursor ? { id: { lt: BigInt(cursor) } } : {}) },
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
      take: take + 1,
    })
    const hasMore = traders.length > take
    const data = hasMore ? traders.slice(0, take) : traders
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

// GET /v1/ib/commissions — agent commissions
ibRouter.get('/commissions', async (req, res, next) => {
  try {
    const agentId = BigInt(req.user!.user_id)
    const { status, cursor, limit = '50' } = req.query as Record<string, string>
    const take = Math.min(parseInt(limit, 10), 200)

    // Validate status
    if (status && !['PENDING', 'PAID'].includes(status)) {
      return next(Errors.badRequest('Invalid status parameter'))
    }

    // Validate cursor
    if (cursor && !/^\d+$/.test(cursor)) {
      return next(Errors.badRequest('Invalid cursor parameter'))
    }

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
    return res.json(
      serializeBigInt({
        data,
        next_cursor: hasMore ? data[data.length - 1]?.id.toString() : null,
        has_more: hasMore,
      }),
    )
  } catch (err) {
    return next(err)
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

    // Fetch all trader counts and commission sums in parallel
    const agentIds = agents.map((a) => a.id)
    const [traderCounts, commissionSums] = await Promise.all([
      prisma.user.groupBy({
        by: ['agentId'],
        where: { agentId: { in: agentIds } },
        _count: true,
      }),
      prisma.ibCommission.groupBy({
        by: ['agentId'],
        where: { agentId: { in: agentIds } },
        _sum: { amountCents: true },
      }),
    ])

    const validTraderCounts = traderCounts.filter((tc) => tc.agentId != null)
    const validCommissionSums = commissionSums.filter((cs) => cs.agentId != null)

    const traderCountMap = new Map(
      validTraderCounts.map((tc) => [tc.agentId!.toString(), tc._count]),
    )
    const commissionSumMap = new Map(
      validCommissionSums.map((cs) => [cs.agentId!.toString(), cs._sum.amountCents ?? 0n]),
    )

    const enriched = agents.map((agent) => ({
      ...agent,
      trader_count: traderCountMap.get(agent.id.toString()) ?? 0,
      total_commission_cents: (commissionSumMap.get(agent.id.toString()) ?? 0n).toString(),
    }))
    res.json(serializeBigInt(enriched))
  } catch (err) {
    next(err)
  }
})
