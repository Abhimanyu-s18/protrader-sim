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

### Apps (6 Next.js + 1 Express)

| App | Port | Purpose |
|-----|------|---------|
| `web` | 3000 | Public marketing site |
| `auth` | 3001 | Login/Register/KYC flows |
| `platform` | 3002 | Trading dashboard (main user interface) |
| `admin` | 3003 | Back-office admin panel |
| `ib-portal` | 3004 | IB Agent/Team Leader portal |
| `api` | 4000 | Express.js REST API + Socket.io |

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
const marginCents = (units * BigInt(contractSize) * openRateScaled * CENTS) / (BigInt(leverage) * PRICE_SCALE)

// WRONG — never cast to Number
const margin = Number(units) * contractSize * Number(price) / leverage
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
```

### Socket.io Conventions

**Authentication**: `socket.handshake.auth.token` (RS256 JWT)

**Room naming**:
- `user:{userId}` — private user events (trade updates, account metrics)
- `prices:{symbol}` — price feed (max 20 subscriptions per connection)
- `admin:panel` — admin broadcast channel

**Client events**: `subscribe:prices` / `unsubscribe:prices` with `{ symbols: string[] }`

---

## Database (`packages/db`)

PostgreSQL 17 with Prisma ORM.

**Key principles**:
- Balance is **never stored** — computed from `ledger_transactions`
- 4-role staff hierarchy: `SUPER_ADMIN` → `ADMIN` → `IB_TEAM_LEADER` → `AGENT`
- IB commissions tracked per trade in `ib_commissions` table

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

## Links

- Full spec: `CLAUDE.md` (comprehensive technical reference)
- Prisma schema: `packages/db/prisma/schema.prisma`
- Calculation engine: `apps/api/src/lib/calculations.ts`
- Shared types: `packages/types/src/index.ts`
- Shared utils: `packages/utils/src/index.ts`
