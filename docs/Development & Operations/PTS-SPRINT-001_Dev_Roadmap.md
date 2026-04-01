# ProTraderSim
## PTS-SPRINT-001 — Development Roadmap, Testing & Notification System
**Version 1.0 | March 2026**

---

## 1. Development Sprint Plan

**Structure:** 13 sprints + 1 infrastructure sprint = 28 weeks total timeline to production-ready MVP.

| Sprint | Focus | Key Deliverables |
|---|---|---|
| 0 | Infrastructure & Environment Strategy | Staging/UAT/production environment separation, CI/CD promotion gates, rollbackable database migration procedures (Prisma rollback runbooks), feature-flagging strategy for gradual rollout and A/B testing |
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
| 12 | Notifications & Launch | Notification system (channels, delivery, templates), alerts, signals, E2E tests (iterative per sprint), security audit (iterative), public landing page, production hardening |
| 13 | Production Hardening | Deployment runbooks, market-data redundancy/backfill plans (alternate vendor, failover), compliance/regulatory milestones (licenses, approvals, owner documentation), monitoring/alerting setup, chaos testing for production launch |

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

### API Server Skeleton (Days 6–7)

21. Express.js app structure in `apps/api/src/`: `index.ts`, `routes/`, `middleware/`, `services/`, `lib/`, `types/`
22. Global middleware: error handler, request logger, CORS, rate limiter, auth
23. Health check endpoint: `GET /health` with database and Redis status checks
24. Request/response wrapper types (`ApiResponse<T>`, `ApiError`)
25. Error handling utility class (`AppError`) with standardized error codes
26. TypeScript strict mode configuration and tsconfig.json

### Database & Persistence (Days 7–8)

27. Prisma client initialization in `packages/db/`: `prisma.ts` setup
28. Database connection module with connection pooling (Supabase)
29. Database health probe: query to verify connection and basic Postgres availability
30. **Minimal Prisma schema scaffold**: Create `packages/db/prisma/schema.prisma` with basic User, Session, and Instrument models to allow `pnpm db:migrate` to run successfully in CI (full 18-table schema deferred to Sprint 2)
31. Seed data framework skeleton: placeholder for instruments and swap rates (actual seed script with 60 instruments deferred to Sprint 2)

### Logging & Observability (Days 8–9)

32. Winston or Pino logger configuration (JSON output, log levels: DEBUG/INFO/WARN/ERROR)
33. Logger integration points: Express middleware, service layer, error handler
34. Log output targets: stdout (dev), file rotation (staging/prod)
35. Structured logging format with timestamp, request ID, user ID tracking
36. Health check for logging system

### Authentication Scaffold (Days 9–10)

37. JWT utilities: `generateToken()`, `verifyToken()` with RS256 algorithm
38. `auth.ts` middleware: extract JWT from Authorization header, verify signature, attach user to request
39. Auth route stubs: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
40. RBAC middleware: role-based access control checks (`requireRole('ADMIN')`, etc.)
41. **Session management: Redis-backed refresh token store** (required for production and multi-instance deployments; in-memory storage allowed only for local development). Configuration: TTL=7days (refresh tokens), eviction_policy=volatile-lru (evict only keys with TTL when memory limit reached; sessions must not be silently lost), persistence=AOF (append-only file for crash recovery), encryption=AES-256 at rest (provided via managed Redis service like AWS ElastiCache with encryption at rest enabled, or filesystem-level encryption like LUKS/dm-crypt for self-managed deployments). Justification: horizontal scalability across multiple API instances, resilience to instance restarts, audit trail support via Redis transactions. **Sprint 0 infrastructure owner**: Deploy Redis 7 with cluster mode disabled (single-node or multi-node via Sentinel) as development baseline; for read scaling across multiple instances, use Redis Sentinel (master-slave replication with automatic failover) — NOT cluster mode (which requires substantial operational overhead and is not needed unless sharding writes across multiple masters). Configure connection pooling on API tier (via client-side pooling library; PgBouncer is for PostgreSQL, not Redis) to optimize connection reuse across API instances. Setup Redis Sentinel for failover (master election <5s), validate 99th percentile latency <50ms and failover recovery <5s. **Migration to production (Sprint 13)**: If remaining single-node Redis, upgrade to Sentinel-managed deployment with 3-node quorum (1 primary, 2 replicas); if write throughput exceeds Sentinel capacity (rare for session stores), consider Redis Cluster mode (requires sharding key strategy and client-side cluster support).

### Secrets & Environment Validation (Days 10)

42. `.env.example` template with all required variables
43. Environment validation at startup: check JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, DATABASE_URL, REDIS_URL presence
44. Zod schema for env var validation (e.g., `NODE_ENV` must be 'development', 'staging', or 'production')
45. Secrets loader: load from environment or AWS Secrets Manager (placeholder for Sprint 13)
46. **Stop-out configuration constants** in environment or config file: `MAX_POSITIONS_PER_STOP_OUT=10`, `CLOSE_DELAY_MS=100`, `LOSS_CAP_PER_EVENT=UNBOUNDED` (set to positive BigInt cents value to enable negative balance protection with cap; set to UNBOUNDED or null to allow losses up to zero balance). Document in `.env.example` with defaults and explanations for each tuning parameter

### Repository & Service Layer Patterns (Days 10)

46. Repository interface pattern: `IUserRepository`, `ITradeRepository` (stubs)
47. Service layer structure: `UserService`, `TradeService` (skeleton with method stubs)
48. Dependency injection setup or direct instantiation pattern for services
49. Example: `UserService` with `create()`, `findById()` method signatures
50. CI integration: update `.github/workflows/ci.yml` to run database migrations and health checks before tests

---

## 3. Testing Strategy

### 3.1 Testing Layers

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit | Jest + ts-jest | All financial calculation functions. Minimum 90% coverage. |
| Integration | Jest + Supertest | All API endpoints. Happy path + all error cases. |
| E2E | Playwright | Critical user journeys per sprint (Auth E2E Sprint 4, Market Data E2E Sprint 5, Trading Engine E2E Sprint 6, etc.). |
| Performance | k6 | 10,000 concurrent users. Price update latency < 500ms. |
| Security | OWASP ZAP + manual pen test + automated unit tests | SQL injection (registration, KYC, deposit endpoints), XSS (user-generated content, error rendering), CSRF (trade, withdrawal operations), rate-limiting (financial endpoints), WebSocket auth (Socket.io rooms and trade subscriptions), brute-force/enumeration (Pool Code validation). Checkpoints after Sprints 3, 6, 9; final audit Sprint 12; additional security review during Sprint 13 (Production Hardening). |
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
- Access token expiry enforced: short-lived tokens (15–30 minutes) with refresh token rotation
- Refresh token flow validates and rotates tokens automatically; UI implements silent refresh before expiry
- KYC_REQUIRED fires on all trading endpoints when kyc_status != 'APPROVED'
- Pool Code validation rejects invalid/missing codes with INVALID_POOL_CODE
- BIGINT precision preserved in all responses (no floating-point leakage)

### 3.4 Decimal Precision Unit Tests

Mandatory tests for all financial calculations. Assert both intermediate arithmetic and final returned values.

| Test Case | Input | Expected Output | Precision Check |
|---|---|---|---|
| Price precision (forex 5dp) | EURUSD bid=1.08505, ask=1.08510 | bid_scaled=108505, ask_scaled=108510 | Verify no rounding error in scale/unscale |
| P&L rounding (nearest cent) | opened=1.08500, closed=1.08543, 10,000 units EURUSD | pnl_cents=4300 | Verify integer division preserves cents, no truncation |
| Margin decimal handling | 10,000 units @ 1.08500, leverage=500 | margin_cents=2170 | Verify BIGINT calc, no float approximation |
| Commission fractional result | $1,000 notional, 0.10% commission | commission_cents=100 | Verify rounding to nearest cent (not truncated) |
| Swap precision (daily rollover) | 10,000 units, swap=-1.5 bps, price=1.08505 | swap_debit_cents=-163 | Verify exact debit calculation: notional = 10,000 × 1.08505 = 10,850.50 USD; swap_amount = 10,850.50 × (-1.5 / 10,000) = -1.627575 USD; swap_cents = -1.627575 × 100 = -162.7575 ≈ -163 cents (rounded to nearest integer) |
| Triple swap (Wed → Thu) | Same as above on Wednesday | swap_debit_cents=-489 | Verify ×3 multiplier applied: -163 × 3 = -489 cents |
| Cascade rounding (multi-step calc) | margin + commission + swap in one trade lifecycle | Balance preserved to cent | Verify no cumulative rounding error across all operations |

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
| Password change | Yes | Yes | Yes | No |
| Successful login from new device/IP | Yes | Yes | Yes | No |
| Failed login attempts (threshold exceeded) | Yes | Yes | Yes | No |
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

### 4.3 Notification Architecture Advanced Features

**User-Level Notification Preferences:**
- Per-notification-type toggle: opt-out and per-channel controls (In-App, Email, SMS, Push) for each Notification Type
- Stored in `user_notification_preferences` table: user_id + notification_type + channel + enabled boolean
- Default preference set: inherit from account settings on registration; user may customize anytime
- UI: Account Settings → Notifications tab → table listing all 22 notification types with 4 channel toggles each

**Rate-Limiting & Coalescing:**
- De-duplicate events: same notification type for same symbol within throttle_window (e.g., 60 seconds)
- Rate limiting per user: max NOTIF_RATE_LIMIT_PER_MIN notifications dispatched per minute (e.g., 10)
- Batch coalescing: similar "Margin call" events for multiple symbols → single batched notification (max BATCH_NOTIF_MAX = 5 events per batch)
- BullMQ worker enforces limits when reading from notification queue

**Failed-Delivery & Retry Policy:**
- Exponential backoff: retry 1 = 5 min, retry 2 = 15 min, retry 3 = 60 min, max_retries = 3
- Channel fallback order (if primary fails): Email → SMS → In-App
- Bounce handling: email bounce (hard/soft) marks email as invalid; SMS carrier rejection disables SMS channel for user
- Max retries exceeded: mark notification as failed, emit internal alert, do not retry further

**Critical-Notification SLAs:**
- **Margin call / Stop-out**: <5 seconds in-app/push, <30 seconds email/SMS (breach triggers internal alert)
- **Deposit/Withdrawal confirmed**: <10 seconds in-app, <60 seconds email/SMS
- **Price alert**: <2 seconds in-app, <15 seconds push
- SLA monitoring: track dispatch time - creation_time for all critical notifications; alert on breach

**Notification History & Retention:**
- All notifications stored in `notifications` table (user_id, type, created_at, status, dispatched_channels, read_at  )
- Retention: keep all records for 12 months; then archive to cold storage (S3 Glacier)
- UI: "Notification Center" page shows user's last 100 notifications with filtering by type/channel/date range and search
- Download: users can download full notification history as CSV for compliance/audit

---

## 5. Complete User Flows

### 5.1 New Trader Full Journey

| Step | Stage | Action & System Response |
|---|---|---|
| 1 | Discovery | Visits www.protrader.com |
| 2 | Registration | Fills form with Pool Code at auth.protrader.com/register |
| 3 | Account Created | **Pool Code Validation**: Validate Pool Code format (case-insensitive alphanumeric, length 6-12, expiry check against staff.pool_codes table). Return error code INVALID_POOL_CODE if invalid/expired. UX: block registration with inline error message "Invalid or expired Pool Code. Please request a new code." with "Request new code" link. If missing: block registration with "Pool Code required" error (decide backend config: IB flag determines mandatory). System: rejects registration, keeps Pool Code field focused, allows retry. On valid code: creates user, generates PT account number + LEAD ID, assigns to IB if provided, sends welcome + verify email. |
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
2. Redis ZSET `margin_watch:EURUSD` → [user_id_1, user_id_2, ...] scored by margin_level (descending)
3. For each user: recalculate unrealized_pnl for all open EURUSD positions
4. Recalculate equity_cents and margin_level_bps
5. IF margin_level_bps <= 10000 (100%): emit `margin:call` to user room, queue email
6. IF margin_level_bps <= 5000 (50%): begin stop-out
7. **Select trade with largest unrealized loss** (tie-breaker: oldest position first, then largest notional)
8. Close trade at current market price; apply max_positions_per_stop_out limit (default: max_positions_per_stop_out=10) and close_delay_ms (default: close_delay_ms=100) between closures
9. INSERT realized P&L to ledger; apply loss_cap_per_event (default: loss_cap_per_event=UNBOUNDED) if negative balance protection is enabled
10. Recalculate margin_level_bps
11. If still <= 5000: repeat with next largest loss (up to max_positions_per_stop_out positions per stop-out event)
12. Continue until margin_level_bps > 5000 or all positions closed (with configurable max_positions_per_stop_out)
13. **Gap/flash-crash handling**: If balance_cents < 0 after liquidations: INSERT negative balance protection adjustment (brings balance to 0); apply loss_cap_per_event cap if configured
14. Emit `margin:stop_out` to user room with position summary and any capped loss amounts
15. Queue stop-out email notification with final balance

---

## 6. Performance SLAs

### Backend Operations

| Operation | Target (P99) |
|---|---|
| Order execution (API receipt → DB commit) | < 100ms |
| Price tick → margin check → broadcast | < 500ms for symbols with <1,000 watchers (low-volume); < 2s for high-volume symbols (≥1,000 watchers) with ZSET optimization. Worker pool scaling: configurable via `BULLMQ_WORKERS` env var. **Capacity math**: For 50,000 concurrent watchers across 60 Forex symbols, assume ~50% active at any moment (~25,000 active watchers total), with average distribution across symbols. At 10 price updates/sec per symbol × 60 symbols = 600 updates/sec. Each update fans out to watchers (~417 watchers/symbol on average) = ~250,000 enqueued jobs/sec total. BullMQ worker throughput: ~600 jobs/sec per worker (1.67ms per job including price update broadcast, accounting for fanout and lock contention). Recommended worker pool: 400 workers (250,000 jobs/sec ÷ 600 jobs/sec/worker ≈ 417 workers; use 400 for conservative estimate with <10% headroom). Adjust `BULLMQ_WORKERS` env var based on actual throughput tests in staging. See Sprint 0 for Redis topology sizing (Sentinel recommended for production; cluster mode avoided for simplicity). |
| P&L recalculation (per user per tick) | < 20ms per user (ZSET-based filtering reduces candidate set; production deployments use Redis Sentinel-managed topology with AOF persistence and master-slave replication; local Docker Compose uses single-instance redis:7-alpine, sufficient for development but not production-grade concurrency). **Redis topology**: Sprint 0 baseline is single-node redis:7 (local dev only). Production (Sprint 13) upgrades to Redis Sentinel with 3-node quorum (1 primary, 2 replicas, automatic failover <5s) with AOF persistence enabled. Cluster mode (Redis Cluster) is not required unless write throughput exceeds Sentinel's single-master capability (expected for session store only in scale-out scenarios ≥100,000 concurrent users). |
| Account metrics computation | < 50ms |
| KYC document upload to R2 | < 3 seconds |
| Rollover job (all open positions) | < 5 minutes for ≤50,000 positions; parallelized across multiple workers for larger volumes with partial-completion fallback policy |

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
