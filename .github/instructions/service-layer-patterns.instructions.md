---
name: service-layer-patterns
description: Rules for organizing business logic in service layer
applyTo: 'apps/api/src/services/**/*.ts, apps/api/src/routes/**/*.ts'
---

# Service Layer Patterns

## Philosophy

Routes should handle HTTP only. All business logic lives in services. This ensures:

- Business logic is testable without mocking HTTP
- Logic can be reused across multiple routes/workers
- Complex logic stays organized and readable
- Dependencies are explicit and injectable

```
Route (HTTP only)
  ↓ receive request, validate with Zod
  ↓ call service method
  ↓ serialize response, send HTTP response

Service (Business logic only)
  ↓ execute business rules
  ↓ call database/cache/external APIs
  ↓ return domain objects (not serialized)
  ↓ throw domain errors (AppError)
```

## Service Structure

Create one service per domain concern:

```
services/
├── trading.service.ts          # Open/close trades, calculate P&L, margin
├── market-data.service.ts      # Fetch prices from Twelve Data, cache
├── auth.service.ts             # Register, login, token generation
├── payment.service.ts          # Process deposits/withdrawals
├── kyc.service.ts              # Upload documents, validate KYC
├── notification.service.ts     # Send emails, in-app notifications
├── wallet.service.ts           # Balance calculations, ledger entries
└── ib.service.ts               # IB commission tracking, payouts
```

## Service File Template

```typescript
// services/trading.service.ts
import type { Trade, Instrument } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { calcMarginCents, calcPnlCents, serializeBigInt } from '../lib/calculations'

/**
 * TradingService handles all trade lifecycle operations.
 * No HTTP or Socket.io logic here — pure business rules.
 */
export const tradingService = {
  /**
   * Opens a new trading position for a trader.
   *
   * Validates trader eligibility (KYC approved, sufficient free margin),
   * calculates required margin, and creates the position record. The wallet's
   * free_margin is debited and margin_used is credited atomically.
   *
   * @param traderId - The ID of the trader opening the position
   * @param input - Position parameters
   * @returns The created trade with all fields populated
   * @throws {AppError} INSUFFICIENT_MARGIN - When free margin < required margin
   * @throws {AppError} KYC_REQUIRED - When trader KYC status is not APPROVED
   * @throws {AppError} LEVERAGE_EXCEEDS_MAXIMUM - When leverage exceeds asset limit
   * @throws {AppError} INSTRUMENT_NOT_FOUND - When instrument is not active
   */
  async openPosition(
    traderId: string,
    input: {
      instrumentId: string
      direction: 'BUY' | 'SELL'
      units: bigint
      leverage: number
      currentBid: bigint // Bid price, scaled ×100000
      currentAsk: bigint // Ask price, scaled ×100000
    },
  ): Promise<Trade> {
    // 1. Fetch and validate instrument
    const instrument = await prisma.instrument.findUnique({
      where: { id: input.instrumentId },
    })

    if (!instrument || !instrument.isActive) {
      throw new AppError('INSTRUMENT_NOT_FOUND', 'Instrument not found or inactive')
    }

    // 2. Validate leverage against asset class limits
    if (input.leverage > instrument.maxLeverage) {
      throw new AppError(
        'LEVERAGE_EXCEEDS_MAXIMUM',
        `Maximum leverage for ${instrument.symbol} is ${instrument.maxLeverage}`,
      )
    }

    // 3. Check trader KYC status
    const trader = await prisma.user.findUnique({
      where: { id: traderId },
      select: { kycStatus: true, roles: true },
    })

    if (trader?.kycStatus !== 'APPROVED') {
      throw new AppError('KYC_REQUIRED', 'Trader KYC must be APPROVED to trade')
    }

    // 4. Calculate required margin
    const entryRate = input.direction === 'BUY' ? input.currentAsk : input.currentBid
    const marginRequired = calcMarginCents({
      units: input.units,
      contractSize: BigInt(instrument.contractSize),
      openRateScaled: entryRate,
      leverage: BigInt(input.leverage),
    })

    // 5. Check free margin (within atomic transaction below)
    const userBalance = await prisma.$queryRaw<[{ balance: bigint }]>`
      SELECT get_user_balance(${traderId}) as balance
    `
    const balanceCents = userBalance[0].balance

    if (balanceCents < marginRequired) {
      throw new AppError(
        'INSUFFICIENT_MARGIN',
        `Insufficient margin. Required: ${marginRequired}n, Available: ${balanceCents}n`,
      )
    }

    // 6. Create trade and update wallet atomically
    const trade = await prisma.$transaction(async (tx) => {
      // Create trade record
      const created = await tx.trade.create({
        data: {
          userId: traderId,
          instrumentId: input.instrumentId,
          direction: input.direction,
          units: input.units,
          leverage: input.leverage,
          openRate: entryRate,
          marginCents: marginRequired,
          status: 'OPEN',
          openedAt: new Date(),
        },
        include: { instrument: true },
      })

      // Debit margin from user balance (create ledger entry)
      await tx.ledgerTransaction.create({
        data: {
          userId: traderId,
          type: 'MARGIN_LOCK',
          description: `Margin for trade ${created.id}: ${instrument.symbol} ${input.direction} ${input.units}u × ${input.leverage}`,
          amountCents: -marginRequired, // Negative = debit
          balanceAfterCents: balanceCents - marginRequired,
          referenceId: created.id,
          referenceType: 'TRADE',
        },
      })

      return created
    })

    return trade
  },

  /**
   * Closes a trading position and realizes P&L.
   *
   * Calculates final P&L, releases locked margin, credits profit/loss to balance,
   * and records the ledger transaction atomically.
   *
   * @param tradeId - The ID of the trade to close
   * @param closingRate - The price at which to close (bid for BUY, ask for SELL)
   * @param reason - Why the position was closed (USER, STOP_LOSS, MARGIN_CALL, etc.)
   * @returns The closed trade with final P&L
   */
  async closePosition(
    tradeId: string,
    closingRate: bigint,
    reason: 'USER' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'MARGIN_CALL' | 'STOP_OUT' | 'ADMIN',
  ): Promise<Trade> {
    // 1. Fetch trade and validate
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { instrument: true },
    })

    if (!trade) {
      throw new AppError('TRADE_NOT_FOUND', 'Trade not found')
    }

    if (trade.status !== 'OPEN') {
      throw new AppError('TRADE_ALREADY_CLOSED', `Trade is ${trade.status}`)
    }

    // 2. Calculate P&L
    const pnlCents = calcPnlCents({
      direction: trade.direction as 'BUY' | 'SELL',
      units: trade.units,
      contractSize: BigInt(trade.instrument.contractSize),
      openRateScaled: trade.openRate,
      closingRateScaled: closingRate,
    })

    // 3. Update trade and wallet atomically
    const closed = await prisma.$transaction(async (tx) => {
      // Update trade to CLOSED
      const updated = await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'CLOSED',
          closeRate: closingRate,
          pnlCents,
          closedAt: new Date(),
          closedBy: reason,
        },
        include: { instrument: true },
      })

      // Release margin + credit P&L
      const netCredit = trade.marginCents + pnlCents

      const currentBalance = await prisma.$queryRaw<[{ balance: bigint }]>`
        SELECT get_user_balance(${trade.userId}) as balance
      `

      await tx.ledgerTransaction.create({
        data: {
          userId: trade.userId,
          type: 'POSITION_CLOSED',
          description: `Closed trade ${tradeId}: P&L ${pnlCents}n (${
            pnlCents >= 0n ? 'profit' : 'loss'
          })`,
          amountCents: netCredit, // Positive = credit
          balanceAfterCents: currentBalance[0].balance + netCredit,
          referenceId: tradeId,
          referenceType: 'TRADE',
        },
      })

      return updated
    })

    return closed
  },
}
```

## Service Testing

Services are tested without HTTP, using real database:

```typescript
// services/trading.service.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '../lib/prisma'
import { tradingService } from './trading.service'
import { AppError } from '../lib/errors'

describe('TradingService', () => {
  let traderId: string
  let instrumentId: string

  beforeAll(async () => {
    // Seed test data
    traderId = 'test-trader-1'
    instrumentId = 'EUR/USD'
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('openPosition', () => {
    it('should open a BUY position with correct margin calculation', async () => {
      const trade = await tradingService.openPosition(traderId, {
        instrumentId,
        direction: 'BUY',
        units: 1n,
        leverage: 100,
        currentBid: 108450n,
        currentAsk: 108475n,
      })

      expect(trade.status).toBe('OPEN')
      expect(trade.marginCents).toBeGreaterThan(0n)
      expect(trade.openRate).toBe(108475n) // Used ask price for BUY
    })

    it('should reject when free margin is insufficient', async () => {
      await expect(
        tradingService.openPosition(traderId, {
          instrumentId,
          direction: 'BUY',
          units: 10000n, // Huge size
          leverage: 500,
          currentBid: 150000n,
          currentAsk: 150000n,
        }),
      ).rejects.toThrow(AppError)
    })

    it('should reject when leverage exceeds maximum', async () => {
      await expect(
        tradingService.openPosition(traderId, {
          instrumentId,
          direction: 'BUY',
          units: 1n,
          leverage: 1000, // Way too high
          currentBid: 108450n,
          currentAsk: 108475n,
        }),
      ).rejects.toThrow('LEVERAGE_EXCEEDS_MAXIMUM')
    })
  })

  describe('closePosition', () => {
    it('should calculate profit correctly on SELL direction', async () => {
      const trade = await tradingService.openPosition(traderId, {
        instrumentId,
        direction: 'SELL',
        units: 1n,
        leverage: 100,
        currentBid: 108450n,
        currentAsk: 108475n,
      })

      // Price went down, profit for SELL
      const closed = await tradingService.closePosition(
        trade.id,
        108350n, // Lower price = profit for short
        'USER',
      )

      expect(closed.status).toBe('CLOSED')
      expect(closed.pnlCents).toBeGreaterThan(0n)
    })
  })
})
```

## Calling Services from Routes

Routes become simple HTTP handlers:

```typescript
// routes/trades.ts
import { Router } from 'express'
import { z } from 'zod'
import { tradingService } from '../services/trading.service'
import { marketDataService } from '../services/market-data.service'
import { requireAuth, requireKYC } from '../middleware/auth'
import { serializeBigInt } from '../lib/calculations'
import { emitToUser } from '../lib/socket'
import { io } from '../lib/socket'
import { notificationQueue } from '../lib/queues'

export const tradesRouter = Router()

tradesRouter.use(requireAuth)
tradesRouter.use(requireKYC)

const openTradeSchema = z.object({
  instrumentId: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  units: z
    .number()
    .int()
    .positive()
    .transform((v) => BigInt(v)),
  leverage: z.number().int().min(1).max(500),
})

tradesRouter.post('/open', async (req, res, next) => {
  try {
    // 1. Validate input
    const parsed = openTradeSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed' })
    }

    // 2. Fetch live prices from cache/market-data
    const prices = await marketDataService.getPrices(parsed.data.instrumentId)

    // 3. Call service (all business logic here)
    const trade = await tradingService.openPosition(req.user.id, {
      ...parsed.data,
      currentBid: prices.bid,
      currentAsk: prices.ask,
    })

    // 4. Emit real-time update
    emitToUser(io, req.user.id, 'trade_update', {
      tradeId: trade.id,
      status: 'OPEN',
    })

    // 5. Enqueue notification job
    await notificationQueue.add({
      type: 'TRADE_OPENED',
      userId: req.user.id,
      data: { tradeId: trade.id },
    })

    // 6. Serialize and respond
    res.status(201).json({ data: serializeBigInt(trade) })
  } catch (error) {
    next(error)
  }
})
```

## Service Dependencies

Services should be dependency-injected or access shared singletons:

```typescript
// services/auth.service.ts
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { sendEmail } from '../lib/email'

export const authService = {
  async register(email: string, password: string) {
    // Use injected dependencies
    const user = await prisma.user.create({...})
    await redis.setex(`email_verified:${email}`, 3600, '...')
    await sendEmail(email, 'Welcome!')
    return user
  },
}
```

## Common Patterns

### Ledger Transactions (Always Atomic)

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update main record
  await tx.trade.update({...})

  // 2. Record ledger entry (for audit trail)
  await tx.ledgerTransaction.create({...})
})
```

### Service Error Handling

```typescript
// Throw domain errors (not HTTP errors)
throw new AppError('INSUFFICIENT_MARGIN', 'Not enough balance')

// Route catches and converts to HTTP response
catch (error) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message })
  }
  next(error) // 500 handler
}
```

### Composing Services

```typescript
export const withdrawalService = {
  async withdraw(userId: string, amountCents: bigint) {
    // Use wallet service
    const balance = await walletService.getBalance(userId)

    // Use payment service
    const withdrawal = await paymentService.initiate(userId, amountCents)

    // Return composed result
    return { balance, withdrawal }
  },
}
```

## Checklist

- [ ] All business logic lives in services, not routes
- [ ] Each service focuses on one domain concern
- [ ] Services receive dependencies (prisma, redis, external APIs) as parameters or via singletons
- [ ] Services throw AppError (not HTTP responses)
- [ ] All database writes use `$transaction` for atomicity
- [ ] Services have 100% test coverage (no mocking HTTP)
- [ ] Service methods are well-documented with JSDoc (@param, @returns, @throws)
- [ ] Ledger transactions recorded for all balance changes
- [ ] Complex calculations extracted to `lib/calculations.ts`
- [ ] Routes are under 50 lines (validate → service → respond)
- [ ] Services can be called from routes, workers, or scheduled jobs
- [ ] No console.log() in services (use structured logging)
