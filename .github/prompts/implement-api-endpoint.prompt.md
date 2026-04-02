---
name: implement-api-endpoint
description: 'Implement a complete API endpoint with route, service, validation, and tests'
argument-hint: 'Describe the endpoint (method, path, purpose, request/response shape, auth requirements)'
agent: 'Coding'
---

# Implement API Endpoint

You are implementing a new API endpoint for ProTraderSim. Follow the platform's strict layering and financial precision rules.

## Input

- **Method & Path**: {{endpoint}}
- **Purpose**: {{purpose}}
- **Request Shape**: {{request}}
- **Response Shape**: {{response}}
- **Auth Requirements**: {{auth}}

## Implementation Steps

### 1. Route Layer (`apps/api/src/routes/`)

Create or update the route file following these rules:

- HTTP handling only — delegate ALL business logic to services
- Use Zod for request validation (path, query, body)
- Apply authentication middleware (`authenticate`)
- Apply rate limiting (100 req/min default, 10 req/15min for auth)
- Return `ApiResponse<T>` on success, `ApiError` on failure
- Use `try/catch` with `next(error)` pattern

### 2. Service Layer (`apps/api/src/services/`)

Implement business logic following these rules:

- ALL money operations use BigInt cents (never Decimal/Float/number)
- ALL prices use BigInt scaled ×100000
- Division is ALWAYS LAST in calculations
- Use Prisma for database operations
- Throw `AppError` with specific error codes on failures
- Add JSDoc comments on all exported functions

### 3. Type Definitions (`packages/types/src/`)

If new types are needed:

- Add to `packages/types/src/index.ts`
- Use `MoneyString` for money in API responses
- Use `PriceString` for prices in API responses
- Export new types from the package

### 4. Tests (`apps/api/src/**/*.test.ts`)

Write tests covering:

- Happy path with valid input
- Validation errors (missing fields, invalid types)
- Authentication failures (missing/invalid JWT)
- Business rule violations (insufficient balance, invalid state)
- Edge cases (zero values, maximum values, boundary conditions)

## Example Structure

```typescript
// Route: apps/api/src/routes/example.ts
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth'
import { exampleService } from '@/services/example.service'
import type { ApiResponse } from '@protrader/types'

const router = Router()

const schema = z.object({
  // validation schema
})

router.post('/example', authenticate, async (req, res, next) => {
  try {
    const input = schema.parse(req.body)
    const result = await exampleService.doSomething(req.user.id, input)
    const response: ApiResponse<typeof result> = { data: result }
    res.json(response)
  } catch (error) {
    next(error)
  }
})

export default router
```

## Checklist

- [ ] Route validates input with Zod
- [ ] Route uses authenticate middleware
- [ ] Route returns ApiResponse<T> shape
- [ ] Service contains all business logic
- [ ] Service uses BigInt for money/prices
- [ ] Service has JSDoc on exported functions
- [ ] Types exported from @protrader/types if needed
- [ ] Tests cover happy path and error cases
- [ ] Tests verify financial calculation correctness
- [ ] Route mounted in apps/api/src/index.ts
