# AGENTS.md

Quick reference for agents working in this repository.

## Commands

```bash
# Install
pnpm install

# Dev
pnpm dev                    # All apps
pnpm --filter protrader/api dev  # Single app

# Quality
pnpm build && pnpm lint && pnpm typecheck  # Full check
pnpm test                  # All tests

# Single test
cd apps/api && pnpm jest src/lib/calculations.test.ts

# Database
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# Format
pnpm format
```

## Non-Obvious Gotchas

### Financial Calculations

- **ALL money**: BIGINT cents (`$100.50` = `10050n`)
- **ALL prices**: BIGINT scaled ×100000 (`1.08500` = `108500n`)
- **NEVER** use `Decimal`, `Float`, `Double`, or `number`
- **Division is ALWAYS LAST** — multiply first, divide last
- Balance is NOT stored — computed from `ledger_transactions`

### API Responses

- Every response with BigInt fields MUST use `serializeBigInt()`:
  ```typescript
  res.json({ data: serializeBigInt({ items, has_more }) })
  ```

### Socket.io

- Room naming: `user:{userId}`, `prices:{symbol}`, `admin:panel`
- Max 20 price subscriptions per connection (can cause silent drops)
- JWT is RS256 (asymmetric) — requires `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`

### Rate Limiting

- 100 req/min global; 10 req/15min on auth endpoints
- Returns 429 but doesn't specify which limit

### Database

- Balance computed via `get_user_balance(userId)` SQL function
- Migrations are forward-only (cannot rollback)
- `ledger_transactions` stores audit snapshots only

### Testing

- Test files must be in same directory as source (not separate test folder)
- Workers guard against test execution with `NODE_ENV !== 'test'`

### Debugging

- Check `apps/api/src/lib/queues.ts` and `apps/api/src/lib/redis.ts` for runtime logs
- Redis connection errors often appear as database timeouts
- Prisma query failures can manifest as socket.io connection drops

## Architecture

- **5 Next.js apps**: web (3000), auth (3001), platform (3002), admin (3003), ib-portal (3004)
- **Express API**: port 4000, serves all frontends
- **Layered**: Routes → Services → Database

### Shared Packages

- `@protrader/types` — `MoneyString`, `PriceString`, `ApiResponse<T>`
- `@protrader/db` — Prisma schema
- `@protrader/utils` — `formatMoney`, `formatPrice`, `serializeBigInt`
- `@protrader/ui` — CVA + Tailwind components
- `@protrader/email` — React Email templates

## Environment Setup

1. `docker compose up -d` (PostgreSQL 17, Redis 7, Mailhog)
2. Copy `.env.example` to `apps/api/.env.local`
3. `pnpm db:migrate && pnpm db:seed`

Key env vars: `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `NOWPAYMENTS_IPN_SECRET`, `DATABASE_URL`, `REDIS_URL`, `CLOUDFLARE_R2_*`
