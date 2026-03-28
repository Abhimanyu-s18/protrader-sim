---
name: trading-calculations
description: "Use when: implementing advanced trading formulas, calculating margin calls, stop-out levels, position sizing, risk management, or leverage constraints. Extends financial-calculations with trading-specific logic and regulatory limits. Primary agents: Coding, Architecture, Test."
---

# Trading Calculations — ProTraderSim

Master advanced trading formulas beyond basic margin and P&L. Focus on **risk management, leverage limits, margin call triggers, and stop-out mechanics**.

---

## 💼 Advanced Formulas

### 1. Maximum Position Size (By Leverage)

**When**: Trader tries to open a position  
**Formula**: `maxUnits = (balanceCents × leverage × CENTS) / (contractSize × price × CENTS)` → simplifies to `(balance × leverage) / (contractSize × price)`

```typescript
// Calculate max units trader can open
function calculateMaxPositionSize(
  balanceCents: bigint,
  leverage: number,
  contractSize: number,
  priceScaled: bigint
): number {
  // maxUnits = (balance × leverage) / (price × contractSize)
  // Prevent division by zero
  if (priceScaled <= 0n) {
    throw new ApiError('INVALID_PRICE', 400, 'Price must be positive')
  }

  const numerator = balanceCents * BigInt(leverage) * CENTS
  const denominator = priceScaled * BigInt(contractSize)
  
  const maxUnits = numerator / denominator
  
  // Convert to lot size (divide by 100)
  return Number(maxUnits) / 100
}

// Usage
const maxLots = calculateMaxPositionSize(
  500000n,  // $5,000 balance
  500,      // 500:1 leverage
  100000,   // Forex contract size
  108500n   // 1.08500 price
)
// Result: 23.14 lots max
```

### 2. Margin Call Trigger

**When**: Computing account health or checking if trader needs margin call  
**Trigger Level**: Typically `marginLevel ≤ 100%` (depends on `marginCallBps` config)

```typescript
// Margin call = when equity drops below required margin
function checkMarginCall(
  equityCents: bigint,
  usedMarginCents: bigint,
  marginCallBps: number  // From instrument (e.g., 10000 = 100%)
): boolean {
  if (usedMarginCents === 0n) {
    return false  // No positions = no margin call
  }

  // marginCallLevel = equity × BPS_SCALE / usedMargin
  const marginLevelBps = (equityCents * BPS_SCALE) / usedMarginCents
  
  // Margin call if level drops below threshold
  const marginCallThresholdBps = BigInt(marginCallBps)
  
  return marginLevelBps <= marginCallThresholdBps
}

// Usage: instrumentConfig has marginCallBps = 10000 (100%)
const isMarginCall = checkMarginCall(
  equityCents,        // $4,500
  usedMarginCents,    // $5,000 required
  10000               // 100% threshold
)
// Result: true (equity < required margin)
```

### 3. Stop-Out Trigger

**When**: Position must be auto-closed to prevent negative balance  
**Trigger Level**: Typically `marginLevel ≤ 50%`

```typescript
function checkStopOut(
  equityCents: bigint,
  usedMarginCents: bigint,
  stopOutBps: number  // From instrument (e.g., 5000 = 50%)
): boolean {
  if (usedMarginCents === 0n) {
    return false
  }

  const marginLevelBps = (equityCents * BPS_SCALE) / usedMarginCents
  const stopOutThresholdBps = BigInt(stopOutBps)
  
  return marginLevelBps <= stopOutThresholdBps
}

// Usage: if stopOutBps = 5000 (50%)
const isStopOut = checkStopOut(
  equityCents,        // $2,400
  usedMarginCents,    // $5,000
  5000                // 50% threshold
)
// Result: true (equity < 50% of required margin)
```

### 4. Liquidation Price (Stop-Out)

**When**: Calculate at what price the position will be auto-closed

```typescript
function calculateLiquidationPrice(
  direction: 'BUY' | 'SELL',
  openRateScaled: bigint,
  units: number,
  contractSize: number,
  equityCents: bigint,
  stopOutBps: number
): bigint {
  // At stop-out: equity = 0
  // For BUY: P&L = (liquidationPrice - openPrice) × units × contractSize × 100 / PRICE_SCALE
  // At stop-out: equity = balance + P&L = 0
  // So: balance = -P&L
  
  const pnlAtLiquidation = -equityCents  // Loss amount
  
  // Solve for price:
  // pnlAtLiquidation = (liquidationPrice - openPrice) × units × contractSize × 100 / PRICE_SCALE
  // liquidationPrice = openPrice + (pnlAtLiquidation × PRICE_SCALE) / (units × contractSize × 100)
  
  const priceChangeScaled = direction === 'BUY'
    ? (pnlAtLiquidation * PRICE_SCALE) / (BigInt(units) * BigInt(contractSize) * CENTS)
    : (-pnlAtLiquidation * PRICE_SCALE) / (BigInt(units) * BigInt(contractSize) * CENTS)
  
  const liquidationPrice = direction === 'BUY'
    ? openRateScaled + priceChangeScaled
    : openRateScaled - priceChangeScaled
  
  return liquidationPrice
}

// Usage
const liquidationPrice = calculateLiquidationPrice(
  'BUY',
  108500n,      // 1.08500 open
  1,            // 1 lot
  100000,       // Forex contract
  300000n,      // $3,000 equity left
  5000          // 50% stop-out
)
// Result: 1.03500 (price at which system closes)
```

### 5. Effective Leverage (Current)

**When**: Show trader their real leverage in use (not max leverage)

```typescript
function calculateEffectiveLeverage(
  usedMarginCents: bigint,
  equityCents: bigint
): number {
  if (equityCents === 0n) {
    return 0  // No equity = no leverage
  }

  // Effective leverage = margin / equity
  return Number(usedMarginCents) / Number(equityCents)
}

// Usage
const effectiveLeverage = calculateEffectiveLeverage(
  2500000n,    // $25,000 margin used
  500000n      // $5,000 equity
)
// Result: 5.0x (5 times leverage actually used)
```

### 6. Risk-Reward Ratio

**When**: Show trader the reward vs risk of a trade

```typescript
function calculateRiskReward(
  openPrice: bigint,
  stopLossPrice: bigint,
  takeProfitPrice: bigint,
  direction: 'BUY' | 'SELL'
): { riskCents: bigint; rewardCents: bigint; ratio: number } {
  let risk: bigint, reward: bigint
  
  if (direction === 'BUY') {
    risk = (openPrice - stopLossPrice) * CENTS / PRICE_SCALE
    reward = (takeProfitPrice - openPrice) * CENTS / PRICE_SCALE
  } else {
    risk = (stopLossPrice - openPrice) * CENTS / PRICE_SCALE
    reward = (openPrice - takeProfitPrice) * CENTS / PRICE_SCALE
  }
  
  const riskRewardRatio = reward === 0n ? 0 : Number(reward) / Number(risk)
  
  return { riskCents: risk, rewardCents: reward, ratio: riskRewardRatio }
}

// Usage
const rr = calculateRiskReward(
  108500n,      // 1.08500 open
  107500n,      // 1.07500 stop loss
  112500n,      // 1.12500 take profit
  'BUY'
)
// Result: { risk: 1000 cents ($10), reward: 4000 cents ($40), ratio: 4 }
// Risk-reward = 1:4 (good)
```

---

## 🛡️ Risk Management Limits

### Maximum Leverage Per Account Type

```typescript
const LEVERAGE_LIMITS = {
  'TRADER': 500,           // Standard traders max 500:1
  'VIP': 1000,             // VIP accounts max 1000:1
  'INSTITUTIONAL': 2000    // Institutional max 2000:1
}

// Enforce in route
router.post('/positions', authenticate(), async (req, res) => {
  const { leverage } = req.body
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  })
  
  const maxLeverage = LEVERAGE_LIMITS[user.account_type] || 500
  
  if (leverage > maxLeverage) {
    throw new ApiError(
      'LEVERAGE_LIMIT_EXCEEDED',
      400,
      `Maximum leverage for your account: ${maxLeverage}`
    )
  }
  
  // Continue...
})
```

### Position Size Limits

```typescript
// Max exposure per instrument
const MAX_EXPOSURE = 50000000n  // $500,000 max exposure per symbol

function validatePositionSize(
  openRateScaled: bigint,
  units: number,
  contractSize: number,
  currentExposureCents: bigint
): void {
  const positionValueCents = (
    openRateScaled *
    BigInt(units) *
    BigInt(contractSize) *
    CENTS
  ) / PRICE_SCALE
  
  const totalExposure = currentExposureCents + positionValueCents
  
  if (totalExposure > MAX_EXPOSURE) {
    throw new ApiError(
      'POSITION_LIMIT_EXCEEDED',
      400,
      `Max exposure per symbol: $${Number(MAX_EXPOSURE) / 100}`
    )
  }
}
```

---

## 🔄 Position Lifecycle Calculations

### Open Trade Calculation

```typescript
async function openTrade(
  traderId: string,
  symbol: string,
  direction: 'BUY' | 'SELL',
  units: number,
  leverage: number
) {
  // 1. Get instrument & price
  const instrument = await prisma.instrument.findUnique({
    where: { symbol }
  })
  const prices = await getPrices(symbol)
  
  // 2. Calculate margin
  const openRateScaled = prices.mid * PRICE_SCALE
  const marginCents = (
    BigInt(units * 100) *
    BigInt(instrument.contractSize) *
    openRateScaled *
    CENTS
  ) / (BigInt(leverage) * PRICE_SCALE)
  
  // 3. Check leverage limit
  const maxLeverage = LEVERAGE_LIMITS[user.type] || 500
  if (leverage > maxLeverage) {
    throw new ApiError('LEVERAGE_LIMIT', 400, `Max: ${maxLeverage}`)
  }
  
  // 4. Check balance
  const balance = await getBalance(traderId)
  if (balance < marginCents) {
    throw new ApiError('INSUFFICIENT_MARGIN', 400, 'Not enough balance')
  }
  
  // 5. Create trade
  const trade = await prisma.trade.create({
    data: {
      user_id: traderId,
      symbol,
      direction,
      units: units * 100,
      leverage,
      open_rate_scaled: openRateScaled.toString(),
      margin_used_cents: marginCents.toString()
    }
  })
  
  // 6. Emit real-time update
  emitToUser(io, traderId, 'trade:opened', trade)
  
  return trade
}
```

### Margin Call Auto-Close

```typescript
async function processMarginCalls() {
  // 1. Find all users with open positions
  const users = await prisma.user.findMany({
    where: { trades: { some: { status: 'OPEN' } } },
    select: { id: true }
  })
  
  for (const user of users) {
    // 2. Calculate equity
    const equity = await getEquity(user.id)
    const positions = await getOpenPositions(user.id)
    const usedMargin = positions.reduce((sum, p) => sum + BigInt(p.margin_used_cents), 0n)
    
    // 3. Check margin call
    const marginLevelBps = (equity * BPS_SCALE) / usedMargin
    
    if (marginLevelBps <= 10000n) {  // 100% threshold
      await sendMarginCallNotification(user.id, {
        equity,
        margin_used: usedMargin,
        level: marginLevelBps
      })
    }
    
    // 4. Check stop-out
    if (marginLevelBps <= 5000n) {  // 50% threshold
      // Auto-close largest losing positions
      for (const position of positions) {
        if (marginLevelBps > 5000n) break  // Stop if recovered
        
        await closeTrade(position.id, 'STOP_OUT')
        marginLevelBps = (equity * BPS_SCALE) / usedMargin  // Recalculate
      }
    }
  }
}
```

---

## ✅ Trading Calculation Checklist

- [ ] **Max Position Size**: Calculated before opening
- [ ] **Leverage Limits**: Enforced per account type
- [ ] **Margin Call Check**: Triggered at threshold
- [ ] **Stop-Out Check**: Auto-closes if < 50%
- [ ] **Liquidation Price**: Calculated for display
- [ ] **Risk-Reward Shown**: Before trade opens
- [ ] **Position Size Limits**: Enforced per symbol
- [ ] **Tests**: Edge cases (zero margin, extreme prices)

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Trust leverage from UI | Enforce limit in route |
| Margin call only at 0% | Trigger at 100%, close at 50% |
| Calculate once, cache | Recalculate on each check |
| Liquidation = final price | Calculate threshold price |
| Ignore position limits | Enforce per symbol |

---

## 📚 Related Skills

- `financial-calculations` — Core formulas (Margin, P&L)
- `api-route-creation` — Enforcing limits in routes
- `testing-financial-features` — Testing edge cases
