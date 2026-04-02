---
name: 'api-integration-testing'
description: 'Use when: writing integration tests for API endpoints, testing request/response flows, validating authentication and authorization, or testing multi-step API workflows. Ensures endpoints behave correctly with real database and service interactions. Primary agents: @test, @coding.'
---

# Skill: API Integration Testing

**Scope**: Integration tests for Express.js API endpoints with real database interactions
**Primary Agents**: @test, @coding
**When to Use**: Testing API endpoints end-to-end, validating request/response contracts, testing auth flows

---

## Core Principles

### 1. Test Against Real Infrastructure

Integration tests use:

- Real PostgreSQL database (test database)
- Real Redis instance (test namespace)
- Real service layer (no mocking)
- Supertest for HTTP requests

### 2. Isolate Test Data

Each test:

- Creates its own test data in `beforeEach`
- Cleans up in `afterEach`
- Uses unique identifiers to avoid collisions
- Runs in transactions when possible

### 3. Test the Full Request Lifecycle

```
HTTP Request → Middleware (auth, validation) → Route Handler → Service → Database → Response
```

---

## Test Setup

### Jest Configuration

```typescript
// apps/api/jest.integration.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  globalTeardown: '<rootDir>/src/tests/teardown.ts',
  testTimeout: 30000,
}
```

### Test Setup & Teardown

```typescript
// apps/api/src/tests/setup.ts
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { app } from '@/app'
import request from 'supertest'

// Extend expect with custom matchers
expect.extend({
  toBeValidApiResponse(received) {
    const hasData = 'data' in received
    const hasError = 'error' in received
    return {
      pass: hasData || hasError,
      message: () => 'Expected valid ApiResponse with data or error field',
    }
  },
})

beforeAll(async () => {
  // Ensure test database is clean
  await prisma.$executeRawUnsafe('DELETE FROM ledger_transactions')
  await prisma.$executeRawUnsafe('DELETE FROM trades')
  await prisma.$executeRawUnsafe('DELETE FROM users')
})

afterEach(async () => {
  // Clean up after each test
  await prisma.$executeRawUnsafe('DELETE FROM ledger_transactions')
  await prisma.$executeRawUnsafe('DELETE FROM trades')
  await prisma.$executeRawUnsafe('DELETE FROM users')
  await redis.flushdb()
})

export { app, request, prisma, redis }
```

### Test Helpers

```typescript
// apps/api/src/tests/helpers.ts
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function createTestUser(overrides: Partial<any> = {}) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      passwordHash: '$2b$10$hashedpassword...',
      kycStatus: 'APPROVED',
      accountType: 'TRADER',
      ...overrides,
    },
  })
}

export async function createTestStaff(overrides: Partial<any> = {}) {
  return prisma.staff.create({
    data: {
      email: `staff-${Date.now()}@protrader.com`,
      passwordHash: '$2b$10$hashedpassword...',
      role: 'ADMIN',
      ...overrides,
    },
  })
}

export function generateAuthToken(userId: string, role: string = 'TRADER') {
  const privateKey = process.env.JWT_PRIVATE_KEY!
  if (!privateKey) {
    throw new Error('JWT_PRIVATE_KEY environment variable is required for tests')
  }
  return jwt.sign({ sub: userId, role, iat: Math.floor(Date.now() / 1000) }, privateKey, {
    algorithm: 'RS256',
  })
}

export function authHeader(userId: string, role: string = 'TRADER') {
  return {
    Authorization: `Bearer ${generateAuthToken(userId, role)}`,
    'Content-Type': 'application/json',
  }
}
```

---

## Testing Patterns

### 1. Authenticated Endpoint Tests

```typescript
import { describe, it, expect } from '@jest/globals'
import { request, prisma } from '@/tests/setup'
import { createTestUser, authHeader } from '@/tests/helpers'

describe('GET /api/users/me', () => {
  it('should return current user profile', async () => {
    const user = await createTestUser({
      email: 'trader@example.com',
      kycStatus: 'APPROVED',
    })

    const response = await request(app).get('/api/users/me').set(authHeader(user.id))

    expect(response.status).toBe(200)
    expect(response.body).toBeValidApiResponse()
    expect(response.body.data.email).toBe('trader@example.com')
    expect(response.body.data).not.toHaveProperty('passwordHash')
  })

  it('should return 401 without authentication', async () => {
    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(401)
    it('should return 401 with expired token', async () => {
      const privateKey = process.env.JWT_PRIVATE_KEY!
      const expiredToken = jwt.sign(
        {
          sub: 'user-id',
          role: 'TRADER',
          iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        privateKey,
        { algorithm: 'RS256' },
      )

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('TOKEN_EXPIRED')
    })
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('TOKEN_EXPIRED')
  })
})
```

### 2. POST Endpoint with Validation

```typescript
describe('POST /api/trades/open', () => {
  it('should open a new BUY position', async () => {
    const user = await createTestUser({
      balanceCents: 10000000, // $100,000
    })

    const instrument = await prisma.instrument.create({
      data: {
        symbol: 'EURUSD',
        contractSize: 100000,
        currentPrice: 108500,
        maxLeverage: 500,
        isActive: true,
    const response = await request(app).post('/api/trades/open').set(authHeader(user.id)).send({
      instrumentId: instrument.id,
      direction: 'BUY',
      units: 10, // Requires ~$108.50 margin
      leverage: 100,
    })
      units: 1,
      leverage: 100,
    })

    expect(response.status).toBe(201)
    expect(response.body.data.direction).toBe('BUY')
    expect(response.body.data.status).toBe('OPEN')
    expect(response.body.data.units).toBe(1)
    expect(response.body.data.leverage).toBe(100)
  })

  it('should return 422 for invalid request body', async () => {
    const user = await createTestUser()

    const response = await request(app).post('/api/trades/open').set(authHeader(user.id)).send({
      // Missing required fields
      direction: 'INVALID',
      units: -1,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details).toHaveProperty('direction')
    expect(response.body.error.details).toHaveProperty('units')
  })

  it('should return 422 for insufficient margin', async () => {
    const user = await createTestUser({
      balanceCents: 1000, // Only $10
    })

    const instrument = await prisma.instrument.create({
      data: {
        symbol: 'EURUSD',
        contractSize: 100000,
        currentPrice: 108500,
        maxLeverage: 500,
        isActive: true,
      },
    })

    const response = await request(app).post('/api/trades/open').set(authHeader(user.id)).send({
      instrumentId: instrument.id,
      direction: 'BUY',
      units: 10, // Requires >$100K margin
      leverage: 100,
    })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INSUFFICIENT_MARGIN')
  })
})
```

### 3. RBAC Authorization Tests

```typescript
describe('GET /api/admin/users', () => {
  it('should return all users for ADMIN', async () => {
    const admin = await createTestStaff({ role: 'ADMIN' })

    const response = await request(app).get('/api/admin/users').set(authHeader(admin.id, 'ADMIN'))

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  it('should return 403 for TRADER role', async () => {
    const trader = await createTestUser()

    const response = await request(app).get('/api/admin/users').set(authHeader(trader.id, 'TRADER'))

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS')
  })

  it('should return 403 for AGENT role', async () => {
    const agent = await createTestStaff({ role: 'AGENT' })

    const response = await request(app).get('/api/admin/users').set(authHeader(agent.id, 'AGENT'))

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS')
  })
})
```

### 4. Multi-Step Workflow Tests

```typescript
describe('Deposit Flow', () => {
  it('should complete full deposit workflow', async () => {
    // Step 1: Create user
    const user = await createTestUser({
      balanceCents: 0,
      kycStatus: 'APPROVED',
    })

    // Step 2: Initiate deposit
    const initResponse = await request(app)
      .post('/api/deposits/initiate')
      .set(authHeader(user.id))
      .send({
        amountCents: 1000000, // $10,000
        cryptoCurrency: 'USDT_TRC20',
      })

    expect(initResponse.status).toBe(201)
    const depositId = initResponse.body.data.id
    const paymentUrl = initResponse.body.data.paymentUrl

    // Step 3: Simulate payment (external step)
    // In real test, you'd redirect user to paymentUrl

    // Step 4: Simulate IPN webhook from NowPayments
    const webhookResponse = await request(app).post('/api/webhooks/nowpayments').send({
      payment_id: depositId,
      payment_status: 'finished',
      price_amount: 10000,
      pay_amount: 10000,
      actually_paid: 10000,
      order_id: depositId,
    })

    expect(webhookResponse.status).toBe(200)

    // Step 5: Verify deposit status updated
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
    })
    expect(deposit.status).toBe('COMPLETED')

    // Step 6: Verify ledger transaction created
    const ledgerEntry = await prisma.ledgerTransaction.findFirst({
      where: {
        userId: user.id,
        type: 'DEPOSIT',
        depositId,
      },
    })
    expect(ledgerEntry).not.toBeNull()
    expect(ledgerEntry!.amountCents).toBe(1000000)
  })
})
```

### 5. Rate Limiting Tests

```typescript
describe('Rate Limiting', () => {
  it('should rate limit auth endpoints', async () => {
    const requests = []

    // Send 15 requests (limit is 10 per 15 minutes)
    for (let i = 0; i < 15; i++) {
      requests.push(
        request(app).post('/api/auth/login').send({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      )
    }

    const responses = await Promise.all(requests)

    // First 10 should succeed (401 for wrong password)
    responses.slice(0, 10).forEach((res) => {
      expect(res.status).toBe(401)
    })

    // Remaining should be rate limited
    responses.slice(10).forEach((res) => {
      expect(res.status).toBe(429)
      expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })
})
```

### 6. Pagination Tests

```typescript
describe('GET /api/trades', () => {
  it('should paginate results correctly', async () => {
    const user = await createTestUser()

    // Create test instrument
    const instrument = await prisma.instrument.create({
      data: {
        symbol: 'EURUSD',
        displayName: 'Euro/USD',
        contractSize: 100000n,
        leverage: 500n,
        spreadPips: 15n,
        pipDecimalPlaces: 4,
        swapBuyBps: 100n,
        swapSellBps: -100n,
        marginCallBps: 10000n,
        stopOutBps: 5000n,
        twelveDataSymbol: 'EURUSD',
      },
    })

    // Create 25 trades
    for (let i = 0; i < 25; i++) {
      await prisma.trade.create({
        data: {
          userId: user.id,
          instrumentId: instrument.id,
          direction: 'BUY',
          units: 1,
          leverage: 100,
          openRate: 108500,
          status: 'OPEN',
        },
      })
    }

    // First page (default 20)
    const page1 = await request(app).get('/api/trades').set(authHeader(user.id))

    expect(page1.status).toBe(200)
    expect(page1.body.data.length).toBe(20)
    expect(page1.body.has_more).toBe(true)
    expect(page1.body.next_cursor).toBeDefined()

    // Second page
    const page2 = await request(app)
      .get(`/api/trades?cursor=${page1.body.next_cursor}`)
      .set(authHeader(user.id))

    expect(page2.status).toBe(200)
    expect(page2.body.data.length).toBe(5)
    expect(page2.body.has_more).toBe(false)
  })
})
```

---

## Testing Checklist

### Before Merging API Changes

- [ ] All endpoints have integration tests
- [ ] Authentication tested (valid, invalid, expired tokens)
- [ ] Authorization tested (all relevant roles)
- [ ] Validation tested (missing fields, invalid values)
- [ ] Error responses match documented format
- [ ] Pagination tested (if applicable)
- [ ] Rate limiting tested (if applicable)
- [ ] Multi-step workflows tested end-to-end
- [ ] Database state verified after mutations
- [ ] Test data cleaned up after each test

---

## Common Mistakes

### ❌ Mocking the Service Layer

```typescript
// WRONG: Mocking service defeats integration testing purpose
jest.mock('@/services/trading.service', () => ({
  openPosition: jest.fn().mockResolvedValue({...})
}))

// CORRECT: Use real service with test database
const response = await request(app)
  .post('/api/trades/open')
  .set(authHeader(user.id))
  .send({...})
```

### ❌ Not Cleaning Up Test Data

```typescript
// WRONG: Test data persists between tests
beforeAll(async () => {
  await createTestUser()
})

// CORRECT: Clean up after each test
afterEach(async () => {
  await prisma.$executeRawUnsafe('DELETE FROM trades')
  await prisma.$executeRawUnsafe('DELETE FROM users')
})
```

### ❌ Testing Only Happy Path

```typescript
// WRONG: Only testing success case
it('should open position', async () => {
  const response = await request(app).post('/api/trades/open')...
  expect(response.status).toBe(201)
})

// CORRECT: Test all error cases too
it('should return 422 for invalid input', async () => {...})
it('should return 401 without auth', async () => {...})
it('should return 422 for insufficient margin', async () => {...})
```

---

## Running Integration Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific test file
pnpm test:integration -- trades.integration.test.ts

# Run with database reset
pnpm test:integration -- --reset-db

# Run with verbose output
pnpm test:integration -- --verbose
```

---

## References

- [API Route Creation Skill](../api-route-creation/SKILL.md)
- [Error Handling Patterns Skill](../error-handling-patterns/SKILL.md)
- [Testing Financial Features Skill](../testing-financial-features/SKILL.md)
- [PTS-API-001](<../../../docs/Core Technical Specifications/PTS-API-001_API_Specification.md>)
