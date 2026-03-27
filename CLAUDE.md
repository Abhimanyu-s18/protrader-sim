# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Start all apps (dev mode)
pnpm dev

# Start a single app (e.g., just the API)
pnpm --filter @protrader/api dev
pnpm --filter @protrader/platform dev

# Build all apps
pnpm build

# Lint / type-check
pnpm lint
pnpm typecheck

# Run tests
pnpm test

# Database commands (run from repo root)
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio
pnpm db:seed        # Seed instruments and staff data

# Format code
pnpm format         # Format with Prettier
pnpm format:check   # Check formatting

# Local infrastructure
docker compose up -d   # Starts PostgreSQL 17, Redis 7, Mailhog, Redis Commander
```

## Architecture

**Monorepo**: Turborepo + pnpm workspaces. Shared packages linked via `workspace:*`.

### Apps

| App | Port | Description |
|-----|------|-------------|
| `web` | 3000 | Public marketing site |
| `auth` | 3001 | Login/Register/KYC |
| `platform` | 3002 | Trading dashboard |
| `admin` | 3003 | Back-office admin panel |
| `ib-portal` | 3004 | IB Agent/Team Leader portal |
| `api` | 4000 | Express.js REST API + Socket.io |

All Next.js apps run on separate ports and consume the API at port 4000.

### Shared Packages

- `packages/config` — Shared ESLint, TypeScript, and Tailwind configs
- `packages/db` — Prisma schema and client
- `packages/types` — Shared TypeScript types (MoneyString, PriceString, API responses)
- `packages/utils` — Utility functions (formatMoney, formatPrice, createApiClient)
- `packages/ui` — Shared UI components built with CVA + Tailwind (Button, Input, Card, Badge, Modal, etc.)
- `packages/email` — React Email templates via Resend

### API Structure (`apps/api`)

Routes organized by domain under `src/routes/`:
- `auth.ts`, `users.ts` — Authentication and user management
- `trades.ts`, `instruments.ts` — Core trading functionality
- `deposits.ts`, `withdrawals.ts` — Crypto payments via NowPayments
- `kyc.ts` — KYC document upload/review (stored in Cloudflare R2)
- `alerts.ts`, `watchlist.ts`, `notifications.ts`, `signals.ts` — User features
- `admin/`, `ib/` — Admin and IB portal endpoints
- `webhooks.ts` — NowPayments deposit/withdrawal IPN callbacks

Middleware: `errorHandler.ts`, `auth.ts`, `requestLogger.ts`

Core services: `socket.ts` (real-time price/trade updates), `redis.ts`, `prisma.ts`, `calculations.ts`, `queues.ts` (BullMQ)

**Rate limiting**: 100 req/min global; 10 req/15min per IP on auth endpoints.

### Socket.io Real-Time (`apps/api/src/lib/socket.ts`)

Authentication via `socket.handshake.auth.token` (RS256 JWT).

Room naming conventions:
- `user:{userId}` — private user events (trade updates, account metrics)
- `prices:{symbol}` — price feed (max 20 subscriptions per connection)
- `admin:panel` — admin broadcast channel

Client events: `subscribe:prices` / `unsubscribe:prices` with `{ symbols: string[] }`.

Server emit helpers: `emitPriceUpdate(io, symbol, data)`, `emitToUser(io, userId, event, data)`, `emitToAdmin(io, event, data)`.

Key payload shapes:
- **PriceUpdate**: `{ symbol, bid_scaled, ask_scaled, mid_scaled, change_bps, ts }` (all strings)
- **AccountMetrics**: `{ balance_cents, unrealized_pnl_cents, equity_cents, used_margin_cents, available_cents, margin_level_bps }` (all strings)

### Database (`packages/db`)

PostgreSQL 17 with Prisma ORM. Key design principles:
- **All monetary values**: BIGINT cents (never Decimal/Float)
- **All prices**: BIGINT scaled ×100000 (5 decimal places)
- **Balance**: NOT stored — computed from `ledger_transactions` table (`balanceAfterCents` is a snapshot for audit, not the source of truth)
- **4-role staff hierarchy**: SUPER_ADMIN → ADMIN → IB_TEAM_LEADER → AGENT
- **IB commissions**: Tracked per trade in `ib_commissions` table with `rateBps`

Core tables: `users`, `staff`, `sessions`, `instruments`, `trades`, `ledger_transactions`, `deposits`, `withdrawals`, `kyc_documents`, `ib_commissions`, `ohlcv_candles`, `alerts`, `watchlist_items`, `notifications`, `signals`, `swap_rates`, `legal_documents`

**Instrument fields of note**: `contractSize` (100000 for Forex, 1 for stocks), `leverage`, `spreadPips`, `pipDecimalPlaces` (4 for most Forex, 2 for JPY pairs), `swapBuyBps`/`swapSellBps`, `marginCallBps` (10000 = 100%), `stopOutBps` (5000 = 50%), `twelveDataSymbol`.

**Trade close reasons** (`closedBy`): USER, STOP_LOSS, TAKE_PROFIT, TRAILING_STOP, MARGIN_CALL, STOP_OUT, ADMIN, EXPIRED.

### Calculation Engine (`apps/api/src/lib/calculations.ts`)

All BigInt. Key constants:
```typescript
PRICE_SCALE = 100000n   // price storage multiplier
BPS_SCALE   = 10000n    // 10000 bps = 100%
```

Key formulas:
- **Margin** = `(units × contractSize × openRateScaled × 100) / (leverage × 100000)`
- **P&L BUY** = `(currentBidScaled - openRateScaled) × units × contractSize × 100 / 100000`
- **P&L SELL** = `(openRateScaled - currentAskScaled) × units × contractSize × 100 / 100000`
- **Margin level** = `(equityCents × BPS_SCALE) / usedMarginCents` (null if no open positions)

### Redis Cache (`apps/api/src/lib/redis.ts`)

Key patterns:
- `prices:{symbol}` — latest mid/bid/ask, TTL 60s
- `margin_watch:{instrumentId}` — sorted set of userIds with open positions (for margin call sweeps)

### Key Type Conventions (`packages/types`)

- `MoneyString` — String representation of cents (e.g., `"10050"` = $100.50)
- `PriceString` — String representation of scaled price (e.g., `"108500"` = 1.08500)
- All API responses use `ApiResponse<T>` wrapper with `data` field
- Paginated responses use `PaginatedResponse<T>` with `next_cursor` and `has_more`

## Environment Setup

1. Copy `.env.example` to `apps/api/.env.local` and fill in all values
2. Start local infrastructure: `docker compose up -d`
   - PostgreSQL 17 on `localhost:5432` (user: protrader, pass: protrader_local_dev)
   - Redis 7 on `localhost:6379`
   - Mailhog (SMTP) on `localhost:1025`, web UI on `localhost:8025`
   - Redis Commander on `localhost:8081`
3. Push database schema:
   ```bash
   pnpm db:migrate && pnpm db:seed
   ```

**Critical env vars**:
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` — RSA key pair (RS256), not symmetric
- `DATABASE_URL` — connection pooler URL (for Prisma queries)
- `DIRECT_URL` — direct connection (for migrations only)
- `NOWPAYMENTS_IPN_SECRET` — webhook signature verification
- `TWELVE_DATA_API_KEY` — market data feed

## Code Style

- TypeScript with strict mode, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`
- ESLint: `@typescript-eslint/recommended` + type-checked rules
- Prettier for formatting
- All money/price calculations must use BigInt (see `packages/utils` helpers)
- API routes return standardized `ApiResponse<T>` or `ApiError` shapes
- Frontend apps use React Query for server state, Zustand for client state, react-hook-form for forms, lightweight-charts for TradingView charts
