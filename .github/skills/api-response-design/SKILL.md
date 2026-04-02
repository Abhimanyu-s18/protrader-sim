---
name: 'api-response-design'
description: 'Use when: designing API response shapes, creating new endpoints, standardizing error formats, implementing pagination, or ensuring consistent API contracts. Ensures all endpoints follow ApiResponse<T> wrapper, proper status codes, and predictable error structures. Primary agents: @coding, @architecture, @code-review.'
---

# Skill: API Response Design

**Scope**: API response shapes, error formats, pagination, consistency across endpoints
**Primary Agents**: @coding, @architecture, @code-review
**When to Use**: Building new endpoints, reviewing API contracts, standardizing responses

---

## Core Principles

### 1. All Responses Use `ApiResponse<T>` Wrapper

Every successful API response MUST wrap data in the standard envelope:

```typescript
// packages/types/src/index.ts
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error_code: string
  message: string
  details?: Record<string, string[]>
}
```

**Why**: Consistent parsing on the frontend, predictable error handling, easy middleware integration.

### 2. HTTP Status Codes Map to Error Types

| Status | Meaning               | When to Use                                |
| ------ | --------------------- | ------------------------------------------ |
| 200    | Success               | GET, PUT, PATCH success                    |
| 201    | Created               | POST success (resource created)            |
| 400    | Bad Request           | Malformed request, invalid JSON            |
| 401    | Unauthorized          | Missing or invalid JWT                     |
| 403    | Forbidden             | Valid JWT but insufficient permissions     |
| 404    | Not Found             | Resource doesn't exist                     |
| 409    | Conflict              | Duplicate resource, state conflict         |
| 422    | Unprocessable Entity  | Validation failed, business rule violation |
| 429    | Too Many Requests     | Rate limit exceeded                        |
| 500    | Internal Server Error | Unexpected server failure                  |

### 3. Financial Values Are Strings in API Responses

Never return raw BigInt or numbers for money/prices:

```typescript
// WRONG
{
  balance: 10050,        // Number — loses precision
  price: 108500          // Number — loses precision
}

// CORRECT
{
  balance_cents: "10050",     // MoneyString
  price_scaled: "108500"      // PriceString
}
```

---

## Response Patterns

### Single Resource

```typescript
// GET /api/users/:id
// 200 OK
{
  "data": {
    "id": "usr_123",
    "email": "trader@example.com",
    "kyc_status": "APPROVED"
  }
}

// 404 Not Found
{
  "error_code": "USER_NOT_FOUND",
  "message": "User usr_123 does not exist"
}
```

### Collection

```typescript
// GET /api/users
// 200 OK
{
  "data": [
    { "id": "usr_123", "email": "trader@example.com" },
    { "id": "usr_456", "email": "admin@example.com" }
  ]
}
```

### Paginated Collection

**Pagination rules**:

- Default limit: 20, max limit: 100
- Cursor-based (not offset-based) for consistency
- `next_cursor` is `null` when no more results
- `has_more` is boolean for easy frontend checks

### Created Resource

```typescript
// POST /api/trades
// 201 Created
{
  "data": {
    "id": "trd_789",
    "symbol": "EURUSD",
    "direction": "BUY",
    "units": 100000,
    "open_rate_scaled": "108500"
  }
}
```

### Validation Error (422)

```typescript
// POST /api/trades with invalid body
// 422 Unprocessable Entity
{
  "error_code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "units": ["Must be a positive integer"],
    "leverage": ["Must be between 1 and 500"]
  }
}
```

### Business Rule Error (422)

```typescript
// POST /api/trades with insufficient margin
// 422 Unprocessable Entity
{
  "error_code": "INSUFFICIENT_MARGIN",
  "message": "Insufficient margin to open position",
  "details": {
    "required_cents": "50000",
    "available_cents": "25000"
  }
}
```

### Authentication Error (401)

```typescript
// GET /api/users/me without JWT
// 401 Unauthorized
{
  "error_code": "UNAUTHORIZED",
  "message": "Valid authentication required"
}
```

### Authorization Error (403)

```typescript
// GET /api/admin/users as non-admin
// 403 Forbidden
{
  "error_code": "FORBIDDEN",
  "message": "Insufficient permissions to access this resource"
}
```

---

## Implementation Patterns

### Route Handler Template

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth'
import { tradingService } from '@/services/trading.service'
import type { ApiResponse, ApiError, Trade } from '@protrader/types'

const router = Router()

const openTradeSchema = z.object({
  instrumentId: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  units: z.number().int().positive(),
  leverage: z.number().int().min(1).max(500),
})

router.post('/trades', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated')
    }

    const input = openTradeSchema.parse(req.body)

    const trade: Trade = await tradingService.openPosition({
      userId: req.user.id,
      ...input,
    })

    const response: ApiResponse<Trade> = { data: trade }
    res.status(201).json(response)
  } catch (error) {
    next(error)
  }
})

export default router
```

### Error Handler Middleware

```typescript
// apps/api/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express'
import type { ApiError } from '@protrader/types'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import winston from 'winston'

// Configure structured logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    // Add file transport for production
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
})

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  // Zod validation errors
  if (error instanceof ZodError) {
    const apiError: ApiError = {
      error_code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: Object.fromEntries(
        Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value ?? []]),
      ) as Record<string, string[]>,
    }
    return res.status(422).json(apiError)
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      const apiError: ApiError = {
        error_code: 'NOT_FOUND',
        message: 'Resource not found',
      }
      return res.status(404).json(apiError)
    }
    if (error.code === 'P2002') {
      const apiError: ApiError = {
        error_code: 'CONFLICT',
        message: 'Resource already exists',
      }
      return res.status(409).json(apiError)
    }
  }

  // Application errors
  if ('statusCode' in error && 'code' in error) {
    const appError = error as { statusCode: number; code: string; message: string }
    const apiError: ApiError = {
      error_code: appError.code,
      message: appError.message,
    }
    return res.status(appError.statusCode).json(apiError)
  }

  // Fallback: Internal server error
  logger.error('Unhandled error occurred', {
    error,
    stack: error?.stack,
    url: req.url,
    method: req.method,
  })
  const apiError: ApiError = {
    error_code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  }
  return res.status(500).json(apiError)
}
```

---

## Type Design for API Responses

### Financial Response Types

```typescript
// packages/types/src/index.ts
export interface TradeResponse {
  id: string
  userId: string
  instrumentId: string
  direction: TradeDirection
  units: number
  leverage: number
  openRate: PriceString // Scaled price as string
  currentRate: PriceString // Live price as string
  unrealizedPnl: MoneyString // P&L in cents as string
  marginUsed: MoneyString // Margin in cents as string
  status: TradeStatus
  createdAt: string
  updatedAt: string
}
```

### Account Metrics Response

```typescript
export interface AccountMetricsResponse {
  balance: MoneyString
  equity: MoneyString
  marginUsed: MoneyString
  marginAvailable: MoneyString
  marginLevel: MoneyString | null // null if no open positions
  unrealizedPnl: MoneyString
}
```

---

## Checklist

When designing a new API response:

- [ ] Success response uses `ApiResponse<T>` wrapper
- [ ] Error response uses `ApiError` shape with `error_code` and `message`
- [ ] Financial values are strings (MoneyString, PriceString)
- [ ] Pagination uses cursor-based approach with `next_cursor` and `has_more`
- [ ] HTTP status codes match error types (401 for auth, 422 for validation, etc.)
- [ ] Validation errors include field-level `details`
- [ ] No internal error details exposed to clients
- [ ] Response types exported from `@protrader/types`
- [ ] Consistent naming (snake_case in API, camelCase in TypeScript)

---

## Common Mistakes

### 1. Returning Raw Data Without Wrapper

```typescript
// WRONG
res.json(users)

// CORRECT
res.json({ data: users })
```

### 2. Inconsistent Error Shapes

```typescript
// WRONG — different endpoints use different error formats
res.status(400).json({ error: 'Bad request' })
res.status(400).json({ message: 'Invalid input' })
res.status(400).json({ errors: ['Field required'] })

// CORRECT — all use ApiError shape
res.status(400).json({
  error_code: 'VALIDATION_ERROR',
  message: 'Request validation failed',
  details: { field: ['Field is required'] },
})
```

### 3. Returning Numbers for Money

```typescript
// WRONG
{
  balance: 10050,
  pnl: -250
}

// CORRECT
{
  balance_cents: "10050",
  unrealized_pnl_cents: "-250"
}
```

### 4. Missing Pagination Metadata

```typescript
// WRONG
{
  data: trades,
  page: 1,
  total: 150
}

// CORRECT
{
  data: trades,
  next_cursor: "abc123",
  has_more: true
}
```

---

## API Documentation Pattern

Document each endpoint with:

````markdown
### POST /api/trades

Open a new trading position.

**Request Body**:

```json
{
  "instrumentId": "string",
  "direction": "BUY" | "SELL",
  "units": "number (positive integer)",
  "leverage": "number (1-500)"
}
```

**Success Response (201)**:

```json
{
  "data": {
    "id": "string",
    "direction": "BUY",
    "units": 100000,
    "open_rate_scaled": "108500",
    "margin_used": "5000"
  }
}
```

**Error Responses**:

- 401 `UNAUTHORIZED` — Missing or invalid JWT
- 422 `VALIDATION_ERROR` — Invalid request body
- 422 `INSUFFICIENT_MARGIN` — Not enough margin available
- 409 `POSITION_LIMIT_EXCEEDED` — Maximum open positions reached
````
