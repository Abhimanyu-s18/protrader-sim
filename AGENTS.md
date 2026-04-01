# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Critical Financial Rules (NON-NEGOTIABLE)

- **ALL money**: BIGINT cents (e.g., `$100.50` = `10050n`)
- **ALL prices**: BIGINT scaled ×100000 (e.g., `1.08500` = `108500n`)
- **NEVER** use `Decimal`, `Float`, `Double`, or `number` for financial calculations
- **Division is ALWAYS LAST** — multiply first, divide last (precision rule)
- **Balance is NOT stored** — computed from `ledger_transactions` table

## Key Type Conventions

- `MoneyString` — String representation of cents in API responses (`"10050"`)
- `PriceString` — String representation of scaled price (`"108500"`)
- All API responses use `ApiResponse<T>` wrapper with `data` field
- Paginated responses use `PaginatedResponse<T>` with `next_cursor` and `has_more`

## Architecture (Non-Obvious)

- **5 Next.js apps** + **1 Express API** (port 4000)
- **Layered architecture**: Routes (HTTP only) → Services (business logic) → Database
- **Socket.io rooms**: `user:{userId}` (private), `prices:{symbol}` (max 20 subscriptions), `admin:panel`
- **JWT**: RS256 (asymmetric), not HS256 — requires `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`
- **Rate limiting**: 100 req/min global; 10 req/15min per IP on auth endpoints

## Database (Non-Obvious)

- **Prisma schema** uses `pgcrypto` extension
- **Instrument fields**: `contractSize` (100000 for Forex, 1 for stocks), `pipDecimalPlaces` (4 for most Forex, 2 for JPY pairs)
- **Margin thresholds**: `marginCallBps` (10000 = 100%), `stopOutBps` (5000 = 50%)
- **Trade close reasons** (`closedBy`): USER, STOP_LOSS, TAKE_PROFIT, TRAILING_STOP, MARGIN_CALL, STOP_OUT, ADMIN, EXPIRED

## Calculation Engine (`apps/api/src/lib/calculations.ts`)

```typescript
PRICE_SCALE = 100000n   // price storage multiplier
BPS_SCALE   = 10000n    // 10000 bps = 100%
CENTS       = 100n

// Margin = (units × contractSize × openRateScaled × CENTS) / (leverage × PRICE_SCALE)
// P&L BUY = (currentBidScaled - openRateScaled) × units × contractSize × CENTS / PRICE_SCALE
// P&L SELL = (openRateScaled - currentAskScaled) × units × contractSize × CENTS / PRICE_SCALE
// Margin level = (equityCents × BPS_SCALE) / usedMarginCents (null if no open positions)
```

## Code Style (Non-Obvious)

- TypeScript strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- ESLint: `@typescript-eslint/no-explicit-any` = error, `@typescript-eslint/consistent-type-imports` = error
- Prettier: no semicolons, single quotes, 2 spaces, trailing commas, 100 char width
- Prefer early returns over nested conditionals
- Add JSDoc comments on all exported functions

## Testing

- Jest for API tests (`apps/api`)
- Run single test: `cd apps/api && pnpm jest src/services/trading.test.ts`

## Environment Setup

1. Copy `.env.example` to `apps/api/.env.local`
2. Start infrastructure: `docker compose up -d`
3. Push schema: `pnpm db:migrate && pnpm db:seed`

## Shared Packages

- `packages/config` — ESLint, TypeScript, Tailwind configs
- `packages/db` — Prisma schema and client
- `packages/types` — Shared TypeScript types (`MoneyString`, `PriceString`, API responses)
- `packages/utils` — Utility functions (`formatMoney`, `formatPrice`, `createApiClient`)
- `packages/ui` — Shared UI components (CVA + Tailwind)
- `packages/email` — React Email templates via Resend

## Kilocode Mode System

- **Mode definitions**: `.kilocodemodes` file defines available modes with `slug`, `name`, `roleDefinition`, `groups`, `customInstructions`, and `whenToUse` fields.
- **Mode-specific rules**: Each mode has a dedicated rules file in `.kilocode/rules-{mode}/AGENTS.md` containing non-obvious rules for that mode.
- **Mode groups**: Define permissions for each mode (read, edit, browser, command, mcp). Edit groups can be restricted to specific file patterns via `fileRegex`.
- **When to use**: Each mode includes a `whenToUse` field describing the appropriate scenarios for activating that mode.
