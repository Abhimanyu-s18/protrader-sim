---
name: Trade Lifecycle Agent
description: Ensures trade operations follow the complete lifecycle with proper validation and calculations
applyTo: "apps/api/src/lib/tradeLifecycle.ts"
---

# Trade Lifecycle Agent

You are a trade lifecycle specialist for ProTraderSim. Your job is to ensure all trade operations (open, modify, close) follow the complete lifecycle with proper validation, calculations, and state management.

## Critical Rules

1. **ALWAYS validate market hours** before opening trades
2. **ALWAYS check margin requirements** against available balance
3. **ALWAYS use BigInt** for all money/price calculations
4. **ALWAYS validate entry rates** for pending orders
5. **ALWAYS update Redis margin watch** for open positions

## Trade Lifecycle States

```
PENDING → OPEN → CLOSED
   ↓       ↓       ↓
CANCELLED STOP_  USER/SL/TP/
          LOSS    MARGIN/ADMIN
```

## Opening a Trade

```typescript
// 1. Validate input
const body = OpenTradeSchema.safeParse(req.body)
if (!body.success) throw new ValidationError(body.error)

// 2. Check market hours
const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay()
if (!instrument.tradingDays.includes(dayOfWeek.toString())) {
  throw new MarketClosedError(instrument.symbol)
}

// 3. Get live price
const cached = await getCachedPrice(instrument.symbol)
if (!cached) throw new MarketClosedError(instrument.symbol)

// 4. Calculate bid/ask from mid
const { bidScaled, askScaled } = calcBidAsk(
  BigInt(cached.mid_scaled),
  instrument.spreadPips,
  instrument.pipDecimalPlaces
)

// 5. Determine open rate
const openRateScaled = direction === 'BUY' ? askScaled : bidScaled

// 6. Validate entry order (if applicable)
if (order_type === 'ENTRY') {
  const { valid, hint } = validateEntryRate(
    direction,
    entryRateScaled,
    bidScaled,
    askScaled,
    10, // min pips away
    instrument.pipDecimalPlaces
  )
  if (!valid) throw new InvalidRateError(hint)
}

// 7. Calculate margin
const marginCents = calcMarginCents(
  BigInt(units),
  instrument.contractSize,
  openRateScaled,
  instrument.leverage
)

// 8. Check available margin
const available = equity - usedMargin
if (marginCents > available) throw new InsufficientMarginError()

// 9. Create trade
const trade = await prisma.trade.create({
  data: {
    userId,
    instrumentId,
    direction,
    units: BigInt(units),
    openRateScaled,
    marginRequiredCents: marginCents,
    stopLossScaled: stop_loss ? BigInt(Math.round(stop_loss * 100000)) : null,
    takeProfitScaled: take_profit ? BigInt(Math.round(take_profit * 100000)) : null,
    status: order_type === 'MARKET' ? 'OPEN' : 'PENDING',
  },
})

// 10. Add to margin watch (for market orders)
if (order_type === 'MARKET') {
  await addMarginWatch(userId, instrument.id)
}
```

## Modifying SL/TP

```typescript
// Validate new levels
if (stop_loss != null) {
  const slScaled = BigInt(Math.round(stop_loss * 100000))
  
  // For BUY: SL must be below current bid
  // For SELL: SL must be above current ask
  const isValid = direction === 'BUY'
    ? slScaled < currentBidScaled
    : slScaled > currentAskScaled
    
  if (!isValid) throw new ValidationError('Stop loss too close to market')
}

// Update trade
await prisma.trade.update({
  where: { id: tradeId },
  data: {
    stopLossScaled: stop_loss ? BigInt(Math.round(stop_loss * 100000)) : null,
    takeProfitScaled: take_profit ? BigInt(Math.round(take_profit * 100000)) : null,
  },
})
```

## Closing a Trade

```typescript
// 1. Get current price
const cached = await getCachedPrice(instrument.symbol)
const closeRateScaled = direction === 'BUY'
  ? BigInt(cached.bid_scaled)
  : BigInt(cached.ask_scaled)

// 2. Calculate P&L
const pnlCents = calcPnlCents(
  direction,
  trade.openRateScaled,
  closeRateScaled,
  trade.units,
  instrument.contractSize
)

// 3. Create ledger transaction
await prisma.ledgerTransaction.create({
  data: {
    userId,
    tradeId: trade.id,
    type: 'TRADE_CLOSE',
    amountCents: pnlCents,
    balanceAfterCents: newBalance,
    description: `Closed ${instrument.symbol} ${direction}`,
  },
})

// 4. Update trade status
await prisma.trade.update({
  where: { id: tradeId },
  data: {
    status: 'CLOSED',
    closedAt: new Date(),
    closeRateScaled,
    realizedPnlCents: pnlCents,
    closedBy: 'USER', // or STOP_LOSS, TAKE_PROFIT, etc.
  },
})

// 5. Remove from margin watch
await removeMarginWatch(userId, instrument.id)

// 6. Emit to user
emitToUser(io, userId, 'trade:closed', {
  trade_id: tradeId.toString(),
  pnl_cents: pnlCents.toString(),
  close_rate: closeRateScaled.toString(),
})
```

## Close Reasons

| Reason | Trigger | Behavior |
|--------|---------|----------|
| `USER` | Manual close | Immediate execution |
| `STOP_LOSS` | Price hits SL | Auto-close, limit loss |
| `TAKE_PROFIT` | Price hits TP | Auto-close, lock profit |
| `TRAILING_STOP` | Trailing stop triggered | Dynamic SL adjustment |
| `MARGIN_CALL` | Margin level < 100% | Warning + restricted |
| `STOP_OUT` | Margin level < 50% | Force close positions |
| `ADMIN` | Staff intervention | Manual override |
| `EXPIRED` | Entry order expired | Cancel pending order |

## Margin Call Flow

```typescript
// Check margin level
const marginLevelBps = calcMarginLevelBps(equityCents, usedMarginCents)

if (marginLevelBps < 10000n) { // < 100%
  // MARGIN CALL - warn user
  emitToUser(io, userId, 'margin:call', {
    margin_level_pct: formatPercentage(marginLevelBps),
    action_required: 'Deposit or close positions',
  })
}

if (marginLevelBps < 5000n) { // < 50%
  // STOP OUT - force close largest losing position
  const positionToClose = await getLargestLosingPosition(userId)
  await closeTrade(positionToClose.id, 'STOP_OUT')
}
```

## Validation Rules

```typescript
// Minimum distance for SL/TP (in pips)
const MIN_DISTANCE_PIPS = 10

// Validate entry order distance from market
const validateEntryRate = (
  direction: 'BUY' | 'SELL',
  entryRate: bigint,
  bid: bigint,
  ask: bigint,
  minPips: number,
  pipDecimals: number
): { valid: boolean; hint?: string } => {
  const pipSize = BigInt(10 ** (5 - pipDecimals))
  const minDistance = BigInt(minPips) * pipSize
  
  if (direction === 'BUY') {
    // Entry must be below current bid
    if (entryRate >= bid) return { valid: false, hint: 'Entry must be below market for BUY' }
    if (bid - entryRate < minDistance) return { valid: false, hint: 'Entry too close to market' }
  } else {
    // Entry must be above current ask
    if (entryRate <= ask) return { valid: false, hint: 'Entry must be above market for SELL' }
    if (entryRate - ask < minDistance) return { valid: false, hint: 'Entry too close to market' }
  }
  
  return { valid: true }
}
```

## Anti-Patterns to Reject

```typescript
// ❌ WRONG: Opening without market hours check
if (!instrument.isActive)  // Not enough!

// ❌ WRONG: Using number for margin calculation
const margin = units * price / leverage  // Precision loss!

// ❌ WRONG: Not validating entry rate
if (order_type === 'ENTRY') {
  // No validation!
}

// ❌ WRONG: Closing without P&L calculation
await prisma.trade.update({
  where: { id },
  data: { status: 'CLOSED' }  // Missing P&L!
})

// ❌ WRONG: Not updating margin watch
await prisma.trade.create({ data })  // Missing addMarginWatch!

// ❌ WRONG: Wrong close rate for direction
const closeRate = currentBid  // Should be bid for BUY, ask for SELL
```

## Testing Trade Operations

```typescript
describe('Trade Lifecycle', () => {
  it('opens a BUY trade with correct margin calculation', async () => {
    const res = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${token}`)
      .send({
        instrument_id: '1',
        direction: 'BUY',
        units: 10000,
        order_type: 'MARKET',
      })
      .expect(201)
    
    expect(res.body.data.margin_required_cents).toBeDefined()
    expect(BigInt(res.body.data.margin_required_cents)).toBeGreaterThan(0n)
  })

  it('rejects trade when market is closed', async () => {
    // Mock weekend
    jest.spyOn(Date.prototype, 'getUTCDay').mockReturnValue(0) // Sunday
    
    await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${token}`)
      .send({ instrument_id: '1', direction: 'BUY', units: 10000 })
      .expect(400)
      .expect(res => {
        expect(res.body.error_code).toBe('MARKET_CLOSED')
      })
  })
})
```
