# Tasks

---

# 🔍 ProTraderSim — End-to-End Comprehensive Technical Audit

**Date:** 2026-04-15 | **Auditor:** Full codebase analysis (3 parallel agents + 14 verification probes) | **Scope:** All 6 apps, 4 packages, CI pipeline, schema, workers, docs

---

## Scoring Framework

```

Priority = (Impact + Risk) × (6 − Effort)

Effort:  S=1 → ×5  |  M=2 → ×4  |  L=3 → ×3

```

---

## 🔴 P0 — Critical (Fix Before Any Production Traffic)

### ~~P0-1 · Wrong Post-Login Redirect URL~~ ✅ DONE

| | |

|---|---|

| **File** | `apps/auth/src/app/login/page.tsx:55` |

| **Category** | Correctness / UX |

| **Score** | (5+5)×5 = **50** |

| **Effort** | S (1 line) |

| **Fixed** | 2026-04-15 |

~~`NEXT_PUBLIC_AUTH_URL` is used as the post-login redirect target (hardcoded fallback `localhost:3002`). The variable name implies the auth app itself, but the intent is the **platform** app.~~

**Resolution:** Replaced `NEXT_PUBLIC_AUTH_URL` with `NEXT_PUBLIC_PLATFORM_URL` (variable renamed to `platformUrl`) in `apps/auth/src/app/login/page.tsx:55`. Post-login redirect now correctly targets the platform app.

---

### ~~P0-2 · JWT Key Env Vars Fall Back to Empty String~~ ✅ DONE

| | |

|---|---|

| **Files** | `apps/api/src/middleware/auth.ts:15`, `routes/auth.ts:17` |

| **Category** | Security |

| **Score** | (5+5)×5 = **50** |

| **Effort** | S |

| **Fixed** | 2026-04-15 |

~~Both files read `process.env.JWT_PUBLIC_KEY ?? ''` and `process.env.JWT_PRIVATE_KEY ?? ''`. If either env var is missing, `jsonwebtoken` will silently accept a blank key string.~~

**Resolution:** Added `REQUIRED_ENV` startup guard inside the `isEntrypoint()` block in `apps/api/src/index.ts` (lines 218–232). Validates `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `DATABASE_URL`, `REDIS_URL`, and `NOWPAYMENTS_IPN_SECRET` are set before the server starts. Guard is scoped to entrypoint-only so tests are unaffected.

---

## 🟠 P1 — High Priority (Fix Within This Sprint)

### P1-1 · ENTRY Order Creation Never Invalidates Pending Orders Cache

| | |

|---|---|

| **Files** | `apps/api/src/routes/trades.ts` (no call), `services/market-data.ts:238` (function exists) |

| **Category** | Correctness / Cache Consistency |

| **Score** | (4+4)×5 = **40** |

| **Effort** | S |

`invalidatePendingOrdersCache(instrumentId)` is exported from `market-data.ts` and called in the trade close path (`line 1123`) — but is **never called** from `trades.ts` when a new ENTRY order is created or cancelled. The market-data tick processor will therefore execute against a stale pending-orders set until the 60-second TTL expires, meaning freshly placed entry orders can miss their trigger price window.

**Fix:** Call `await invalidatePendingOrdersCache(instrument.id)` in `trades.ts` after inserting a `PENDING` trade and after cancelling one.

---

### P1-2 · 6 Route Files Have Zero Request Body Validation

| | |

|---|---|

| **Files** | `routes/instruments.ts`, `routes/kyc.ts`, `routes/notifications.ts`, `routes/signals.ts`, `routes/webhooks.ts`, `routes/ib/index.ts` |

| **Category** | Security / Input Validation |

| **Score** | (3+4)×5 = **35** |

| **Effort** | M |

These 6 files do zero zod parsing — all rely on raw `req.body`, `req.query`, or `req.params` casts. The remaining 8 route files (`trades`, `auth`, `deposits`, `withdrawals`, `users`, `admin`, `watchlist`, `alerts`) all use zod. This is an inconsistent security surface. `kyc.ts` (file upload) and `webhooks.ts` (external payments) are especially high-risk.

---

### P1-3 · 14 FK Relations Missing `onDelete` Cascade Rules

| | |

|---|---|

| **File** | `packages/db/prisma/schema.prisma` |

| **Category** | Data Integrity |

| **Score** | (4+4)×4 = **32** |

| **Effort** | M |

Only `Session` has `onDelete: Cascade`. Every other FK relation uses Prisma's default (`Restrict`), which means deleting a `User` will **throw a foreign key violation** unless all child records are manually deleted first. No cleanup logic exists in admin routes. Affected models:

| Model | FK to | Risk |

|---|---|---|

| `Trade` | `User`, `Instrument` | Restrict blocks user delete |

| `LedgerTransaction` | `User`, `Staff` | Restrict blocks user delete |

| `Deposit` / `Withdrawal` | `User`, `Staff` | Restrict blocks user delete |

| `KycDocument` | `User`, `Staff` | R2 orphan risk on Restrict |

| `Alert`, `WatchlistItem` | `User`, `Instrument` | Silent orphan on instrument removal |

| `IbCommission` | `Staff`, `User`, `Trade` | Orphan on agent delete |

| `Notification`, `Signal` | `User`, `Staff`, `Instrument` | Orphan records accumulate |

**Fix:** Add `onDelete: Cascade` to all user-owned child records and `onDelete: SetNull` where the FK is nullable (e.g., `Staff?` processor fields).

---

### P1-4 · Webhook Endpoint Not Rate-Limited

| | |

|---|---|

| **File** | `apps/api/src/routes/webhooks.ts` |

| **Category** | Security / DoS |

| **Score** | (3+4)×5 = **35** |

| **Effort** | S |

`POST /v1/webhooks/nowpayments` bypasses the global `rateLimit` middleware applied to other routes. An attacker can flood it with malformed payloads; each request triggers a `crypto.timingSafeEqual` HMAC comparison and a Prisma lookup even before authentication. Add a strict per-IP rate limiter (e.g., 20 req/min) as the first middleware on this route.

---

### P1-5 · `localStorage` Access Unguarded (Private Browsing Throws)

| | |

|---|---|

| **Files** | `apps/platform/src/components/AppShell.tsx:10`, `apps/auth/src/app/login/page.tsx:48–52` |

| **Category** | Correctness / Error Handling |

| **Score** | (3+3)×5 = **30** |

| **Effort** | S |

In Safari private browsing and certain restrictive enterprise browser policies, calling `localStorage.setItem()` or `.getItem()` **throws a `SecurityError`**. Neither call site is wrapped in try/catch, so the entire login or app-load silently crashes for affected users. Fix: wrap all storage access in a utility:

```ts
export const safeStorage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },

  set: (key: string, val: string, persist: boolean) => {
    try {
      persist ? localStorage.setItem(key, val) : sessionStorage.setItem(key, val)
    } catch {}
  },
}
```

---

### P1-6 · No `error.tsx` Boundaries in Any Next.js App

| | |

|---|---|

| **Files** | All 5 apps — zero `error.tsx` or `not-found.tsx` files found |

| **Category** | Error Handling / UX |

| **Score** | (3+3)×4 = **24** |

| **Effort** | M |

Next.js App Router requires `error.tsx` at route segment level to catch render/data errors. Without it, any thrown exception (e.g., a failed React Query fetch that re-throws, a null-deref on stale WebSocket data) surfaces as a blank white page with no user feedback and no recovery option. All 5 apps (`platform`, `admin`, `auth`, `ib-portal`, `web`) are affected.

---

### P1-7 · Client-Side-Only Role Enforcement in IB Portal

| | |

|---|---|

| **File** | `apps/ib-portal/src/app/(protected)/agents/page.tsx:9–29` |

| **Category** | Authorization |

| **Score** | (3+4)×4 = **28** |

| **Effort** | M |

The `/agents` page decodes the JWT payload client-side (no signature verification) to determine if the user is a `TEAM_LEADER`. The API endpoint for listing agents already enforces this server-side, but the page still renders sensitive UI structure before the role check resolves, and there is no middleware-layer redirect. Agents with a forged client-side token string would see the "Access Restricted" UI, not a proper 403/redirect.

---

### P1-8 · 4 Missing BullMQ Workers — Core Business Logic Absent

| | |

|---|---|

| **Files** | `apps/api/src/workers/` (4 files missing) |

| **Category** | Feature Completeness / Infrastructure |

| **Score** | (5+4)×4 = **36** (entry-order-expiry) |

| **Effort** | M each |

| Worker | Impact | Consequence of Missing |

|---|---|---|

| `entry-order-expiry` | **Critical** | ENTRY orders placed with `expiresAt` never expire; they accumulate forever and keep firing during market data ticks |

| `deposit-confirm` | **High** | If NowPayments webhook fails/retries, there's no polling fallback — deposit stays `PENDING` forever |

| `p&l-snapshot` | Medium | No historical P&L for analytics, statements, or tax reporting |

| `report-generator` | Medium | No monthly account statements; required for compliance |

---

### P1-9 · Test Coverage Threshold Not Enforced on Route Files

| | |

|---|---|

| **File** | `apps/api/jest.config.cjs` |

| **Category** | Testing |

| **Score** | (3+3)×5 = **30** |

| **Effort** | S |

`coverageThreshold` enforces 100% on `calculations.ts` and 80% globally — but the **global** threshold is met by the well-tested `calculations.ts` alone, masking that every route file (`trades.ts`, `deposits.ts`, `auth.ts`, etc.) has near-zero test coverage. Route-level thresholds are not set. A PR that deletes all route tests would still pass CI.

**Fix:** Add per-file thresholds:

```js

'src/routes/*.ts': { branches: 70, functions: 70, lines: 70, statements: 70 },

'src/workers/*.ts': { branches: 70, functions: 70, lines: 70, statements: 70 },

```

---

### P1-10 · No Idempotency Key on NowPayments Webhook Handler

| | |

|---|---|

| **File** | `apps/api/src/routes/webhooks.ts` |

| **Category** | Data Integrity |

| **Score** | (4+4)×4 = **32** |

| **Effort** | M |

NowPayments docs explicitly warn that IPN callbacks can be **delivered multiple times**. The current handler has no guard — if the same `payment_id` webhook fires twice, the deposit could be marked `COMPLETED` twice and a duplicate `LedgerTransaction` entry created, inflating the user's balance. Fix: wrap the status update in a transaction with a `findFirst` check on `nowpaymentsPaymentId` and return 200 idempotently if already processed.

---

### P1-11 · No Frontend Deployment in CI Pipeline

| | |

|---|---|

| **File** | `.github/workflows/ci.yml` |

| **Category** | Infrastructure / Deployment |

| **Score** | (4+3)×4 = **28** |

| **Effort** | L |

The CI pipeline (`ci.yml`) runs typecheck → lint → test → build → **deploys only the API to AWS ECS**. All 5 Next.js apps are built by Turbo but never deployed. There is no step to deploy `web`, `auth`, `platform`, `admin`, or `ib-portal` to Vercel, Cloudflare Pages, or any static host. The project has no live frontend.

---

## 🟡 P2 — Medium Priority (Address Within 2 Sprints)

### P2-1 · `returnTo` Open Redirect in Admin AppShell

| | |

|---|---|

| **File** | `apps/admin/src/components/AppShell.tsx:50–51` |

| **Category** | Security |

| **Score** | (2+3)×5 = **25** |

| **Effort** | S |

`encodeURIComponent(window.location.href)` is passed as `?returnTo=` to the auth app. If the auth app's login page ever reads and follows this param without allowlist validation (it currently doesn't, but this is fragile), it becomes an open redirect. Add a server-side allowlist check in the auth app for any future `returnTo` implementation.

---

### P2-2 · Socket.io Symbol Subscription Allows Numeric-Only Symbols

| | |

|---|---|

| **File** | `apps/api/src/lib/socket.ts:40` |

| **Category** | Security / Input Validation |

| **Score** | (2+3)×5 = **25** |

| **Effort** | S |

Regex `/^[A-Z0-9]{3,12}$/` allows `123456789012` as a valid symbol, subscribing the client to a room named `prices:123456789012`. Legitimate instruments are all alpha (EURUSD, AAPL, BTCUSD). Replace with `/^[A-Z]{3,12}$/` or validate against the instruments table whitelist.

---

### P2-3 · Race Condition in KYC Status Transition (TOCTOU)

| | |

|---|---|

| **File** | `apps/api/src/routes/kyc.ts:113–121` |

| **Category** | Correctness |

| **Score** | (3+2)×4 = **20** |

| **Effort** | M |

The pattern: `count documents → if count meets threshold → update user KYC status` is two separate queries. A concurrent upload between the count and the update can cause the status to be set incorrectly. Wrap in a serializable transaction or use a single `UPDATE ... WHERE EXISTS (SELECT ...)` pattern.

---

### P2-4 · Partial Close Margin Rounding Drift (Integer Division)

| | |

|---|---|

| **File** | `apps/api/src/routes/trades.ts` (partial close logic) |

| **Category** | Financial Correctness |

| **Score** | (3+3)×4 = **24** |

| **Effort** | M |

`closedMargin = (marginRequiredCents * closeUnits) / tradeUnits` uses BigInt floor division. Over many partial closes, the released margin consistently rounds down, leaving fractional margin permanently locked in `usedMarginCents`. With high-frequency partial closes on large positions, this accumulates into visible distortion. Track the remainder explicitly or release all margin on the final partial close.

---

### P2-5 · UI Components Missing Accessibility Attributes

| | |

|---|---|

| **File** | `packages/ui/src/components/` (Button, Input, Badge, Modal) |

| **Category** | Accessibility |

| **Score** | (2+2)×4 = **16** |

| **Effort** | M |

The entire component library has **1 aria attribute** (`aria-label="Close modal"` on Modal). Missing: `aria-busy` on loading Button, `aria-describedby` linking Input errors to their fields, `aria-live="polite"` on error/status messages, `role="dialog"` + focus trap on Modal, `scope="col"` on table headers in dashboard/trades pages.

---

### P2-6 · Stale TODO Comment in `market-data.ts` Type Definition

| | |

|---|---|

| **File** | `apps/api/src/services/market-data.ts:55–56` |

| **Category** | Maintainability / Misleading Code |

| **Score** | (1+2)×5 = **15** |

| **Effort** | S |

The comment `// TODO: Use marginCallBps and stopOutBps for real-time margin monitoring` sits inside the `InstrumentRow` type definition. The feature **has been implemented** in `checkMarginLevels()`. This is a misleading "imposter" — a developer reading it will believe margin monitoring is unimplemented and either skip work or duplicate it.

---

### P2-7 · No `loading.tsx` Skeleton Pages in Any App

| | |

|---|---|

| **Files** | All 5 apps |

| **Category** | UX |

| **Score** | (2+1)×4 = **12** |

| **Effort** | M |

Route-level `loading.tsx` files are missing across all apps. Next.js uses these to show Suspense fallbacks during navigation. Users currently see blank content flashes between page transitions. Add at minimum a skeleton loader for the platform dashboard and trade list.

---

### P2-8 · No Destructive-Action Confirmation Dialogs

| | |

|---|---|

| **Files** | `apps/platform/src/app/(protected)/trades/page.tsx`, `apps/admin/src/app/(protected)/users/[id]/page.tsx` |

| **Category** | UX / Safety |

| **Score** | (2+2)×5 = **20** |

| **Effort** | S |

"Close Trade" (platform) and "Suspend Account" (admin) fire mutations immediately on click without a confirmation step. The `Modal` component already exists in `packages/ui` — these just need to wrap the action in a confirmation modal.

---

### P2-9 · No Soft-Delete / Audit Trail on Core Models

| | |

|---|---|

| **File** | `packages/db/prisma/schema.prisma` |

| **Category** | Compliance / Data Integrity |

| **Score** | (3+4)×3 = **21** |

| **Effort** | L |

No `deletedAt: DateTime?` on `User`, `Staff`, `Instrument`, or `Trade`. Hard deletes cascade through the ledger and destroy the audit trail. For a financial platform, regulators typically require 7-year record retention. Users cannot be GDPR-erased without a separate anonymisation pass anyway (financial records exempt), making soft-delete the correct pattern.

---

### P2-10 · `as any` Type Escape in `users.ts`

| | |

|---|---|

| **File** | `apps/api/src/routes/users.ts:101` |

| **Category** | Type Safety |

| **Score** | (1+1)×5 = **10** |

| **Effort** | S |

`user.jurisdiction as any` is used to pass a `Jurisdiction` enum value into `isCountryJurisdictionConsistent()`. The function signature likely accepts `string` instead of `Jurisdiction`. Fix the function signature to accept the actual Prisma-generated type.

---

### P2-11 · Hardcoded 7-Country List in Register Form

| | |

|---|---|

| **File** | `apps/auth/src/app/register/page.tsx:35` |

| **Category** | Data Completeness |

| **Score** | (3+1)×4 = **16** |

| **Effort** | M |

Registration only allows 7 countries. This will silently block real users from registering. Should pull from the `jurisdiction` enum values or a complete ISO 3166 list, filtered by supported jurisdictions from the API.

---

### P2-12 · No Disaster Recovery / Backup Runbook

| | |

|---|---|

| **Files** | `docs/` (absent) |

| **Category** | Documentation / Operations |

| **Score** | (2+3)×4 = **20** |

| **Effort** | M |

The docs directory has KYC runbooks and security action items but **no runbook for**: DB backup/restore, Redis flush recovery, ECS rollback procedure, or security incident response for a compromised JWT key. The ECS deploy pipeline has no rollback step.

---

## 🟢 P3 — Low Priority (Backlog / Nice-to-Have)

| ID | Issue | File | Score | Effort |

|---|---|---|---|---|

| P3-1 | Array index used as `key` prop in dashboard skeleton, web landing | `platform/dashboard/page.tsx`, `web/PlatformSection.tsx` | 10 | S |

| P3-2 | Stale `// eslint-disable-next-line` in `auth.ts:239` (unused var is acceptable but could just be `_` prefix) | `routes/auth.ts` | 8 | S |

| P3-3 | No `not-found.tsx` custom 404 in any app | All apps | 8 | S |

| P3-4 | Phone number validation only checks `minLength(6)` — no format regex | `apps/auth/register/page.tsx` | 8 | S |

| P3-5 | `BigInt(cursor)` from query param throws on non-numeric strings; needs safe parse | Multiple routes | 10 | S |

| P3-6 | Docs AUDIT-001/002/003 out of sync with implemented state | `docs/*.md` | 6 | S |

| P3-7 | `packages/db/tsconfig.json` still has `ignoreDeprecations: "5.0"` against TS 5.6 | `packages/db/tsconfig.json:5` | 5 | S |

| P3-8 | CI does not push frontend app images / Vercel deploy on `main` merges | `ci.yml` | 12 | L |

---

## 📊 Summary Matrix

| Category | P0 | P1 | P2 | P3 | Total |

|---|---|---|---|---|---|

| Security | 1 | 2 | 2 | 0 | **5** |

| Correctness | 1 | 2 | 2 | 1 | **6** |

| Data Integrity | 0 | 2 | 2 | 0 | **4** |

| Missing Workers | 0 | 1 (×4) | 0 | 0 | **4** |

| Frontend / UX | 0 | 2 | 3 | 3 | **8** |

| Input Validation | 0 | 1 | 0 | 0 | **1** |

| Testing | 0 | 2 | 0 | 0 | **2** |

| Infrastructure | 0 | 1 | 1 | 1 | **3** |

| Type Safety | 0 | 0 | 1 | 1 | **2** |

| Docs / Config | 0 | 0 | 1 | 2 | **3** |

| **Total** | **2** | **13** | **12** | **8** | **35** |

---

## ✅ What's Solid (Don't Touch)

These areas are **production-quality** and should be treated as reference implementations:

| Area | Assessment |

|---|---|

| `calculations.ts` | 100% BigInt, 100% test coverage enforced, zero `any`, correct P&L formulas |

| Graceful shutdown | SIGTERM/SIGINT handlers at `index.ts:261–262` — correctly implemented |

| NowPayments integration | API call, IPN secret validation, HMAC timing-safe comparison — all correct |

| `market-data.ts` margin sweep | `checkMarginLevels()` fully wired into the tick pipeline |

| JWT RS256 + algorithm whitelist | Auth middleware correctly enforces `algorithms: ['RS256']` |

| Database indexes | Schema has comprehensive composite indexes on all hot query paths |

| Rate limiting | Global 100/min + 10/15min on auth routes — correctly applied |

| Structured logging | Zero `console.*` in production API code — all via `pino` logger |

| CI pipeline | Full typecheck → lint → test → build → deploy with health checks and Redis/PG service containers |

| ESLint hygiene | Only 2 `eslint-disable` comments, both justified; zero `@ts-ignore` |

| `any` types | Only 1 `as any` in 4,700+ LOC API — exceptional TS discipline |

---

## 🗺️ Prioritized Refactoring Plan

### Phase 1 — Hotfix (This Week, ~6h total)

| # | Task | File(s) | Time |

|---|---|---|---|

| ~~1~~ | ~~Fix post-login redirect env var (`NEXT_PUBLIC_AUTH_URL` → `NEXT_PUBLIC_PLATFORM_URL`)~~ ✅ | `auth/login/page.tsx:55` | ~~15m~~ |

| ~~2~~ | ~~Add startup env var guard (JWT keys, DATABASE_URL, REDIS_URL)~~ ✅ | `api/src/index.ts` | ~~30m~~ |

| 3 | Call `invalidatePendingOrdersCache()` on ENTRY order create/cancel | `routes/trades.ts` | 30m |

| 4 | Add rate limiter to webhook route | `routes/webhooks.ts` | 15m |

| 5 | Wrap all `localStorage`/`sessionStorage` calls in try/catch utility | `AppShell.tsx` (×3), `login/page.tsx` | 45m |

| 6 | Add idempotency guard in webhook handler | `routes/webhooks.ts` | 1h |

| 7 | Remove stale TODO from market-data.ts type definition | `services/market-data.ts:55` | 5m |

---

### Phase 2 — Schema & Safety (Sprint 1, ~2 days)

| # | Task | File(s) | Time |

|---|---|---|---|

| 8 | Add `onDelete: Cascade/SetNull` to all 14 FK relations | `schema.prisma` + migration | 2h |

| 9 | Add per-route coverage thresholds to jest config | `jest.config.cjs` | 30m |

| 10 | Add zod schemas to 6 route files (instruments, kyc, notifications, signals, webhooks, ib) | Route files | 3h |

| 11 | Add `error.tsx` to all 5 apps | All apps | 2h |

| 12 | Fix `as any` in `users.ts:101` | `routes/users.ts` | 15m |

| 13 | Fix `BigInt(cursor)` to safe-parse utility | Multiple routes | 1h |

| 14 | Fix regex in socket symbol validation | `lib/socket.ts:40` | 15m |

---

### Phase 3 — Missing Workers (Sprint 1–2, ~3 days)

| # | Task | Est |

|---|---|---|

| 15 | `entry-order-expiry` worker — scan `PENDING` trades past `expiresAt`, cancel + notify | 4h |

| 16 | `deposit-confirm` worker — poll NowPayments for `WAITING`/`CONFIRMING` deposits older than 10min | 4h |

| 17 | `p&l-snapshot` worker — hourly snapshot of equity per user into new table | 3h |

| 18 | `report-generator` worker — monthly PDF statements via React PDF | 8h |

---

### Phase 4 — Frontend Polish & Compliance (Sprint 2–3)

| # | Task | Est |

|---|---|---|

| 19 | Add `loading.tsx` skeleton pages for platform + admin | 3h |

| 20 | Add confirmation modals for Close Trade / Suspend Account | 2h |

| 21 | Expand country list in register form or fetch from API | 1h |

| 22 | Add ARIA attributes to `packages/ui` components (Button, Input, Badge, Modal) | 3h |

| 23 | Fix partial close margin rounding drift | 2h |

| 24 | Fix KYC status TOCTOU race condition with transaction | 1h |

| 25 | Add soft-delete pattern to User, Staff, Instrument, Trade | 4h |

| 26 | Add frontend app deployment (Vercel/Cloudflare) to CI pipeline | 4h |

---

### Phase 5 — Testing Sprint (Sprint 3, 5+ days)

| # | Task | Est |

|---|---|---|

| 27 | Integration tests for `deposits.ts` + `withdrawals.ts` (crypto flow, balance checks) | 1 day |

| 28 | Integration tests for `admin` routes (balance adj, KYC approve/reject, status toggle) | 1 day |

| 29 | Integration tests for `ib` routes (commission creation, pagination, role gates) | 0.5 day |

| 30 | Financial edge case tests: partial close rounding, rollover triple-swap Wed, trailing stop trigger | 1 day |

| 31 | WebSocket integration tests (subscribe/unsubscribe, price emit, account metrics emit) | 1 day |

| 32 | Disaster recovery runbook (DB backup, Redis flush, JWT key rotation, ECS rollback) | 0.5 day |

---

**Bottom line:** The financial engine, API structure, and infrastructure scaffolding are genuinely strong. The critical gaps are concentrated in three areas: two P0 correctness bugs that would break login and silently degrade JWT security, 13 P1s that span data integrity (cascade rules, idempotency), missing workers, and thin test coverage outside `calculations.ts`. Nothing here requires architectural surgery — it's all well-scoped fixes on a solid foundation.
