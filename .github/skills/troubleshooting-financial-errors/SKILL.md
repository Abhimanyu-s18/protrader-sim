---
name: 'troubleshooting-financial-errors'
description: 'Use when: debugging incorrect margin calculations, wrong P&L values, balance discrepancies, swap rate errors, or any financial calculation producing unexpected results. Ensures systematic diagnosis of financial math errors with BigInt precision verification. Primary agents: @debug, @coding, @test.'
---

# Skill: Troubleshooting Financial Errors

**Scope**: Debugging incorrect financial calculations, balance discrepancies, P&L errors, margin issues
**Primary Agents**: @debug, @coding, @test
**When to Use**: Wrong margin amounts, incorrect P&L, balance doesn't match expected, swap calculations off

---

## Core Principles

### 1. Financial Errors Are Compliance Failures

In a regulated trading platform, wrong calculations are not bugs — they are compliance violations. Every financial error must be:

- Reproduced with exact input values
- Traced to the specific formula step
- Fixed with test coverage
- Verified against manual calculation

### 2. BigInt Precision is Non-Negotiable

All financial calculations use BigInt to avoid floating-point errors:

- Money: BigInt cents ($100.50 = 10050n)
- Prices: BigInt scaled ×100000 (1.08500 = 108500n)
- Division is ALWAYS LAST

### 3. Systematic Diagnosis Flow

Follow this order for every financial error:

1. **Input verification** — Are inputs correct?
2. **Formula verification** — Is the formula correct?
3. **Precision verification** — Is BigInt used throughout?
4. **Division order** — Is division last?
5. **Output verification** — Is the result formatted correctly?

---

## Common Financial Errors

### Error 1: Wrong Margin Calculation

**Symptoms**: Margin required doesn't match expected, position rejected for insufficient margin

**Diagnosis**:

```typescript
// Correct formula
margin = (units × contractSize × openRateScaled × CENTS) / (leverage × PRICE_SCALE)

// Example: EUR/USD BUY 1 lot at 1.08500 with 1:100 leverage
// contractSize = 100000 (Forex)
// openRateScaled = 108500n
// CENTS = 100n
// leverage = 100n
// PRICE_SCALE = 100000n

margin = (100000n × 100000n × 108500n × 100n) / (100n × 100000n)
margin = 108500000000000000n / 10000000n
margin = 10850000n  // = $108,500.00

// WRONG: Division too early
margin = (units × contractSize × openRateScaled) / leverage × CENTS / PRICE_SCALE
// This loses precision due to intermediate division
```

**Common causes**:

- Division performed before all multiplications
- Using `Number()` instead of BigInt
- Wrong contractSize (1 for stocks, 100000 for Forex)
- Missing CENTS multiplier

**Fix**:

```typescript
// CORRECT: All multiplications first, division last
const marginCents =
  (units * BigInt(contractSize) * openRateScaled * CENTS) / (BigInt(leverage) * PRICE_SCALE)
```

### Error 2: Incorrect P&L Calculation

**Symptoms**: Unrealized P&L shows wrong sign or magnitude, closed trade P&L doesn't match

**Diagnosis**:

```typescript
// BUY P&L: (currentBid - openRate) × units × contractSize × CENTS / PRICE_SCALE
// SELL P&L: (openRate - currentAsk) × units × contractSize × CENTS / PRICE_SCALE

// Example: EUR/USD BUY 1 lot, open at 1.08500, current bid 1.08700
// openRateScaled = 108500n
// currentBidScaled = 108700n
// units = 1n
// contractSize = 100000n

pnl = (108700n - 108500n) × 1n × 100000n × 100n / 100000n
pnl = 200n × 1n × 100000n × 100n / 100000n
pnl = 2000000000n / 100000n
pnl = 20000n  // = $200.00 profit

// WRONG: Using ask price for BUY P&L
// WRONG: Reversed subtraction (openRate - currentBid for BUY)
```

**Common causes**:

- Using ask price instead of bid for BUY positions
- Using bid price instead of ask for SELL positions
- Reversed subtraction order
- Missing contractSize multiplier

**Fix**:

```typescript
// BUY: Use currentBid (what you can sell at)
if (direction === 'BUY') {
  pnlCents =
    ((currentBidScaled - openRateScaled) * units * BigInt(contractSize) * CENTS) / PRICE_SCALE
}

// SELL: Use currentAsk (what you can buy back at)
if (direction === 'SELL') {
  pnlCents =
    ((openRateScaled - currentAskScaled) * units * BigInt(contractSize) * CENTS) / PRICE_SCALE
}
```

### Error 3: Balance Discrepancy

**Symptoms**: User balance doesn't match expected, deposits/withdrawals not reflected

**Diagnosis**:

```typescript
// Balance is NEVER stored — computed from ledger_transactions
balance = SUM(CASE WHEN type IN ('DEPOSIT', 'TRADE_CLOSE', ...) THEN amountCents ELSE -amountCents END)

// Verify ledger entries
SELECT type, amountCents, balanceAfterCents, createdAt
FROM ledger_transactions
WHERE userId = 'user123'
ORDER BY createdAt ASC;

// Check if balanceAfterCents matches running total
```

**Common causes**:

- Missing ledger entry for a transaction
- Duplicate ledger entry (double-counting)
- Wrong sign on amount (credit vs debit)
- Balance computed from wrong transaction types

**Fix**:

```typescript
// Always create ledger entry for financial events
await prisma.ledgerTransaction.create({
  data: {
    userId,
    type: 'DEPOSIT',
    amountCents: depositAmountCents,
    balanceAfterCents: newBalanceCents,
    referenceId: depositId,
    description: `Deposit via ${method}`,
  },
})
```

### Error 4: Swap Rate Calculation Error

**Symptoms**: Overnight swap charges don't match expected, rollover amounts incorrect

**Diagnosis**:

```typescript
// Swap = units × contractSize × swapRateBps × CENTS / (BPS_SCALE × PRICE_SCALE)
// Applied per night for positions held overnight

// Example: EUR/USD BUY 1 lot, swapBuyBps = -50 (negative = charge)
// units = 100000n, contractSize = 100000n, swapRateBps = -50n

swap = 100000n × 100000n × (-50n) × 100n / (10000n × 100000n)
swap = -50000000000000000n / 1000000000n
swap = -50000n  // = -$5.00 per night
```

**Common causes**:

- Wrong swap rate (buy vs sell rate)
- Missing BPS_SCALE in denominator
- Applied to wrong positions (should only apply overnight)
- Not accounting for triple-swap Wednesday

**Fix**:

```typescript
const swapCents = (units * BigInt(contractSize) * swapRateBps * CENTS) / (BPS_SCALE * PRICE_SCALE)
```

### Error 5: Margin Level Calculation Error

**Symptoms**: Margin call triggered incorrectly, stop-out at wrong level

**Diagnosis**:

```typescript
// Margin level = (equity × BPS_SCALE) / usedMargin
// equity = balance + unrealizedPnl
// null if no open positions (no margin used)

// Example: balance $10,000, unrealized P&L +$500, used margin $2,000
// equityCents = 1000000n + 50000n = 1050000n
// usedMarginCents = 200000n

marginLevelBps = 1050000n × 10000n / 200000n
marginLevelBps = 10500000000n / 200000n
marginLevelBps = 52500n  // = 525.00%

// Margin call at 10000 bps (100%)
// Stop-out at 5000 bps (50%)
```

**Common causes**:

- Division by zero when no margin used
- Using balance instead of equity
- Wrong BPS_SCALE factor
- Not handling null case (no open positions)

**Fix**:

```typescript
if (usedMarginCents === 0n) {
  return null // No open positions
}

const marginLevelBps = (equityCents * BPS_SCALE) / usedMarginCents
```

---

## Debugging Checklist

When troubleshooting financial errors:

- [ ] All values are BigInt (not Number)
- [ ] Division is performed LAST
- [ ] Correct constants used (PRICE_SCALE, BPS_SCALE, CENTS)
- [ ] Correct contractSize for instrument type
- [ ] Correct price used (bid for BUY, ask for SELL)
- [ ] Ledger entries created for all financial events
- [ ] No duplicate ledger entries
- [ ] Balance computed from SUM(ledger_transactions)
- [ ] Margin level handles zero margin case
- [ ] Swap rates use correct sign (negative = charge)

---

## Testing Financial Calculations

### Unit Test Template

```typescript
describe('Margin Calculation', () => {
  it('should calculate correct margin for EUR/USD BUY', () => {
    const result = calculateMargin({
      units: 100000n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      leverage: 100n,
    })

    // Manual: (100000 × 100000 × 108500 × 100) / (100 × 100000) = 10850000n
    expect(result).toBe(10850000n) // $108,500.00
  })

  it('should handle zero units', () => {
    const result = calculateMargin({
      units: 0n,
      contractSize: 100000n,
      openRateScaled: 108500n,
      leverage: 100n,
    })
    expect(result).toBe(0n)
  })
})
```

### Property-Based Testing

```typescript
import fc from 'fast-check'

describe('P&L Symmetry', () => {
  it('BUY and SELL should have opposite P&L at same price', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 100000n, max: 200000n }), // openRate
        fc.bigInt({ min: 100000n, max: 200000n }), // currentRate
        fc.bigInt({ min: 1n, max: 100n }), // units
        (openRate, currentRate, units) => {
          const buyPnl = calculatePnl('BUY', openRate, currentRate, units)
          const sellPnl = calculatePnl('SELL', openRate, currentRate, units)

          expect(buyPnl).toBe(-sellPnl)
        },
      ),
    )
  })
})
```

---

## Production Debugging

### Enable Financial Calculation Logging

```typescript
// Temporarily enable verbose logging
const DEBUG_FINANCIAL = process.env.DEBUG_FINANCIAL === 'true'

if (DEBUG_FINANCIAL) {
  console.log('[FINANCIAL] Margin calculation:', {
    units,
    contractSize,
    openRateScaled,
    leverage,
    result: marginCents,
  })
}
```

### Verify Against Manual Calculation

```typescript
// Create a verification endpoint for debugging
router.get('/debug/calculate-margin', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  const { units, contractSize, openRate, leverage } = req.query

  const margin = calculateMargin({
    units: BigInt(units),
    contractSize: BigInt(contractSize),
    openRateScaled: BigInt(openRate),
    leverage: BigInt(leverage),
  })

  res.json({
    data: {
      marginCents: margin.toString(),
      marginFormatted: formatMoney(margin),
    },
  })
})
```
