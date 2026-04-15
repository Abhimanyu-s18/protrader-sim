# Tech Stack & Tooling

## Monorepo

- Turborepo + pnpm workspaces
- Shared packages: db, types, utils, ui, email, config

## Backend

- Express.js REST API
- Socket.io for real-time price feeds and account metrics
- BullMQ + Redis 7 for job queues
- Prisma ORM → PostgreSQL 17

## Frontend

- Next.js 15 (all apps)
- React Query for server state
- Zustand for WebSocket/client state (accountStore, priceStore)
- react-hook-form for forms
- lightweight-charts for TradingView-style candlestick charts
- Tailwind CSS + CVA for styling

## Key Conventions

- All money: BigInt cents (never Decimal/Float)
- All prices: BigInt ×100000 (e.g., $1.23456 → 123456n in code, stored as BigInt integers, not decimals)
- Computing totals: multiply quantity by price, then divide by 1000 to get cents (e.g., 10 units at 123456n → (BigInt(10) \* 123456n) / 1000n = 1234n = $12.34). Consider implementing a helper like `calcTotalCents(quantity: number, price: BigInt): BigInt` to centralize this logic and prevent errors.
- Balance computed from ledger_transactions (not stored)
- API responses: ApiResponse<T> wrapper with `data` field
- BigInt serialized as strings via serializeBigInt()
- TS strict mode + noUncheckedIndexedAccess + exactOptionalPropertyTypes

## Local Dev Infrastructure (Docker)

- PostgreSQL 17 — localhost:5432
- Redis 7 — localhost:6379
- Mailhog SMTP — localhost:1025 / UI localhost:8025
- Redis Commander — localhost:8081

## Common Commands

- `pnpm dev` — start all apps
- `pnpm db:migrate && pnpm db:seed` — migrate + seed
- `pnpm typecheck` — check types across monorepo
- `docker compose up -d` — start local infra
