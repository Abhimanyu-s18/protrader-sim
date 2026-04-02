---
name: api-route-rules
description: Rules for Express.js API route files
applyTo: 'apps/api/src/routes/**/*.ts'
---

# API Route Rules

## Layering

- Routes handle HTTP only (validation, auth, response formatting)
- All business logic goes in services (`apps/api/src/services/`)
- Routes delegate to services, services handle database operations

## Request Validation

- Use Zod for all request validation
- Validate path params, query params, and body
- Return 422 with field-level error details on validation failure

## Response Format

- Success: `{ data: T, message?: string }`
- Error: `{ error: { code: string, message: string, details?: object } }`
- Paginated: `{ data: T[], next_cursor: string, has_more: boolean }`

## Error Handling

- Use `try/catch` with `next(error)` pattern
- Throw `AppError` with specific error codes
- Never expose internal error details to clients

## Rate Limiting

- Global: 100 req/min
- Auth endpoints: 10 req/15min per IP
- Add rate limiting to mutation endpoints when needed

## Examples

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { tradingService } from '@/services/trading.service'
import { authMiddleware, AuthRequest } from '@/middleware/auth'

const router = Router()

const openPositionSchema = z.object({
  instrumentId: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  // Accept string or number for safe BigInt conversion at parse time.
  units: z
    .union([z.string(), z.number()])
    .refine(
      (val) => {
        const parsed = typeof val === 'string' ? Number(val) : val
        return Number.isSafeInteger(parsed) && parsed > 0
      },
  leverage: z.union([z.string(), z.number()])
    .refine((val) => {
      const parsed = typeof val === 'string' ? Number(val) : val
      return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 500
    }, { message: 'leverage must be a safe integer between 1 and 500' })
    .transform((val) => BigInt(typeof val === 'string' ? Number(val) : val)),
    }
    return BigInt(parsed)
  }),
})

router.post('/trades/open', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const parseResult = openPositionSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parseResult.error.flatten().fieldErrors,
        },
      })
    }
    const input = parseResult.data

    // input.units and input.leverage are already BigInt after zod transformation
    const trade = await tradingService.openPosition({
      userId: req.user.id,
      ...input,
    })

    res.status(201).json({ data: trade })
  } catch (error) {
    next(error)
  }
})

export default router
```
