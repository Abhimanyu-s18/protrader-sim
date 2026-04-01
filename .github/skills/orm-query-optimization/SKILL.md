---
name: orm-query-optimization
description: "Use when: optimizing slow Prisma queries, debugging N+1 query problems, designing efficient select/include patterns, leveraging Postgres indexes, or improving database performance. Ensures queries execute in <100ms with minimal database load. Primary agents: Coding, Architecture, Performance."
---

# ORM Query Optimization — ProTraderSim

Master **Prisma + PostgreSQL** query design for <100ms response times. Eliminate N+1 problems, optimize selects, and leverage indexes.

---

## 🔍 Identifying Slow Queries

### Check Query Logs

```typescript
// Enable Prisma query logging in code
// apps/api/src/lib/prisma.ts
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    'warn',
    'error',
  ],
})

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    console.warn(`[SLOW QUERY ${e.duration}ms] ${e.query}`)
  }
})
```

---

## ❌ Problem: N+1 Queries

### Slow: Fetches 1 position, then N traders afterward

```typescript
// BAD: N+1 query problem
async function getPositionsWithTraderEmails(limit: number = 10) {
  const positions = await db.trade.findMany({
    take: limit,
    select: {
      id: true,
      symbol: true,
      units: true,
      user_id: true,  // Include user_id to reference it
    }
  })

  // This loop triggers N additional queries (one per position)
  const result = await Promise.all(
    positions.map(async (pos) => {
      const user = await db.user.findUnique({  // ❌ Query inside loop!
        where: { id: pos.user_id }
      })
      return { ...pos, trader_email: user.email }
    })
  )

  return result
}

// Result: 1 query + 10 queries = 11 total
// Time: ~50ms (first query) + 10×5ms (dependent queries) = ~100ms+
```

### ✅ Solution: Include Relations

```typescript
// GOOD: Single query with JOIN
async function getPositionsWithTraderEmails(limit: number = 10) {
  const positions = await db.trade.findMany({
    take: limit,
    select: {
      id: true,
      symbol: true,
      units: true,
      user: {  // ✅ Include relation (JOIN in SQL)
        select: {
          email: true
        }
      }
    }
  })

  return positions
  // map result: positions.map(p => ({ ...p, trader_email: p.user.email }))
}

// Result: 1 query (with JOIN)
// Time: ~5ms
```

---

## 🎯 Query Patterns

### Pattern 1: Select Specific Columns (Not *)

```typescript
// BAD: Fetches entire user (100+ columns potentially)
const user = await db.user.findUnique({
  where: { id: userId }
})

// GOOD: Select only what you need
const user = await db.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    kyc_status: true
    // Don't select balance - compute from ledger instead
  }
})
```

### Pattern 2: Include Relations (JOINs)

```typescript
// Fetch position with user + instrument in one query
const position = await db.trade.findUnique({
  where: { id: positionId },
  include: {
    user: {
      select: { id: true, email: true }  // Include sub-select
    },
    instrument: {
      select: { id: true, symbol: true, contract_size: true }
    }
  }
})
```

### Pattern 3: Pagination with Cursor

```typescript
// Get next 50 positions after positionId 123 (filter by open status)
const positions = await db.trade.findMany({
  skip: 1,  // Skip cursor itself
  take: 50,  // Next 50
  cursor: { id: '123' },
  where: {
    status: 'OPEN'  // or use: closed_at: null (both are valid, prefer status when it's an enum)
  },
  select: {
    id: true,
    symbol: true,
    created_at: true
  },
  orderBy: {
    created_at: 'desc'  // Sort by creation time
  }
})

// Response includes cursor for next batch
return {
  data: positions,
  next_cursor: positions[positions.length - 1]?.id
}
```

### Pattern 4: Batch Queries

```typescript
// BAD: Multiple separate queries
const user1 = await db.user.findUnique({ where: { id: id1 } })
const user2 = await db.user.findUnique({ where: { id: id2 } })
const user3 = await db.user.findUnique({ where: { id: id3 } })

// GOOD: Single query with WHERE IN
const users = await db.user.findMany({
  where: {
    id: {
      in: [id1, id2, id3]  // WHERE id IN (...)
    }
  },
  select: { id: true, email: true }
})
```

---

## 📊 Efficient Account Metrics Query

### The Challenge

Compute account metrics (balance, equity, margin, P&L) — values that depend on multiple tables:

```
Balance = SUM(ledger_transactions.amount_cents WHERE user_id = ?)
Margin = SUM(trades.margin_used_cents WHERE user_id = ? AND status = OPEN)
Equity = Balance + UnrealizedPnl
```

### Naive Approach (3 queries)

```typescript
// BAD: Separate queries
async function getAccountMetrics(userId: string) {
  const balance = await db.ledgerTransaction.aggregate({
    where: { user_id: userId },
    _sum: { amount_cents: true }
  })

  const margins = await db.trade.findMany({
    where: { user_id: userId, status: 'OPEN' },
    select: { margin_used_cents: true }
  })

  const pnlPositions = await db.trade.findMany({
    where: { user_id: userId, status: 'OPEN' },
    // ... fetch all open trades to calculate P&L
  })

  return computeMetrics(balance, margins, pnlPositions)
}
// Time: ~30ms (aggregation) + ~15ms (positions) + ~15ms (pnl calc) = ~60ms
```

### Efficient Approach (Aggregate + Single Query)

```typescript
// ✅ GOOD: Leverage Prisma aggregates + select
async function getAccountMetrics(userId: string) {
  // Balance from ledger
  const { _sum: balanceSum } = await db.ledgerTransaction.aggregate({
    where: { user_id: userId },
    _sum: { amount_cents: true }
  })
  const balance_cents = balanceSum.amount_cents ?? 0n

  // All open positions (with margin + symbols for price lookup)
  const openPositions = await db.trade.findMany({
    where: { user_id: userId, status: 'OPEN' },
    select: {
      id: true,
      symbol: true,
      direction: true,
      units: true,
      open_rate_scaled: true,
      margin_used_cents: true,
      instrument: {
        select: { contract_size: true }
      }
    }
  })

  // Total margin used
  const used_margin_cents = openPositions.reduce(
    (sum, p) => sum + p.margin_used_cents,
    0n
  )

  // Calculate unrealized P&L (client-side with fresh prices)
  // NOTE: P&L must use latest prices from Redis
  const prices: Record<string, any> = {}
  const priceKeys = await redis.keys('prices:*')
  if (priceKeys.length > 0) {
    const priceValues = await redis.mget(...priceKeys)
    priceKeys.forEach((key, idx) => {
      if (priceValues[idx]) {
        const symbol = key.replace('prices:', '')
        prices[symbol] = JSON.parse(priceValues[idx])
      }
    })
  }
  let unrealized_pnl_cents = 0n

  for (const pos of openPositions) {
    const price = prices[pos.symbol]
    if (!price) continue

    const rateDiff = pos.direction === 'BUY'
      ? price.bid - pos.open_rate_scaled
      : pos.open_rate_scaled - price.ask

    const posPnl = (rateDiff * pos.units * BigInt(pos.instrument.contract_size) * 100n) / 100000n
    unrealized_pnl_cents += posPnl
  }

  const equity_cents = balance_cents + unrealized_pnl_cents
  const available_cents = equity_cents - used_margin_cents

  const margin_level_bps = used_margin_cents > 0n
    ? (equity_cents * 10000n) / used_margin_cents
    : null

  return {
    balance_cents,
    unrealized_pnl_cents,
    equity_cents,
    used_margin_cents,
    available_cents,
    margin_level_bps
  }
}
// Time: ~5ms (aggregate) + ~10ms (positions + instrument select) = ~15ms
```

---

## 🗂️ Index Strategy

### Analyze Missing Indexes

```sql
-- Find slow queries without indexes
EXPLAIN ANALYZE
SELECT id, symbol, status FROM trades
WHERE user_id = 'user_123' AND status = 'OPEN';
-- Output: Seq Scan on trades (if slow, add index)
```

### Create Indexes

```prisma
// prisma/schema.prisma

model Trade {
  id         String   @id @default(cuid())
  user_id    String
  symbol     String
  status     TradeStatus
  closed_at  DateTime?
  
  user       User     @relation(fields: [user_id], references: [id])

  // Single-column indexes (low cardinality)
  @@index([user_id])                      // Many queries filter by user
  @@index([symbol])                        // Many queries filter by symbol
  @@index([status])                        // Many queries filter by status

  // Composite indexes (high-value queries)
  @@index([user_id, status])               // SELECT * WHERE user_id = ? AND status = ?
  @@index([user_id, closed_at])            // SELECT * WHERE user_id = ? AND closed_at = NULL
  @@index([symbol, closed_at])             // SELECT * WHERE symbol = ? AND closed_at = NULL
}
```

### Index Checklist

```typescript
// Good indexes (should have):
✅ user_id (all user-specific queries)
✅ (user_id, status) (open positions)
✅ (user_id, closed_at) (position lifecycle)
✅ symbol (price lookups)
✅ (symbol, closed_at) (open positions per symbol)
✅ created_at DESC (ordered lists)

// Bad indexes (avoid):
❌ Standalone indexes on low-cardinality columns (e.g., @@index([status]) alone) — these benefit little from a dedicated index, but including them as trailing columns in composite indexes is useful when paired with a highly selective leading column (e.g., @@index([user_id, status]))
❌ Compound indexes with >3 columns (diminishing returns)
```

---

## 🚀 Real-World Example: Dashboard Route

### Slow Implementation (~500ms)

```typescript
// GET /api/dashboard
export async function getDashboard(userId: string) {
  // 1. Fetch user (5ms)
  const user = await db.user.findUnique({
    where: { id: userId }
  })

  // 2. Fetch all trades (50+ positions = 50ms with N+1)
  const trades = await db.trade.findMany({
    where: { user_id: userId }
  })

  // 3. Fetch instruments for each trade (50 queries = 250ms)
  const tradesWithInstruments = await Promise.all(
    trades.map(async (t) => {
      const instrument = await db.instrument.findUnique({
        where: { id: t.instrument_id }
      })
      return { ...t, instrument }
    })
  )

  // 4. Fetch all prices from Redis
  const pricesKeys = await redis.keys('prices:*')
  const prices: Record<string, any> = {}
  
  if (pricesKeys.length > 0) {
    const priceValues = await redis.mget(...pricesKeys)
    pricesKeys.forEach((key, idx) => {
      if (priceValues[idx]) {
        const symbol = key.replace('prices:', '')
        prices[symbol] = JSON.parse(priceValues[idx])
      }
    })
  }

  // Total: 5 + 50 + 250 + 100 = ~405ms
  return aggregateDashboard(user, tradesWithInstruments, prices)
}
```

### Fast Implementation (~40ms)

```typescript
// GET /api/dashboard
export async function getDashboard(userId: string) {
  // Combined query: user + metrics + open trades
  const [user, openTrades, metrics] = await Promise.all([
    // 1. User (5ms)
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        kyc_status: true,
        created_at: true
      }
    }),

    // 2. Open trades + instrument (1 query, 15ms)
    db.trade.findMany({
      where: { user_id: userId, status: 'OPEN' },
      select: {
        id: true,
        symbol: true,
        direction: true,
        units: true,
        open_rate_scaled: true,
        margin_used_cents: true,
        instrument: {
          select: { contract_size: true }
        }
      }
    }),

    // 3. Metrics aggregates (10ms)
    calculateMetrics(userId)
  ])

  // 4. Fetch prices in parallel (10ms)
  const prices = await redis.get('prices:latest')

  // Total: 5 + 15 + 10 + 10 = ~40ms
  return {
    user,
    open_trades: openTrades,
    metrics,
    prices
  }
}
```

---

## ✅ Query Optimization Checklist

- [ ] **Identify Slow Queries**: Enable DEBUG logs, find >100ms
- [ ] **Eliminate N+1**: Use `include` or batch queries
- [ ] **Select Specific Columns**: Don't fetch entire rows
- [ ] **Leverage Indexes**: Create composite indexes for common filters
- [ ] **Batch Related Data**: Fetch user + trades together, not separately
- [ ] **Cache Aggregates**: Store computed metrics with 30s TTL in Redis
- [ ] **Pagination**: Use cursor-based pagination, not offset
- [ ] **Limit Result Sets**: `take(100)` not `take(10000)`

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Fetch entire user object | Use select to pick columns |
| Loop with query inside | Batch with WHERE...IN |
| No indexes on foreign keys | Always index user_id, symbol |
| Fetch all trades, filter in code | Use WHERE clause in DB |
| Calculate P&L with stored value | Fetch positions, calc client-side |
| No pagination | Use cursor-based pagination |
| Multiple separate queries | Combine with include |

---

## 📚 Related Skills

- `financial-calculations` — P&L formulas for query results
- `api-route-creation` — API endpoints using optimized queries
- `database-schema-design` — Index strategy at schema design time
