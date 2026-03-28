# ProTraderSim
## PTS-SPRINT-001 — Development Roadmap, Testing & Notification System
**Version 1.0 | March 2026 | CONFIDENTIAL**

---

## 1. Development Sprint Plan

**Structure:** 12 sprints × 2 weeks = 24 weeks total timeline to production-ready MVP.

| Sprint | Focus | Key Deliverables |
|---|---|---|
| 1 | Foundation | Turborepo setup, pnpm config, shared packages scaffold, Docker Compose, base ESLint/TS config, CI pipeline skeleton |
| 2 | Database | Full Prisma schema (18 tables + 1 computed view), migrations, seed script with 60 instruments + swap rates, test data |
| 3 | Auth API | Register, login, logout, refresh, email verify, forgot/reset password, OAuth Google+Facebook, RBAC middleware |
| 4 | Auth Frontend | auth.protrader.com: login page, register page, change password, email verify, KYC wizard (steps 1–5) |
| 5 | Market Data | Twelve Data WebSocket integration, price pipeline, Redis cache, OHLCV history backfill, instrument API endpoints |
| 6 | Trading Engine | Trade open/close/cancel, margin calc, P&L calc, SL/TP trigger, entry order engine, trailing stop, BullMQ margin monitor |
| 7 | Trader Platform | app.protrader.com: Symbols page, trade panel, TradingView chart, My Trades (5 tabs), Socket.io live updates |
| 8 | Account Pages | My Account: Funds, Profile, Financial Summary, Legal, KYC document upload, change password modal, mobile responsiveness |
| 9 | Financial Ops | NowPayments deposit flow, withdrawal flow, ledger, rollover BullMQ job, inactivity fee job, annual statement PDF |
| 10 | Admin Panel | admin.protrader.com: user management, KYC review queue, deposit/withdrawal approval, lead management, reports |
| 11 | IB Portal | ib.protrader.com: agent dashboard, TL dashboard, commission tracking, trader assignment, network stats |
| 12 | Public Site + Polish | www.protrader.com landing page, alerts, signals, notifications system, E2E tests, security audit, production deploy |

---

## 2. Sprint 1 — Detailed Task Breakdown

### Monorepo Setup (Days 1–2)

1. Initialize Turborepo: `npx create-turbo@latest`
2. Configure pnpm workspaces: `pnpm-workspace.yaml`
3. Create apps: `web`, `auth`, `platform`, `admin`, `ib-portal` (Next.js 15), `api` (Express)
4. Create packages: `ui`, `db`, `config`, `types`, `utils`, `email`
5. Set up shared TypeScript config in `packages/config/tsconfig.base.json`
6. Set up shared ESLint config in `packages/config/eslint.config.js`
7. Set up shared Tailwind config in `packages/config/tailwind.config.js` (with ProTraderSim design tokens)

### Docker Compose Setup (Days 2–3)

8. `docker-compose.yml`: `postgres:16` and `redis:7-alpine` services
9. Environment variables: `.env.local` template for each app
10. Health check endpoints on all services
11. Volume mounts for postgres data persistence
12. `pnpm dev` command starts all services in parallel (Turborepo dev pipeline)

### Shared UI Package (Days 3–4)

13. Install shadcn/ui base components in `packages/ui`
14. Set up design tokens: brand colors (#E8650A orange, #1A2332 dark), asset-class colors, animation tokens
15. Base components: Button, Input, Card, Modal, Table, Badge, Toggle, Spinner
16. Export all from `packages/ui/index.ts`

### CI Pipeline (Days 4–5)

17. `.github/workflows/ci.yml`
18. Jobs (parallel): typecheck (`tsc --noEmit`), lint (`eslint`), test (`jest`)
19. Turborepo remote caching configured
20. Deployment job: push to Railway on `main` branch merge

---

## 3. Testing Strategy

### 3.1 Testing Layers

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit | Jest + ts-jest | All financial calculation functions. Minimum 90% coverage. |
| Integration | Jest + Supertest | All API endpoints. Happy path + all error cases. |
| E2E | Playwright | Critical user journeys: register, KYC, deposit, trade open/close. |
| Performance | k6 | 10,000 concurrent users. Price update latency < 500ms. |
| Security | OWASP ZAP + manual pen test | Before every major release. |
| Financial Audit | Custom scripts | Verify P&L, margin, balance against known expected values. |

### 3.2 Critical Financial Calculation Tests

These tests are mandatory. Any failure blocks deployment.

| Test | Expected Result |
|---|---|
| Margin: BUY 10,000 units EURUSD at 1.08500, leverage 500 | $21.70 margin (2170 cents) |
| P&L BUY: opened 1.08500, closed 1.09000, 10,000 units | +$50.00 (+5000 cents) |
| P&L SELL: opened 1.08500, closed 1.08000, 10,000 units | +$50.00 (+5000 cents) |
| Spread application: mid=1.08500, spread=2 pips | bid=1.08490, ask=1.08510 |
| Margin level: equity=$1,000, used_margin=$500 | 200.00% (20000 bps) |
| Margin call trigger: equity=$500, used_margin=$500 | 100.00% → call fires |
| Stop-out trigger: equity=$250, used_margin=$500 | 50.00% → stop-out fires |
| Rollover: 10,000 units EURUSD, swap=-2bps, rate=1.08500 | Correct debit calculated |
| Wednesday triple: same rollover scenario | Debit × 3 |
| Negative balance protection: equity=-$100 after stop-out | Balance reset to $0 |
| Balance computation: +$1,000 deposit, +$50 trade close, -$200 withdrawal | $850 balance |
| Commission (indices): 1 standard lot, $1/lot per side | $1.00 on open, $1.00 on close |
| Commission (stocks): 1000 shares × $0.02 | $20.00 on open, $20.00 on close |
| Commission (crypto): $1,000 notional × 0.10% | $1.00 on open, $1.00 on close |
| Inactivity fee: account with $15 balance, 90+ days inactive | $15 deducted (not negative) |

### 3.3 API Contract Tests

- Every endpoint returns documented error codes for invalid inputs
- Rate limiting kicks in at exactly the documented threshold
- JWT expiry returns 401 after exactly 15 minutes
- KYC_REQUIRED fires on all trading endpoints when kyc_status != 'APPROVED'
- Pool Code validation rejects invalid/missing codes with INVALID_POOL_CODE
- BIGINT precision preserved in all responses (no floating-point leakage)

---

## 4. Notification System

### 4.1 Notification Architecture

All notifications are created as records in the `notifications` table AND dispatched via appropriate channels. Channels are determined per notification type.

| Notification Type | In-App | Email | SMS | Push |
|---|---|---|---|---|
| Registration confirmation | Yes | Yes | No | No |
| Email verification | No | Yes | No | No |
| KYC status change (any) | Yes | Yes | No | No |
| Deposit confirmed | Yes | Yes | Yes | Yes |
| Deposit rejected | Yes | Yes | No | No |
| Withdrawal processing | Yes | Yes | Yes | No |
| Withdrawal completed | Yes | Yes | Yes | Yes |
| Withdrawal rejected | Yes | Yes | No | No |
| Trade opened | Yes | No | No | No |
| Trade closed (by user) | Yes | No | No | No |
| Stop Loss triggered | Yes | Yes | No | Yes |
| Take Profit triggered | Yes | Yes | No | Yes |
| Trailing Stop triggered | Yes | Yes | No | Yes |
| Margin call warning | Yes | Yes | Yes | Yes |
| Stop-out executed | Yes | Yes | Yes | Yes |
| Price alert triggered | Yes | Yes | No | Yes |
| Password change | Yes | Yes | No | No |
| Inactivity fee warning (7 days) | Yes | Yes | No | No |
| Inactivity fee charged | Yes | Yes | No | No |
| Annual statement ready | Yes | Yes | No | No |

### 4.2 Email Templates (packages/email/)

All templates are React Email components rendered server-side and sent via Resend API.

| File | Template Name | Trigger |
|---|---|---|
| welcome.tsx | Welcome + Verify Email | Registration |
| email-verify.tsx | Email Verification | Standalone re-send |
| kyc-pending.tsx | KYC Under Review | Documents submitted |
| kyc-approved.tsx | KYC Approved — Start Trading | kyc_status → APPROVED |
| kyc-rejected.tsx | KYC Rejected + Re-upload Link | kyc_status → REJECTED |
| kyc-additional.tsx | Additional Documents Requested | kyc_status → ADDITIONAL_REQUIRED |
| deposit-confirmed.tsx | Deposit Credited | Deposit completed |
| deposit-rejected.tsx | Deposit Rejected | Deposit rejected by admin |
| withdrawal-processing.tsx | Withdrawal Accepted | Withdrawal submitted |
| withdrawal-completed.tsx | Payout Sent (with txid) | NowPayments payout confirmed |
| withdrawal-rejected.tsx | Withdrawal Rejected + Reason | Withdrawal rejected by admin |
| margin-call.tsx | Urgent: Margin Call Warning | Margin level ≤ 100% |
| stop-out.tsx | Positions Closed + Summary | Stop-out sequence completed |
| stop-loss-triggered.tsx | Stop Loss Triggered | SL triggered on trade |
| take-profit-triggered.tsx | Take Profit Triggered | TP triggered on trade |
| password-reset.tsx | Password Reset Link (1-hour) | Forgot password |
| password-changed.tsx | Password Changed Confirmation | Password change |
| inactivity-warning.tsx | Inactivity Fee Warning (7 days) | 7 days before first charge |
| inactivity-charged.tsx | Inactivity Fee Charged | Fee applied |
| annual-statement.tsx | Annual Statement Ready + Download Link | pnl-snapshot job annually |

---

## 5. Complete User Flows

### 5.1 New Trader Full Journey

| Step | Stage | Action & System Response |
|---|---|---|
| 1 | Discovery | Visits www.protrader.com |
| 2 | Registration | Fills form with Pool Code at auth.protrader.com/register |
| 3 | Account Created | System: creates user, generates PT account number + LEAD ID, sends welcome + verify email |
| 4 | Email Verify | Clicks link in email → email_verified = true, kyc_level = 1 |
| 5 | KYC Wizard | Completes personal info + address steps |
| 6 | Upload ID | Opens Documents modal → uploads passport or national ID |
| 7 | Upload Address | Uploads utility bill or bank statement dated within 3 months |
| 8 | KYC Pending | kyc_status = 'PENDING'. Admin panel notified. Trader sees "Under Review" |
| 9 | KYC L2 Approved | Agent reviews docs → approves. kyc_status = 'APPROVED', kyc_level = 2. Email sent. |
| 10 | First Deposit | Clicks Deposit → selects USDT → gets NowPayments invoice |
| 11 | Deposit Confirmed | NowPayments webhook fires → ledger credited → Socket.io event to platform |
| 12 | Trading Enabled | Symbols page → selects EURUSD → Trade panel → BUY market order |
| 13 | Trade Open | Server validates margin → inserts trade → Socket.io: trade:opened |
| 14 | Live P&L | Price ticks → unrealized_pnl updated → trade:pnl_update events |
| 15 | Close Trade | Trader clicks Close → POST /v1/trades/:id/close → P&L settled to ledger |

### 5.2 Margin Call & Stop-Out Flow

1. Price tick for EURUSD: new bid = 105000 (1.05000)
2. Redis SMEMBERS `margin_watch:EURUSD` → [user_id_1, user_id_2, ...]
3. For each user: recalculate unrealized_pnl for all open EURUSD positions
4. Recalculate equity_cents and margin_level_bps
5. IF margin_level_bps <= 10000 (100%): emit `margin:call` to user room, queue email
6. IF margin_level_bps <= 5000 (50%): begin stop-out
7. Select trade with largest unrealized loss
8. Close trade at current market price
9. INSERT realized P&L to ledger
10. Recalculate margin_level_bps
11. If still <= 5000: repeat with next largest loss
12. Continue until margin_level_bps > 5000 or all positions closed
13. If balance_cents < 0: INSERT negative balance protection adjustment (brings to 0)
14. Emit `margin:stop_out` to user room with position summary
15. Queue stop-out email notification

---

## 6. Performance SLAs

### Backend Operations

| Operation | Target (P99) |
|---|---|
| Order execution (API receipt → DB commit) | < 100ms |
| Price tick → margin check → broadcast | < 50ms |
| P&L recalculation (per user per tick) | < 20ms |
| Account metrics computation | < 50ms |
| KYC document upload to R2 | < 3 seconds |
| Rollover job (all open positions) | < 5 minutes at 22:00 UTC |

### Frontend Core Web Vitals

| Metric | Good | Warning | Critical (blocks deploy) |
|---|---|---|---|
| First Contentful Paint (FCP) | < 1800ms | 1800–3000ms | > 3000ms |
| Largest Contentful Paint (LCP) | < 2500ms | 2500–4000ms | > 4000ms |
| First Input Delay (FID) | < 100ms | 100–300ms | > 300ms |
| Cumulative Layout Shift (CLS) | < 0.10 | 0.10–0.25 | > 0.25 |
| Chart initial render | < 500ms | 500–1000ms | > 1000ms |
| WebSocket latency (end-to-end) | < 50ms | 50–150ms | > 150ms |
| Order execution (UI to confirmation) | < 200ms | 200–500ms | > 500ms |
| Error rate (5xx / total requests) | < 0.5% | 0.5–1% | > 1% |

---

*ProTraderSim — PTS-SPRINT-001 — Development Roadmap, Testing & Notification System — v1.0 — March 2026*
