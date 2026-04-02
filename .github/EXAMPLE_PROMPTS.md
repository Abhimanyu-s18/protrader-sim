---
name: 'Example Prompts for ProTraderSim Agent Framework'
description: 'Ready-to-use prompts demonstrating how to effectively use the 14-agent framework with domain skills.'
---

# Example Prompts — ProTraderSim Agent Framework

These prompts demonstrate how to get the best results from the AI agent ecosystem.

---

## 🎯 Using the Orchestrator Agent

The Orchestrator is your entry point for complex tasks. It decomposes work and delegates to specialists.

### Example 1: Build a New Feature End-to-End

```
Build a trailing stop loss feature for ProTraderSim.

Requirements:
- Traders can set a trailing stop distance (in pips) when opening a position
- The trailing stop follows favorable price movement
- When price reverses by the trailing distance, the position closes automatically
- A BullMQ worker checks trailing stops every 5 seconds
- Real-time updates sent to trader via Socket.io when trailing stop triggers

Acceptance criteria:
1. POST /api/trades/open accepts optional trailingStopPips parameter
2. Trailing stop price updates as price moves favorably
3. Position auto-closes when trailing stop is hit
4. Trader receives Socket.io notification on close
5. Admin can view trailing stop history in admin panel

Constraints:
- Must use BigInt for all price calculations
- Must work with existing margin call system
- Must be backward compatible with existing trades
```

**What happens**: Orchestrator decomposes this into:

- Research Agent → Trailing stop best practices
- Architect Agent → Schema design + API contract
- Schema Agent → Database migration for trailing stop fields
- Coding Agent → API endpoints + service logic
- Frontend Agent → UI components for trailing stop input
- Test Agent → Unit + integration tests
- Documentation Agent → API documentation

---

### Example 2: Fix a Production Bug

```
Traders are reporting that their P&L calculations are off by a factor of 100
for JPY pairs (USD/JPY, EUR/JPY). The issue started after the last deployment.

Affected pairs: USDJPY, EURJPY, GBPJPY
Working pairs: EURUSD, GBPUSD, AUDUSD

The bug appears in:
- Platform dashboard (real-time P&L display)
- Position history page
- Trade confirmation emails

Please investigate and fix this issue.
```

**What happens**: Orchestrator routes to:

- Debug Agent → Root cause analysis
- Coding Agent → Fix implementation
- Test Agent → Regression tests
- Documentation Agent → Post-mortem

---

## 🛠️ Direct Agent Prompts

When you know exactly which specialist you need, address them directly.

### Schema Agent — Database Design

```
@schema Design a new table for tracking IB (Introducing Broker) performance metrics.

We need to track:
- Total referred traders per IB agent
- Total trading volume from referred traders
- Total commissions earned (daily, weekly, monthly aggregates)
- Conversion rate (registered → funded → active traders)

The table should support:
- Efficient querying by agent ID and date range
- Daily rollup aggregation
- Integration with existing ib_commissions table

Provide the Prisma schema, necessary indexes, and a migration plan.
```

### Coding Agent — API Implementation

```
@coding Implement GET /api/trades/history with pagination and filtering.

Requirements:
- Returns closed trades for authenticated user
- Supports filtering by: instrument, date range, direction, closedBy reason
- Cursor-based pagination (20 items per page)
- Response includes: trade details, P&L, duration, close reason
- Must use BigInt for all financial values
- Must include instrument details in response

Use the existing trading service layer. Add proper error handling and validation.
```

### Frontend Agent — UI Component

```
@frontend Build a real-time position table component for the trading dashboard.

Requirements:
- Displays all open positions with live P&L updates
- Columns: Instrument, Direction, Units, Entry Price, Current Price, P&L, Margin, Close button
- P&L color-coded (green for profit, red for loss)
- Updates via Socket.io price feed
- Clicking "Close" opens confirmation modal
- Responsive design (works on mobile)
- Loading state while fetching initial data
- Empty state when no open positions

Use the existing design system (Terminal Precision) and CVA for variants.
Integrate with useOpenPositions React Query hook and usePriceUpdates Socket hook.
```

### Test Agent — Test Coverage

```
@test Write comprehensive tests for the deposit service.

Cover these scenarios:
1. Successful deposit initiation (USDT TRC20, USDT ERC20, ETH)
2. Deposit validation (minimum amount, KYC required, valid currency)
3. IPN webhook processing (valid signature, invalid signature, duplicate payment)
4. Idempotency (same payment_id processed twice)
5. Ledger transaction creation on deposit completion
6. Error cases (NowPayments API down, invalid response, timeout)

Include both unit tests (service logic) and integration tests (full flow with database).
Use the testing-financial-features skill for BigInt validation patterns.
```

### Security Agent — Audit

```
@security Review the KYC document upload flow for security vulnerabilities.

The flow is:
1. Trader uploads passport/ID and proof of address
2. Files stored in Cloudflare R2
3. Admin reviews and approves/rejects
4. Trader notified of decision

Check for:
- File upload vulnerabilities (malicious files, size limits, type validation)
- PII exposure in logs or error messages
- Authorization checks (can traders access other users' documents?)
- Secure file deletion on rejection
- Compliance with FSC Mauritius data protection requirements

Provide a security audit report with severity ratings and remediation steps.
```

### Performance Agent — Optimization

```
@performance The GET /api/users/:id/dashboard endpoint is taking 800ms (target: <100ms).

The endpoint returns:
- User profile
- Account balance (computed from ledger)
- Open positions with current P&L
- Recent trade history (last 10)
- Active alerts

Profile this endpoint and identify bottlenecks. Provide specific optimization
recommendations with expected performance improvements.

Current implementation uses Prisma with multiple sequential queries.
```

---

## 📋 Skill-Specific Prompts

### Using financial-calculations Skill

```
Implement the margin calculation for opening a position.

Use the financial-calculations skill formula:
margin = (units × contractSize × openRateScaled × CENTS) / (leverage × PRICE_SCALE)

Where:
- units: number of lots (BigInt)
- contractSize: 100000 for Forex, 1 for stocks (BigInt)
- openRateScaled: price × 100000 (BigInt)
- leverage: 1-500 (BigInt)
- CENTS = 100n
- PRICE_SCALE = 100000n

The function should return margin in cents (BigInt).
Include input validation and edge case handling.
```

### Using bigint-money-handling Skill

```
Implement the deposit amount conversion flow.

User enters: "100.50" (dollars as string)
System stores: 10050n (cents as BigInt)
API returns: "10050" (MoneyString)

Use the bigint-money-handling skill patterns:
- dollarsToCents() for input conversion
- Zod validation for input format
- MoneyString type for API responses
- Ledger transaction creation with correct amount

Include error handling for invalid input formats.
```

### Using socket-io-real-time Skill

```
Implement real-time account metrics updates.

When a trade is opened/closed, the trader's dashboard should update:
- Balance
- Unrealized P&L
- Equity
- Used margin
- Available margin
- Margin level percentage

Use the socket-io-real-time skill patterns:
- emitToUser(io, userId, 'account:metrics', data)
- Room: user:{userId}
- Payload: all values as strings (MoneyString format)
- Frontend subscribes on dashboard mount, unsubscribes on unmount
```

---

## 🔧 Common Workflow Prompts

### Add a New API Endpoint

```
Add POST /api/alerts/create endpoint.

Steps:
1. Define Zod validation schema for request body
2. Create route handler with auth middleware
3. Delegate to alertService.createAlert()
4. Return ApiResponse with created alert
5. Add rate limiting (100 req/min)
6. Write integration tests
7. Update API documentation

The alert should support:
- instrumentId (required)
- price (required, as PriceString)
- direction (required: 'ABOVE' | 'BELOW')
- notificationType (optional: 'EMAIL' | 'PUSH', default: 'EMAIL')
```

### Create a New Database Table

```
Create a new table for tracking user login sessions.

Fields needed:
- id (cuid)
- userId (FK to users)
- deviceInfo (string, optional)
- ipAddress (string)
- lastActiveAt (timestamp)
- createdAt (timestamp)
- revokedAt (timestamp, nullable)

Requirements:
- Index on userId for efficient lookup
- Index on lastActiveAt for cleanup queries
- Cascade delete when user is deleted
- Add Prisma migration
- Update types package if needed
```

### Optimize a Slow Query

```
Optimize the dashboard query that fetches user positions with P&L.

Current issues:
- Takes 500ms for users with 50+ positions
- N+1 query problem fetching instrument data
- Balance computation scans entire ledger table

Optimize to <100ms by:
1. Eliminating N+1 queries with Prisma include
2. Caching balance computation in Redis (TTL 30s)
3. Adding appropriate database indexes
4. Limiting position history returned

Provide the optimized code and explain each change.
```

---

## 💡 Tips for Better Results

1. **Be specific about financial precision**: Always mention BigInt requirements
2. **Reference existing patterns**: "Follow the same pattern as POST /api/trades/open"
3. **Include acceptance criteria**: Define what "done" looks like
4. **Mention relevant skills**: "Use the api-route-creation skill for this endpoint"
5. **Provide context**: Link to related files or existing implementations
6. **Specify the layer**: "This is a service-level change" vs "This is a route-level change"
