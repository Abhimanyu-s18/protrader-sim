---
name: 'error-handling-patterns'
description: 'Use when: implementing error handling, creating custom error types, designing error responses, handling async failures, or building resilient services. Ensures consistent error patterns across the platform with proper logging and user feedback. Primary agents: @coding, @security, @debug.'
---

# Skill: Error Handling Patterns

**Scope**: Application-wide error handling, custom error types, API error responses, async error propagation
**Primary Agents**: @coding, @security, @debug
**When to Use**: Building new services, API endpoints, or any code that can fail

---

## Core Principles

### 1. Errors Are Part of the API

Every endpoint must document:

- Success response shape
- All possible error responses (400, 401, 403, 404, 409, 422, 429, 500)
- Error codes for programmatic handling

### 2. Layered Error Handling

```
Route Layer    → HTTP status codes, validation errors
Service Layer  → Business logic errors, domain errors
Data Layer     → Database errors, constraint violations
```

Each layer catches and transforms errors appropriately.

### 3. Never Expose Internal Details

```typescript
// WRONG: Exposes database internals
throw new Error(`Prisma error: Unique constraint failed on the fields: ('email')`)

// CORRECT: User-friendly message
throw new ConflictError('A user with this email already exists')
```

---

## Custom Error Hierarchy

### Base Application Error

```typescript
// src/types/errors.ts
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}
```

### Domain-Specific Errors

```typescript
// Financial errors (409 Conflict or 422 Unprocessable Entity)
export class InsufficientMarginError extends AppError {
  constructor(required: bigint, available: bigint) {
    super(
      `Insufficient margin. Required: ${formatMoney(required)}, Available: ${formatMoney(available)}`,
      422,
      'INSUFFICIENT_MARGIN',
    )
  }
}

export class PositionAlreadyClosedError extends AppError {
  constructor(tradeId: string) {
    super(`Position ${tradeId} is already closed`, 409, 'POSITION_ALREADY_CLOSED')
  }
}

export class MarginCallError extends AppError {
  constructor(marginLevelBps: bigint) {
    super(
      `Account margin level at ${Number(marginLevelBps) / 100}% — position cannot be opened`,
      422,
      'MARGIN_CALL',
    )
  }
}

// Authentication errors (401 Unauthorized)
export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super('Authentication token has expired', 401, 'TOKEN_EXPIRED')
  }
}

// Authorization errors (403 Forbidden)
export class InsufficientPermissionsError extends AppError {
  constructor(requiredRole: string) {
    super(
      `Insufficient permissions. Required role: ${requiredRole}`,
      403,
      'INSUFFICIENT_PERMISSIONS',
    )
  }
}

// Validation errors (400 Bad Request or 422 Unprocessable Entity)
export class ValidationError extends AppError {
  public readonly details: Record<string, string[]>

  constructor(message: string, details: Record<string, string[]>) {
    super(message, 422, 'VALIDATION_ERROR')
    this.details = details
  }
}

// Not found errors (404)
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, 404, 'NOT_FOUND')
  }
}

// Rate limit errors (429)
export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds`,
      429,
      'RATE_LIMIT_EXCEEDED',
    )
  }
}
```

---

## Error Handling by Layer

### Route Layer

```typescript
// src/routes/trades.ts
import { Router } from 'express'
import { z } from 'zod'
import { tradingService } from '@/services/trading.service'
import { authMiddleware } from '@/middleware/auth'
import { ValidationError } from '@/types/errors'

const router = Router()

const openPositionSchema = z.object({
  instrumentId: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  units: z.number().int().positive(),
  leverage: z.number().int().min(1).max(1000),
})

router.post('/positions', authMiddleware, async (req, res, next) => {
  try {
    // Validate input
    const validation = openPositionSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError('Invalid request body', validation.error.flatten().fieldErrors)
    }

    const { instrumentId, direction, units, leverage } = validation.data

    // Delegate to service
    const trade = await tradingService.openPosition({
      userId: req.user.id,
      instrumentId,
      direction,
      units: BigInt(units),
      leverage: BigInt(leverage),
    })

    res.json({
      data: trade,
      message: 'Position opened successfully',
    })
  } catch (error) {
    next(error) // Pass to error handler middleware
  }
})

export default router
```

### Service Layer

```typescript
// src/services/trading.service.ts
import { prisma } from '@/lib/prisma'
import { calculateMargin, calculatePnL } from '@/lib/calculations'
import { InsufficientMarginError, PositionAlreadyClosedError, NotFoundError } from '@/types/errors'

export class TradingService {
  async openPosition(params: OpenPositionParams) {
    const { userId, instrumentId, direction, units, leverage } = params

    // Validate instrument exists
    const instrument = await prisma.instrument.findUnique({
      where: { id: instrumentId },
    })
    if (!instrument) {
      throw new NotFoundError('Instrument', instrumentId)
    }

    // Validate leverage limit
    if (leverage > instrument.maxLeverage) {
      throw new ValidationError('Leverage exceeds instrument maximum', {
        leverage: [`Maximum allowed: ${instrument.maxLeverage}`],
      })
    }

    // Calculate required margin
    const marginRequired = calculateMargin({
      units,
      contractSize: BigInt(instrument.contractSize),
      openRateScaled: BigInt(instrument.currentPrice),
      leverage,
    })

    // Check available balance
    const availableBalance = await this.getAvailableBalance(userId)
    if (availableBalance < marginRequired) {
      throw new InsufficientMarginError(marginRequired, availableBalance)
    }

    // Open position in transaction
    return prisma.$transaction(async (tx) => {
      const trade = await tx.trade.create({
        data: {
          userId,
          instrumentId,
          direction,
          units,
          leverage: Number(leverage),
          openRate: Number(instrument.currentPrice),
          marginCents: Number(marginRequired),
          status: 'OPEN',
        },
      })

      // Create ledger transaction for margin deduction
      await tx.ledgerTransaction.create({
        data: {
          userId,
          type: 'MARGIN_HOLD',
          amountCents: Number(marginRequired),
          tradeId: trade.id,
          description: `Margin hold for ${direction} ${units} ${instrumentId}`,
        },
      })

      return trade
    })
  }

  async closePosition(params: ClosePositionParams) {
    const { tradeId, currentRateScaled } = params

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { instrument: true },
    })

    if (!trade) {
      throw new NotFoundError('Trade', tradeId)
    }

    if (trade.status !== 'OPEN') {
      throw new PositionAlreadyClosedError(tradeId)
    }

    // Calculate P&L
    const pnl = calculatePnL({
      direction: trade.direction,
      units: BigInt(trade.units),
      contractSize: BigInt(trade.instrument.contractSize),
      openRateScaled: BigInt(trade.openRate),
      currentRateScaled,
    })

    // Close position in transaction
    return prisma.$transaction(async (tx) => {
      const closedTrade = await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'CLOSED',
          closeRate: Number(currentRateScaled),
          pnlCents: Number(pnl),
          closedAt: new Date(),
          closedBy: 'USER',
        },
      })

      // Release margin hold
      await tx.ledgerTransaction.create({
        data: {
          userId: trade.userId,
          type: 'MARGIN_RELEASE',
          amountCents: trade.marginCents,
          tradeId,
          description: `Margin release for closed position ${tradeId}`,
        },
      })

      // Credit/debit P&L
      if (pnl !== 0n) {
        await tx.ledgerTransaction.create({
          data: {
            userId: trade.userId,
            type: pnl > 0n ? 'PROFIT' : 'LOSS',
            amountCents: Number(Math.abs(pnl)),
            tradeId,
            description: `${pnl > 0n ? 'Profit' : 'Loss'} from position ${tradeId}`,
          },
        })
      }

      return closedTrade
    })
  }

  private async getAvailableBalance(userId: string): Promise<bigint> {
    const result = await prisma.ledgerTransaction.aggregate({
      where: { userId },
      _sum: { amountCents: true },
    })

    return BigInt(result._sum.amountCents ?? 0)
  }
}

export const tradingService = new TradingService()
```

### Global Error Handler Middleware

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import { AppError } from '@/types/errors'
import { logger } from '@/lib/logger'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Operational errors (expected)
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    })

    const response: any = {
      error: {
        code: err.code,
        message: err.message,
      },
    }

    // Include validation details if present
    if ('details' in err) {
      response.error.details = (err as any).details
    }

    return res.status(err.statusCode).json(response)
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        logger.warn('Database unique constraint violation', {
          meta: prismaError.meta,
          path: req.path,
        })
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'A record with this value already exists',
          },
        })

      case 'P2025': // Record not found
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found',
          },
        })

      default:
        logger.error('Unhandled Prisma error', {
          code: prismaError.code,
          message: err.message,
        })
        break
    }
  }

  // Zod validation errors (if not caught earlier)
  if (err.name === 'ZodError') {
    const zodError = err as any
    logger.warn('Zod validation error', {
      errors: zodError.errors,
      path: req.path,
    })

    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: zodError.errors.reduce((acc: any, e: any) => {
          const path = e.path.join('.')
          acc[path] = acc[path] || []
          acc[path].push(e.message)
          return acc
        }, {}),
      },
    })
  }

  // Unhandled errors (500)
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  })
}
```

---

## Async Error Handling

### Wrapper for Async Route Handlers

```typescript
// src/lib/asyncHandler.ts
import { Request, Response, NextFunction } from 'express'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Usage
router.post('/positions', authMiddleware, asyncHandler(async (req, res) => {
  const trade = await tradingService.openPosition({...})
  res.json({ data: trade })
}))
```

### Service-Level Error Boundaries

```typescript
// Wrap critical operations with error boundaries
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  if (maxRetries <= 0) {
    maxRetries = 1
  }

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry operational errors
      if (error instanceof AppError && error.isOperational) {
        throw error
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)))
      }
    }
  }

  throw (
    lastError ??
    new Error(`Operation failed after ${maxRetries} ${maxRetries === 1 ? 'attempt' : 'attempts'}`)
  )
}
```

---

## Error Response Format

All API errors follow this format:

```typescript
// Success response
{
  "data": { ... },
  "message": "Operation successful"
}

// Error response
{
  "error": {
    "code": "INSUFFICIENT_MARGIN",
    "message": "Insufficient margin. Required: $108,500.00, Available: $50,000.00"
  }
}

// Validation error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "units": ["Must be a positive integer"],
      "leverage": ["Must be between 1 and 500"]
    }
  }
}
```

---

## Error Logging Strategy

```typescript
// src/lib/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'protrader-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  )
}
```

### What to Log

| Error Type            | Log Level | Include Stack Trace |
| --------------------- | --------- | ------------------- |
| 5xx errors            | ERROR     | Yes                 |
| 4xx errors            | WARN      | No                  |
| Validation errors     | WARN      | No                  |
| Rate limit hits       | INFO      | No                  |
| Database errors       | ERROR     | Yes                 |
| External API failures | ERROR     | Yes                 |

---

## Common Mistakes

### ❌ Swallowing Errors

```typescript
// WRONG: Error is silently ignored
try {
  await tradingService.openPosition(params)
} catch (error) {
  // Nothing happens
}

// CORRECT: Handle or re-throw
try {
  await tradingService.openPosition(params)
} catch (error) {
  logger.error('Failed to open position', { params, error })
  throw error // Or return error response
}
```

### ❌ Exposing Stack Traces to Users

```typescript
// WRONG: Internal details exposed
res.status(500).json({ error: err.stack })

// CORRECT: User-friendly message
res.status(500).json({
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  },
})
```

### ❌ Not Using Transactions for Multi-Step Operations

```typescript
// WRONG: Partial state on failure
await prisma.trade.create({...})
await prisma.ledgerTransaction.create({...}) // If this fails, trade exists without ledger entry

// CORRECT: Atomic transaction
await prisma.$transaction(async (tx) => {
  await tx.trade.create({...})
  await tx.ledgerTransaction.create({...})
})
```

---

## Testing Error Handling

```typescript
describe('TradingService Error Handling', () => {
  it('should throw InsufficientMarginError when balance too low', async () => {
    const user = await createTestUser({ balanceCents: 100000n })

    await expect(
      tradingService.openPosition({
        userId: user.id,
        instrumentId: 'EURUSD',
        direction: 'BUY',
        units: 10n,
        leverage: 100n,
      }),
    ).rejects.toThrow(InsufficientMarginError)
  })

  it('should throw PositionAlreadyClosedError when closing closed position', async () => {
    const trade = await createClosedTrade()

    await expect(
      tradingService.closePosition({
        tradeId: trade.id,
        currentRateScaled: 109000n,
      }),
    ).rejects.toThrow(PositionAlreadyClosedError)
  })

  it('should return 422 with validation details for invalid input', async () => {
    const response = await request(app).post('/api/positions').send({
      instrumentId: 'EURUSD',
      direction: 'INVALID',
      units: -1,
      leverage: 0,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details).toHaveProperty('direction')
    expect(response.body.error.details).toHaveProperty('units')
    expect(response.body.error.details).toHaveProperty('leverage')
  })
})
```

---

## References

- [API Route Creation Skill](../api-route-creation/SKILL.md)
- [BigInt Money Handling Skill](../bigint-money-handling/SKILL.md)
- [RBAC Implementation Skill](../rbac-implementation/SKILL.md)
- [PTS-API-001](../../../docs/Core%20Technical%20Specifications/PTS-API-001_API_Specification.md)
