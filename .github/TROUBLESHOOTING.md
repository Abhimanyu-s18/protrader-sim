---
name: Troubleshooting Guide
description: Common errors, diagnosis steps, and fixes for ProTraderSim development
---

# Troubleshooting Guide

**Common issues, diagnosis, and fixes for ProTraderSim development.**

---

## Table of Contents

1. [Environment & Setup](#env-setup)
2. [Database Issues](#database)
3. [API Errors](#api-errors)
4. [Financial Calculation Errors](#calc-errors)
5. [Socket.io & Real-Time Issues](#socket-io)
6. [Frontend Issues](#frontend)
7. [Authentication & RBAC](#auth-rbac)
8. [Payment & Deposit Issues](#payment)
9. [Deployment & Production](#deployment)
10. [Getting Help](#getting-help)

---

## Environment & Setup {#env-setup}

### `pnpm install` hangs or fails

**Diagnosis**:
```bash
npm_config_build_from_source=true pnpm install --verbose
# Look for which package is failing
```

**Common causes**:
- Old lock file conflicts
- Node version mismatch

**Fix**:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

Or check Node version:
```bash
node --version  # Should be 18.x or 20.x
pnpm --version  # Should be 8.x or 9.x
```

---

### Docker containers won't start

**Diagnosis**:
```bash
docker compose ps               # Check status
docker compose logs postgres    # Check postgres logs
docker compose logs redis       # Check redis logs
```

**Common causes**:
- Port conflict (5432, 6379 in use)
- Disk space full
- Old containers not cleaned up

**Fix**:
```bash
# Clean up completely
docker compose down -v          # Remove volumes
docker compose up -d            # Restart fresh

# Or free up ports
lsof -i :5432                   # See what's using postgres port
kill -9 <PID>
```

---

### `DATABASE_URL` connection errors

**Symptom**: Can't connect to database
```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Check**:
```bash
# Verify postgres is running
docker ps | grep postgres       # Should see postgres container

# Verify DATABASE_URL in .env
cat apps/api/.env.local | grep DATABASE_URL

# Test connection
psql postgresql://protrader:protrader_local_dev@localhost:5432/protrader_dev
```

**Fix**:
```bash
docker compose up -d postgres   # Start postgres
pnpm db:migrate                 # Apply schema
```

---

## Database Issues {#database}

### Migration fails

**Symptom**:
```
Error: P1025 schema creation failed (migration: 20240101000000_add_trades)
```

**Diagnosis**:
```bash
# Check migration files
ls packages/db/prisma/migrations/

# Check which migrations are applied
pnpm db:migrate status

# Read the failed migration
cat packages/db/prisma/migrations/20240101000000_add_trades/migration.sql
```

**Common causes**:
- SQL syntax error in migration
- Table already exists
- Foreign key constraint conflict
- Missing index

**Fix**:
```bash
# If migration is broken, reset database
pnpm db:migrate reset           # ⚠️ Deletes all data
pnpm db:seed                    # Reload sample data

# Or manually fix and retry
pnpm db:migrate deploy
```

---

### Prisma client out of sync

**Symptom**:
```
Property 'trades' does not exist on type 'PrismaClient'
```

**Diagnosis**:
```bash
# Check if client is generated
ls packages/db/node_modules/@prisma/client
```

**Fix**:
```bash
pnpm db:generate                # Regenerate Prisma client
```

---

### N+1 Query Problem (Slow Endpoint)

**Symptom**: GET /api/positions returns in 800ms (target: 100ms)

**Diagnosis**:
```bash
# Enable Prisma query logging
export PRISMA_CLIENT_QUERY_LOGGING=true

# Check logs for sequential queries
pnpm --filter @protrader/api dev 2>&1 | grep "prisma:"
```

**Pattern**: 50 queries instead of 2-3 suggests N+1 problem.

**Root cause**: Not using `.include()` to batch-load data.

```typescript
// ❌ WRONG: N+1 query
const trades = await prisma.trade.findMany({ where: { user_id: userId } })
for (const trade of trades) {
  const instrument = await prisma.instrument.findUnique({ where: { id: trade.instrument_id } })
  // executes loop 50 times (50 queries)
}

// ✅ CORRECT: Batch-load with include
const trades = await prisma.trade.findMany({
  where: { user_id: userId },
  include: { instrument: true },  // 1 query, 50 rows
})
```

**Fix**:
- Read [orm-query-optimization SKILL](.github/skills/orm-query-optimization/SKILL.md)
- Update Prisma query to use `.include()` or `.select()`
- Add index on common filter columns: `CREATE INDEX idx_trades_user_status ON trades(user_id, status)`

**Invoke**: Performance Agent for full optimization.

---

### Foreign Key Violation on Delete

**Symptom**:
```
Error: Foreign key constraint failed on the field: 'trades.instrument_id'
```

**Cause**: Trying to delete an instrument that has open trades.

**Fix**:
```typescript
// Check before deleting
const tradesWithInstrument = await prisma.trade.count({
  where: { instrument_id: instrumentId }
})

if (tradesWithInstrument > 0) {
  throw new ApiError(400, 'Cannot delete instrument with open trades')
}

// OR: Use cascading delete in schema
model Instrument {
  trades Trade[] @relation(onDelete: Cascade)
}
```

---

## API Errors {#api-errors}

### 500: "Cannot read properties of null"

**Symptom**:
```
TypeError: Cannot read properties of null (reading 'balance')
at getTradingStats (positions.service.ts:42)
```

**Diagnosis**:
1. Read the error stack trace — identifies exact file/line
2. Check that file at line 42
3. Look for `.` access on potentially null value

**Common causes**:
- User/wallet not found
- Trade/instrument not found
- Middleware didn't set `req.user`

**Fix**:
```typescript
// ❌ WRONG
const balance = wallet.balance  // wallet might be null

// ✅ CORRECT
if (!wallet) throw new ApiError(404, 'Wallet not found')
const balance = wallet.balance

// OR use optional chaining (if null is valid)
const balance = wallet?.balance ?? 0n
```

---

### 401: "Unauthorized"

**Symptom**: Valid JWT token but getting 401.

**Diagnosis**:
```bash
# Check the token
echo $AUTH_TOKEN | cut -d. -f2 | base64 -d | jq  # Decode JWT payload

# Verify JWT algorithm
```

**Common causes**:
- JWT algorithm mismatch (RS256 expected, HS256 provided)
- Token expired
- Wrong secret key
- Missing `Authorization: Bearer <token>` header

**Fix**:
```bash
# Verify auth middleware
cat apps/api/src/middleware/auth.ts

# Check JWT_PUBLIC_KEY is loaded
echo $JWT_PUBLIC_KEY | head -c 50

# Test endpoint with logging
curl -v http://localhost:4000/api/positions \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### 400: "Invalid input"

**Symptom**: Request rejected with validation error.

**Diagnosis**:
```bash
curl -X POST http://localhost:4000/api/trades/open \
  -H "Content-Type: application/json" \
  -d '{ "instrument_id": "invalid" }'
# Response: { "error": "instrument_id must be UUID" }
```

**Check**:
- Request body fields match schema
- Types are correct (string, number, etc.)
- Required fields are present

**Fix**:
```typescript
// Review validation schema
const CreateTradeSchema = z.object({
  instrument_id: z.string().uuid('Invalid instrument ID'),
  direction: z.enum(['BUY', 'SELL']),
  lot_size: z.number().positive('Lot size must be positive'),
})
```

---

### 429: "Too Many Requests"

**Symptom**: API returns 429 after several requests.

**Cause**: Rate limiting triggered.

**ProTraderSim rate limits**:
- **Global**: 100 req/min per IP
- **Auth endpoints**: 10 req/15min per IP (login, register)

**Fix**:
- Wait 1 minute before retrying (global)
- Wait 15 minutes before retrying auth endpoints
- Or adjust `RATE_LIMIT_*` environment variables

---

## Financial Calculation Errors {#calc-errors}

### P&L is off by 1-2 cents

**Symptom**:
```
Expected P&L: 1250.00 cents
Actual P&L: 1250.02 cents
```

**Cause**: BigInt rounding or arithmetic order issue.

**Diagnosis**:
```bash
# Add debug logging
console.log('Price scaled:', priceScaled, 'type:', typeof priceScaled)
console.log('Unit:', units, 'type:', typeof units)
console.log('Before division:', numericValue)
console.log('After division:', numericValue / PRICE_SCALE)
```

**Common issues**:
- Division before multiplication (loses least-significant bits)
- Mixing PRICE_SCALE and BPS_SCALE
- Using `Number()` instead of `BigInt()`

**Fix**: Re-read [financial-calculations SKILL](.github/skills/financial-calculations/SKILL.md)

```typescript
// ❌ WRONG: Division before multiplication
const pnl = (priceScaled * units) / PRICE_SCALE * CENTS  // Precision loss

// ✅ CORRECT: Multiplication then division
const pnl = (priceScaled * units * CENTS) / PRICE_SCALE
```

**Invoke**: Debug Agent for systematic diagnosis.

---

### Margin calculation wrong

**Symptom**:
```
Opened 100,000 unit EUR/USD with leverage 50:1
Expected margin: ~1,870 cents
Actual margin: 18,700 cents (off by 10x)
```

**Cause**: PRICE_SCALE misapplication.

**Formula**:
```
margin = (units × contractSize × priceScaled × CENTS) / (leverage × PRICE_SCALE)
       = (100000 × 100000 × 108500 × 100) / (50 × 100000)
       = 187000000n cents
       = $1,870,000 (if PRICE_SCALE is wrong, becomes $187)
```

**Fix**:
```bash
# Check PRICE_SCALE constant
grep -r "PRICE_SCALE" apps/api/src/lib/calculations.ts

# Should be 100000n (5 decimal places)
const PRICE_SCALE = 100000n
```

---

### Stop-out not triggering

**Symptom**: Margin level drops below 50% but position not auto-closed.

**Diagnosis**:
1. Check margin calculation (see above)
2. Check stop-out job is running

```bash
# Verify BullMQ job queue
docker exec protrader-redis redis-cli LLEN bull:margin-watch:jobs

# Check logs
pnpm --filter @protrader/api dev 2>&1 | grep -E "stop\.out|margin\.call"
```

**Fix**:
- Ensure margin calculation is correct
- Ensure background job `marginWatchJob` is running
- Check `stopOutBps` in instrument settings (should be 5000 = 50%)

---

## Socket.io & Real-Time Issues {#socket-io}

### Prices not updating live

**Symptom**: Position page loads but prices don't change in real-time.

**Diagnosis**:
```bash
# Check Socket.io connection
# Open browser DevTools → Application → Sockets
# Should see "prices:EURUSD" room subscribed

# Check server broadcasting
pnpm --filter @protrader/api dev 2>&1 | grep "emit.*prices"

# Check Redis broker
docker exec protrader-redis redis-cli KEYS "prices:*"
```

**Common causes**:
- Client not subscribed to instrument symbols
- Socket.io handshake failed (JWT expired)
- Price feed not publishing updates

**Fix**:
```javascript
// Frontend: ensure subscription
const { subscribe } = usePriceSubscription(['EURUSD', 'GBPUSD'])
useEffect(() => {
  subscribe(['EURUSD', 'GBPUSD'])  // Call on mount
}, [])
```

```typescript
// Backend: ensure broadcasting
io.to(`prices:EURUSD`).emit('price:update', {
  symbol: 'EURUSD',
  bid_scaled: '108500',
  ask_scaled: '108510',
  ts: Date.now()
})
```

**Invoke**: Frontend Agent + Performance Agent.

---

### Socket.io disconnects frequently

**Symptom**: Chat with users: "I keep getting disconnected"

**Diagnosis**:
```bash
# Check websocket library version
grep "socket.io-client" apps/platform/package.json

# Check transport type
pnpm --filter @protrader/platform dev 2>&1 | grep "socket.*transport"
```

**Common causes**:
- Token expires and client doesn't refresh
- Network latency > timeout threshold
- Too many subscriptions (max 20 per client)

**Fix**:
```typescript
// Implement reconnection strategy
const socket = io(API_URL, {
  auth: {
    token: getAuthToken()  // Refresh before each auth attempt
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
})

// Handle token expiry
socket.on('auth_error', () => {
  // Refresh token, then reconnect
  const newToken = await refreshAuthToken()
  socket.auth.token = newToken
  socket.connect()
})
```

---

### "Max subscriptions reached" error

**Symptom**: Client tries to subscribe to 21+ instruments, gets error.

**Cause**: Rate limiting — max 20 subscriptions per client to prevent abuse.

**Fix**:
```typescript
// Limit watchlist to 20 items
const maxSubscriptions = 20
const symbols = selectedSymbols.slice(0, maxSubscriptions)
subscribe(symbols)

// Notify user if limit exceeded
if (selectedSymbols.length > maxSubscriptions) {
  showNotification(`Max ${maxSubscriptions} instruments. Oldest removed.`)
}
```

---

## Frontend Issues {#frontend}

### Component doesn't update after API response

**Symptom**: User submits form, API responds successfully, but UI doesn't change.

**Diagnosis**:
```bash
# Check React DevTools:
# → Profiler tab
# → Did component re-render after API call?
# → Is state updated?

# Check network tab:
# → Did API return 200?
# → Is response shape correct?
```

**Common causes**:
- State not updated after API call
- React Query cache not invalidated
- Component key changed unexpectedly

**Fix**:
```typescript
// ✅ CORRECT: Invalidate cache after mutation
const { mutate } = useMutation(openPosition, {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['positions'] })  // Trigger refetch
  }
})

// OR: Update state directly
const { data: positions } = useQuery(['positions'], fetchPositions)
const [optimistic, setOptimistic] = useState(positions)

mutate(trade, {
  onSuccess: (result) => {
    setOptimistic([...optimistic, result])  // Instant update
  }
})
```

---

### API data not syncing with Socket.io updates

**Symptom**: Position page shows old price, receives Socket.io price update but doesn't apply it.

**Diagnosis**:
```typescript
// Check if both sources are being merged:
const { data: positions } = useQuery(['positions'], ...)  // Initial data
const { livePrice } = usePriceSubscription(['EURUSD'])    // Real-time updates

// Are they combined?
const displayedPrice = livePrice ?? positions[0].current_price
```

**Fix**:
```typescript
// Merge both sources in component
const positionsWithLivePrices = positions?.map(pos => ({
  ...pos,
  current_price: livePrices[pos.symbol] ?? pos.current_price
}))
```

**Invoke**: Frontend Agent + State Management skill check.

---

### Tailwind styles not applying

**Symptom**: Component has className but styles don't appear.

**Diagnosis**:
```bash
# Check if Tailwind is rebuilding
pnpm --filter @protrader/platform dev --verbose 2>&1 | grep "tailwind"

# Check included paths in tailwind.config.ts
cat packages/config/tailwind.config.ts | grep content
```

**Common causes**:
- Template path not in tailwind.config.ts `content` array
- Build cache not cleared
- Using dynamic class names (not in config at build time)

**Fix**:
```typescript
// tailwind.config.ts — ensure all template paths included
const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/**/*.{js,ts,jsx,tsx}',  // Include shared packages
  ],
}

// Rebuild
rm -rf .next node_modules/.next
pnpm dev
```

---

## Authentication & RBAC {#auth-rbac}

### User can access other user's data

**Symptom**: Trader A sees Trader B's positions when accessing positions API.

**Diagnosis**:
```bash
# Check if query filters by user_id
grep -A 5 "GET /api/positions" apps/api/src/routes/trades.ts

# Should have: where: { user_id: req.user.id }
```

**Common causes**:
- Missing user_id filter in query
- Using global trader ID instead of req.user.id
- Test user data not isolated

**Fix**:
```typescript
// ✅ CORRECT: Always filter by authenticated user
router.get('/', authMiddleware, async (req, res) => {
  const positions = await prisma.trade.findMany({
    where: {
      user_id: req.user.id,    // MUST filter
      status: 'OPEN'
    }
  })
  res.json(positions)
})
```

**Invoke**: Security Agent for full RBAC audit.

---

### Non-admin accessing admin endpoint

**Symptom**: Trader successfully calls PUT /api/admin/users/123/role.

**Diagnosis**:
```bash
# Check role middleware
grep -B 3 "PUT /api/admin" apps/api/src/routes/admin.ts

# Should have: roleMiddleware(['ADMIN'])
```

**Fix**:
```typescript
// ✅ CORRECT: Check role before admin operations
router.put(
  '/users/:id/role',
  authMiddleware,
  roleMiddleware(['ADMIN']),  // Enforces role
  async (req, res) => {
    // Only admins reach here
  }
)
```

---

## Payment & Deposit Issues {#payment}

### Deposit webhook not crediting balance

**Symptom**: NowPayments confirms payment but balance doesn't increase.

**Diagnosis**:
```bash
# Check webhook logs
docker logs protrader-api | grep "webhook" | grep -i deposit

# Check deposit record
pnpm db:studio
# Look in deposits table — status should be 'PAID'
```

**Common causes**:
- Webhook signature verification failing
- Webhook not reaching API (firewall/network)
- Database transaction failing silently

**Fix**:
```typescript
// Verify webhook signature
const isValid = verifyNowPaymentsSignature(req.body, shopIdSecret)
if (!isValid) {
  console.log('Invalid signature')
  return res.status(401).json({ error: 'Invalid signature' })
}

// Idempotency check
const existingDeposit = await prisma.deposit.findUnique({
  where: { nowpayments_order_id: req.body.order_id }
})
if (existingDeposit) {
  return res.json({ success: true })  // Already processed
}

// Credit balance
await prisma.$transaction(async (tx) => {
  await tx.deposit.update({ where: { id }, data: { status: 'PAID' } })
  await tx.ledgerTransaction.create({
    data: { user_id, amount_cents, type: 'DEPOSIT' }
  })
})
```

---

### Withdrawal amount not debited

**Symptom**: Admin approves withdrawal but balance doesn't decrease.

**Cause**: Approval doesn't automatically debit — need to implement debit in service.

**Fix**:
```typescript
async approveWithdrawal(withdrawalId) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } })

  // Debit balance
  await prisma.$transaction(async (tx) => {
    await tx.withdrawal.update({
      where: { id },
      data: { status: 'PROCESSING', approved_at: new Date() }
    })
    
    await tx.ledgerTransaction.create({
      data: {
        user_id: withdrawal.user_id,
        amount_cents: -withdrawal.amount_cents,  // Negative = debit
        type: 'WITHDRAWAL'
      }
    })
  })
}
```

---

## Deployment & Production {#deployment}

### Railway app redeploys after pushing code

**Expected behavior**: New commits to `main` trigger redeploy.

**Check status**:
```bash
# Visit Railway dashboard
# → Select app
# → Deployments tab
# Should show recent deployment with status: "Running" or "Crashed"
```

**If stuck on "Building"**:
```bash
# Check logs
# Check logs
railway logs api

# Check build errors
railway logs --tail -f
```

---

### Production error rate spiking

**Diagnosis**:
```bash
# Check logs
railway logs api --tail -f

# Filter errors
railway logs api 2>&1 | grep -i error | head -20
```

**Common causes**:
- Database connection pooling exhausted
- API key expired (Twelve Data, NowPayments)
- Memory leak causing OOM restarts

**Immediate action**:
1. Identify root cause (check logs)
2. Either fix or rollback recent commit
3. Notify team

```bash
# Rollback to previous commit
git revert <bad-commit>
git push origin main
# Railway auto-redeploys
```

---

### Database performance degrading

**Symptom**: API endpoints slow, >1s latency.

**Diagnosis**:
```bash
# Check active connections
pnpm db:studio
# SQL tab: SELECT * FROM pg_stat_statements
# Look for slow queries

# Check slow query log
docker exec protrader-postgres psql -U protrader protrader_dev \
  -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"
```

**Fix**:
- Add index: `CREATE INDEX idx_trades_user_status ON trades(user_id, status)`
- Optimize query: use `include()` instead of `select()`
- Cache frequently-accessed data in Redis

**Invoke**: Performance Agent.

---

### Out of Memory (OOM) errors

**Symptom**: Process crashes with "FATAL: memory limit exceeded"

**Causes**:
- Socket.io keeping too many connections open
- Memory leak in service (infinite loop, unbounded cache)
- Redis connection not closing

**Fix**:
```typescript
// Add memory monitoring
setInterval(() => {
  const used = process.memoryUsage()
  console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB`)
  
  if (used.heapUsed > 500 * 1024 * 1024) {  // 500MB threshold
    console.warn('Memory high, investigating...')
    // Take heap dump, alert team
  }
}, 60000)
```

---

## Getting Help {#getting-help}

### Ask the Right Agent

| Issue Type | Agent |
|---|---|
| API endpoint broken | Debug Agent → Coding Agent |
| Slow query | Performance Agent |
| Financial calc wrong | Debug Agent → financial-calculations skill |
| Can't log in | Debug Agent → Security Agent |
| Socket.io issues | Frontend Agent + Performance Agent |
| UI not updating | Frontend Agent |
| Production error | Debug Agent first (diagnosis) |

### Debug Agent Workflow

1. **Document the symptom** — exact error, where it occurs, when it started
2. **Invoke Debug Agent**
3. **Provide stack trace** — full error message, not just "500 error"
4. **Provide context** — recent commits, what changed, affected users

### Escalation Path

1. **Debug Agent** — diagnosis
2. **Specialist Agent** (Coding, Frontend, Security, etc.) — fix
3. **Code Review Agent** — final audit
4. **DevOps Agent** — deploy if production

---

## Document Status

| Area | Coverage | Last Updated |
|---|---|---|
| Environment & Setup | 90% | March 2026 |
| Database | 85% | March 2026 |
| API Errors | 80% | March 2026 |
| Financial Calcs | 95% | March 2026 |
| Socket.io | 75% | March 2026 |
| Frontend | 70% | March 2026 |
| Auth & RBAC | 85% | March 2026 |
| Payment | 80% | March 2026 |
| Deployment | 75% | March 2026 |

**Missing coverage** — if you hit an issue not listed, please document it here or tell the team!

---

## Quick Links

- [WORKSPACE_INSTRUCTIONS.md](./WORKSPACE_INSTRUCTIONS.md) — Onboarding
- [COMMON_WORKFLOWS.md](./COMMON_WORKFLOWS.md) — How-to guides
- [AGENTS.md](./AGENTS.md) — Agent registry
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — Quick agent selector
