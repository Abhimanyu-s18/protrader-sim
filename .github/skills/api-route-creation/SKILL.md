---
name: api-route-creation
description: "Use when: building Express.js API routes, implementing HTTP endpoints, handling requests/responses, or designing route structure. Ensures proper layering, validation, authentication, error handling, and API design consistency. Primary agents: Coding, Security, Architecture."
---

# API Route Creation — ProTraderSim

Master Express.js route creation following ProTraderSim's strict layering rules: **routes handle HTTP only, services contain business logic, jobs handle async work.**

---

## 🏗️ Layering Rule (NEVER Violate)

```
HTTP Request
    ↓
Route Handler (HTTP only: parse, validate, call service)
    ↓
Service Function (ALL business logic, DB queries, calculations)
    ↓
Database / External APIs / Job Queues
```

### ✅ Correct Layering

```typescript
// routes/withdrawals.ts — HTTP ONLY
router.post('/', 
  authenticate(),
  authorize(['TRADER']),
  validateRequest(WithdrawalSchema),
  async (req, res) => {
    try {
      // 1. Extract from request
      const { amount } = req.body
      const userId = req.user.id
      
      // 2. Delegate to service (all logic goes here)
      const withdrawal = await withdrawalService.createWithdrawal(
        userId,
        amount
      )
      
      // 3. Return response
      res.status(201).json(apiResponse.success(withdrawal))
    } catch (err) {
      handleError(res, err)
    }
  }
)

// services/withdrawal.service.ts — ALL BUSINESS LOGIC
export async function createWithdrawal(
  userId: string,
  amountDollars: string
): Promise<WithdrawalData> {
  // 1. Convert to cents
  const amountCents = dollarsToCents(amountDollars)
  
  // 2. Validate business rules
  const balance = await getBalance(userId)
  if (balance < amountCents) {
    throw new ApiError('INSUFFICIENT_BALANCE', 'Not enough funds')
  }
  
  // 3. Create records
  const withdrawal = await prisma.withdrawal_request.create({
    data: { user_id: userId, amount_cents: amountCents.toString() }
  })
  
  // 4. Trigger async job
  await withdrawalQueue.add({
    withdrawal_id: withdrawal.id,
    user_id: userId
  })
  
  return withdrawal
}
```

### ❌ Wrong — Business Logic in Route

```typescript
// DON'T DO THIS
router.post('/', async (req, res) => {
  const wallet = await prisma.traders_wallet.findUnique({
    where: { trader_id: req.user.id }
  })
  
  // ❌ All this belongs in a SERVICE
  const amountCents = dollarsToCents(req.body.amount)
  if (wallet.balance < amountCents) {
    return res.status(400).json({ error: 'Insufficient' })
  }
  
  const newBalance = wallet.balance - amountCents
  await prisma.traders_wallet.update({
    where: { trader_id: req.user.id },
    data: { balance: newBalance }
  })
  // ... more business logic
})
```

---

## 📝 Route Structure Template

```typescript
// apps/api/src/routes/[feature].routes.ts

import { Router, Request, Response } from 'express'
import { authenticate, authorize, validateRequest } from '../middleware'
import { [Feature]Service } from '../services'
import { handleError, apiResponse } from '../lib/response'

const router = Router()

/**
 * POST /api/[feature]
 * Description: What this endpoint does
 * Auth: Required roles
 * Body: { ... }
 * Response: { success: true, data: {...} }
 */
router.post(
  '/',
  authenticate(),
  authorize(['TRADER', 'ADMIN']),  // Specific roles
  validateRequest(CreateSchema),    // Zod validation
  async (req: Request, res: Response) => {
    try {
      const result = await [Feature]Service.create(
        req.user.id,
        req.body
      )
      res.status(201).json(apiResponse.success(result))
    } catch (err) {
      handleError(res, err)
    }
  }
)

export default router
```

---

## 🔐 Authentication & Authorization

### Middleware Stack (in order)

```typescript
import { authenticate } from './middleware/auth'
import { authorize } from './middleware/role'
import { validateRequest } from './middleware/validation'
import { rateLimit } from './middleware/rateLimit'

// Order matters!
router.post(
  '/',
  rateLimit({ limit: 10, windowMs: 60 * 1000 }),  // Global rate limit
  authenticate(),                                   // JWT validation (req.user)
  authorize(['TRADER']),                           // Role check
  validateRequest(DepositSchema),                  // Body validation
  handler
)
```

### Authentication Types

**JWT (RS256) — Primary**
```typescript
// middleware/auth.ts
export function authenticate() {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json(apiError('NO_TOKEN'))
    
    try {
      const decoded = verifyJWT(token, JWT_PUBLIC_KEY)
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        roles: decoded.roles
      }
      next()
    } catch (err) {
      res.status(401).json(apiError('INVALID_TOKEN'))
    }
  }
}

// Usage in route
router.get('/me', authenticate(), (req, res) => {
  res.json({ user: req.user })  // req.user guaranteed to exist
})
```

**Rate Limiting — All auth endpoints**
```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per IP
  message: 'Too many login attempts'
})

router.post('/login', authLimiter, handler)
router.post('/register', authLimiter, handler)
```

### Authorization Patterns

```typescript
// Single role
authorize(['TRADER'])

// Multiple roles (OR logic)
authorize(['ADMIN', 'IB_TEAM_LEADER'])

// Admin-only
authorize(['SUPER_ADMIN', 'ADMIN'])

// Deep permission check
authorize(['TRADER'], (req, user) => {
  // Custom logic: e.g., can only access own positions
  return req.params.userId === user.id
})
```

---

## ✅ Input Validation (Zod)

### Schema Definitions

```typescript
// routes/deposits.ts
import { z } from 'zod'

const CreateDepositSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
    .refine((val) => {
      const cents = dollarsToCents(val)
      return cents >= 100n && cents <= 99999999n
    }, 'Amount must be $0.01 to $999,999.99'),
  
  currency: z.enum(['USDT', 'ETH']),
  
  metadata: z.object({
    ip_address: z.string().ip(),
    device_id: z.string().uuid().optional()
  }).optional()
})

type CreateDepositRequest = z.infer<typeof CreateDepositSchema>
```

### Validation Middleware

```typescript
import { ZodSchema } from 'zod'

export function validateRequest(schema: ZodSchema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      })
    }
    
    req.body = result.data  // Replace with validated data
    next()
  }
}
```

---

## 📤 Response Format

### StandardAPI Response

```typescript
// Always wrapped in ApiResponse<T>
export interface ApiResponse<T> {
  success: true
  data: T
  timestamp: string
}

export interface ApiError {
  success: false
  error: string
  message: string
  statusCode: number
  timestamp: string
}

// Usage
router.post('/', async (req, res) => {
  try {
    const result = await depositService.createDeposit(...)
    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: err.message,
      statusCode: 500,
      timestamp: new Date().toISOString()
    })
  }
})
```

### Pagination

```typescript
interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    next_cursor: string | null
    has_more: boolean
    limit: number
  }
}

// Usage
router.get('/', authenticate(), async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  const cursor = req.query.cursor as string | undefined
  
  const [items, count] = await Promise.all([
    prisma.position.findMany({
      where: { user_id: req.user.id },
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      take: limit + 1  // +1 to detect has_more
    }),
    prisma.position.count({ where: { user_id: req.user.id } })
  ])
  
  const hasMore = items.length > limit
  const data = items.slice(0, limit)
  
  res.json({
    success: true,
    data,
    pagination: {
      next_cursor: hasMore ? data[data.length - 1].id : null,
      has_more: hasMore,
      limit
    }
  })
})
```

---

## 🚨 Error Handling

### Standardized Error Class

```typescript
// lib/errors.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Usage in service
if (balance < amountCents) {
  throw new ApiError(
    'INSUFFICIENT_BALANCE',
    400,
    'Your balance is too low for this withdrawal',
    { balance, required: amountCents }
  )
}

// Caught in route or global handler
catch (err) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message
    })
  } else {
    // Unexpected error — log & return generic
    console.error(err)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong'
    })
  }
}
```

### Global Error Handler Middleware

```typescript
// middleware/errorHandler.ts
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: any
) {
  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_ERROR'
  
  // Log all errors
  if (statusCode >= 500) {
    console.error('[500]', err)
  }
  
  res.status(statusCode).json({
    success: false,
    error: code,
    message: err.message || 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  })
}

// In server setup
app.use(errorHandler)  // Last middleware
```

---

## 📋 Route Registration

### Register All Routes

```typescript
// apps/api/src/index.ts
import express from 'express'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'

// Import all routes
import authRoutes from './routes/auth'
import tradesRoutes from './routes/trades'
import depositsRoutes from './routes/deposits'
import withdrawalsRoutes from './routes/withdrawals'
import adminRoutes from './routes/admin'

const app = express()

// Middleware
app.use(express.json())
app.use(requestLogger)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/trades', tradesRoutes)
app.use('/api/deposits', depositsRoutes)
app.use('/api/withdrawals', withdrawalsRoutes)
app.use('/api/admin', adminRoutes)

// Error handling (MUST be last)
app.use(errorHandler)

export default app
```

---

## ✅ Route Creation Checklist

- [ ] **Layering**: All business logic in service, not route
- [ ] **Auth**: Route has `authenticate()` if user-specific
- [ ] **Authorization**: Correct roles in `authorize()`
- [ ] **Validation**: Request body validated with Zod
- [ ] **Response**: Returns `ApiResponse<T>` format
- [ ] **Errors**: Throws `ApiError` with code & status
- [ ] **Documentation**: JSDoc comment above route
- [ ] **Tests**: Integration tests for success + error paths
- [ ] **Rate Limiting**: Payment endpoints have rate limits

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Business logic in route | All logic in `[Feature]Service` |
| No role check | `authorize(['TRADER'])` |
| Manual body parsing | Use `validateRequest(Schema)` |
| Generic "Error" response | `ApiError('CODE', statusCode, msg)` |
| Store validation in route | Define in Zod schema in `schemas.ts` |
| No error handler | Global `errorHandler` middleware |
| Mixed concerns (HTTP + DB) | Separate route and service files |

---

## 📚 Related Skills

- `rbac-implementation` — Role-based access control
- `api-response-design` — Designing response structures
- `error-handling-patterns` — Error handling best practices
- `api-integration-testing` — Testing routes
