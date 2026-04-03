---
name: financial-calculations
description: 'Use when: implementing margin calculations, P&L formulas, leverage multiples, equity computations, or any financial math in ProTraderSim. Ensures BigInt precision, correct PRICE_SCALE application, and regulatory compliance. Primary agents: Coding, Architecture, Test.'
---

# Financial Calculations — ProTraderSim

Master the critical financial formulas that power CFD trading on ProTraderSim. All calculations use **BigInt only** — never Float, Decimal, or Number for monetary values.

---

## 🧮 Constants & Scales

**Always import from `packages/utils/src/index.ts`:**

```typescript
const PRICE_SCALE = 100000n // Scale for price precision (5 decimals)
const BPS_SCALE = 10000n // Basis points (10000 bps = 100%)
const CENTS = 100n // Convert dollars to cents
const ONE_MILLION = 1000000n // For scaling large numbers
```

**Never hardcode these values.** Always use imported constants.

---

## 💰 Core Financial Formulas

### 1. Margin Requirement

**When**: Trader opens a position
**Formula**: `(units × contractSize × openRate × CENTS) / (leverage × PRICE_SCALE)`

```typescript
// CORRECT — All BigInt, division last
const marginRequired =
  (BigInt(units) *
    BigInt(contractSize) *
    openRateScaled * // Already scaled by PRICE_SCALE
    CENTS) /
  (BigInt(leverage) * PRICE_SCALE)

// Result: cents (BIGINT), never convert to Number
```

**Key Rules**:

- `units` = lot size (e.g., 1.5 for Forex = 150000 units after normalization)
- `contractSize` = 100000 for Forex, 1 for stocks
- `openRateScaled` = price × PRICE_SCALE (e.g., 1.08500 → 108500n)
- `leverage` = 1 to 500 (typically)
- **Result must be BIGINT cents** (e.g., 375000n = $3,750)

**Edge Cases**:

- Zero leverage → **reject immediately**
- Negative units/rate → **reject immediately**
- Margin > available balance → **reject with insufficient_margin error**

---

### 2. Profit/Loss (P&L) — BUY Position

**When**: Closing a BUY position or computing unrealized P&L
**Formula**: `(currentBid - openRate) × units × contractSize × CENTS / PRICE_SCALE`

```typescript
// CORRECT
const pnlCents =
  ((currentBidScaled - openRateScaled) * // Difference in scaled prices
    BigInt(units) *
    BigInt(contractSize) *
    CENTS) /
  PRICE_SCALE

// If negative: Loss. If positive: Profit.
// Result: BIGINT cents
```

**Key Rules**:

- Use **BID price** for closes (what buyer actually pays)
- Both `currentBid` and `openRate` must already be scaled
- Positive result = profit, negative = loss
- **Never round** — preserve full precision until final storage

---

### 3. Profit/Loss (P&L) — SELL Position

**When**: Closing a SELL position or computing unrealized P&L
**Formula**: `(openRate - currentAsk) × units × contractSize × CENTS / PRICE_SCALE`

```typescript
// CORRECT
const pnlCents =
  ((openRateScaled - currentAskScaled) * // Reversed for sell
    BigInt(units) *
    BigInt(contractSize) *
    CENTS) /
  PRICE_SCALE

// If negative: Loss. If positive: Profit.
```

**Key Rules**:

- Use **ASK price** for closes (what seller must pay)
- Formula is **reversed** from BUY
- Same precision rules as BUY P&L

---

### 4. Margin Level (%)

**When**: Computing account health, margin call triggers, stop-out triggers
**Formula**: `(equity × BPS_SCALE) / usedMargin`

```typescript
// CORRECT — Result in basis points
const marginLevelBps = (equityCents * BPS_SCALE) / usedMarginCents

// Examples:
// marginLevelBps = 10000 → 100% (fully collateralized)
// marginLevelBps = 5000 → 50% (MARGIN CALL trigger typically)
// marginLevelBps = 2500 → 25% (STOP-OUT trigger typically)

// MUST be null if no open positions (no margin used)
if (usedMarginCents === 0n) {
  marginLevelBps = null
}
```

**Key Rules**:

- Result is in basis points (1 bps = 0.01%)
- Only computed if trader has open positions
- **Null when no margin used** (balance only, no leverage)
- Used for automated margin call/stop-out triggers

---

### 5. Equity (Account Balance)

**When**: Computing total account value
**Formula**: `balance + unrealizedPnl`

```typescript
// CORRECT — Sum all position P&Ls
const equityCents = balanceCents + unrealizedPnlCents

// unrealizedPnlCents = sum of all open positions' unrealized P&L
// Example:
// balanceCents = 500000n ($5,000)
// position1 unrealizedPnl = 25000n (+$250)
// position2 unrealizedPnl = -10000n (-$100)
// equityCents = 515000n ($5,150 total equity)
```

**Key Rules**:

- Equity can go **negative** (trader owes money)
- Balance is **always read from ledger**, not stored
- Unrealized P&L is **real-time**, recomputed each update
- Used for margin level calculation

---

### 6. Swap (Interest/Overnight Fee)

**When**: Position held past market close; daily charges applied
**Formula**: `(margin × swapRateBps) / BPS_SCALE`

```typescript
// CORRECT
const swapChargeCents = (marginUsedCents * BigInt(swapRateBps)) / BPS_SCALE

// swapRateBps = 10 → 0.1% daily charge
// swapRateBps = 50 → 0.5% daily charge

// Example:
// margin = 100000n cents ($1,000)
// swapRate = 10 bps (0.1%)
// swap = (100000 * 10) / 10000 = 100 cents ($1)
```

**Key Rules**:

- Applied daily at market open
- Buy and sell swaps typically differ
- Deducted from balance via ledger transaction
- **Never applied to closed positions**

---

## 🔄 Safe Price Conversion from External APIs

### When Number Inputs Are OK

**External APIs return Number prices**—this is normal and safe ONLY at the API boundary. Examples:

- Twelve Data WebSocket: `{ bid: 1.08500, ask: 1.08505, mid: 1.08502 }` (JavaScript Number)
- NowPayments quote API: `{ rate: 0.00012345 }` (JavaScript Number)
- Internal price cache: Retrieve as Number, then convert

**Rule**: Accept Number from APIs, but **convert to BigInt immediately** before any calculations.

### Safe Conversion Pattern

**❌ WRONG — Floating-point multiplication:**

```typescript
const openRateScaled = BigInt(Math.round(prices.mid * Number(PRICE_SCALE)))
// Loses precision due to double rounding
```

**✅ CORRECT — String-based conversion:**

```typescript
/**
 * Convert a numeric API price (e.g., 1.08500) to scaled BigInt (108500n)
 * via safe string manipulation, avoiding floating-point arithmetic entirely.
 *
 * @param price - number from API (e.g., 1.08500)
 * @returns BigInt scaled by PRICE_SCALE (e.g., 108500n)
 */
function priceToScaled(price: number): bigint {
  // Convert to string and pad/truncate to exactly 5 decimals
  const str = price.toFixed(5) // e.g., "1.08500"
  const [whole, frac] = str.split('.')
  const wholePart = BigInt(whole || '0')
  const fracPart = BigInt((frac || '00000').substring(0, 5).padEnd(5, '0'))
  return wholePart * PRICE_SCALE + fracPart
}

// Usage
const openRateScaled = priceToScaled(prices.mid) // Safe, no Number arithmetic
```

### Why This Works

1. **Avoids floating-point**: `toFixed()` rounds in decimal space, not binary
2. **Exact precision**: We know we want exactly 5 decimals (PRICE_SCALE = 100000)
3. **BigInt-only after boundary**: All arithmetic is BigInt from this point forward
4. **Audit trail**: Code explicitly shows price is from API (Input) and result is scaled (Output)

### Input Validation for Prices

Before using any price from an external source:

```typescript
/**
 * Validate and sanitize a price from an external API
 */
function validatePrice(price: unknown): number {
  // Type check
  if (typeof price !== 'number' || Number.isNaN(price)) {
    throw new Error('Price must be a valid number')
  }

  // Range check (positive, reasonable bounds)
  if (price <= 0 || price > 1000000) {
    throw new Error(`Price out of range: ${price}`)
  }

  // Decimal precision check (not more than 8 decimals in practice)
  const str = price.toString()
  const decimalPlaces = str.includes('.') ? str.split('.')[1].length : 0
  if (decimalPlaces > 8) {
    throw new Error(`Price has too many decimals: ${price}`)
  }

  return price
}

// Usage at API boundary
const prices = await getPrices(symbol)
const validatedMid = validatePrice(prices.mid)
const openRateScaled = priceToScaled(validatedMid) // Now safe to scale
```

---

## ✅ Implementation Checklist

### Before Writing Formula Code

- [ ] Is this formula documented in CLAUDE.md or calculations.ts?
- [ ] Did I import PRICE_SCALE and BPS_SCALE?
- [ ] Am I using BigInt everywhere (no Number casts)?
- [ ] **For prices from APIs**: Am I converting via string (priceToScaled) NOT floating-point multiply?
- [ ] Is division the **last operation**?
- [ ] Will the result fit in a BIGINT (< 2^63 - 1)?

### After Writing Formula Code

- [ ] Add JSDoc with formula English description
- [ ] Include example inputs and expected outputs
- [ ] Cover at least 2 edge cases (zero, negative, boundary)
- [ ] Write unit tests with Big numbers (1M+, -1M, 0)
- [ ] Cross-check against CLAUDE.md calculation engine

### For Pull Request

- [ ] Tests pass with edge cases
- [ ] Code review checklist signed off
- [ ] No changes to existing formulas without approval
- [ ] Changelog entry under "Financial" section

---

## 🧪 Example: Complete Implementation

```typescript
// service function for opening a position
async openPosition(
  traderId: string,
  symbol: string,
  direction: 'BUY' | 'SELL',
  units: number,
  leverage: number
): Promise<Position> {
  // 1. Fetch instrument & current prices
  const instrument = await prisma.instrument.findUnique({
    where: { symbol }
  })
  const prices = await getPrices(symbol) // { bid, ask, mid }

  // 2. Determine open rate (mid for better UX)
  // Assuming prices.mid is a regular number from API (e.g., 1.08500)
  // SAFE CONVERSION: Convert via string to avoid floating-point arithmetic
  const openRateScaled = priceToScaled(prices.mid.toString())

  // 3. Calculate margin required
  const marginCents = (
    BigInt(Math.trunc(units * 100)) *  // units normalized
    BigInt(instrument.contractSize) *
    openRateScaled *
    CENTS
  ) / (BigInt(leverage) * PRICE_SCALE)

  // 4. Validate sufficient balance
  const balance = await getBalance(traderId)
  if (balance < marginCents) {
    throw new ApiError('INSUFFICIENT_MARGIN', 'Not enough balance')
  }

  // 5. Create position record
  const position = await prisma.position.create({
    data: {
      traderId,
      symbol,
      direction,
      units: Math.trunc(units * 100),
      leverage,
      openRateScaled: openRateScaled.toString(),
      marginUsedCents: marginCents.toString(),
      status: 'OPEN'
    }
  })

  // 6. Emit real-time update
  emitToUser(io, traderId, 'position:opened', {
    position_id: position.id,
    margin_used: marginCents.toString()
  })

  return position
}
```

---

## 🚨 Common Mistakes to Avoid

| ❌ Wrong                                   | ✅ Correct                                      | Why                                    |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------------- |
| `const pnl = units * price / leverage`     | Use full formula with contractSize & scales     | Incomplete; wrong result               |
| `const margin = (units * price) as bigint` | All operations as BigInt from start             | Type casting loses precision           |
| `(bid - ask) * units / leverage`           | Include contractSize, CENTS, PRICE_SCALE        | Formula is incomplete                  |
| Store balance as Decimal in DB             | Store in ledger only; compute from transactions | Balance is derived, not stored         |
| `marginLevel = equity / margin`            | `(equity × BPS_SCALE) / margin`                 | Without BPS_SCALE, result is too small |

---

## 📚 References

- **CLAUDE.md** — Full calculation engine documentation
- **apps/api/src/lib/calculations.ts** — All formulas in one place
- **packages/utils/src/index.ts** — Shared constants & helpers
- **Test suite**: `apps/api/src/services/__tests__/trading.service.test.ts`

---

## 🔗 Related Skills

- `bigint-money-handling` — Converting and validating money values
- `testing-financial-features` — Writing tests for these formulas
- `troubleshooting-financial-errors` — Debugging calculation bugs
