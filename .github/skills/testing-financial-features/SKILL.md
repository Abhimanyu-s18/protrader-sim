---
name: 'testing-financial-features'
description: 'Use when: writing tests for financial calculations, validating monetary precision, testing trading logic, or ensuring BigInt correctness. Ensures comprehensive test coverage for all money-related operations with edge case validation. Primary agents: @test, @coding, @security.'
---

# Skill: Testing Financial Features

**Scope**: Unit tests, integration tests, and property-based tests for financial calculations
**Primary Agents**: @test, @coding, @security
**When to Use**: Writing tests for margin calculations, P&L formulas, balance computations, or any money-related logic

---

## Core Principles

### 1. Financial Tests Are Compliance-Critical

Wrong financial calculations = regulatory violations. Tests must validate:

- **Precision**: No floating-point errors
- **Edge cases**: Zero, negative, maximum values
- **Idempotency**: Same input always produces same output
- **Audit trail**: Calculations are traceable

### 2. Test Against Known Values

Always test against manually verified calculations:

```typescript
// Example: Verify margin for 1 lot EUR/USD at 1.08500 with 1:100 leverage
// Expected: (100000 × 108500 × 100) / (100 × 100000) = 10850000 cents = $108,500
const margin = calculateMargin({
  units: 1n,
  contractSize: 100000n,
  openRateScaled: 108500n,
  leverage: 100n,
})
expect(margin).toBe(10850000n) // $108,500.00
```

### 3. Test All Edge Cases

Financial edge cases that MUST be tested:

- Zero lot size
- Maximum leverage (500x for retail, 1000x for VIP)
- JPY pairs (2 decimal places vs 4 for others)
- Negative P&L scenarios
- Margin call threshold (100%)
- Stop-out threshold (50%)
- Very large positions (100+ lots)
- Very small positions (0.01 lots)

---

## Test Structure

### Unit Tests for Calculations

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateMargin,
  calculatePnL,
  calculateEquity,
  calculateMarginLevel,
} from '@/lib/calculations'

describe('calculateMargin', () => {
  it('should compute correct margin for EUR/USD buy position', () => {
    const margin = calculateMargin({
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      leverage: 100n,
    })
    expect(margin).toBe(10850000n) // $108,500.00
  })

  it('should handle JPY pairs with 2 decimal places', () => {
    const margin = calculateMargin({
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 14550n, // USD/JPY at 145.50
      leverage: 200n,
    })
    expect(margin).toBe(7275000n) // $72,750.00
  })

  it('should reject zero lot size', () => {
    expect(() =>
      calculateMargin({
        units: 0n,
        contractSize: 100000n,
        openRateScaled: 108500n,
        leverage: 100n,
      }),
    ).toThrow('Units must be greater than zero')
  })

  it('should handle maximum leverage (1000x)', () => {
    const margin = calculateMargin({
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      leverage: 1000n,
    })
    expect(margin).toBe(1085000n) // $10,850.00
  })
})

describe('calculatePnL', () => {
  it('should compute positive P&L for profitable BUY position', () => {
    const pnl = calculatePnL({
      direction: 'BUY',
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      currentRateScaled: 109000n, // Price increased
    })
    expect(pnl).toBe(5000000n) // $50,000.00 profit
  })

  it('should compute negative P&L for losing BUY position', () => {
    const pnl = calculatePnL({
      direction: 'BUY',
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      currentRateScaled: 108000n, // Price decreased
    })
    expect(pnl).toBe(-5000000n) // -$50,000.00 loss
  })

  it('should compute positive P&L for profitable SELL position', () => {
    const pnl = calculatePnL({
      direction: 'SELL',
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      currentRateScaled: 108000n, // Price decreased (good for SELL)
    })
    expect(pnl).toBe(5000000n) // $50,000.00 profit
  })

  it('should return zero when price unchanged', () => {
    const pnl = calculatePnL({
      direction: 'BUY',
      units: 1n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      currentRateScaled: 108500n,
    })
    expect(pnl).toBe(0n)
  })
})

describe('calculateMarginLevel', () => {
  it('should return null when no positions open', () => {
    const level = calculateMarginLevel({
      equityCents: 1000000n,
      usedMarginCents: 0n,
    })
    expect(level).toBeNull()
  })

  it('should return 10000 bps (100%) at margin call threshold', () => {
    const level = calculateMarginLevel({
      equityCents: 1000000n,
      usedMarginCents: 1000000n,
    })
    expect(level).toBe(10000n) // 100%
  })

  it('should return 5000 bps (50%) at stop-out threshold', () => {
    const level = calculateMarginLevel({
      equityCents: 500000n,
      usedMarginCents: 1000000n,
    })
    expect(level).toBe(5000n) // 50%
  })

  it('should return 20000 bps (200%) for healthy account', () => {
    const level = calculateMarginLevel({
      equityCents: 2000000n,
      usedMarginCents: 1000000n,
    })
    expect(level).toBe(20000n) // 200%
  })
})
```

### Integration Tests for Trading Service

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { tradingService } from '@/services/trading.service'

describe('TradingService - Financial Integration', () => {
  beforeEach(async () => {
    // Clean test data
    await prisma.trade.deleteMany()
    await prisma.ledgerTransaction.deleteMany()
  })

  it('should deduct correct margin when opening position', async () => {
    const user = await createTestUser({ balanceCents: 5000000n }) // $50,000

    const trade = await tradingService.openPosition({
      userId: user.id,
      instrumentId: 'EURUSD',
      direction: 'BUY',
      units: 1n,
      leverage: 100n,
    })

    // Verify margin deducted from available balance
    const balance = await getAvailableBalance(user.id)
    expect(balance).toBe(5000000n - trade.marginCents)
  })

  it('should credit correct P&L when closing profitable position', async () => {
    const user = await createTestUser({ balanceCents: 5000000n })

    const openTrade = await tradingService.openPosition({
      userId: user.id,
      instrumentId: 'EURUSD',
      direction: 'BUY',
      units: 1n,
      leverage: 100n,
    })

    // Simulate price increase
    const closeTrade = await tradingService.closePosition({
      tradeId: openTrade.id,
      currentRateScaled: 109000n, // Higher than open price
    })

    // Verify P&L credited to balance
    const balance = await getAvailableBalance(user.id)
    const expectedBalance = 5000000n - openTrade.marginCents + closeTrade.pnlCents
    expect(balance).toBe(expectedBalance)
  })

  it('should prevent opening position with insufficient margin', async () => {
    const user = await createTestUser({ balanceCents: 100000n }) // $1,000

    await expect(
      tradingService.openPosition({
        userId: user.id,
        instrumentId: 'EURUSD',
        direction: 'BUY',
        units: 10n, // Requires >$1M margin
        leverage: 100n,
      }),
    ).rejects.toThrow('Insufficient margin')
  })
})
```

### Property-Based Tests for Financial Invariants

```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { calculateMargin, calculatePnL } from '@/lib/calculations'

describe('Financial Invariants (Property-Based)', () => {
  it('margin should always be positive for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 100n }), // units
        fc.bigInt({ min: 1n, max: 1000n }), // leverage
        fc.bigInt({ min: 10000n, max: 200000n }), // price
        (units, leverage, price) => {
          const margin = calculateMargin({
            units,
            contractSize: 100000n,
            openRateScaled: price,
            leverage,
          })
          expect(margin).toBeGreaterThan(0n)
        },
      ),
    )
  })

  it('P&L should be symmetric for BUY vs SELL', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n }), // units
        fc.bigInt({ min: 100000n, max: 110000n }), // open price
        fc.bigInt({ min: -5000n, max: 5000n }), // price change
        (units, openPrice, priceChange) => {
          const currentPrice = openPrice + priceChange

          const pnlBuy = calculatePnL({
            direction: 'BUY',
            units,
            contractSize: 100000n,
            openRateScaled: openPrice,
            currentRateScaled: currentPrice,
          })

          const pnlSell = calculatePnL({
            direction: 'SELL',
            units,
            contractSize: 100000n,
            openRateScaled: openPrice,
            currentRateScaled: currentPrice,
          })

          // BUY and SELL should have opposite P&L
          expect(pnlBuy).toBe(-pnlSell)
        },
      ),
    )
  })

  it('calculations should never produce fractional cents', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 100n }),
        fc.bigInt({ min: 1n, max: 1000n }),
        fc.bigInt({ min: 10000n, max: 200000n }),
        (units, leverage, price) => {
          const margin = calculateMargin({
            units,
            contractSize: 100000n,
            openRateScaled: price,
            leverage,
          })
          // Result should be integer (no fractional cents)
          expect(margin % 1n).toBe(0n)
        },
      ),
    )
  })
})
```

---

## Testing Checklist

### Before Merging Financial Code

- [ ] All calculation functions have unit tests
- [ ] Edge cases tested (zero, negative, max values)
- [ ] JPY pairs tested (2 decimal places)
- [ ] Margin call threshold tested (100%)
- [ ] Stop-out threshold tested (50%)
- [ ] P&L symmetry verified (BUY vs SELL)
- [ ] Integration tests cover ledger updates
- [ ] Property-based tests validate invariants
- [ ] No floating-point operations in tests
- [ ] Test data uses realistic values

### Test Coverage Requirements

| Component             | Minimum Coverage | Critical Tests                            |
| --------------------- | ---------------- | ----------------------------------------- |
| calculations.ts       | 100%             | All formulas, edge cases                  |
| trading.service.ts    | 90%+             | Open/close position, margin checks        |
| ledger.service.ts     | 95%+             | Balance computation, transaction creation |
| deposit.service.ts    | 95%+             | Webhook verification, idempotency         |
| withdrawal.service.ts | 95%+             | Balance validation, status transitions    |

---

## Common Mistakes

### ❌ Using Floating-Point in Tests

```typescript
// WRONG: Tests using Number lose precision
const margin = Number(calculateMargin({...}))
expect(margin).toBeCloseTo(108500.00, 2) // Can miss precision errors

// CORRECT: Test BigInt directly
const margin = calculateMargin({...})
expect(margin).toBe(10850000n) // Exact match required
```

### ❌ Not Testing Edge Cases

```typescript
// WRONG: Only testing happy path
it('should calculate margin', () => {
  expect(calculateMargin(validInput)).toBe(expected)
})

// CORRECT: Test boundaries
it('should reject zero units', () => {
  expect(() => calculateMargin({...units: 0n})).toThrow()
})
it('should handle maximum leverage', () => {
  expect(calculateMargin({...leverage: 1000n})).toBe(expected)
})
it('should handle minimum lot size', () => {
  expect(calculateMargin({...units: 1n})).toBe(expected)
})
```

### ❌ Testing Against Wrong Expected Values

```typescript
// WRONG: Manually calculated wrong expected value
// 1 lot EUR/USD at 1.08500 with 1:100 leverage
// Manual calc: 100000 * 1.08500 / 100 = 1085 (WRONG - forgot cents conversion)
expect(margin).toBe(1085n)

// CORRECT: Use formula with proper units
// (100000 × 108500 × 100) / (100 × 100000) = 10850000 cents
expect(margin).toBe(10850000n)
```

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run financial calculation tests only
pnpm test -- calculations.test.ts

# Run with coverage
pnpm test -- --coverage

# Run property-based tests (slower but thorough)
pnpm test -- --property-based

# Watch mode for TDD
pnpm test -- --watch
```

---

## Test Data Generation

Use realistic test data that matches production:

```typescript
// Realistic instrument data
const TEST_INSTRUMENTS = {
  EURUSD: {
    contractSize: 100000n,
    pipDecimalPlaces: 4,
    typicalPrice: 108500n, // 1.08500
    spreadPips: 1n,
  },
  USDJPY: {
    contractSize: 100000n,
    pipDecimalPlaces: 2,
    typicalPrice: 14550n, // 145.50
    spreadPips: 2n,
  },
  AAPL: {
    contractSize: 1n,
    pipDecimalPlaces: 4,
    typicalPrice: 17500000n, // $175.00000
    spreadPips: 5n,
  },
}

// Realistic user data
const TEST_USERS = {
  retail: {
    balanceCents: 1000000n, // $10,000
    maxLeverage: 500n,
  },
  vip: {
    balanceCents: 10000000n, // $100,000
    maxLeverage: 1000n,
  },
}
```

---

## References

- [Financial Calculations Skill](../financial-calculations/SKILL.md)
- [BigInt Money Handling Skill](../bigint-money-handling/SKILL.md)
- [Trading Calculations Skill](../trading-calculations/SKILL.md)
- [PTS-CALC-001](../../../docs/Core%20Technical%20Specifications/PTS-CALC-001_Trading_Calculations.md)
