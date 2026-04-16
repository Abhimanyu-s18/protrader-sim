# ProTraderSim — Copilot Instructions

> **New to ProTraderSim? Start here**: [WORKSPACE_INSTRUCTIONS.md](./WORKSPACE_INSTRUCTIONS.md) has a 30-minute onboarding, architecture overview, and links to all guides.
>
> **Choosing an agent?** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | **Building a feature?** → [COMMON_WORKFLOWS.md](./COMMON_WORKFLOWS.md) | **Documentation index** → [INDEX.md](./INDEX.md)

---

## Project Overview

Multi-asset offshore CFD simulation trading platform with IB (Introducing Broker) model. Regulated under FSC Mauritius + FSA Seychelles.

**Monorepo**: Turborepo + pnpm workspaces | **Stack**: Next.js 15, Express.js, PostgreSQL 17, Redis 7, Socket.io

---

## Quick Commands

```bash
# Install dependencies
pnpm install

# Start all apps (dev mode)
pnpm dev

# Start single app
pnpm --filter @protrader/api dev
pnpm --filter @protrader/platform dev

# Database operations
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio
pnpm db:seed        # Seed instruments and staff

# Quality checks
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

---

## Architecture

### Apps (5 Next.js + 1 Express)

| App         | Port | Purpose                                 |
| ----------- | ---- | --------------------------------------- |
| `web`       | 3000 | Public marketing site                   |
| `auth`      | 3001 | Login/Register/KYC flows                |
| `platform`  | 3002 | Trading dashboard (main user interface) |
| `admin`     | 3003 | Back-office admin panel                 |
| `ib-portal` | 3004 | IB Agent/Team Leader portal             |
| `api`       | 4000 | Express.js REST API + Socket.io         |

All frontend apps consume the API at `localhost:4000`.

### Shared Packages

- `packages/config` — ESLint, TypeScript, Tailwind configs
- `packages/db` — Prisma schema and client
- `packages/types` — Shared TypeScript types (`MoneyString`, `PriceString`, API responses)
- `packages/utils` — Utility functions (`formatMoney`, `formatPrice`, `createApiClient`)
- `packages/ui` — Shared UI components (CVA + Tailwind)
- `packages/email` — React Email templates via Resend

---

## Critical Rules

### Financial Precision (NON-NEGOTIABLE)

- **All money**: `BIGINT` cents (e.g., `$100.50` = `10050n`)
- **All prices**: `BIGINT` scaled ×100000 (e.g., `1.08500` = `108500n`)
- **Never use**: `Decimal`, `Float`, `Double`, or `number` for financial calculations
- **Division is always LAST** — use integer arithmetic throughout

```typescript
// CORRECT
const marginCents =
  (units * BigInt(contractSize) * openRateScaled * CENTS) / (BigInt(leverage) * PRICE_SCALE)

// WRONG — never cast to Number
const margin = (Number(units) * contractSize * Number(price)) / leverage
```

### Type Conventions

- `MoneyString` — String representation of cents in API responses (`"10050"`)
- `PriceString` — String representation of scaled price (`"108500"`)
- All API responses use `ApiResponse<T>` wrapper with `data` field
- Paginated responses use `PaginatedResponse<T>` with `next_cursor` and `has_more`

### Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- Prefer early returns over nested conditionals
- Never use `var` — always `const`/`let`
- Add JSDoc comments on all exported functions
- Handle loading and error states in all UI components

---

## API Structure (`apps/api/src/`)

```
routes/
  auth.ts, users.ts          # Authentication and user management
  trades.ts, instruments.ts  # Core trading functionality
  deposits.ts, withdrawals.ts  # Crypto payments via NowPayments
  kyc.ts                     # KYC document upload/review (Cloudflare R2)
  alerts.ts, watchlist.ts    # User features
  notifications.ts, signals.ts
  admin/, ib/                # Admin and IB portal endpoints
  webhooks.ts                # NowPayments IPN callbacks

middleware/
  auth.ts                    # JWT RS256 verification
  errorHandler.ts            # Standardized error responses
  requestLogger.ts

lib/
  calculations.ts            # ALL financial calculations (BigInt only)
  socket.ts                  # Socket.io real-time updates
  redis.ts                   # Cache layer
  prisma.ts                  # Database client
  queues.ts                  # BullMQ job queues

services/
  market-data.ts             # Market data + pending orders cache

workers/
  rollover.ts                # Daily swap rollover processor
```

**Architecture note**: Despite the "Routes → Services → Database" pattern described in docs, most business logic currently lives directly in route files (e.g., `trades.ts` is ~750 lines). The `services/` directory only contains `market-data.ts`. When adding new features, prefer extracting business logic into service functions for testability, but follow existing patterns for consistency.

### Common Route Patterns

Every route follows this template:

```typescript
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeBigInt } from '../lib/calculations.js'
import { z } from 'zod'

export const XRouter = Router()
XRouter.use(requireAuth)

XRouter.get('/endpoint', async (req, res) => {
  // 1. Validate query params with Zod
  const schema = z.object({ limit: z.string().optional() })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })

  // 2. Query with cursor-based pagination (take + 1 trick)
  const take = Math.min(parseInt(parsed.data.limit ?? '50', 10), 200)
  const items = await prisma.model.findMany({ take: take + 1 })
  const hasMore = items.length > take
  const data = hasMore ? items.slice(0, take) : items

  // 3. Serialize BigInt to strings for JSON response
  res.json({ data: serializeBigInt({ items: data, has_more: hasMore }) })
})
```

**Critical patterns**:

- **BigInt serialization**: Every response with BigInt fields MUST wrap with `serializeBigInt()` — forgetting this causes JSON serialization errors
- **Cursor-based pagination**: Use `take + 1` trick to detect `has_more` without a second query
- **Zod validation**: Validate all `req.body` and `req.query` inputs
- **`as never` enum casting**: Prisma enums require casting string params via `as never` (e.g., `status: kycStatus as never`) — this is a Prisma limitation

### Socket.io Conventions

**Authentication**: `socket.handshake.auth.token` (RS256 JWT)

**Room naming**:

- `user:{userId}` — private user events (trade updates, account metrics)
- `prices:{symbol}` — price feed (max 20 subscriptions per connection)
- `admin:panel` — admin broadcast channel

**Client events**: `subscribe:prices` / `unsubscribe:prices` with `{ symbols: string[] }`

**Server emit helpers**: `emitToUser(io, userId, event, data)`, `emitPriceUpdate(io, symbol, data)`, `emitToAdmin(io, event, data)`

**→ For detailed patterns**: Read [`.github/instructions/socket-io-patterns.instructions.md`](./.github/instructions/socket-io-patterns.instructions.md)

### Background Jobs (BullMQ)

Workers handle async tasks: email, notifications, daily rollover (swap fees), KYC reminders.

**Pattern**: Route enqueues job → Worker processes asynchronously → Database updated

**Important**: All workers skip processing during tests (`NODE_ENV !== 'test'`)

**→ For detailed patterns**: Read [`.github/instructions/worker-patterns.instructions.md`](./.github/instructions/worker-patterns.instructions.md)

---

## Instruction Files & Skills Reference

### Instruction Files

These files contain code patterns and conventions for specific domains:

| File | Applies To | Purpose |
|------|-----------|---------|
| [api-route-rules.instructions.md](./.github/instructions/api-route-rules.instructions.md) | `apps/api/src/routes/**/*.ts` | Express route structure, validation, errors |
| [socket-io-patterns.instructions.md](./.github/instructions/socket-io-patterns.instructions.md) | `apps/api/src/lib/socket.ts`, frontend hooks | WebSocket room naming, authentication, events |
| [worker-patterns.instructions.md](./.github/instructions/worker-patterns.instructions.md) | `apps/api/src/workers/**/*.ts` | BullMQ job structure, enqueueing, error handling |
| [service-layer-patterns.instructions.md](./.github/instructions/service-layer-patterns.instructions.md) | `apps/api/src/services/**/*.ts` | Business logic extraction, testing, composition |
| [zustand-store-patterns.instructions.md](./.github/instructions/zustand-store-patterns.instructions.md) | `apps/*/src/stores/**/*.ts` | Client state management, Socket.io integration |
| [shared-utilities-patterns.instructions.md](./.github/instructions/shared-utilities-patterns.instructions.md) | `packages/utils/src/**/*.ts`, `packages/types/src/**/*.ts` | Formatting, conversions, API client, shared types |
| [e2e-trading-flows.instructions.md](./.github/instructions/e2e-trading-flows.instructions.md) | Complete user journeys (register → trade → withdraw) | End-to-end workflows with frontend + backend code |
| [prisma-schema-rules.instructions.md](./.github/instructions/prisma-schema-rules.instructions.md) | `packages/db/prisma/schema.prisma` | Table design, BIGINT fields, migrations |
| [react-component-rules.instructions.md](./.github/instructions/react-component-rules.instructions.md) | `**/*.{tsx,jsx}` | Component structure, hooks, state management |
| [test-file-rules.instructions.md](./.github/instructions/test-file-rules.instructions.md) | `**/*.test.{ts,tsx}` | Test structure, assertions, mocking |

### Detailed Skills

For comprehensive domain knowledge, see `.github/skills/`:

**Financial Foundation** (required reading):
- [`financial-calculations/SKILL.md`](./.github/skills/financial-calculations/SKILL.md) — All trading formulas (margin, P&L, equity, swaps) with BigInt
- [`bigint-money-handling/SKILL.md`](./.github/skills/bigint-money-handling/SKILL.md) — Money conversion, validation, ledger patterns

**API & Backend**:
- [`api-route-creation/SKILL.md`](./.github/skills/api-route-creation/SKILL.md) — Route layering, auth, validation, errors
- [`database-schema-design/SKILL.md`](./.github/skills/database-schema-design/SKILL.md) — Schema principles, relationships, indexes
- [`authentication-jwt-flow/SKILL.md`](./.github/skills/authentication-jwt-flow/SKILL.md) — RS256 JWT implementation
- [`socket-io-real-time/SKILL.md`](./.github/skills/socket-io-real-time/SKILL.md) — WebSocket architecture, scaling

**Frontend**:
- [`state-management-trading/SKILL.md`](./.github/skills/state-management-trading/SKILL.md) — Zustand + React Query + Socket.io integration
- [`trading-ui-components/SKILL.md`](./.github/skills/trading-ui-components/SKILL.md) — CVA components, TradingView charts

**Testing & Quality**:
- [`testing-financial-features/SKILL.md`](./.github/skills/testing-financial-features/SKILL.md) — Financial test strategies, BigInt precision
- [`api-integration-testing/SKILL.md`](./.github/skills/api-integration-testing/SKILL.md) — Route integration tests with real DB

**Compliance & Security**:
- [`kyc-compliance-flow/SKILL.md`](./.github/skills/kyc-compliance-flow/SKILL.md) — Document upload, file validation, PII
- [`regulatory-compliance/SKILL.md`](./.github/skills/regulatory-compliance/SKILL.md) — FSC/FSA constraints, KYC gates
- [`rbac-implementation/SKILL.md`](./.github/skills/rbac-implementation/SKILL.md) — Role hierarchy (SUPER_ADMIN → ADMIN → IB_TEAM_LEADER → AGENT)

**Other**:
- [`payment-integration/SKILL.md`](./.github/skills/payment-integration/SKILL.md) — NowPayments, IPN webhooks, idempotency
- [`orm-query-optimization/SKILL.md`](./.github/skills/orm-query-optimization/SKILL.md) — N+1 prevention, indexes
- [`error-handling-patterns/SKILL.md`](./.github/skills/error-handling-patterns/SKILL.md) — AppError class, standardized responses

**Quick lookup**: All 30+ skills at [`.github/skills/README.md`](./.github/skills/README.md)

---

## Database (`packages/db`)

PostgreSQL 17 with Prisma ORM.

**Key principles**:

- Balance is **never stored** — computed via `get_user_balance(userId)` PostgreSQL function
- `balanceAfterCents` on `ledger_transactions` is an **audit snapshot**, not the source of truth
- 4-role staff hierarchy: `SUPER_ADMIN` → `ADMIN` → `IB_TEAM_LEADER` → `AGENT`
- IB commissions tracked per trade in `ib_commissions` table

**Balance computation**:

```typescript
// CORRECT — use the DB function
const result = await prisma.$queryRaw`SELECT get_user_balance(${userId})`

// WRONG — there is no balance column on users table
const user = await prisma.user.findUnique({ where: { id } })
// user.balance does not exist
```

**Critical instrument fields**:

- `contractSize` — `100000` for Forex, `1` for stocks
- `pipDecimalPlaces` — `4` for most Forex, `2` for JPY pairs
- `marginCallBps` — `10000` = 100%
- `stopOutBps` — `5000` = 50%

**Trade close reasons** (`closedBy`): `USER`, `STOP_LOSS`, `TAKE_PROFIT`, `TRAILING_STOP`, `MARGIN_CALL`, `STOP_OUT`, `ADMIN`, `EXPIRED`

---

## Calculation Engine (`apps/api/src/lib/calculations.ts`)

```typescript
const PRICE_SCALE = 100000n   // price storage multiplier
const BPS_SCALE = 10000n      // 10000 bps = 100%
const CENTS = 100n

// Margin
margin = (units × contractSize × openRateScaled × CENTS) / (leverage × PRICE_SCALE)

// P&L BUY
pnl = (currentBidScaled - openRateScaled) × units × contractSize × CENTS / PRICE_SCALE

// P&L SELL
pnl = (openRateScaled - currentAskScaled) × units × contractSize × CENTS / PRICE_SCALE

// Margin level (null if no open positions)
marginLevelBps = (equityCents × BPS_SCALE) / usedMarginCents
```

---

## Environment Setup

1. Copy `.env.example` to `apps/api/.env.local` and fill in all values
2. Start local infrastructure: `docker compose up -d`
3. Push database: `pnpm db:migrate && pnpm db:seed`

**Critical env vars**:

- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` — RSA key pair (RS256)
- `DATABASE_URL` / `DIRECT_URL` — connection pooler + direct URLs
- `NOWPAYMENTS_IPN_SECRET` — webhook signature verification
- `TWELVE_DATA_API_KEY` — market data feed

---

## Common Tasks

### Adding a New API Route

1. Create route file in `apps/api/src/routes/`
2. Export Express router with typed request/response handlers
3. Import and mount in `apps/api/src/index.ts`
4. Add rate limiting if needed (100 req/min global, 10 req/15min for auth)

### Adding a New Database Table

1. Add model to `packages/db/prisma/schema.prisma`
2. Run `pnpm db:generate` to update client
3. Create migration: `pnpm db:migrate`
4. Export types from `packages/types/src/index.ts` if needed

### Adding a Shared UI Component

1. Create component in `packages/ui/src/components/`
2. Use CVA for variant management
3. Export from `packages/ui/src/index.ts`
4. Import in apps via `@protrader/ui`

### Working with Socket.io

1. Use `emitToUser(io, userId, event, data)` for private events
2. Use `emitPriceUpdate(io, symbol, data)` for price feeds
3. Always validate JWT in `socket.handshake.auth.token`

---

## Testing

```bash
# Run all tests
pnpm test

# Test specific app
pnpm --filter @protrader/api test
```

---

## Deployment

- **Database**: Supabase (eu-west-1)
- **Cache**: Redis 7 (ElastiCache)
- **Apps**: Deployed via CI/CD (configure in `.github/workflows/`)

---

## Common Pitfalls & Gotchas

### Financial Operations

- **`$transaction` required for ledger writes** — Any operation modifying balance must use `$transaction` to atomically update the ledger. Use `withSerializableRetry()` wrapper to handle PostgreSQL SSI conflicts (error P2034/40001)
- **Wednesday triple swap** — Rollover on Wednesday charges 3× the daily swap rate due to Forex 3-day settlement
- **KYC gate** — Trading, deposits, and withdrawals all require `requireKYC` middleware (`kyc_status` must be `APPROVED`). Routes without it are a compliance bug

### Market Data

- **Live prices required** — Trade creation requires live prices from Redis (`getCachedPrice`). If Twelve Data WebSocket isn't running, trade creation fails with `MARKET_CLOSED`
- **Pending orders cache** — `market-data.ts` caches pending orders in Redis. Any code modifying orders MUST call `invalidatePendingOrdersCache()` to avoid stale data

### Redis Patterns

- **Margin watch** — `addMarginWatch`/`removeMarginWatch`/`getMarginWatchers` track users with open positions per instrument for margin call sweeps
- **Price cache** — `prices:{symbol}` keys with 60s TTL. Check Redis before querying external APIs

### Authentication & Security

- **JWT RS256, not HS256** — Requires both `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`. Using a symmetric key will silently fail authentication
- **No per-route rate limiting** — Only global 100 req/min limiter exists. Auth endpoints should have 10 req/15min per IP but this isn't implemented yet

### Testing

- **Only calculation tests exist** — `apps/api/src/lib/calculations.test.ts` covers pure functions. No route integration tests, E2E tests, or service tests exist yet
- **Test gap**: Zero coverage for auth flows, trading operations, payment webhooks, KYC uploads, admin operations, IB portal, Socket.io, or workers

---

## Links

- Full spec: `CLAUDE.md` (comprehensive technical reference)
- Prisma schema: `packages/db/prisma/schema.prisma`
- Calculation engine: `apps/api/src/lib/calculations.ts`
- Shared types: `packages/types/src/index.ts`
- Shared utils: `packages/utils/src/index.ts`
