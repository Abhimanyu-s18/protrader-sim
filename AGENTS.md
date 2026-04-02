# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build / Lint / Test Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start all apps
pnpm --filter @protrader/api dev    # Single app

# Quality checks
pnpm build                  # Build all apps
pnpm lint                  # Lint all apps
pnpm typecheck             # TypeScript check all apps
pnpm test                  # Run all tests

# Single test file (Jest)
cd apps/api && pnpm jest src/lib/calculations.test.ts
cd apps/api && pnpm jest src/services/trading.test.ts --testNamePattern="test name"

# Formatting
pnpm format                # Format with Prettier
pnpm format:check          # Check formatting

# Database
pnpm db:generate           # Generate Prisma client
pnpm db:migrate            # Run migrations
pnpm db:seed               # Seed instruments and staff
pnpm db:studio             # Open Prisma Studio
```

## Code Style Guidelines

### TypeScript Config

- Strict mode enabled with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- Use explicit return types on exported functions
- Never use `any` — use `unknown` or proper types
- Prefer `type` over `interface` for object shapes

### ESLint Rules (error level)

- `@typescript-eslint/no-explicit-any` — ERROR
- `@typescript-eslint/consistent-type-imports` — ERROR (use inline type imports)
- `@typescript-eslint/no-non-null-assertion` — ERROR
- `@typescript-eslint/no-unused-vars` — ERROR (prefix with `_` for unused)
- `no-console` — WARN (allow `warn`, `error`)
- `prefer-const` — ERROR
- `no-var` — ERROR
- `object-shorthand` — ERROR

### Prettier Rules

- No semicolons
- Single quotes
- 2 spaces indentation
- Trailing commas
- 100 character line width
- Single quotes for strings

### Imports

```typescript
// Prefer inline type imports
import type { User, Trade } from '@protrader/types'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

// Order: external → internal → types
import { z } from 'zod'
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { serializeBigInt } from '../lib/calculations.js'
import type { ApiResponse } from '@protrader/types'
```

### Naming Conventions

- Use PascalCase for types, interfaces, classes
- Use camelCase for variables, functions, file names
- Use UPPER_SNAKE_CASE for constants
- File names: kebab-case (`user-service.ts`) for utils, PascalCase for components

### Error Handling

- Use standardized error responses: `{ error: string }`
- Implement errorHandler middleware in routes
- Use Zod for input validation
- Return proper HTTP status codes (400, 401, 403, 404, 500)

```typescript
// Standard route error handling
XRouter.get('/endpoint', async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed' })
    }
    res.json({ data: serializeBigInt(result) })
  } catch (error) {
    next(error)
  }
})
```

### Code Structure

- Prefer early returns over nested conditionals
- Add JSDoc comments on all exported functions
- Keep functions under 50 lines when possible
- Handle loading and error states in UI components

---

## Critical Financial Rules (NON-NEGOTIABLE)

- **ALL money**: BIGINT cents (e.g., `$100.50` = `10050n`)
- **ALL prices**: BIGINT scaled ×100000 (e.g., `1.08500` = `108500n`)
- **NEVER** use `Decimal`, `Float`, `Double`, or `number` for financial calculations
- **Division is ALWAYS LAST** — multiply first, divide last (precision rule)
- **Balance is NOT stored** — computed from `ledger_transactions` table

### Financial Calculations

```typescript
const PRICE_SCALE = 100000n // price storage multiplier
const BPS_SCALE = 10000n // 10000 bps = 100%
const CENTS = 100n

// Margin = (units × contractSize × openRateScaled × CENTS) / (leverage × PRICE_SCALE)
// P&L BUY = (currentBidScaled - openRateScaled) × units × contractSize × CENTS / PRICE_SCALE
// P&L SELL = (openRateScaled - currentAskScaled) × units × contractSize × CENTS / PRICE_SCALE
// Margin level = (equityCents × BPS_SCALE) / usedMarginCents (null if no open positions)
```

---

## Type Conventions

- `MoneyString` — `"10050"` (cents as string)
- `PriceString` — `"108500"` (scaled ×100000 as string)
- All API responses: `ApiResponse<T>` wrapper with `data` field
- Paginated responses: `PaginatedResponse<T>` with `next_cursor` and `has_more`

---

## Architecture

- **5 Next.js apps** + **1 Express API** (port 4000)
- **Layered architecture**: Routes (HTTP) → Services → Database
- **Socket.io rooms**: `user:{userId}`, `prices:{symbol}`, `admin:panel`
- **JWT**: RS256 (asymmetric) — requires `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`
- **Rate limiting**: 100 req/min global; 10 req/15min per IP on auth endpoints

### Database (Prisma)

- Balance computed via `get_user_balance(userId)` SQL function
- `ledger_transactions` stores audit snapshots only
- Trade close reasons: `USER`, `STOP_LOSS`, `TAKE_PROFIT`, `TRAILING_STOP`, `MARGIN_CALL`, `STOP_OUT`, `ADMIN`, `EXPIRED`
- Instrument fields: `contractSize` (100000 Forex, 1 stocks), `pipDecimalPlaces` (4 most Forex, 2 JPY)

---

## Shared Packages

- `@protrader/config` — ESLint, TypeScript, Tailwind configs
- `@protrader/db` — Prisma schema and client
- `@protrader/types` — Shared TypeScript types
- `@protrader/utils` — `formatMoney`, `formatPrice`, `createApiClient`
- `@protrader/ui` — Shared UI components (CVA + Tailwind)
- `@protrader/email` — React Email templates

---

## Environment Setup

1. Copy `.env.example` to `apps/api/.env.local`
2. Start infrastructure: `docker compose up -d`
3. Push schema: `pnpm db:migrate && pnpm db:seed`

---

## Testing

- Jest for API tests (`apps/api`)
- Test files in same directory as source (not separate test folder)
- Run single test: `cd apps/api && pnpm jest src/lib/calculations.test.ts`

---

## Common Patterns

### BigInt Serialization

Every response with BigInt fields MUST use `serializeBigInt()`:

```typescript
res.json({ data: serializeBigInt({ items: data, has_more: hasMore }) })
```

### Cursor-based Pagination

```typescript
const take = Math.min(parseInt(parsed.data.limit ?? '50', 10), 200)
const items = await prisma.model.findMany({ take: take + 1 })
const hasMore = items.length > take
const data = hasMore ? items.slice(0, take) : items
```

### Zod Validation with req.query

```typescript
const schema = z.object({ limit: z.string().optional() })
const parsed = schema.safeParse(req.query)
if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })
```
