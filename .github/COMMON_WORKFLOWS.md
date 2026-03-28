---
name: Common Workflows
description: Step-by-step guides for typical development tasks in ProTraderSim
---

# Common Workflows

**Step-by-step guides for the most common development tasks on ProTraderSim.**

Pick the workflow that matches your task. Each includes: who to invoke, what to prepare, and checkpoints.

---

## Table of Contents

1. [Add a New API Endpoint](#add-api-endpoint)
2. [Create a New Database Table](#create-db-table)
3. [Fix a Financial Calculation Bug](#fix-calc-bug)
4. [Optimize a Slow Query/Endpoint](#optimize-query)
5. [Build a New Frontend Feature](#build-frontend-feature)
6. [Implement KYC Document Upload](#kyc-upload)
7. [Build a Deposit/Withdrawal Flow](#payment-flow)
8. [Handle a Socket.io Real-Time Feature](#socket-feature)
9. [Debug a Production Error](#debug-production)
10. [Write Comprehensive Tests](#write-tests)

---

## Workflow 1: Add a New API Endpoint {#add-api-endpoint}

**Example**: Traders request a "Get Trading Stats" endpoint (GET /api/stats/trading).

### Who to Invoke
- **Coding Agent** (implementation)
- **Test Agent** (test coverage)
- **Security Agent** (if endpoint touches auth/sensitive data)

### Prerequisites
1. Know which database tables you need to read
2. Know the response shape (what data to return)
3. Know which roles can access it

### Phase 1: Design (5 min)

**Prepare documentation**:
```
Endpoint: GET /api/stats/trading
Role: TRADER
Response fields:
  - positions_open: number
  - positions_closed_today: number
  - total_pnl_today: MoneyString (cents)
  - avg_win_size: PriceString (scaled ×100000)
  - win_rate_percent: number (0-100)
```

### Phase 2: Invoke Coding Agent

**Prompt**:
```
Implement GET /api/stats/trading endpoint.

- Authenticated as TRADER (only return own stats)
- Response shape: { positions_open, positions_closed_today, total_pnl_today, avg_win_size, win_rate_percent }
- positions_open = count of trades where status='OPEN'
- positions_closed_today = count where status='CLOSED' and closed_at >= today 00:00
- total_pnl_today = sum of P&L from today's closed trades (BIGINT cents)
- avg_win_size = average P&L of profitable trades (BIGINT scaled ×100000)
- win_rate_percent = (winning trades / total trades) × 100

Database: trades table, filter by user_id + status

Return as ApiResponse<TradingStatsResponse>
```

### Phase 3: Coding Agent Delivers

Expected outputs:
- ✅ New file or route update: `apps/api/src/routes/stats.ts`
- ✅ New service function: `apps/api/src/services/stats.service.ts` with `getTradingStats(userId: string)`
- ✅ TypeScript types in `packages/types/index.ts`
- ✅ Input validation schema (no params for GET request)

### Phase 4: Invoke Test Agent

**Prompt**:
```
Write comprehensive tests for GET /api/stats/trading

Test cases:
- Happy path: trader with 5 closed trades today (3 profitable, 2 loss), 2 open
- Edge: trader with no trades
- Edge: trader with only open positions (closed_today = 0)
- Edge: non-trader cannot access
- Edge: trader cannot see other trader's stats
- Verify financial accuracy: total_pnl matches sum of trade P&Ls
```

Expected outputs:
- ✅ Test file: `apps/api/src/routes/__tests__/stats.test.ts`
- ✅ Service tests: `apps/api/src/services/__tests__/stats.service.test.ts`
- ✅ Coverage >80%

### Checkpoint ✓

Run locally:
```bash
pnpm --filter @protrader/api test                    # Tests pass
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/stats/trading
# Should return: { status: 'success', data: { positions_open, ... } }
```

---

## Workflow 2: Create a New Database Table {#create-db-table}

**Example**: Add a `user_notes` table so traders can attach notes to positions.

### Who to Invoke
- **Schema Agent** (database design)
- **Coding Agent** (API routes to manage notes)
- **Test Agent** (test coverage)

### Prerequisites
1. Know the entity relationships (user → position → note)
2. Know if data is time-sensitive (audit trail needed?)
3. Know the access model (who can create/read/delete notes?)

### Phase 1: Prepare Schema Design

**Document the requirements**:
```
Table: user_notes
Purpose: Traders add personal notes/memos to trades for later reference

Fields needed:
- id (UUID PK)
- trade_id (FK → trades.id)
- user_id (FK → users.id) [for audit, should match trade.user_id]
- content (text, max 500 chars)
- created_at (timestamp, auto)
- updated_at (timestamp, auto)

Business rules:
- Only the trader who owns the trade can create/edit/delete notes
- Notes are soft-deleted (is_deleted flag? Or hard delete OK?)
- Need indexes on: trade_id, user_id
```

### Phase 2: Invoke Schema Agent

**Prompt**:
```
Add a user_notes table to track personal notes on trades.

Fields:
- id UUID PK
- trade_id FK → trades(id) ON DELETE CASCADE
- user_id FK → users(id) [should match trade.user_id]
- content VARCHAR(500) NOT NULL
- created_at TIMESTAMP DEFAULT now()
- updated_at TIMESTAMP DEFAULT now()
- is_deleted BOOLEAN DEFAULT false (soft delete)

Relationships: one-to-many, user:notes and trade:notes

Indexes need:
- (trade_id) for finding all notes on a trade
- (user_id) for finding all a user's notes
- (is_deleted, created_at DESC) for soft-delete queries

No financial data, so standard decimal OK. CREATED/UPDATED pattern OK.
```

### Phase 3: Schema Agent Delivers

Expected outputs:
- ✅ Updated `packages/db/prisma/schema.prisma` with UserNote model
- ✅ Migration file: `packages/db/prisma/migrations/[timestamp]_add_user_notes/migration.sql`
- ✅ TypeScript type exported from `packages/types/index.ts`

### Phase 4: Run Migration Locally

```bash
pnpm db:migrate                # Apply migration to local DB
pnpm db:generate               # Regenerate Prisma client
pnpm db:studio                 # Verify table in GUI
```

### Phase 5: Invoke Coding Agent for API

**Prompt**:
```
Build CRUD API for user notes:

POST /api/trades/:tradeId/notes
  - Create note on trade
  - Only authenticated trader
  - "Only can note your own trades" check
  - Request: { content: string }

GET /api/trades/:tradeId/notes
  - List all notes on trade (paginated, 10 per page)
  - Return with timestamps, content

PATCH /api/trades/:tradeId/notes/:noteId
  - Edit existing note
  - Only owner can edit

DELETE /api/trades/:tradeId/notes/:noteId
  - Soft-delete note
```

### Checkpoint ✓

```bash
# Test POST
curl -X POST http://localhost:4000/api/trades/uuid-123/notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "content": "Good breakout signal on EUR/USD" }'

# Test GET
curl http://localhost:4000/api/trades/uuid-123/notes

# Test PATCH
curl -X PATCH http://localhost:4000/api/trades/uuid-123/notes/note-uuid \
  -H "Authorization: Bearer <token>" \
  -d '{ "content": "Updated: false signal, closed too early" }'

# Test DELETE
curl -X DELETE http://localhost:4000/api/trades/uuid-123/notes/note-uuid \
  -H "Authorization: Bearer <token>"
```

---

## Workflow 3: Fix a Financial Calculation Bug {#fix-calc-bug}

**Example**: P&L calculations are off by 1-2 cents for large positions.

### Who to Invoke
- **Debug Agent** (diagnose root cause)
- **Test Agent** (write regression tests)
- **Code Review Agent** (final audit)

### Phase 1: Reproduce the Bug

**Document the specifics**:
```
Symptom: When closing a 100,000 unit EUR/USD position at 1.08543, P&L shows 1250.00 cents
Expected: 1250.00 cents
Actual: 1250.02 cents (off by 2 cents)

Details:
- Opening price: 1.08500 (scaled: 108500)
- Closing price: 1.08543 (scaled: 108543)
- Position: 100,000 units
- Contract size: 100,000 (standard for forex)
- Direction: BUY
```

### Phase 2: Invoke Debug Agent

**Prompt**:
```
Diagnose P&L calculation error.

Scenario: 100,000 unit EURUSD buy position
- Opened at: 1.08500 (scaled 108500)
- Closed at: 1.08543 (scaled 108543)
- Expected P&L: 1250.00 cents
- Actual P&L: 1250.02 cents (off by 2 cents)

Check:
1. Formula in apps/api/src/lib/calculations.ts
2. Order of operations (division must be last)
3. BigInt rounding/truncation
4. Whether PRICE_SCALE, contract size, or CENTS scale is wrong

Provide the exact formula used and what's incorrect.
```

### Phase 3: Debug Agent Analyzes

Expected output:
```
Root cause found: Division happens before final CENTS multiplication.

Current (WRONG):
pnl = ((108543 - 108500) * 100000) / 100000 * 100
    = (43 * 100000) / 100000 * 100
    = 43 * 100  [precision loss before final conversion]

Correct:
pnl = ((108543 - 108500) * 100000 * 100) / 100000
    = (43 * 100000 * 100) / 100000
    = 43 * 100 = 4300 cents (then final scale)
```

### Phase 4: Coding Agent Fixes

**Update file**:
```bash
apps/api/src/lib/calculations.ts
```

Usually a one-line fix reordering the division.

### Phase 5: Test Agent Writes Regression Tests

```typescript
describe('calculatePnLForBuy', () => {
  it('should correctly calculate P&L for large position (100K units)', () => {
    const pnl = calculatePnLForBuy(
      100000n,           // units
      108500n,           // openRateScaled
      108543n,           // currentBidScaled
      100000n            // contractSize
    )
    expect(pnl).toBe(4300n)  // 43 pips × 100 cents = 4300 cents
  })
  
  it('should handle fractional pip movements', () => {
    // [similar edge cases]
  })
})
```

### Checkpoint ✓

```bash
pnpm --filter @protrader/api test -- calculations   # Regression test passes
pnpm --filter @protrader/api test -- --watch        # All tests pass
```

---

## Workflow 4: Optimize a Slow Query/Endpoint {#optimize-query}

**Example**: GET /api/positions endpoint returns in 1.2s, target: <200ms.

### Who to Invoke
- **Performance Agent** (profiling + optimization)
- **Code Review Agent** (final review)

### Phase 1: Establish Baseline

**Document current state**:
```
Endpoint: GET /api/positions
Current latency: 1.2s (measured on staging, 100 concurrent traders, 50 open positions each)
Target latency: <200ms
Bottleneck hypothesis: N+1 queries or missing indexes

Number of open positions: 50 per trader
Data needed per position: symbol, entry price, current price, unrealized P&L, margin used
Real-time update: yes, via Socket.io
```

### Phase 2: Invoke Performance Agent

**Prompt**:
```
Optimize GET /api/positions endpoint.

Current: 1.2s, Target: <200ms

Stack:
- Prisma query in apps/api/src/services/positions.service.ts
- Returns trades where status='OPEN' with related instruments + current prices
- Broadcasts via Socket.io per position

Steps:
1. Profile the query (enable Prisma query logging)
2. Run EXPLAIN ANALYZE on PostgreSQL to find missing indexes
3. Detect N+1 patterns (if querying instruments 50 times instead of once)
4. Suggest indexes and query refactoring
5. Measure improvement

Focus on orm-query-optimization patterns.
```

### Phase 3: Performance Agent Delivers

Expected output:
```sql
-- Problem: Missing index on trades(user_id, status)
-- Solution:
CREATE INDEX idx_trades_user_status ON trades(user_id, status='OPEN');

-- Prisma optimization: Use .include() to fetch instruments in one batch
const positions = await prisma.trade.findMany({
  where: { user_id: userId, status: 'OPEN' },
  include: {
    instrument: { select: { id: true, symbol: true, ... } },  // 1 query, not 50
  },
})
```

### Phase 4: Coding Agent Implements

- Updates Prisma query
- Deploys index migration
- Verifies no N+1 queries remain

### Phase 5: Benchmark

```bash
# Before: 1.2s
# After: 180ms ✓
curl -w "Total time: %{time_total}\n" http://localhost:4000/api/positions
```

### Checkpoint ✓

```bash
pnpm --filter @protrader/api test                  # No regression in tests
# Manual load test or use k6/artillery
```

---

## Workflow 5: Build a New Frontend Feature {#build-frontend-feature}

**Example**: Add a "Favorite Instruments" watchlist to the trading dashboard.

### Who to Invoke
- **UI/UX Designer** (interaction flow, wireframe)
- **Frontend Agent** (React/Next.js implementation)
- **Coding Agent** (API endpoints if new)
- **Test Agent** (E2E tests)

### Phase 1: Design & Scope

**What frontend provides**:
- Page/component to display watchlist
- Add/remove buttons
- Real-time price updates via Socket.io

**What backend provides** (may already exist or need building):
- GET /api/watchlist (list user's saved instruments)
- POST /api/watchlist (add instrument)
- DELETE /api/watchlist/:id (remove)

### Phase 2: Invoke UI/UX Designer (Optional but Recommended)

**Prompt**:
```
Design the watchlist panel for the explorer dashboard.

Requirements:
- Show user's saved instruments (5-20 typically)
- Display: symbol, current price, 24h change %, add/remove button
- Live price updates when price feed updates
- Mobile responsive
- Fits in dark mode (Terminal Precision design)
- Quick add button (⭐) for common instruments
```

**Designer delivers**: Wireframe/ASCII mockup, interaction states (empty, loading, error).

### Phase 3: Invoke Frontend Agent

**Prompt**:
```
Build watchlist panel component for platform dashboard.

Component: WatchlistPanel
- Displays: symbol, price (live), change%, remove button
- Subscribe to prices via Socket.io for subscribed symbols (max 20)
- State: symbols, prices (from Socket.io), loading, error
- Styling: Terminal Precision design, dark mode
- Accept optional className prop

Use:
- Zustand for storing watchlist symbols
- Custom useWatchlist hook to manage subscriptions
- React Query for initial data fetch
- Socket.io integration per state-management-trading skill

Endpoint: GET /api/watchlist (assumption: already exists)

Handle states:
- Loading first fetch
- Subscription to live prices
- Unsubscribe on unmount
- Error handling + retry
```

### Phase 4: Frontend Agent Delivers

Expected files:
- ✅ `apps/platform/src/components/WatchlistPanel.tsx` (component)
- ✅ `apps/platform/src/hooks/useWatchlist.ts` (custom hook)
- ✅ `apps/platform/src/stores/watchlistStore.ts` (Zustand store if new)
- ✅ TypeScript types
- ✅ Accessibility: ARIA labels, keyboard nav

### Phase 5: Optional — Coding Agent for API Endpoints

If endpoints don't exist, invoke Coding Agent to build:
- POST /api/watchlist (add)
- DELETE /api/watchlist/:instrumentId (remove)
- GET /api/watchlist (list)

See [Workflow 1: Add a New API Endpoint](#add-api-endpoint).

### Checkpoint ✓

```bash
pnpm --filter @protrader/platform dev            # Start frontend dev server

# Manual testing
# 1. Navigate to watchlist panel
# 2. Add 3 instruments
# 3. Verify symbols appear
# 4. Verify prices update live (open price feed in separate terminal)
# 5. Test remove button
# 6. Refresh page, verify persistence
```

---

## Workflow 6: Implement KYC Document Upload {#kyc-upload}

**Example**: Traders upload passport/proof of address, admin reviews and approves.

### Who to Invoke
- **Architect Agent** (system design if complex)
- **Security Agent** (KYC & file handling)
- **Coding Agent** (API implementation)
- **Frontend Agent** (upload UI)
- **Test Agent** (security tests)

### Prerequisites
- Cloudflare R2 API key + bucket configured
- KYC document types: passport, proof_of_address, others

### Phase 1: System Design

**Invoke Architect** for approval first if this is your first KYC flow. They'll confirm:
- File storage strategy (Cloudflare R2)
- Review workflow (auto-scan or manual?)
- Data retention policy

### Phase 2: Invoke Security Agent

**Prompt**:
```
Design secure KYC document upload flow per kyc-compliance-flow skill.

Flow:
1. Trader uploads document file (PDF, JPG, PNG up to 5MB)
2. File validated (type, size, virus scan?)
3. Upload to Cloudflare R2 with encrypted/hashed path
4. Store metadata in kyc_documents table (file_path, hash, upload_date, status)
5. Admin reviews via admin panel (view document, approve/reject)
6. Email notification to trader on approval/rejection

Requirements:
- PII protection (file path not exposed to trader)
- Immutable audit trail (who approved, when, IP address)
- File validation (prevent exe/malware)
- Rate limiting (prevent spam uploads)
- GDPR right-to-delete (handle soft/hard delete per regulation)

Per kyc-compliance-flow skill: file validation, storage, access control.
```

### Phase 3: Security Agent Delivers

- Validation rules (file type whitelist: ['image/jpeg', 'application/pdf'])
- R2 upload path strategy
- Database schema for kyc_documents table
- Access control checks (only trader sees own docs, only ADMIN sees all)

### Phase 4: Schema Agent (if new table)

Create `kyc_documents` table:
```
- id (UUID PK)
- user_id (FK → users)
- document_type (enum: PASSPORT, PROOF_OF_ADDRESS, ...)
- file_path (string, cloudflare R2 path, encrypted)
- file_hash (string, SHA256 for duplicate detection)
- status (enum: PENDING, APPROVED, REJECTED)
- uploaded_at
- reviewed_at
- reviewed_by_id (FK → staff.id, if approved/rejected)
- rejection_reason (text, optional)
```

### Phase 5: Coding Agent Implements API

**POST /api/kyc/upload**
- Validate file (type, size, hash)
- Upload to R2
- Create kyc_documents record
- Return file_id + status

**PUT /api/kyc/:docId/approve**
- Admin-only endpoint
- Update status → APPROVED
- Send email notification

**PUT /api/kyc/:docId/reject**
- Admin-only endpoint
- Update status → REJECTED + reason
- Send email notification

### Phase 6: Frontend Agent Implements UI

- Upload form component (drag-drop, file picker)
- Document type selector (dropdown)
- File size validator on client
- Upload progress bar
- Error states + retry

### Phase 7: Admin Panel Enhancement

Show:
- Pending documents list
- Document preview (securely)
- Approve/Reject buttons
- Rejection reason text field

### Checkpoint ✓

```bash
# Manual flow test
# 1. Trader uploads passport
# 2. Check database: kyc_documents record created, status=PENDING
# 3. Verify file in Cloudflare R2
# 4. Admin logs in, sees pending document
# 5. Admin approves, trader email received
# 6. Trader can download approved document (if allowed by regulation)
```

---

## Workflow 7: Build a Deposit/Withdrawal Flow {#payment-flow}

**Example**: Traders deposit USDT via NowPayments, admin approves withdrawal requests.

### Who to Invoke
- **Architect Agent** (payment system design)
- **Security Agent** (webhook verification, idempotency)
- **Coding Agent** (API + NowPayments integration)
- **Test Agent** (edge cases, IPN simulation)

### Prerequisites
- NowPayments API credentials configured
- Understand payment states: PENDING → PAID → SETTLED

### Phase 1: System Design

**Invoke Architect** to confirm:
- Deposit flow: trader creates order → NowPayments → IPN webhook → balance credited
- Withdrawal flow: trader requests → admin approves → stablecoin sent → balance debited
- Idempotency: handle duplicate IPN webhooks (same order_id multiple times)

### Phase 2: Invoke Security Agent

**Prompt**:
```
Design secure deposit/withdrawal flow per payment-integration skill.

Deposit flow:
1. POST /api/deposits — trader requests $1000 USDT
2. System creates pending Deposit record
3. Return NowPayments invoice URL
4. Trader scans QR, sends USDT on TRC20/ERC20
5. NowPayments sends IPN webhook with payment proof
6. API verifies webhook signature (NOWPAYMENTS_IPN_SECRET)
7. Update Deposit status → PAID
8. Credit balance via ledger transaction
9. Email notification

Withdrawal flow:
1. POST /api/withdrawals — trader requests $1000 withdrawal + address
2. Create WithdrawalRequest (status=PENDING, amount in BIGINT cents)
3. Deduct from free_margin immediately
4. Admin reviews: POST /api/admin/withdrawals/:id/approve
5. System sends funds to address
6. Update status → PROCESSING
7. When blockchain confirms: status → COMPLETED

Security:
- Webhook signature verification (prevent replay)
- Idempotency: handle duplicate IPN for same order_id
- Amount validation: prevent zero/negative
- Decimal precision: BIGINT cents, never Float
- Audit trail: log all transactions
- Rate limiting: max 5 withdrawals/day per trader

Per payment-integration skill.
```

### Phase 3: Security Agent Delivers

- Webhook signature verification code
- Idempotency key strategy (order_id uniqueness)
- Rate limiting rules
- Amount validation

### Phase 4: Schema Agent

Add tables:
- `deposits` (user_id, amount_cents, status, nowpayments_order_id, txn_hash)
- `withdrawals` (user_id, amount_cents, status, destination_address, approved_by_id)

### Phase 5: Coding Agent Implements

**Backend API**:
- POST /api/deposits — create deposit request
- POST /api/withdrawals — create withdrawal request
- POST /webhooks/nowpayments — IPN handler (verify signature, handle idempotency)
- PUT /api/admin/withdrawals/:id/approve — admin approval
- PUT /api/admin/withdrawals/:id/reject — admin rejection

**Key points**:
- All amounts in BIGINT cents
- Idempotency check in webhook: `if (deposit already exists) return 200 OK`
- Ledger transaction per transfer
- Email notifications via Resend

### Phase 6: Frontend Agent

- Deposit form (amount input, currency selector)
- RightID payment QR code display
- Withdrawal form (amount, address)
- Deposit history table, withdrawal history table
- Status badges (PENDING, PAID, COMPLETED, REJECTED)

### Phase 7: Test Agent

- **Happy path**: deposit $100 → IPN webhook → balance credited
- **Edge**: duplicate IPN webhook for same order_id (idempotency)
- **Edge**: withdrawal amount > available balance (should fail)
- **Edge**: withdrawal address validation (ERC20 checksum)
- **Edge**: webhook with invalid signature (should reject)

### Checkpoint ✓

**Local testing** (with NowPayments sandbox):
```bash
# Simulate deposit IPN webhook
curl -X POST http://localhost:4000/webhooks/nowpayments \
  -H "X-Signature: <valid-signature>" \
  -d '{ "order_id": "uuid", "status": "finished", "amount": "100", ... }'

# Check database: deposit marked PAID, balance updated
# Check ledger_transactions: entry created
```

---

## Workflow 8: Handle Socket.io Real-Time Feature {#socket-feature}

**Example**: Show live position updates as prices change (entry → current price → P&L update).

### Who to Invoke
- **Frontend Agent** (Socket.io client subscription + state management)
- **Coding Agent** (Socket.io server broadcasting)
- **Performance Agent** (scaling for 1000s of traders)

### Prerequisites
- Understand Socket.io rooms: `user:{userId}`, `prices:{symbol}`
- Know JWT-over-Socket.io auth (RS256 token in handshake)

### Phase 1: Backend Setup

**Invoke Coding Agent**:
```
Set up Socket.io price broadcast for positions page.

When a price updates for EUR/USD:
1. Server receives price from Twelve Data (bid, ask, mid)
2. Emit to room `prices:EUR/USD`
3. All traders with open EUR/USD positions receive update
4. Traders calculate live unrealized P&L

Payload format:
{ symbol, bid_scaled, ask_scaled, change_bps, timestamp }

Ensure:
- Max 20 subscriptions per client (prevent abuse)
- Re-auth on disconnect
- Broadcast efficiency (don't send duplicate prices within 100ms)
```

### Phase 2: Frontend Setup

**Invoke Frontend Agent**:
```
Build live position updates using Socket.io.

Component: PositionsTable
- Displays: symbol, entry price, current price, P&L, margin

Real-time behavior:
1. Load initial positions (React Query)
2. Subscribe to prices for all open symbols via Socket.io
3. When price arrives: update live price in UI
4. Calculate live P&L in real-time
5. Unsubscribe on unmount

Hooks:
- usePriceSubscription(symbols) — subscribe to prices, return live prices
- useCalculatePnL(trade, livePrice) — calculate P&L on price change

State:
- Zustand store for current prices
- React Query for position data (refreshed every 30s as fallback)
```

### Phase 3: Stream Data

**Invoke Coding Agent** to ensure:
- Price updates broadcast every 100ms-500ms (not too frequent to overwhelm client)
- Per-symbol fan-out (only traders with open trades subscribe)
- Graceful re-subscription on disconnect

### Phase 4: Test & Performance

**Invoke Performance Agent**:
```
Load test Socket.io with 1000 concurrent traders, 50 positions each, price updates every 200ms.

Target:
- <50ms latency from price received → broadcast to client
- <100MB memory per 1000 connections
- 99% delivery (no dropped price updates)
```

### Checkpoint ✓

```bash
# Manual test
# 1. Open platform, login
# 2. Open positions page, see position list
# 3. Watch prices update live (no page refresh)
# 4. Watch P&L change in real-time
# 5. Close browser = unsubscribe
# 6. Reconnect = re-subscribe automatically
```

---

## Workflow 9: Debug a Production Error {#debug-production}

**Example**: "Production error: GET /api/positions returning 500 with 'Cannot read properties of null (reading balance)'"

### Who to Invoke
- **Debug Agent** (diagnosis first)
- **Coding Agent** (fix)
- **Test Agent** (regression test)
- **Code Review Agent** (post-incident review)

### Phase 1: Gather Context

**Before invoking Debug Agent, document**:
```
Error: TypeError: Cannot read properties of null (reading 'balance')
Endpoint: GET /api/positions
Environment: Production (eu-west-1)
Frequency: 3 incidents in last 2 hours, affects ~15 traders
Time first occurred: 14:32 UTC
Rollback candidate: commit abc123 deployed at 13:45

Stack trace:
  at services/positions.service.ts:42
  at routes/positions.ts:15
```

### Phase 2: Invoke Debug Agent

**Prompt**:
```
Diagnose production error on GET /api/positions:

TypeError: Cannot read properties of null (reading 'balance')
Stack: services/positions.service.ts:42

Hypothesis: 
- Service assumes wallet exists but user might not have been initialized
- OR: Recent code change introduced early return without null check

Steps:
1. Read the service code at line 42
2. Trace where 'balance' access happens
3. Find what can be null (wallet? user? ledger?)
4. Check recent commits for this file
5. Propose immediate fix

Urgency: 15 traders affected, need rapid fix + rollback strategy.
```

### Phase 3: Debug Agent Delivers

Expected output:
```
Root cause: Line 42 accesses wallet.balance without null check.

wallet = await prisma.wallet.findUnique(...)
// wallet is null if user deleted or wallet never created
const balance = wallet.balance  // ← ERROR: null.balance

Fix: Add null check before accessing:
if (!wallet) throw new ApiError(404, 'Wallet not found')
const balance = wallet.balance
```

### Phase 4: Coding Agent Implements Hot Fix

One-line fix, merged to main + production branch immediately.

### Phase 5: Deploy & Verify

```bash
git cherry-pick <fix-commit>
git push origin main:production
# Monitor logs: error rate should drop to 0 within 2 min
```

### Phase 6: Test Agent Writes Regression Test

```typescript
describe('GET /api/positions — null wallet edge case', () => {
  it('should return 404 if wallet not found', async () => {
    // Create user without wallet
    const res = await request(app).get('/api/positions')
      .set('Authorization', `Bearer ${token}`)
    
    expect(res.status).toBe(404 | 500)  // Clarify ideal behavior
    expect(res.body.error).toContain('wallet')
  })
})
```

### Checkpoint ✓

```bash
# Verify
pnpm --filter @protrader/api test -- positions.test.ts
# Error rate in production: 0%
```

---

## Workflow 10: Write Comprehensive Tests {#write-tests}

**Example**: Test the trade opening endpoint with all edge cases and financial accuracy.

### Who to Invoke
- **Test Agent** (test design + implementation)

### Prerequisites
- Implementation code is already written
- Know happy path + edge cases

### Prompt

```
Write comprehensive tests for POST /api/trades/open endpoint.

Happy path:
- Trader opens 1.0 lot BUY EUR/USD, leverage 50:1, at bid 1.08500
- Check: trade created, status=OPEN, margin reserved, balance updated

Edge cases (must all pass):
1. Insufficient margin (balance < margin required)
2. Leverage exceeds maximum (100 when max is 100)
3. Lot size too small (< 0.01)
4. Lot size too large (> 100 when max is 100)
5. Invalid instrument (symbol not in database)
6. Non-trader role cannot open (only TRADER role can)
7. Position already exists for this instrument (one OPEN per instrument per trader? or allow multiple?)

Financial accuracy tests:
- margin = (units × contractSize × openRateScaled × CENTS) / (leverage × PRICE_SCALE)
- Verify margin matches expected value ±1 cent
- Verify balance decreases exactly by margin amount
- Verify equity = balance (no P&L yet on fresh trade)

Mocking:
- Use stead for database mocking or use test database
- Instrument prices fixed at test start
```

### Test Agent Delivers

Files:
- ✅ `apps/api/src/routes/__tests__/trades.test.ts` (API endpoint tests)
- ✅ `apps/api/src/services/__tests__/trade.service.test.ts` (unit tests)
- ✅ Snapshot tests for response shape (optional)
- ✅ Coverage >80%

### Checkpoint ✓

```bash
pnpm --filter @protrader/api test -- trades.test.ts --coverage
# Coverage: 85% | Tests: 24 | Passing: 24 ✓
```

---

## When Workflows Overlap

Some tasks involve multiple workflows:

- **Building a feature end-to-end** = Orchestrator coordinates all workflows
- **Refactoring financial logic** = Combine [Fix Calc Bug](#fix-calc-bug) + [Write Tests](#write-tests)
- **Adding payment features** = Combine [Deposit/Withdrawal](#payment-flow) + [Build Frontend](#build-frontend-feature)

Always start with **Orchestrator Agent** if unsure how steps fit together.

---

## Quick Links

- [WORKSPACE_INSTRUCTIONS.md](./WORKSPACE_INSTRUCTIONS.md) — Onboarding & architecture
- [AGENT_SKILLS_INTEGRATION.md](./AGENT_SKILLS_INTEGRATION.md) — How skills load with agents
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Error diagnosis
- [AGENTS.md](./AGENTS.md) — Agent registry
