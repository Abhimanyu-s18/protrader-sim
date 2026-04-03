# Code Mode Rules (Non-Obvious)

- Always use `BigInt` for ALL financial calculations - never use `Decimal`, `Float`, `Double`, or `number`
- Division is ALWAYS LAST in calculations - multiply first, divide last (precision rule)
- API responses MUST use `ApiResponse<T>` wrapper with `data` field
- Test files must be in same directory as source for vitest to work (not in separate test folder)
- Socket.io room naming: `user:{userId}`, `prices:{symbol}` (max 20 subscriptions), `admin:panel`
- JWT uses RS256 (asymmetric), not HS256 - requires `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`
- Rate limiting: 100 req/min global; 10 req/15min per IP on auth endpoints
- Balance is NOT stored - computed from `ledger_transactions` table
- Prisma schema uses `pgcrypto` extension for financial data
- Instrument fields: `contractSize` (100000 for Forex, 1 for stocks), `pipDecimalPlaces` (4 for most Forex, 2 for JPY pairs)
- Margin thresholds: `marginCallBps` (10000 = 100%), `stopOutBps` (5000 = 50%)
- Trade close reasons: USER, STOP_LOSS, TAKE_PROFIT, TRAILING_STOP, MARGIN_CALL, STOP_OUT, ADMIN, EXPIRED
- Calculation engine in `apps/api/src/lib/calculations.ts` uses fixed PRICE_SCALE = 100000n
- TypeScript strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- ESLint: `@typescript-eslint/no-explicit-any` = error, `@typescript-eslint/consistent-type-imports` = error
- Prettier: no semicolons, single quotes, 2 spaces, trailing commas, 100 char width
- Prefer early returns over nested conditionals
- Add JSDoc comments on all exported functions
