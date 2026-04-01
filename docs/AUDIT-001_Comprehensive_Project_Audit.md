# ProTraderSim — Comprehensive Project Audit & Sprint Plan

**Date:** 2026-04-01
**Auditor:** Senior Technical PM / Lead Developer
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current System Health](#2-current-system-health)
3. [Technology Stack Baseline](#3-technology-stack-baseline)
4. [Feature Implementation Matrix](#4-feature-implementation-matrix)
5. [Gap Analysis](#5-gap-analysis)
6. [Prioritized Backlog](#6-prioritized-backlog)
7. [Open Decisions & Ambiguities](#7-open-decisions--ambiguities)
8. [Sprint Roadmap](#8-sprint-roadmap)
9. [Risk Register](#9-risk-register)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

ProTraderSim is a multi-asset offshore CFD simulation trading platform with an IB (Introducing Broker) business model. The project has **excellent foundational infrastructure** — a well-architected Express API with 41 endpoints, a comprehensive 17-model Prisma schema, and a production-quality BigInt financial calculation engine. However, the project is approximately **40% complete overall**.

### Completion Breakdown

| Layer | Status | % Complete |
|-------|--------|------------|
| Documentation | Comprehensive (12 spec documents) | 95% |
| Database Schema | 17 models, 14 enums, seed data | 95% |
| API Backend | 41 endpoints, auth, middleware | 85% |
| Financial Engine | BigInt calculations, margin/P&L | 90% |
| Background Workers | 9 queues defined, 0 workers | 5% |
| Email System | Resend integration exists, 0 templates | 5% |
| Payment Integration | Webhook handler only, no API calls | 15% |
| Market Data Pipeline | Redis cache functions exist, no feed | 10% |
| Frontend — Auth App | Skeleton (redirects to non-existent page) | 0% |
| Frontend — Platform | Skeleton + 2 Zustand stores | 2% |
| Frontend — Admin | Skeleton | 0% |
| Frontend — IB Portal | Skeleton | 0% |
| Frontend — Marketing | Skeleton | 0% |
| Testing | CI configured, 0 test files | 0% |
| Deployment | CI pipeline defined, no Dockerfile | 10% |

### Critical Blockers (Must Fix Before Any Sprint)

1. **Login route has a runtime bug** — `.constructor()` pattern creates `Error` instead of `AppError`, causing undefined `errorCode` in responses
2. **Trade close has a race condition** — `balance_after_cents` set to `0n` then updated in a second query outside transaction
3. **Zero test coverage** — Financial calculations have no tests despite being deployment-blocking per spec
4. **No Dockerfile** — CI references `apps/api/Dockerfile` which doesn't exist
5. **No BullMQ workers** — Rollover, margin monitoring, alert checking, entry order execution all unimplemented

---

## 2. Current System Health

### 2.1 Architecture Assessment

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                          │
├──────┬──────┬───────┬──────────┬───────────┬───────────────┤
│  web │ auth │platform│  admin   │ ib-portal │      api      │
│ :3000│ :3005│ :3002  │ :3003    │  :3004    │    :4000      │
│NEXT  │NEXT  │ NEXT   │ NEXT     │  NEXT     │   Express     │
│EMPTY │EMPTY │ EMPTY  │ EMPTY    │  EMPTY    │  41 endpoints │
└──────┴──────┴───────┴──────────┴───────────┴───────┬───────┘
                                                      │
                              ┌────────────────────────┤
                              │                        │
                        ┌─────┴─────┐           ┌─────┴─────┐
                        │PostgreSQL │           │   Redis    │
                        │   (RDS)   │           │(ElastiCache│
                        │  17 models│           │ prices,    │
                        │  14 enums │           │ sessions,  │
                        └───────────┘           │ alerts     │
                                                └───────────┘
```

**Assessment:** The monorepo structure is sound. Turborepo + pnpm workspace configuration is correct. The API is the only functional application layer. All 5 Next.js apps are empty shells.

### 2.2 Code Quality Scorecard

| Criterion | Score | Notes |
|-----------|-------|-------|
| Type Safety | A | Strict TypeScript, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Financial Precision | A | Consistent BigInt, division-last rule, PRICE_SCALE=100000n |
| API Architecture | A- | Clean Routes→Services→DB layering, consistent error handling |
| Security | B+ | JWT RS256, bcrypt cost 12, rate limiting, Helmet, CORS. Missing: graceful shutdown, structured logging |
| Error Handling | A- | AppError class with 12 error types. Login route has constructor bug |
| Test Coverage | F | Zero tests. CI runs `--passWithNoTests` |
| Documentation | A | 12 comprehensive spec documents covering all domains |
| Database Design | A | Proper indexes, enums, relationships, computed balance |
| Code Style | A | Prettier + ESLint consistent across codebase |
| Frontend | F | All 5 apps are empty skeletons |

### 2.3 Bug Inventory

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 1 | **Critical** | `apps/api/src/routes/auth.ts:163` | Login error uses `.constructor()` which creates generic `Error` not `AppError` — `errorCode` will be undefined in response |
| 2 | **Critical** | `apps/api/src/routes/auth.ts:168` | Same `.constructor` bug for ACCOUNT_SUSPENDED error |
| 3 | **High** | `apps/api/src/routes/trades.ts` | `balanceAfterCents` set to `0n` then updated in second query — race condition between concurrent trade closes |
| 4 | **Medium** | `apps/api/src/routes/withdrawals.ts` | Balance calculation doesn't account for ledger entry just created in same transaction |
| 5 | **Medium** | `apps/api/src/routes/trades.ts`, `withdrawals.ts` | Duplicate `prisma as db` import alongside `prisma` — both point to same singleton |
| 6 | **Low** | `apps/api/src/index.ts` | No graceful shutdown — `httpServer.listen()` without SIGTERM/SIGINT handlers |
| 7 | **Low** | Throughout `apps/api/` | `console.log` used instead of structured logging (winston/pino) despite `LOG_LEVEL` env var |

### 2.4 Implemented API Endpoints (41 total)

| Category | Count | Status |
|----------|-------|--------|
| Auth | 8 | Functional (email not sent) |
| Users | 5 | Functional |
| Trades | 6 | Functional (no background monitoring) |
| Instruments | 4 | Functional (no live feed) |
| Deposits | 3 | Partial (no NowPayments API call) |
| Withdrawals | 2 | Functional |
| KYC | 4 | Functional |
| Alerts | 3 | Functional (no trigger monitoring) |
| Watchlist | 4 | Functional |
| Notifications | 3 | Functional |
| Signals | 1 | Read-only (no generation) |
| Webhooks | 1 | Functional (NowPayments IPN) |
| Admin | 8 | Functional |
| IB Portal | 5 | Functional |

---

## 3. Technology Stack Baseline

| Layer | Technology | Status |
|-------|-----------|--------|
| Monorepo | Turborepo + pnpm 9.x | Configured |
| Frontend | Next.js 15 (App Router) + React 18 | Installed, empty |
| Backend | Express.js + Socket.io 4 | Implemented |
| Database | PostgreSQL 17 (Supabase) | Schema deployed |
| Cache | Redis 7 (ElastiCache) | Connected |
| Queue | BullMQ 5.x | Queues defined, no workers |
| Market Data | Twelve Data | Not integrated |
| Payments | NowPayments | Webhook only |
| Storage | Cloudflare R2 | KYC upload working |
| Email | Resend + React Email | Integration ready, no templates |
| Auth | RS256 JWT | Implemented |
| State (FE) | Zustand + TanStack Query | Installed, 2 stores |
| Charts | TradingView lightweight-charts | Installed, unused |
| Validation | Zod | Implemented |
| Styling | Tailwind CSS + CVA | Configured |
| CI/CD | GitHub Actions | Pipeline defined |

---

## 4. Feature Implementation Matrix

### Legend
- ✅ **Complete** — Fully implemented and functional
- 🟡 **Partial** — Some components implemented
- 🔴 **Not Started** — Schema/docs exist but no implementation
- ⚪ **Not Specified** — Mentioned but not designed

| Feature | API | Workers | Frontend | Email | Status |
|---------|-----|---------|----------|-------|--------|
| User Registration | ✅ | — | 🔴 | 🔴 | 🟡 |
| Login/Logout | ✅ | — | 🔴 | — | 🟡 |
| Email Verification | ✅ (token gen) | — | 🔴 | 🔴 | 🟡 |
| Password Reset | ✅ | — | 🔴 | 🔴 | 🟡 |
| KYC Upload | ✅ | — | 🔴 | 🔴 | 🟡 |
| KYC Admin Review | ✅ | — | 🔴 | ✅ (events) | 🟡 |
| Instrument Listing | ✅ | — | 🔴 | — | 🟡 |
| Live Price Feed | 🟡 (cache only) | 🔴 | 🔴 | — | 🔴 |
| OHLCV Candles | ✅ | — | 🔴 | — | 🟡 |
| Trade Open (Market) | ✅ | — | 🔴 | — | 🟡 |
| Trade Open (Entry) | ✅ | 🔴 (trigger) | 🔴 | — | 🔴 |
| Trade Close | ✅ | — | 🔴 | — | 🟡 |
| Partial Close | 🔴 | — | 🔴 | — | 🔴 |
| Stop Loss | ✅ (field) | 🔴 | 🔴 | 🔴 | 🔴 |
| Take Profit | ✅ (field) | 🔴 | 🔴 | 🔴 | 🔴 |
| Trailing Stop | 🟡 (field) | 🔴 | 🔴 | 🔴 | 🔴 |
| Margin Monitoring | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Margin Call | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Stop Out | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Rollover/Swap | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Inactivity Fee | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Deposit (NowPayments) | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Withdrawal | ✅ | — | 🔴 | 🔴 | 🟡 |
| Price Alerts | ✅ (storage) | 🔴 | 🔴 | 🔴 | 🔴 |
| Watchlist | ✅ | — | 🔴 | — | 🟡 |
| Notifications | ✅ | 🔴 | 🔴 | 🔴 | 🟡 |
| Signals | 🟡 (read) | 🔴 | 🔴 | — | 🔴 |
| IB Commissions | ✅ (create) | — | 🔴 | — | 🟡 |
| IB Portal | ✅ | — | 🔴 | — | 🟡 |
| Admin Panel | ✅ | — | 🔴 | — | 🟡 |
| TradingView Charts | 🟡 (data) | — | 🔴 | — | 🔴 |
| Socket.io Live Updates | ✅ | — | 🔴 | — | 🟡 |
| Landing Page | — | — | 🔴 | — | 🔴 |
| Legal Documents | ✅ (schema) | — | 🔴 | — | 🔴 |
| Annual Statement | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |

---

## 5. Gap Analysis

### 5.1 Critical Path Gaps (Blocking Launch)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 1 | No Twelve Data WebSocket integration | No live prices — entire platform non-functional | High |
| 2 | No BullMQ workers | No rollover, margin calls, stop-outs, alert triggers, entry order execution | High |
| 3 | All 5 frontend apps are empty | No user-facing interface exists | Very High |
| 4 | No email templates | No transactional emails sent (welcome, KYC, deposits, etc.) | Medium |
| 5 | NowPayments API not called | Deposits cannot be created | Medium |
| 6 | Zero test coverage | Financial calculations unverified — deployment-blocking | High |
| 7 | No Dockerfile | CI/CD pipeline broken | Low |
| 8 | Login route bug | Authentication broken at runtime | Low |

### 5.2 High-Priority Gaps (Needed for MVP)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 9 | No TradingView chart datafeed integration | Charts won't display data | Medium |
| 10 | No graceful shutdown | Data loss on deploy/restart | Low |
| 11 | No structured logging | Debugging production issues impossible | Low |
| 12 | No partial close implementation | Traders cannot reduce position size | Medium |
| 13 | No MFA implementation | Withdrawals not protected | Medium |
| 14 | No negative balance protection | Users could go negative on stop-out | Medium |
| 15 | No Socket.io price broadcast pipeline | Real-time updates don't reach clients | Medium |
| 16 | Forex swap rates incomplete | 6 pairs have placeholder values | Low |

### 5.3 Medium-Priority Gaps (Needed for Full Launch)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 17 | No economic calendar integration | Screen 21 non-functional | Medium |
| 18 | No news feed integration | Screen 25 non-functional | Medium |
| 19 | No signal generation logic | Signals page empty | Medium |
| 20 | No report/PDF generation | Annual statements unavailable | Medium |
| 21 | No push notification service | Push channel in notification matrix unimplemented | Medium |
| 22 | No user notification preferences table | Users can't customize notification channels | Low |
| 23 | No KYC selfie requirements spec | L3 verification incomplete | Low |
| 24 | No OAuth implementation | Google/Facebook login non-functional | Medium |

---

## 6. Prioritized Backlog

### P0 — Critical (Fix Immediately)

| ID | Task | Est. | Dependencies |
|----|------|------|-------------|
| B-01 | Fix login route `.constructor` bug | 1h | None |
| B-02 | Fix trade close race condition on `balance_after_cents` | 2h | None |
| B-03 | Create `apps/api/Dockerfile` | 2h | None |
| B-04 | Write financial calculation unit tests (14 test cases per spec) | 8h | None |
| B-05 | Fix withdrawal balance calculation | 1h | None |

### P1 — Core Infrastructure (Weeks 1-3)

| ID | Task | Est. | Dependencies |
|----|------|------|-------------|
| I-01 | Twelve Data WebSocket client + price pipeline | 16h | None |
| I-02 | Price cache → Redis → Socket.io broadcast pipeline | 8h | I-01 |
| I-03 | BullMQ worker: rollover-daily + wednesday-triple | 8h | I-01 |
| I-04 | BullMQ worker: margin-monitor (margin call + stop-out) | 16h | I-02 |
| I-05 | BullMQ worker: entry-order-trigger | 8h | I-02 |
| I-06 | BullMQ worker: alert-monitor | 4h | I-02 |
| I-07 | BullMQ worker: inactivity-check | 4h | None |
| I-08 | BullMQ worker: pnl-snapshot | 4h | I-02 |
| I-09 | BullMQ worker: kyc-reminder | 2h | None |
| I-10 | Implement negative balance protection | 4h | I-04 |
| I-11 | NowPayments API integration (create invoice) | 8h | None |
| I-12 | Create all 21 email templates (React Email) | 16h | None |
| I-13 | Wire email sending to API events | 8h | I-12 |
| I-14 | Add graceful shutdown (SIGTERM/SIGINT) | 2h | None |
| I-15 | Add structured logging (pino) | 4h | None |
| I-16 | Implement partial close endpoint | 4h | None |
| I-17 | Implement trailing stop update logic | 8h | I-02 |
| I-18 | MFA implementation (TOTP + SMS) | 16h | None |

### P2 — Frontend Foundation (Weeks 3-8)

| ID | Task | Est. | Dependencies |
|----|------|------|-------------|
| F-01 | Auth app: Login page | 12h | B-01 |
| F-02 | Auth app: Register page (with Pool Code) | 16h | None |
| F-03 | Auth app: Forgot/Reset password pages | 8h | None |
| F-04 | Auth app: KYC wizard (6 steps) | 24h | F-01 |
| F-05 | Auth app: Email verification page | 4h | None |
| F-06 | Platform: Global layout (header + sidebar) | 16h | F-01 |
| F-07 | Platform: Symbols page (table + TradingView chart) | 24h | F-06, I-02 |
| F-08 | Platform: Trade panel (market + entry orders) | 24h | F-07 |
| F-09 | Platform: My Trades (5 tabs) | 20h | F-06 |
| F-10 | Platform: Account — Funds tab (deposit/withdrawal) | 16h | F-06, I-11 |
| F-11 | Platform: Account — Profile tab | 12h | F-06 |
| F-12 | Platform: Account — Financial Summary | 12h | F-06 |
| F-13 | Platform: Account — Legal tab | 4h | F-06 |
| F-14 | Platform: KYC document upload modals | 16h | F-06 |
| F-15 | Platform: Alerts page | 12h | F-06, I-06 |
| F-16 | Platform: Watchlist management | 8h | F-07 |
| F-17 | Platform: Notifications panel | 8h | F-06 |
| F-18 | Platform: Signals page | 8h | F-06 |
| F-19 | Platform: News page | 8h | F-06 |
| F-20 | Platform: Economic Calendar | 8h | F-06 |
| F-21 | Platform: Socket.io integration (live prices, P&L) | 12h | F-07, I-02 |

### P3 — Admin & IB (Weeks 8-11)

| ID | Task | Est. | Dependencies |
|----|------|------|-------------|
| A-01 | Admin: Dashboard with key metrics | 12h | None |
| A-02 | Admin: User management (list, detail, status) | 16h | A-01 |
| A-03 | Admin: KYC review queue + document viewer | 20h | A-01 |
| A-04 | Admin: Deposit/Withdrawal processing | 12h | A-01 |
| A-05 | Admin: Instrument configuration | 8h | A-01 |
| A-06 | Admin: Reports | 12h | A-01 |
| A-07 | IB Portal: Agent dashboard (traders, commissions) | 16h | None |
| A-08 | IB Portal: Team Leader dashboard (agents, network) | 16h | A-07 |
| A-09 | IB Portal: Commission payout management | 8h | A-07 |

### P4 — Marketing & Polish (Weeks 11-13)

| ID | Task | Est. | Dependencies |
|----|------|------|-------------|
| M-01 | Landing page (Screen 01) | 16h | None |
| M-02 | Mobile responsive pass (all screens) | 24h | All frontend |
| M-03 | TradingView datafeed integration | 12h | I-01 |
| M-04 | OAuth (Google + Facebook) | 12h | F-01 |
| M-05 | Signal generation engine | 12h | I-01 |
| M-06 | Report/PDF generation (annual statements) | 12h | None |
| M-07 | Economic calendar integration | 8h | None |
| M-08 | News feed integration | 8h | None |
| M-09 | Push notification service (FCM/OneSignal) | 8h | None |
| M-10 | End-to-end test suite | 24h | All frontend |
| M-11 | Performance testing (k6) | 12h | All |
| M-12 | Security audit (OWASP ZAP) | 8h | All |
| M-13 | Production hardening | 12h | All |

---

## 7. Open Decisions & Ambiguities

These must be resolved before the relevant sprints begin.

### Decision Required — P0 (Before Sprint 1) — ALL RESOLVED ✅

| # | Decision | **DECIDED** | Rationale |
|---|----------|-------------|-----------|
| D-01 | **Stop-out level: 50% or 20%?** | **50% (5000 bps)** | Matches industry standard for retail. 20% too aggressive for learning/simulation environment. |
| D-02 | **Password requirements: 8 or 12 chars?** | **12 chars (upper + lower + digit + special)** | Aligns with FSC/FSA requirements and modern security standards. PTS-ARCH-001 must be updated to match PTS-API-001. |
| D-03 | **IB commission formula: with or without contract_size?** | **WITH contract_size** per PTS-CALC-001 | PTS-API-001 formula must be corrected to include `contract_size` for forex/indices/commodities. |
| D-04 | **Wednesday triple-swap: skip daily or add multiplier?** | **Skip daily on Wednesday** | `rollover-daily` cron must exclude Wednesday (`0 22 * * 1,2,4,5`). `wednesday-triple` handles ×3 independently. Avoids 4× charges. |

### Decision Required — P1 (Before Sprint 3)

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D-05 | **MFA cutoff date and grace period** | TBD | Set at production launch date with 30-day grace period. |
| D-06 | **KYC level capabilities per tier** | L1/L2/L3 undefined | L1=login only, L2=trading+deposits, L3=unrestricted withdrawals. |
| D-07 | **Forex swap rates for 6 placeholder pairs** | Pending Victor/IB input | Collect from operations team before Phase 2. |

### Documentation Gaps (Non-Blocking)

| # | Issue | Source |
|---|-------|--------|
| G-01 | `user_notification_preferences` table referenced in roadmap but missing from data dictionary | PTS-SPRINT-001 |
| G-02 | Annual statement email template referenced in in-app notifications but no email template defined | PTS-COMM-001 |
| G-03 | KYC selfie technical requirements not specified (format, quality, liveness detection) | PTS-SOP-001 |
| G-04 | Deposit status mapping (NowPayments → DB) implied but never explicitly stated | PTS-API-001 |
| G-05 | `EXPIRED` in AGENTS.md `closed_by` but not in data dictionary | AGENTS.md vs PTS-DATA-001 |
| G-06 | Auth app port 3005 missing from API CORS_ORIGINS | PTS-ENV-001 |
| G-07 | 60 instruments in seed — breakdown by asset class not documented | PTS-ENV-001 |
| G-08 | ~~Password policy inconsistency across 3 screens~~ **RESOLVED** — unified to 12 chars + special character across all screens, API, and docs | PTS-UI-001/002 |
| G-09 | Escalation contact details redacted in KYC runbook | PTS-RUN-001 |
| G-10 | Screen numbering overlap between PTS-UI-001 and PTS-UI-002 (both define Screens 16-18) | PTS-UI-001/002 |

---

## 8. Sprint Roadmap

### Overview

The roadmap restructures the original 13-sprint plan based on the current state. Sprints 0-1 (Foundation) are complete. We resume at **Sprint 2** focusing on infrastructure hardening, then progress through backend workers, frontend development, and launch preparation.

**Total estimated effort: ~24 weeks (12 two-week sprints)**

---

### Sprint 2: Bug Fixes & Infrastructure Hardening (Week 1-2)

**Objective:** Fix critical bugs, establish test coverage, complete infrastructure prerequisites.

**Sprint Goal:** All P0 bugs resolved, 14 financial calculation tests passing, Dockerfile exists, structured logging in place.

| # | Task | Complexity | Owner | Acceptance Criteria |
|---|------|-----------|-------|-------------------|
| 2.1 | Fix login route `.constructor` bug | Low (1h) | BE | Login returns proper `AppError` with `errorCode` for invalid credentials and suspended accounts |
| 2.2 | Fix trade close race condition | Medium (2h) | BE | Concurrent trade closes produce correct `balance_after_cents` snapshots; no data corruption |
| 2.3 | Fix withdrawal balance calculation | Low (1h) | BE | Withdrawal correctly computes new balance accounting for ledger entry in same transaction |
| 2.4 | Create `apps/api/Dockerfile` | Low (2h) | DevOps | `docker build -t protrader-api apps/api/` succeeds; CI pipeline passes build step |
| 2.5 | Write 14 financial calculation unit tests | High (8h) | BE | All tests pass: margin, P&L (BUY+SELL), spread, margin level, margin call, stop-out, rollover, triple swap, negative balance protection, balance computation, commissions (indices/stocks/crypto), inactivity fee |
| 2.6 | Write 7 decimal precision unit tests | Medium (4h) | BE | Tests cover: price precision, P&L rounding, margin decimals, commission fractional, swap precision, triple swap, cascade rounding |
| 2.7 | Add graceful shutdown | Low (2h) | BE | SIGTERM/SIGINT handlers: close HTTP server, disconnect Prisma, close Redis, drain BullMQ |
| 2.8 | Add pino structured logging | Medium (4h) | BE | Replace all `console.log` with pino; JSON output in production, pretty in dev; request ID tracking |
| 2.9 | Add API integration tests (auth happy path) | Medium (6h) | BE | Register, login, refresh, logout, verify-email, forgot/reset-password flows tested |
| 2.10 | Add API integration tests (trades happy path) | Medium (6h) | BE | Open market trade, close trade, update SL/TP, cancel entry order flows tested |
| 2.11 | Clean up duplicate imports | Low (0.5h) | BE | Single `prisma` import per file; no `prisma as db` duplication |

**Sprint 2 Total: ~40.5 hours**

---

### Sprint 3: Market Data Pipeline & Core Workers (Week 3-4)

**Objective:** Get live prices flowing through the system. Implement critical background workers.

**Sprint Goal:** Live prices in Redis, Socket.io broadcasting price updates, rollover and entry-order workers operational.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 3.1 | Twelve Data WebSocket client | High (16h) | None | Connects to Twelve Data WS, subscribes to 60 instruments, handles reconnection, parses price ticks |
| 3.2 | Price pipeline: parse → apply spread → cache → broadcast | High (8h) | 3.1 | Each tick: calculate bid/ask, update Redis `prices:{symbol}`, publish to Redis pub/sub, Socket.io broadcasts to `prices:{symbol}` room |
| 3.3 | BullMQ worker: rollover-daily + wednesday-triple | Medium (8h) | 3.2 | At 22:00 UTC Mon-Fri: calculate swap for all open positions using BigInt formula; Wednesday applies ×3; skip daily on Wednesday; insert ledger entries |
| 3.4 | BullMQ worker: entry-order-trigger | Medium (8h) | 3.2 | On each price tick: check PENDING entry orders against trigger price; BUY triggers on ask reaching trigger, SELL on bid; execute with margin validation |
| 3.5 | BullMQ worker: alert-monitor | Low (4h) | 3.2 | On each price tick: check `alert_index:{symbol}` sorted set; trigger alerts when price crosses threshold; send notification |
| 3.6 | Implement trailing stop update endpoint | Medium (4h) | None | PUT `/v1/trades/:id/trailing-stop` validates distance, stores `trailingStopPips` and `peakPriceScaled` |
| 3.7 | Implement trailing stop execution in price pipeline | Medium (4h) | 3.2, 3.6 | On each tick: check open trades with trailing stops; BUY triggers when bid ≤ peak - distance; SELL when ask ≥ trough + distance |
| 3.8 | Implement partial close endpoint | Medium (4h) | None | POST `/v1/trades/:id/partial-close` validates units < position, calculates pro-rata P&L, updates trade |
| 3.9 | Write worker integration tests | Medium (6h) | 3.3-3.5 | Rollover calculates correct swap, entry order triggers at correct price, alerts fire on threshold |

**Sprint 3 Total: ~62 hours**

---

### Sprint 4: Margin Engine & Email System (Week 5-6)

**Objective:** Implement margin monitoring, liquidation engine, and complete email notification system.

**Sprint Goal:** Margin calls fire at 100%, stop-outs execute at 50%, all 21 email templates exist and send.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 4.1 | BullMQ worker: margin-monitor | High (16h) | Sprint 3 | On each price tick: recalculate margin level for affected users; emit `margin:call` at ≤100%; begin stop-out at ≤50% |
| 4.2 | Implement stop-out liquidation logic | High (8h) | 4.1 | Close largest unrealized loss first, recalculate after each close, repeat until >50% or all closed; respect MAX_POSITIONS_PER_STOP_OUT=10, CLOSE_DELAY_MS=100 |
| 4.3 | Implement negative balance protection | Medium (4h) | 4.2 | After all positions closed, if balance < 0: insert MANUAL_ADJUSTMENT to reset to $0 |
| 4.4 | BullMQ worker: inactivity-check | Low (4h) | None | Daily check: users with 90+ days since `last_active_at`; charge $25/month from balance (not below $0); send email |
| 4.5 | BullMQ worker: kyc-reminder | Low (2h) | None | 3 days post-registration: if `kyc_status = NOT_STARTED`, send reminder email |
| 4.6 | BullMQ worker: pnl-snapshot | Low (4h) | Sprint 3 | Nightly snapshot of equity curve for portfolio performance chart |
| 4.7 | Create 21 React Email templates | High (16h) | None | All templates per PTS-COMM-001: welcome, email-verify, kyc-pending/approved/rejected/additional/resubmit, deposit-confirmed/rejected, withdrawal-processing/completed/rejected, stop-loss/take-profit-triggered, margin-call, stop-out, password-reset/changed, inactivity-warning/charged, kyc-reminder |
| 4.8 | Wire email sending to API events | Medium (8h) | 4.7 | Registration → welcome, KYC change → status email, deposit webhook → confirmed, withdrawal → processing/completed, password reset → reset email |
| 4.9 | Implement NowPayments API integration | Medium (8h) | None | POST `/v1/deposits` calls NowPayments create-payment, stores invoice_id, returns payment URL |
| 4.10 | Write margin/liquidation tests | Medium (6h) | 4.1-4.3 | Margin call fires at 100%, stop-out closes positions in correct order, negative balance protection activates |

**Sprint 4 Total: ~76 hours**

---

### Sprint 5: Auth Frontend (Week 7-8)

**Objective:** Build the complete auth zone — login, register, password flows, KYC wizard.

**Sprint Goal:** Users can register, verify email, login, reset password, and complete KYC wizard through the UI.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 5.1 | Auth app: Layout + design system setup | Medium (8h) | None | Split-screen layout, dark left panel, Tailwind tokens from packages/config, responsive |
| 5.2 | Auth app: Login page | Medium (12h) | 5.1 | Email/password form, show/hide toggle, remember me, forgot password link, Google/Facebook buttons, validation, error states, loading states |
| 5.3 | Auth app: Register page | High (16h) | 5.1 | Full name, phone (country code selector), country, email, password (12+ chars validation), pool code, terms checkbox, server-side validation, anti-enumeration |
| 5.4 | Auth app: Forgot password page | Low (4h) | 5.1 | Email input, success confirmation (anti-enumeration: always shows success) |
| 5.5 | Auth app: Reset password page | Low (4h) | 5.1, 5.4 | Token from URL, new password + confirm, validation, redirect to login |
| 5.6 | Auth app: Email verification page | Low (4h) | 5.1 | Token from URL, verify call, success/error states |
| 5.7 | Auth app: KYC wizard — Step 1 (Personal Info) | Medium (6h) | 5.1 | Full name, DOB, nationality (auto-filled from registration) |
| 5.8 | Auth app: KYC wizard — Step 2 (Address) | Low (4h) | 5.7 | Address line 1, city, country, postal code |
| 5.9 | Auth app: KYC wizard — Step 3 (Top Up) | Medium (6h) | 5.8, Sprint 4 | NowPayments deposit options (BTC/ETH/USDT), skip button |
| 5.10 | Auth app: KYC wizard — Step 4 (Financial Details) | Medium (4h) | 5.9 | Employment, income, source of funds, trading experience/motive/goal |
| 5.11 | Auth app: KYC wizard — Step 5 (Documents) | High (8h) | 5.10 | ID upload (passport/ID/license), address upload, file validation (JPEG/PNG/PDF, 10MB, 800×600) |
| 5.12 | Auth app: KYC wizard — Step 6 (Start Trading) | Low (2h) | 5.11 | "GO TO TRADING PLATFORM" CTA → redirect to `app.protrader.com` |
| 5.13 | Auth app: Socket.io connection for real-time KYC updates | Low (4h) | Sprint 3 | KYC status updates via WebSocket while on auth zone |

**Sprint 5 Total: ~82 hours**

---

### Sprint 6: Platform Core — Layout & Trading (Week 9-10)

**Objective:** Build the main trading platform — header, sidebar, symbols page, trade panel.

**Sprint Goal:** Users can view live prices, open/close trades, see P&L updates in real-time.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 6.1 | Platform: Global header bar | High (12h) | Sprint 5 | Logo, notification bell (unread badge), 5 live metric chips (P&L, margin level, equity, balance, available), greeting, avatar |
| 6.2 | Platform: Left sidebar navigation | Medium (8h) | 6.1 | Trade label, Deposit CTA, nav items (Symbols, My Trades, News, Calendar, Alerts, Signals, Academy, Account), active state, collapse |
| 6.3 | Platform: Socket.io integration (Zustand store) | Medium (8h) | Sprint 3 | Connect with JWT, join `user:{id}` room, handle price:update, trade:opened/closed, account:metrics, margin:call/stop_out events |
| 6.4 | Platform: Symbols page — instrument table | High (16h) | 6.1, 6.3 | Category tabs (Watchlist/Stock/Index/Commodity/Crypto/Currency), table with symbol/logo, change%, low/high range, sell/buy buttons, trend bar, search, live price updates |
| 6.5 | Platform: Symbols page — TradingView chart | Medium (8h) | 6.4, Sprint 3 | Candlestick chart with OHLCV data from API, toolbar (search, indicators, timeframe, drawing tools) |
| 6.6 | Platform: Trade panel — Market order | High (12h) | 6.4 | Symbol header, SELL/BUY prices, units stepper, margin calc display, SL/TP checkboxes, submit button with validation |
| 6.7 | Platform: Trade panel — Entry order | Medium (6h) | 6.6 | Order rate field with validation, expiration date picker, submit button |
| 6.8 | Platform: Header stats reorder modal | Low (4h) | 6.1 | Drag-and-drop reorder of header metrics, save preference |
| 6.9 | Write frontend component tests | Medium (6h) | 6.4-6.7 | Symbol table renders, trade panel validates inputs, price updates reflect in UI |

**Sprint 6 Total: ~80 hours**

---

### Sprint 7: Platform — My Trades & Account (Week 11-12)

**Objective:** Build trade history, account management, and KYC document upload.

**Sprint Goal:** Users can view open/pending/closed trades, manage account, upload KYC docs, deposit/withdraw.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 7.1 | Platform: My Trades — Open Trades tab | Medium (8h) | Sprint 6 | Symbol, type, units, open rate, current rate, unrealized P&L, margin, swap, actions (close, edit SL/TP, partial close) |
| 7.2 | Platform: My Trades — Pending Orders tab | Medium (6h) | 7.1 | Same columns + order rate, expiry, cancel button |
| 7.3 | Platform: My Trades — Closed Trades tab | Medium (6h) | 7.1 | Symbol, type, units, open rate, close rate, realized P&L, closed by, duration |
| 7.4 | Platform: My Trades — Orders History tab | Low (4h) | 7.2 | All entry orders including triggered and cancelled |
| 7.5 | Platform: My Trades — Activity Log tab | Medium (6h) | 7.1 | Paginated feed of all account events from ledger |
| 7.6 | Platform: Account — Funds tab | High (12h) | Sprint 6 | Ring chart (margin level), balance, equity, used margin, available, deposit/withdrawal CTAs, deposit history table, withdrawal history table |
| 7.7 | Platform: Account — Profile tab | Medium (8h) | 7.6 | Avatar, personal info, change password button, KYC doc upload link, language, account number/ID copy |
| 7.8 | Platform: Change password modal | Low (4h) | 7.7 | Current/new/confirm password fields, validation, success toast |
| 7.9 | Platform: Documents Hub modal (ID/Address/Misc) | High (12h) | 7.7 | 3-step upload flow, file validation, state machine display |
| 7.10 | Platform: Account — Financial Summary tab | Medium (8h) | 7.6 | Current metrics (computed), lifetime summary (ledger aggregation) |
| 7.11 | Platform: Account — Legal tab | Low (4h) | 7.6 | 11 legal document links, PDFs open in new tab |
| 7.12 | Platform: Make a Withdrawal modal | Medium (6h) | 7.6 | Amount validation ($50-$5000), crypto selector, wallet address, confirmation step |

**Sprint 7 Total: ~84 hours**

---

### Sprint 8: Platform — Alerts, Signals, News, Calendar (Week 13-14)

**Objective:** Complete secondary platform features.

**Sprint Goal:** All platform pages functional — alerts, watchlist, signals, news, calendar, notifications.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 8.1 | Platform: Alerts page + Set Alert flow | Medium (12h) | Sprint 6 | Asset class tabs, alert table, create alert modal (symbol/type/trigger/channels/expiration), edit/delete |
| 8.2 | Platform: Watchlist management | Medium (8h) | Sprint 6 | Add/remove instruments, reorder, live price enrichment |
| 8.3 | Platform: Notifications panel | Medium (8h) | Sprint 6 | Bell dropdown, unread badge, notification list, mark read, mark all read |
| 8.4 | Platform: Signals page | Low (8h) | Sprint 6 | Asset class tabs, signal table (symbol/type/pattern/interval/target), empty state |
| 8.5 | Platform: News page | Low (8h) | M-08 | Card layout, source/headline/summary/timestamp, asset class filter |
| 8.6 | Platform: Economic Calendar | Low (8h) | M-07 | Date range picker, currency/impact filters, event table with color-coded actual values |
| 8.7 | Platform: Academy page | Low (8h) | None | Category cards grid, featured article/video, placeholder content |
| 8.8 | Implement alert trigger in worker | Low (4h) | Sprint 3 | Alert fires when price crosses threshold, sends notification via configured channels |
| 8.9 | Mobile responsive pass — Platform | High (12h) | All platform | All screens responsive, sidebar collapses, touch targets 48px minimum |

**Sprint 8 Total: ~76 hours**

---

### Sprint 9: Admin Panel (Week 15-16)

**Objective:** Build the complete admin back-office.

**Sprint Goal:** Admins can manage users, review KYC, process deposits/withdrawals, view reports.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 9.1 | Admin: Layout + sidebar + auth guard | Medium (8h) | None | Sidebar (Dashboard, Users, KYC, Deposits, Withdrawals, Leads, Instruments, Signals, Reports), role-based access |
| 9.2 | Admin: Dashboard | Medium (8h) | 9.1 | Key metrics: total users, active traders, pending KYC, pending deposits/withdrawals, daily volume |
| 9.3 | Admin: User management | High (12h) | 9.1 | User list with search/filter, user detail (profile, KYC docs, deposits, withdrawals, trades), status update, manual adjustment |
| 9.4 | Admin: KYC review queue | High (16h) | 9.1, 9.3 | Queue table (oldest first, SLA indicators), split panel (profile + documents), document viewer (R2 presigned URL), approve/reject/request additional |
| 9.5 | Admin: Deposit processing | Medium (8h) | 9.1 | List with status filter, approve/reject with optional bonus, ledger entry creation |
| 9.6 | Admin: Withdrawal processing | Medium (8h) | 9.1 | List with status filter, process (NowPayments payout) / reject (reversal), masked wallet display |
| 9.7 | Admin: Instrument configuration | Low (6h) | 9.1 | List instruments, edit spread/leverage/trading hours/swap rates |
| 9.8 | Admin: Reports | Medium (8h) | 9.1 | Trading volume, P&L summaries, commission reports, date range filters, CSV export |

**Sprint 9 Total: ~74 hours**

---

### Sprint 10: IB Portal (Week 17-18)

**Objective:** Build the IB agent and team leader portals.

**Sprint Goal:** IB agents can view their traders and commissions. Team leaders can manage agents.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 10.1 | IB Portal: Layout + auth guard | Medium (6h) | None | Sidebar (Dashboard, My Traders, My Commissions, Network), role-based (Agent vs TL views) |
| 10.2 | IB Portal: Agent dashboard | High (12h) | 10.1 | My Traders table (name, account#, balance, last active, volume, status), Commission Summary (lifetime/paid/pending), Performance chart |
| 10.3 | IB Portal: Commission detail | Medium (8h) | 10.2 | Commission table (date, trader, symbol, direction, units, notional, commission, status), filters (date/status/trader) |
| 10.4 | IB Portal: Team Leader — My Agents | High (10h) | 10.1 | Agent list (#traders, monthly volume, commissions, active traders), per-agent drilldown |
| 10.5 | IB Portal: Team Leader — Network Overview | Medium (8h) | 10.4 | Total traders, volume MTD/all-time, network commissions, override commissions |
| 10.6 | IB Portal: Commission payout management | Medium (6h) | 10.3 | Super Admin: filter by period, review PENDING, mark as PAID with payment reference |

**Sprint 10 Total: ~50 hours**

---

### Sprint 11: Marketing, OAuth & Enhancements (Week 19-20)

**Objective:** Landing page, OAuth, economic calendar/news integrations, portfolio page.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 11.1 | Landing page (Screen 01) | High (16h) | None | Hero, asset ticker, features, mobile app promo, research tools, CTA, footer, trust signals |
| 11.2 | OAuth: Google + Facebook | Medium (12h) | Sprint 5 | Social auth buttons functional, account creation/linking, JWT issuance |
| 11.3 | TradingView datafeed integration | Medium (12h) | Sprint 3 | OHLCV data from API, real-time updates via WebSocket, symbol mapping |
| 11.4 | Economic calendar integration | Medium (8h) | None | Trading Economics or Forex Factory API, filterable event feed |
| 11.5 | News feed integration | Medium (8h) | None | Twelve Data news endpoint or licensed provider, card layout |
| 11.6 | Signal generation engine | Medium (12h) | Sprint 3 | Technical analysis patterns (MACD cross, etc.), store in signals table |
| 11.7 | Portfolio page (enhancement) | Medium (12h) | Sprint 7 | Asset allocation pie chart, equity curve, win rate, profit factor, max drawdown |
| 11.8 | Push notification service (FCM/OneSignal) | Medium (8h) | Sprint 4 | Register device tokens, send push for critical events (margin call, stop-out, deposit) |
| 11.9 | Mobile responsive — Auth zone | Medium (8h) | Sprint 5 | All auth screens responsive on mobile |
| 11.10 | Mobile responsive — Admin/IB | Medium (8h) | Sprint 9-10 | Admin and IB portal responsive on tablet |

**Sprint 11 Total: ~96 hours**

---

### Sprint 12: Testing, Security & Production Hardening (Week 21-22)

**Objective:** Comprehensive testing, security audit, performance optimization, production readiness.

**Sprint Goal:** Platform passes security audit, performance SLAs met, production deployment successful.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 12.1 | E2E test suite (Playwright) | High (16h) | All frontend | Registration → KYC → Deposit → Trade → Close → Withdrawal flow; admin KYC review flow; IB commission flow |
| 12.2 | API contract tests | Medium (8h) | All API | Error codes, rate limiting, access token expiry, KYC_REQUIRED enforcement, Pool Code validation |
| 12.3 | Performance testing (k6) | Medium (8h) | All | 10K concurrent users, price update latency <500ms, order execution <100ms, P99 targets met |
| 12.4 | Security audit (OWASP ZAP) | Medium (8h) | All | SQL injection, XSS, CSRF, rate limiting, WebSocket auth, brute force — all pass |
| 12.5 | Manual penetration test | Medium (8h) | 12.4 | Auth bypass, privilege escalation, financial manipulation — all pass |
| 12.6 | Financial audit scripts | Medium (8h) | All | P&L, margin, balance verification across 1000 simulated trades — zero discrepancies |
| 12.7 | Production environment setup | Medium (8h) | None | AWS ECS, RDS, ElastiCache, ECR, Secrets Manager, CloudWatch configured |
| 12.8 | CI/CD pipeline validation | Low (4h) | 12.7 | Full pipeline: typecheck → lint → test → build → deploy staging → E2E → deploy production |
| 12.9 | Monitoring & alerting setup | Medium (6h) | 12.7 | CloudWatch dashboards, error rate >1% alert, latency >2s alert, disk/CPU alerts |
| 12.10 | Production data seeding | Low (4h) | 12.7 | 60 instruments, swap rates, legal documents, staff accounts |
| 12.11 | Domain + SSL + Cloudflare setup | Low (4h) | 12.7 | All 6 domains configured, SSL certificates, CDN, DDoS protection |

**Sprint 12 Total: ~82 hours**

---

### Sprint 13: Launch & Post-Launch (Week 23-24)

**Objective:** Soft launch, monitoring, bug fixes, documentation finalization.

**Sprint Goal:** Platform live with real users, monitoring active, documentation complete.

| # | Task | Complexity | Dependencies | Acceptance Criteria |
|---|------|-----------|-------------|-------------------|
| 13.1 | Soft launch (limited users) | — | Sprint 12 | Platform accessible at all domains, registration working, trading functional |
| 13.2 | Post-launch monitoring (48h) | — | 13.1 | No P0/P1 errors, P99 latency within SLA, zero financial discrepancies |
| 13.3 | Bug fix triage from soft launch | Variable | 13.1 | All reported bugs triaged, P0 fixed within 4h, P1 within 24h |
| 13.4 | Finalize remaining swap rates | Low (2h) | None | 6 placeholder forex pairs have final values from Victor/IB |
| 13.5 | Complete documentation gaps | Low (4h) | None | All 10 documentation gaps from Section 7 resolved |
| 13.6 | Deployment runbook finalization | Low (4h) | 13.1 | Step-by-step deploy, rollback (forward-fix), scaling, emergency procedures |
| 13.7 | Compliance checklist verification | Medium (4h) | All | FSC/FSA requirements: KYC tiers, AML screening, data retention, MFA enforcement |
| 13.8 | Annual statement PDF generation | Medium (8h) | None | Generate PDF account statements from ledger data |

**Sprint 13 Total: ~22+ hours**

---

## 9. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R-01 | Twelve Data API rate limits during development | Medium | High | Use sandbox/test API key; implement request queuing; cache aggressively |
| R-02 | TradingView Charting Library licensing cost | Medium | Medium | Using `lightweight-charts` (free) instead of full Charting Library; confirm compatibility |
| R-03 | NowPayments sandbox limitations | Medium | Low | Test with minimal amounts; implement thorough webhook simulation for CI |
| R-04 | Frontend scope underestimation (30 screens) | High | High | Prioritize 24 core screens; 6 enhancement screens in Sprint 11 |
| R-05 | Race conditions in financial transactions | Medium | Critical | All financial operations in DB transactions with row-level locks; comprehensive concurrency tests |
| R-06 | Redis single point of failure | Low | High | AOF persistence in dev; plan Sentinel migration for Sprint 13 |
| R-07 | IB commission formula discrepancy (contract_size) | High | Medium | Resolve D-03 before Sprint 3; update PTS-API-001 formula |
| R-08 | Swap rate placeholders block rollover worker | Medium | Low | Use defaults for placeholder pairs; finalize with operations team |
| R-09 | MFA implementation complexity | Medium | Medium | Use established library (speakeasy for TOTP); SMS via Twilio |
| R-10 | Production Supabase vs RDS decision | Low | High | Current code uses Supabase (eu-west-1); production spec says AWS RDS — confirm before Sprint 12 |

---

## 10. Appendices

### A. Document Inventory

| Document ID | Title | Location |
|-------------|-------|----------|
| PTS-ARCH-001 | System Architecture & Deployment | docs/Core Technical Specifications/ |
| PTS-API-001 | API Specification | docs/Core Technical Specifications/ |
| PTS-CALC-001 | Trading Calculations & Business Rules | docs/Core Technical Specifications/ |
| PTS-DB-001 | Database Schema | docs/Core Technical Specifications/ |
| PTS-SPRINT-001 | Dev Roadmap, Testing & Notification System | docs/Development & Operations/ |
| PTS-DATA-001 | Data Dictionary | docs/Development & Operations/ |
| PTS-ENV-001 | Environment Setup Guide | docs/Development & Operations/ |
| PTS-SOP-001 | Compliance & KYC Operations Standard | docs/Compliance & Operations/ |
| PTS-RUN-001 | KYC Review Runbook | docs/Compliance & Operations/ |
| PTS-COMM-001 | Trader Communication Templates | docs/Business Operations/ |
| PTS-IB-001 | IB Onboarding & Operations Guide | docs/Business Operations/ |
| PTS-UI-001 | UI Specification Part 1 (Screens 01-18) | docs/UI : UX Specifications/ |
| PTS-UI-002 | UI Specification Part 2 (Screens 16-30) | docs/UI : UX Specifications/ |

### B. Sprint Velocity Assumptions

- **Team:** 1 full-stack developer (Krishan)
- **Sprint length:** 2 weeks
- **Effective hours per sprint:** ~80 hours (accounting for meetings, context switching, debugging)
- **Velocity buffer:** 20% contingency for unknowns
- **Total project effort:** ~846 hours across 13 sprints (~26 weeks)

### C. Dependencies Between Sprints

```
Sprint 2 (Bugs & Tests)
    │
    ▼
Sprint 3 (Market Data & Workers) ──→ Sprint 4 (Margin & Email)
    │                                      │
    │                                      ▼
    ├──────────────────────────────→ Sprint 5 (Auth Frontend)
    │                                      │
    │                                      ▼
    └──────────────────────────────→ Sprint 6 (Platform Core)
                                           │
                                           ▼
                                     Sprint 7 (My Trades & Account)
                                           │
                                           ▼
                                     Sprint 8 (Alerts, Signals, News)
                                           │
                                    ┌──────┴──────┐
                                    ▼             ▼
                              Sprint 9       Sprint 10
                              (Admin)        (IB Portal)
                                    │             │
                                    └──────┬──────┘
                                           ▼
                                     Sprint 11 (Marketing & OAuth)
                                           │
                                           ▼
                                     Sprint 12 (Testing & Security)
                                           │
                                           ▼
                                     Sprint 13 (Launch)
```

### D. Key Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| API test coverage | ≥90% for financial calculations | Jest coverage report |
| E2E test coverage | All critical user journeys | Playwright test results |
| Order execution latency | P99 < 100ms | APM / CloudWatch |
| Price update → broadcast | P99 < 500ms | Custom metrics |
| Frontend FCP | < 1800ms | Lighthouse |
| Frontend LCP | < 2500ms | Lighthouse |
| Error rate (5xx) | < 0.5% | CloudWatch |
| Financial discrepancies | 0 | Audit scripts |

---

*End of Audit Document*
