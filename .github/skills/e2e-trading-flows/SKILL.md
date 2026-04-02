---
name: 'e2e-trading-flows'
description: 'Use when: writing end-to-end tests for complete trading workflows, validating user journeys from registration to trade closure, testing real-time price updates, or verifying full platform functionality. Ensures all system components work together correctly. Primary agents: @test, @frontend.'
---

# Skill: E2E Trading Flows

**Scope**: End-to-end tests for complete trading workflows across the full stack
**Primary Agents**: @test, @frontend
**When to Use**: Testing complete user journeys, validating multi-step trading flows, verifying real-time updates

---

## Core Principles

### 1. Test Real User Journeys

E2E tests simulate actual user behavior:

- Registration → KYC → Deposit → Trade → Withdrawal
- Not individual API calls, but complete workflows
- Real browser interactions (Playwright)

### 2. Test Against Staging Environment

E2E tests run against:

- Real frontend (Next.js apps)
- Real backend (Express API)
- Real database (test instance)
- Real WebSocket connections

### 3. Deterministic but Realistic

- Use seeded test data for consistency
- Simulate real market price movements
- Test timing-sensitive features (margin calls, stop-outs)

---

## Test Framework Setup

### Playwright Configuration

```typescript
// apps/platform/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true, // Each test manages its own state/cleanup
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4, // Enable parallel workers
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @protrader/api dev',
      url: 'http://localhost:4000/health',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @protrader/platform dev',
      url: 'http://localhost:3002',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
```

### Test Fixtures

```typescript
// apps/platform/e2e/fixtures.ts
import { test as base, Page } from '@playwright/test'
import { prisma } from '@protrader/db'

type TestFixtures = {
  testUser: {
    id: string
    email: string
    password: string
  }
  authenticatedPage: Page
}

import bcrypt from 'bcrypt'

export const test = base.extend<TestFixtures>({
  testUser: async ({}, use) => {
    const user = {
      id: `test-${Date.now()}`,
      email: `e2e-${Date.now()}@protrader.test`,
      password: 'Test1234!',
    }

    // Hash password using bcrypt (matches actual plaintext password)
    const hashedPassword = await bcrypt.hash(user.password, 10)

    // Create user in database
    const createdUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: hashedPassword,
        kycStatus: 'APPROVED',
        accountType: 'TRADER',
      },
    })

    await use(user)

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } })
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    await page.goto('http://localhost:3001/login')
    await page.fill('[name="email"]', testUser.email)
    await page.fill('[name="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3002/dashboard')
    await use(page)
  },
})

export { expect } from '@playwright/test'
```

---

## E2E Test Scenarios

### 1. Complete Trading Lifecycle

```typescript
// apps/platform/e2e/trading-lifecycle.spec.ts
import { test, expect } from './fixtures'

test.describe('Complete Trading Lifecycle', () => {
  test('user can register, deposit, trade, and withdraw', async ({ page }) => {
    // Use unique email for each test run to avoid conflicts
    const testEmail = `trader-${Date.now()}@example.com`
    const password = 'SecurePass123!'

    try {
      // Step 1: Registration
      await page.goto('http://localhost:3001/register')
      await page.fill('[name="email"]', testEmail)
      await page.fill('[name="password"]', password)
      await page.fill('[name="confirmPassword"]', password)
      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:3002/dashboard')

      // Step 2: Verify dashboard loads with zero balance
      await expect(page.locator('[data-testid="balance"]')).toContainText('$0.00')

      // Step 3: Navigate to deposit page
      await page.click('[data-testid="deposit-button"]')
      await page.waitForURL('http://localhost:3002/deposit')

      // Step 4: Initiate deposit
      await page.fill('[name="amount"]', '10000') // $10,000
      await page.selectOption('[name="cryptoCurrency"]', 'USDT_TRC20')
      await page.click('button[type="submit"]')

      // Wait for payment URL
      await expect(page.locator('[data-testid="payment-url"]')).toBeVisible()

      // Step 5: Simulate payment completion (via API)
      await page.evaluate((email) => {
        return fetch('http://localhost:4000/api/test/simulate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, amount: 10000 }),
          credentials: 'include',
        })
      }, testEmail)

      // Step 6: Verify balance updated
      await page.goto('http://localhost:3002/dashboard')
      await expect(page.locator('[data-testid="balance"]')).toContainText('$10,000.00')

      // Step 7: Open a trade
      await page.click('[data-testid="new-trade-button"]')
      await page.waitForURL('http://localhost:3002/trade/EURUSD')

      // Select instrument
      await page.selectOption('[data-testid="instrument-select"]', 'EURUSD')

      // Set trade parameters
      await page.click('[data-testid="direction-buy"]')
      await page.fill('[data-testid="lot-size"]', '0.1')
      await page.selectOption('[data-testid="leverage-select"]', '100')

      // Submit trade
      await page.click('[data-testid="submit-trade"]')

      // Verify trade appears in open positions
      await expect(page.locator('[data-testid="open-positions"]')).toBeVisible()
      await expect(page.locator('[data-testid="position-0"]')).toContainText('EURUSD')
      await expect(page.locator('[data-testid="position-0"]')).toContainText('BUY')

      // Step 8: Close the trade
      await page.click('[data-testid="close-position-0"]')
      await page.click('[data-testid="confirm-close"]')

      // Step 9: Verify balance reflects P&L
      const balanceText = await page.locator('[data-testid="balance"]').textContent()
      expect(balanceText).toMatch(/\$[\d,]+\.\d{2}/)
    } finally {
      // Cleanup: Delete test user
      await page.evaluate((email) => {
        return fetch('http://localhost:4000/api/test/delete-user', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
          credentials: 'include',
        })
      }, testEmail)
    }
  })
})
```

### 2. Real-Time Price Updates

```typescript
// apps/platform/e2e/realtime-prices.spec.ts
import { test, expect } from './fixtures'

test.describe('Real-Time Price Updates', () => {
  test('prices update in real-time via WebSocket', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('http://localhost:3002/trade/EURUSD')

    // Wait for chart to load
    await expect(authenticatedPage.locator('[data-testid="price-chart"]')).toBeVisible()

    // Get initial price
    const initialPrice = await authenticatedPage
      .locator('[data-testid="current-price"]')
      .textContent()

    // Wait for price update (should happen within 5 seconds)
    await authenticatedPage.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="current-price"]')?.textContent
        return current !== initial
      },
      initialPrice,
      { timeout: 10000 },
    )

    // Verify price changed
    const newPrice = await authenticatedPage.locator('[data-testid="current-price"]').textContent()

    expect(newPrice).not.toBe(initialPrice)

    // Verify price change indicator appears
    await expect(authenticatedPage.locator('[data-testid="price-change"]')).toBeVisible()
  })

  test('P&L updates in real-time when price changes', async ({ authenticatedPage }) => {
    // Open a position first
    await authenticatedPage.goto('http://localhost:3002/trade/EURUSD')
    await authenticatedPage.click('[data-testid="direction-buy"]')
    await authenticatedPage.fill('[data-testid="lot-size"]', '0.01')
    await authenticatedPage.click('[data-testid="submit-trade"]')

    // Wait for position to appear
    await expect(authenticatedPage.locator('[data-testid="position-0"]')).toBeVisible()

    // Get initial P&L
    const initialPnL = await authenticatedPage
      .locator('[data-testid="position-0-pnl"]')
      .textContent()

    // Wait for P&L to update
    await authenticatedPage.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="position-0-pnl"]')?.textContent
        return current !== initial
      },
      initialPnL,
      { timeout: 15000 },
    )

    // Verify P&L changed
    const newPnL = await authenticatedPage.locator('[data-testid="position-0-pnl"]').textContent()

    expect(newPnL).not.toBe(initialPnL)
  })
})
```

### 3. Margin Call & Stop-Out Flow

```typescript
// apps/platform/e2e/margin-management.spec.ts
import { test, expect } from './fixtures'
import { prisma } from '@protrader/db'
import bcrypt from 'bcrypt'

test.describe('Margin Management', () => {
  test('margin call warning appears when margin level drops below 100%', async ({
    authenticatedPage,
  }) => {
    // Hash password for test user
    const password = 'Test1234!'
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with low balance
    const user = await prisma.user.create({
      data: {
        email: `margin-test-${Date.now()}@protrader.test`,
        passwordHash: hashedPassword,
        kycStatus: 'APPROVED',
        accountType: 'TRADER',
      },
    })

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

    try {
      // Add small deposit
      const ledgerTx = await prisma.ledgerTransaction.create({
        data: {
          userId: user.id,
          transactionType: 'DEPOSIT',
          amountCents: 100000n, // $1,000
          balanceAfterCents: 100000n,
          description: 'Test deposit',
        },
      })

      // Open large position (high leverage)
      const trade = await prisma.trade.create({
        data: {
          userId: user.id,
          instrumentId: instrument.id,
          direction: 'BUY',
          units: 10n,
          leverage: 500n,
          openRateScaled: 108500n,
          status: 'OPEN',
          marginRequiredCents: 90000n, // $900 margin (90% of balance)
        },
      })

      // Login and check for margin warning
      await authenticatedPage.goto('http://localhost:3002/dashboard')

      // Margin call warning should appear
      await expect(authenticatedPage.locator('[data-testid="margin-warning"]')).toBeVisible()
      await expect(authenticatedPage.locator('[data-testid="margin-level"]')).toContainText('%')

      // Cleanup: delete test records
      await prisma.trade.delete({ where: { id: trade.id } })
      await prisma.ledgerTransaction.delete({ where: { id: ledgerTx.id } })
    } finally {
      // Cleanup: delete test user and instrument
      await prisma.user.delete({ where: { id: user.id } })
      await prisma.instrument.delete({ where: { id: instrument.id } })
    }
  })

  test('positions auto-closed on stop-out (margin level < 50%)', async ({ authenticatedPage }) => {
    const password = 'Test1234!'
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email: `stopout-test-${Date.now()}@protrader.test`,
        passwordHash: hashedPassword,
        kycStatus: 'APPROVED',
        accountType: 'TRADER',
      },
    })

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

    try {
      // Create deposit and position
      await prisma.ledgerTransaction.create({
        data: {
          userId: user.id,
          transactionType: 'DEPOSIT',
          amountCents: 100000n,
          balanceAfterCents: 100000n,
          description: 'Test deposit',
        },
      })

      const trade = await prisma.trade.create({
        data: {
          userId: user.id,
          instrumentId: instrument.id,
          direction: 'BUY',
          units: 10n,
          leverage: 500n,
          openRateScaled: 108500n,
          status: 'OPEN',
          marginRequiredCents: 95000n,
        },
      })

      // Trigger stop-out via test endpoint (pass actual userId)
      await authenticatedPage.evaluate((userId) => {
        return fetch('http://localhost:4000/api/test/trigger-stop-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
          credentials: 'include',
        })
      }, user.id.toString())

      // Verify positions closed
      await authenticatedPage.goto('http://localhost:3002/positions')
      await expect(authenticatedPage.locator('[data-testid="open-positions"]')).not.toBeVisible()
    } finally {
      await prisma.user.delete({ where: { id: user.id } })
      await prisma.instrument.delete({ where: { id: instrument.id } })
    }
  })
})
```

### 4. KYC Document Upload Flow

```typescript
// apps/platform/e2e/kyc-flow.spec.ts
import { test, expect } from './fixtures'
import path from 'path'

test.describe('KYC Document Upload', () => {
  test('user can upload and submit KYC documents', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('http://localhost:3002/kyc')

    // Upload passport
    const passportPath = path.join(__dirname, 'fixtures', 'test-passport.jpg')
    await authenticatedPage.setInputFiles('[data-testid="passport-upload"]', passportPath)

    // Upload proof of address
    const poaPath = path.join(__dirname, 'fixtures', 'test-poa.pdf')
    await authenticatedPage.setInputFiles('[data-testid="poa-upload"]', poaPath)

    // Fill personal details
    await authenticatedPage.fill('[name="firstName"]', 'John')
    await authenticatedPage.fill('[name="lastName"]', 'Doe')
    await authenticatedPage.fill('[name="dateOfBirth"]', '1990-01-01')
    await authenticatedPage.fill('[name="nationality"]', 'US')

    // Submit
    await authenticatedPage.click('[data-testid="submit-kyc"]')

    // Verify submission confirmation
    await expect(authenticatedPage.locator('[data-testid="kyc-submitted"]')).toBeVisible()
  })

  test('user sees KYC status after submission', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('http://localhost:3002/kyc')

    // Should show pending status
    await expect(authenticatedPage.locator('[data-testid="kyc-status"]')).toContainText('Pending')
  })
})
```

### 5. IB Commission Tracking

```typescript
// apps/platform/e2e/ib-commissions.spec.ts
import { test, expect } from './fixtures'
import { prisma } from '@protrader/db'
import bcrypt from 'bcrypt'

test.describe('IB Commission Tracking', () => {
  test('IB agent sees commissions from referred traders', async ({ page }) => {
    const password = 'Test1234!'
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create instrument first (required for trade)
    const instrument = await prisma.instrument.create({
      data: {
        symbol: `EURUSD-${Date.now()}`,
        name: 'Euro / US Dollar',
        contractSize: 100000,
        leverage: 100,
        spreadPips: 2,
        pipDecimalPlaces: 4,
        swapBuyBps: 50,
        swapSellBps: -50,
        marginCallBps: 10000,
        stopOutBps: 5000,
        twelveDataSymbol: 'EURUSD',
      },
    })

    // Setup: Create IB agent and referred trader
    const ibAgent = await prisma.staff.create({
      data: {
        email: `ib-agent-${Date.now()}@protrader.test`,
        passwordHash: hashedPassword,
        role: 'AGENT',
      },
    })

    const trader = await prisma.user.create({
      data: {
        email: `referred-trader-${Date.now()}@protrader.test`,
        passwordHash: hashedPassword,
        kycStatus: 'APPROVED',
        referredBy: ibAgent.id,
      },
    })

    try {
      // Create a trade with commission
      const trade = await prisma.trade.create({
        data: {
          userId: trader.id,
          instrumentId: instrument.id,
          direction: 'BUY',
          units: 1,
          leverage: 100,
          openRate: 108500n,
          status: 'CLOSED',
          pnlCents: 500000n, // $5,000 profit
        },
      })

      await prisma.ibCommission.create({
        data: {
          tradeId: trade.id,
          agentId: ibAgent.id,
          rateBps: 500, // 5% commission
          amountCents: 25000n, // $250 commission
        },
      })

      // Login as IB agent
      await page.goto('http://localhost:3001/login')
      await page.fill('[name="email"]', ibAgent.email)
      await page.fill('[name="password"]', password)
      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:3004/dashboard')

      // Verify commission appears
      await expect(page.locator('[data-testid="total-commissions"]')).toContainText('$250.00')
      await expect(page.locator('[data-testid="commission-0"]')).toContainText(instrument.symbol)
    } finally {
      // Cleanup
      await prisma.ibCommission.deleteMany({
        where: { agentId: ibAgent.id },
      })
      await prisma.trade.deleteMany({
        where: { userId: trader.id },
      })
      await prisma.user.delete({
        where: { id: trader.id },
      })
      await prisma.staff.delete({
        where: { id: ibAgent.id },
      })
      await prisma.instrument.delete({
        where: { id: instrument.id },
      })
    }
  })
})
```

---

## Testing Checklist

### Before Merging E2E Tests

- [ ] All critical user journeys covered
- [ ] Tests run against staging environment
- [ ] Test data cleaned up after each test
- [ ] Screenshots/videos captured on failure
- [ ] Tests are deterministic (no flaky assertions)
- [ ] Real-time features tested (WebSocket updates)
- [ ] Error states tested (network failures, server errors)
- [ ] Mobile responsiveness tested (if applicable)
- [ ] Accessibility checks included (if applicable)

---

## Common Mistakes

### ❌ Hardcoded Wait Times

```typescript
// WRONG: Arbitrary waits cause flaky tests
await page.waitForTimeout(5000)

// CORRECT: Wait for specific condition
await page.waitForSelector('[data-testid="price-updated"]')
```

### ❌ Tests Dependent on Each Other

```typescript
// WRONG: Test B depends on Test A's state
test('step 1', async () => {
  /* creates data */
})
test('step 2', async () => {
  /* uses data from step 1 */
})

// CORRECT: Each test is independent
test('complete flow', async () => {
  // Setup, execute, verify, cleanup all in one test
})
```

### ❌ Not Testing Error States

```typescript
// WRONG: Only testing happy path
test('user can trade', async () => {
  /* success only */
})

// CORRECT: Test failures too
test('user sees error on insufficient margin', async () => {
  /* error case */
})
```

---

## Running E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- trading-lifecycle.spec.ts

# Run with UI mode (interactive)
pnpm test:e2e -- --ui

# Run with specific browser
pnpm test:e2e -- --project=chromium

# Run on CI
CI=true pnpm test:e2e
```

---

## References

- [Testing Financial Features Skill](../testing-financial-features/SKILL.md)
- [API Integration Testing Skill](../api-integration-testing/SKILL.md)
- [State Management Trading Skill](../state-management-trading/SKILL.md)
- [Socket.io Real-Time Skill](../socket-io-real-time/SKILL.md)
