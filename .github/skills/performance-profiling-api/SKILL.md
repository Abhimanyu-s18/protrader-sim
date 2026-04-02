---
name: 'performance-profiling-api'
description: 'Use when: profiling API endpoints, identifying performance bottlenecks, optimizing slow queries, measuring response times, or implementing caching strategies. Ensures API endpoints meet <100ms response time targets with proper monitoring. Primary agents: @performance, @debug.'
---

# Skill: API Performance Profiling

**Scope**: Performance profiling, bottleneck identification, and optimization for Express.js API
**Primary Agents**: @performance, @debug
**When to Use**: Slow endpoints, high latency, database bottlenecks, memory leaks, scaling issues

---

## Core Principles

### 1. Performance Targets

| Endpoint Type    | Target P95 | Target P99 | Max    |
| ---------------- | ---------- | ---------- | ------ |
| Simple GET       | 20ms       | 50ms       | 100ms  |
| Complex GET      | 50ms       | 100ms      | 200ms  |
| POST (create)    | 50ms       | 100ms      | 200ms  |
| POST (trade)     | 100ms      | 200ms      | 500ms  |
| Batch operations | 200ms      | 500ms      | 1000ms |

### 2. Measure Before Optimizing

Always profile first:

- Identify the actual bottleneck (DB, CPU, network, I/O)
- Don't optimize based on assumptions
- Use real data from production-like environment

### 3. Optimize in Order of Impact

1. **Database queries** (usually 70-80% of latency)
2. **N+1 query elimination**
3. **Caching** (Redis for repeated reads)
4. **Payload size reduction**
5. **Algorithm optimization**

---

## Profiling Tools

### 1. Built-in Request Timing Middleware

```typescript
// apps/api/src/middleware/performanceLogger.ts
import { Request, Response, NextFunction } from 'express'
import { logger } from '@/lib/logger'

export function performanceLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint()
  const startMs = Date.now()

  // Track DB query count
  let queryCount = 0
  const originalQuery = (req as any).prisma?.$queryRaw
  if ((req as any).prisma) {
    const original = (req as any).prisma
    const handler = {
      get(target: any, prop: string) {
        if (prop === '$queryRaw' || prop === '$executeRaw') {
          queryCount++
        }
        return target[prop]
      },
    }
    ;(req as any).prisma = new Proxy(original, handler)
  }

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000 // ms
    const statusCode = res.statusCode

    // Log slow requests
    if (duration > 100) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration.toFixed(2)}ms`,
        queryCount,
        userId: (req as any).user?.id,
      })
    }

    // Add timing header
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`)
    res.setHeader('X-Query-Count', queryCount.toString())
  })

  next()
}
```

### 2. Prisma Query Logging

```typescript
// Enable in development
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`)
  console.log(`Params: ${e.params}`)
  console.log(`Duration: ${e.duration}ms`)
})
```

### 3. Clinic.js Profiling

```bash
# Install Clinic.js
npm install -g clinic

# Profile with doctor (automatic diagnosis)
clinic doctor -- node apps/api/dist/index.js

# Profile with flame (CPU profiling)
clinic flame -- node apps/api/dist/index.js

# Profile with bubbleprof (async profiling)
clinic bubbleprof -- node apps/api/dist/index.js
```

### 4. Load Testing with k6

```typescript
// apps/api/load-tests/trading.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 50 }, // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 }, // Stay at 100 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    errors: ['rate<0.05'],
  },
}

export default function () {
  const token = getToken()

  // Test GET /api/trades
  const tradesRes = http.get('http://localhost:4000/api/trades', {
    headers: { Authorization: `Bearer ${token}` },
  })

  check(tradesRes, {
    'trades status is 200': (r) => r.status === 200,
    'trades response < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1)

  // Test POST /api/trades/open
  const openRes = http.post(
    'http://localhost:4000/api/trades/open',
    JSON.stringify({
      instrumentId: 'EURUSD',
      direction: 'BUY',
      units: 1,
      leverage: 100,
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  )

  check(openRes, {
    'open position status is 201': (r) => r.status === 201,
    'open position < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1)

  sleep(1)
}
```

---

## Common Bottlenecks & Fixes

### 1. N+1 Query Problem

**Symptom**: 50+ queries for a single endpoint

```typescript
// ❌ WRONG: N+1 query
const trades = await prisma.trade.findMany({
  where: { userId },
})

for (const trade of trades) {
  const instrument = await prisma.instrument.findUnique({
    where: { id: trade.instrumentId },
  })
  // Executes 1 + N queries
}

// ✅ CORRECT: Single query with include
const trades = await prisma.trade.findMany({
  where: { userId },
  include: {
    instrument: true,
  },
})
// Executes 1 query with JOIN
```

### 2. Missing Indexes

**Symptom**: Full table scans on large tables

```typescript
// Check for missing indexes
EXPLAIN ANALYZE SELECT * FROM trades WHERE user_id = 'xxx' AND status = 'OPEN';

// Add composite index
CREATE INDEX idx_trades_user_status ON trades(user_id, status);

// Add index for sorting
CREATE INDEX idx_trades_created_desc ON trades(created_at DESC);
```

### 3. Over-Fetching Data

**Symptom**: Large response payloads, high memory usage

```typescript
// ❌ WRONG: Select all fields
const user = await prisma.user.findUnique({
  where: { id },
})
// Returns passwordHash, createdAt, updatedAt, etc.

// ✅ CORRECT: Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    kycStatus: true,
    accountType: true,
  },
})
```

### 4. Missing Redis Cache

**Symptom**: Repeated identical queries hitting database

```typescript
// ❌ WRONG: Query DB every time
const instrument = await prisma.instrument.findUnique({
  where: { symbol: 'EURUSD' },
})

// ✅ CORRECT: Cache with Redis
async function getInstrument(symbol: string) {
  const cached = await redis.get(`instrument:${symbol}`)
  if (cached) {
    return JSON.parse(cached)
  }

  const instrument = await prisma.instrument.findUnique({
    where: { symbol },
  })

  if (instrument) {
    await redis.setex(
      `instrument:${symbol}`,
      3600, // 1 hour TTL
      JSON.stringify(instrument),
    )
  }

  return instrument
}
```

### 5. Unbounded Pagination

**Symptom**: Endpoint slows down as data grows

```typescript
// ❌ WRONG: No limit, returns all records
const trades = await prisma.trade.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
})

// ✅ CORRECT: Cursor-based pagination
const trades = await prisma.trade.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  take: 20,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
})
```

---

## Optimization Patterns

### 1. Batch Operations

```typescript
// ❌ WRONG: Sequential updates
for (const trade of trades) {
  await prisma.trade.update({
    where: { id: trade.id },
    data: { status: 'CLOSED' },
  })
}

// ✅ CORRECT: Batch update
await prisma.trade.updateMany({
  where: { id: { in: tradeIds } },
  data: { status: 'CLOSED' },
})
```

### 2. Parallel Independent Queries

```typescript
// ❌ WRONG: Sequential independent queries
const user = await prisma.user.findUnique({ where: { id } })
const trades = await prisma.trade.findMany({ where: { userId: id } })
const deposits = await prisma.deposit.findMany({ where: { userId: id } })

// ✅ CORRECT: Parallel queries
const [user, trades, deposits] = await Promise.all([
  prisma.user.findUnique({ where: { id } }),
  prisma.trade.findMany({ where: { userId: id } }),
  prisma.deposit.findMany({ where: { userId: id } }),
])
```

### 3. Computed Fields via Database

```typescript
// ❌ WRONG: Compute balance in application
const transactions = await prisma.ledgerTransaction.findMany({
  where: { userId },
})
const balance = transactions.reduce((sum, t) => sum + t.amountCents, 0)

// ✅ CORRECT: Compute in database
const result = await prisma.ledgerTransaction.aggregate({
  where: { userId },
  _sum: { amountCents: true },
})
const balance = BigInt(result._sum.amountCents ?? 0)
```

### 4. Connection Pool Optimization

```typescript
// Prisma connection pool settings
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Environment variables for pool sizing
// DATABASE_URL=postgresql://...?connection_limit=20&pool_timeout=30
```

---

## Performance Monitoring

### 1. Response Time Tracking

```typescript
// Track response times in Redis for dashboard
res.on('finish', () => {
  const duration = Number(process.hrtime.bigint() - start) / 1_000_000

  // Store in Redis time series
  redis.zadd(
    `metrics:response_times:${req.path}`,
    Date.now(),
    JSON.stringify({ duration, timestamp: Date.now() }),
  )

  // Keep only last 1000 entries
  redis.zremrangebyrank(`metrics:response_times:${req.path}`, 0, -1001)
})
```

### 2. Slow Query Alert

```typescript
// Alert when query exceeds threshold
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    logger.error('Slow database query', {
      query: e.query,
      duration: e.duration,
      params: e.params,
    })

    // Send alert to monitoring system
    sendAlert({
      type: 'SLOW_QUERY',
      query: e.query,
      duration: e.duration,
    })
  }
})
```

---

## Performance Checklist

### Before Deploying

- [ ] All endpoints meet P95 < 100ms target
- [ ] No N+1 queries detected
- [ ] Database indexes exist for filtered/sorted columns
- [ ] Redis caching implemented for repeated reads
- [ ] Pagination implemented for list endpoints
- [ ] Response payloads < 100KB (or paginated)
- [ ] Connection pool properly sized
- [ ] Load testing passed at expected traffic levels

### Monitoring Setup

- [ ] Response time tracking enabled
- [ ] Slow query logging enabled
- [ ] Error rate monitoring
- [ ] Memory usage tracking
- [ ] CPU usage tracking
- [ ] Database connection pool monitoring

---

## Common Mistakes

### ❌ Premature Optimization

```typescript
// WRONG: Optimizing before measuring
// Adding complex caching without knowing if it's needed

// CORRECT: Measure first, then optimize
// 1. Profile endpoint
// 2. Identify bottleneck
// 3. Apply targeted fix
// 4. Measure improvement
```

### ❌ Caching Everything

```typescript
// WRONG: Cache user balance (changes frequently)
await redis.set(`balance:${userId}`, balance)

// CORRECT: Cache static data (instruments, settings)
await redis.set(`instrument:${symbol}`, instrument, 'EX', 3600)
```

### ❌ Ignoring Payload Size

```typescript
// WRONG: Return full trade objects with all relations
const trades = await prisma.trade.findMany({
  include: { instrument: true, user: true, commissions: true },
})

// CORRECT: Return only needed fields
const trades = await prisma.trade.findMany({
  select: {
    id: true,
    symbol: true,
    direction: true,
    pnlCents: true,
    status: true,
  },
})
```

---

## Running Performance Tests

```bash
# Profile with Clinic.js
clinic doctor -- node apps/api/dist/index.js

# Run load test with k6
k6 run apps/api/load-tests/trading.js

# Run load test with custom config
k6 run --vus 100 --duration 2m apps/api/load-tests/trading.js

# Generate HTML report
k6 run --out html=report.html apps/api/load-tests/trading.js
```

---

## References

- [ORM Query Optimization Skill](../orm-query-optimization/SKILL.md)
- [Socket.io Real-Time Skill](../socket-io-real-time/SKILL.md)
- [PTS-ARCH-001](../../../docs/Core%20Technical%20Specifications/PTS-ARCH-001_System_Architecture.md)
