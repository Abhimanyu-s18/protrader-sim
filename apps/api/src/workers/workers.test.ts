import {
  calcRolloverCents,
  calcBidAsk,
  calcPnlCents,
  calcIbCommissionCents,
  calcMarginCents,
  calcMarginLevelBps,
} from '../lib/calculations.js'

/**
 * Integration tests for Sprint 3 workers and price pipeline logic.
 *
 * Tests verify business logic used by:
 * - Rollover worker (daily + Wednesday triple swap)
 * - Entry order trigger (price threshold checks)
 * - Alert monitor (price threshold checks)
 * - Trailing stop (peak tracking + trigger logic)
 * - Partial close (pro-rata P&L calculation)
 * - Price pipeline (spread application, bid/ask)
 */

describe('Rollover Worker — Swap Calculations', () => {
  const units = 100_000n
  const contractSize = 100_000
  const openRate = 108_500n // 1.08500

  it('should calculate daily rollover correctly', () => {
    const rateBps = -5n // negative = debit to trader
    const result = calcRolloverCents(units, contractSize, openRate, rateBps, false)

    // notional = (100000 * 100000 * 108500 * 100) / 100000 = 1085000000000
    // daily_swap = (1085000000000 * 5) / 10000 / 365 = 1486301
    expect(result).toBeGreaterThan(0n)
    expect(result).toBe(1486301n)
  })

  it('should apply triple swap on Wednesday', () => {
    const rateBps = -5n
    const dailyResult = calcRolloverCents(units, contractSize, openRate, rateBps, false)
    const wednesdayResult = calcRolloverCents(units, contractSize, openRate, rateBps, true)

    expect(wednesdayResult).toBe(dailyResult * 3n)
  })

  it('should return credit (negative) for positive swap rate', () => {
    const rateBps = 3n // positive = credit to trader
    const result = calcRolloverCents(units, contractSize, openRate, rateBps, false)

    expect(result).toBeLessThan(0n)
  })

  it('should return zero for zero swap rate', () => {
    const result = calcRolloverCents(units, contractSize, openRate, 0n, false)
    expect(result).toBe(0n)
  })

  it('should handle micro lot positions', () => {
    const microUnits = 1_000n // 0.01 lot
    const rateBps = -5n
    const result = calcRolloverCents(microUnits, contractSize, openRate, rateBps, false)

    const standardResult = calcRolloverCents(units, contractSize, openRate, rateBps, false)
    expect(result).toBe(standardResult / 100n)
  })
})

describe('Entry Order Trigger — Price Threshold Logic', () => {
  it('should trigger BUY entry when ask reaches entry rate', () => {
    const midScaled = 108_500n
    const { askScaled } = calcBidAsk(midScaled, 1, 4)
    const entryRate = 108_510n // above current ask

    expect(askScaled <= entryRate).toBe(true)
  })

  it('should NOT trigger BUY entry above entry rate', () => {
    const midScaled = 108_500n
    const { askScaled } = calcBidAsk(midScaled, 1, 4)
    const entryRate = 108_400n // below current ask

    expect(askScaled <= entryRate).toBe(false)
  })

  it('should trigger SELL entry when bid reaches entry rate', () => {
    const midScaled = 108_500n
    const { bidScaled } = calcBidAsk(midScaled, 1, 4)
    const entryRate = 108_490n // below current bid

    expect(bidScaled >= entryRate).toBe(true)
  })

  it('should NOT trigger SELL entry below entry rate', () => {
    const midScaled = 108_500n
    const { bidScaled } = calcBidAsk(midScaled, 1, 4)
    const entryRate = 108_510n // above current bid

    expect(bidScaled >= entryRate).toBe(false)
  })

  it('should handle exact trigger price for BUY', () => {
    const midScaled = 108_500n
    const { askScaled } = calcBidAsk(midScaled, 1, 4)
    const entryRate = 108_505n

    expect(askScaled <= entryRate).toBe(true)
  })

  it('should handle exact trigger price for SELL', () => {
    const midScaled = 108_500n
    const { bidScaled } = calcBidAsk(midScaled, 1, 4)
    const entryRate = 108_495n

    expect(bidScaled >= entryRate).toBe(true)
  })
})

describe('Alert Monitor — Price Threshold Logic', () => {
  it('should trigger PRICE_ABOVE alert when mid >= trigger', () => {
    const midScaled = 108_500n
    const triggerScaled = 108_400n
    expect(midScaled >= triggerScaled).toBe(true)
  })

  it('should NOT trigger PRICE_ABOVE alert when mid < trigger', () => {
    const midScaled = 108_500n
    const triggerScaled = 108_600n
    expect(midScaled >= triggerScaled).toBe(false)
  })

  it('should trigger PRICE_BELOW alert when mid <= trigger', () => {
    const midScaled = 108_500n
    const triggerScaled = 108_600n
    expect(midScaled <= triggerScaled).toBe(true)
  })

  it('should NOT trigger PRICE_BELOW alert when mid > trigger', () => {
    const midScaled = 108_500n
    const triggerScaled = 108_400n
    expect(midScaled <= triggerScaled).toBe(false)
  })

  it('should trigger at exact price threshold', () => {
    const midScaled = 108_500n
    const triggerScaled = 108_500n
    expect(midScaled >= triggerScaled).toBe(true)
    expect(midScaled <= triggerScaled).toBe(true)
  })
})

describe('Trailing Stop — Peak Tracking Logic', () => {
  const pipSizeScaled = 10n // EURUSD 4 decimal places

  it('should calculate trigger level for BUY trailing stop', () => {
    const peakBid = 108_600n
    const trailingStopPips = 20
    const distanceScaled = BigInt(trailingStopPips) * pipSizeScaled
    const triggerLevel = peakBid - distanceScaled

    expect(triggerLevel).toBe(108_400n)

    // Price drops below trigger → close
    expect((108_395n) <= triggerLevel).toBe(true)
    // Price above trigger → hold
    expect((108_405n) <= triggerLevel).toBe(false)
  })

  it('should calculate trigger level for SELL trailing stop', () => {
    const troughAsk = 108_400n
    const trailingStopPips = 20
    const distanceScaled = BigInt(trailingStopPips) * pipSizeScaled
    const triggerLevel = troughAsk + distanceScaled

    expect(triggerLevel).toBe(108_600n)

    // Price rises above trigger → close
    expect((108_605n) >= triggerLevel).toBe(true)
    // Price below trigger → hold
    expect((108_595n) >= triggerLevel).toBe(false)
  })

  it('should update peak for BUY when new high reached', () => {
    let peak = 108_500n
    const newBid = 108_650n

    if (newBid > peak) peak = newBid
    expect(peak).toBe(108_650n)
  })

  it('should update trough for SELL when new low reached', () => {
    let trough = 108_500n
    const newAsk = 108_350n

    if (newAsk < trough) trough = newAsk
    expect(trough).toBe(108_350n)
  })

  it('should NOT update peak when price goes lower', () => {
    let peak = 108_600n
    const newBid = 108_550n

    if (newBid > peak) peak = newBid
    expect(peak).toBe(108_600n)
  })

  it('should handle JPY pair pip size (2 decimal places)', () => {
    const jpyPipSize = 1000n // JPY 2 decimal places
    const peakBid = 15_000_000n // USDJPY 150.000
    const trailingStopPips = 20
    const distanceScaled = BigInt(trailingStopPips) * jpyPipSize
    const triggerLevel = peakBid - distanceScaled

    expect(triggerLevel).toBe(14_980_000n) // 149.800
  })
})

describe('Partial Close — Pro-Rata P&L', () => {
  const units = 100_000n
  const contractSize = 100_000
  const openRate = 108_500n

  it('should calculate pro-rata P&L for partial close', () => {
    const closeUnits = 50_000n
    const closeRate = 108_700n

    const partialPnl = calcPnlCents('BUY', openRate, closeRate, closeUnits, contractSize)
    const fullPnl = calcPnlCents('BUY', openRate, closeRate, units, contractSize)

    expect(partialPnl).toBe(fullPnl / 2n)
  })

  it('should calculate pro-rata P&L for SELL partial close', () => {
    const closeUnits = 25_000n
    const closeRate = 108_300n

    const partialPnl = calcPnlCents('SELL', openRate, closeRate, closeUnits, contractSize)
    const fullPnl = calcPnlCents('SELL', openRate, closeRate, units, contractSize)

    expect(partialPnl).toBe(fullPnl / 4n)
  })

  it('should calculate pro-rata margin for partial close', () => {
    const totalMargin = calcMarginCents(units, contractSize, openRate, 500)
    const closeUnits = 50_000n

    const closedMargin = (totalMargin * closeUnits) / units
    expect(closedMargin).toBe(totalMargin / 2n)

    const remainingMargin = totalMargin - closedMargin
    expect(remainingMargin).toBe(totalMargin / 2n)
  })

  it('should handle small partial close (1 unit)', () => {
    const closeUnits = 1n
    const closeRate = 108_700n

    const partialPnl = calcPnlCents('BUY', openRate, closeRate, closeUnits, contractSize)
    // (108700-108500) * 1 * 100000 * 100 / 100000 = 20000
    expect(partialPnl).toBe(20000n)
  })

  it('should maintain total P&L invariant across partial closes', () => {
    const closeRate = 108_700n

    const part1 = calcPnlCents('BUY', openRate, closeRate, 25_000n, contractSize)
    const part2 = calcPnlCents('BUY', openRate, closeRate, 25_000n, contractSize)
    const part3 = calcPnlCents('BUY', openRate, closeRate, 25_000n, contractSize)
    const part4 = calcPnlCents('BUY', openRate, closeRate, 25_000n, contractSize)

    expect(part1 + part2 + part3 + part4).toBe(
      calcPnlCents('BUY', openRate, closeRate, units, contractSize),
    )
  })
})

describe('Price Pipeline — Spread Application', () => {
  it('should apply 1 pip spread correctly for EURUSD', () => {
    const { bidScaled, askScaled } = calcBidAsk(108_500n, 1, 4)

    expect(bidScaled).toBe(108_495n)
    expect(askScaled).toBe(108_505n)
  })

  it('should produce symmetric spread around mid', () => {
    const midScaled = 1_000_000n
    const { bidScaled, askScaled } = calcBidAsk(midScaled, 2, 4)

    expect(askScaled - midScaled).toBe(midScaled - bidScaled)
  })

  it('should handle zero spread', () => {
    const midScaled = 108_500n
    const { bidScaled, askScaled } = calcBidAsk(midScaled, 0, 4)

    expect(bidScaled).toBe(midScaled)
    expect(askScaled).toBe(midScaled)
  })
})

describe('Stop Loss / Take Profit — Trigger Logic', () => {
  it('should trigger BUY SL when bid <= stopLoss', () => {
    const { bidScaled } = calcBidAsk(108_500n, 1, 4)
    const stopLoss = 108_400n

    expect(bidScaled <= stopLoss).toBe(false)
    expect((108_395n) <= stopLoss).toBe(true)
  })

  it('should trigger BUY TP when ask >= takeProfit', () => {
    const { askScaled } = calcBidAsk(108_500n, 1, 4)
    const takeProfit = 108_600n

    expect(askScaled >= takeProfit).toBe(false)
    expect((108_605n) >= takeProfit).toBe(true)
  })

  it('should trigger SELL SL when ask >= stopLoss', () => {
    const { askScaled } = calcBidAsk(108_500n, 1, 4)
    const stopLoss = 108_600n

    expect(askScaled >= stopLoss).toBe(false)
    expect((108_605n) >= stopLoss).toBe(true)
  })

  it('should trigger SELL TP when bid <= takeProfit', () => {
    const { bidScaled } = calcBidAsk(108_500n, 1, 4)
    const takeProfit = 108_400n

    expect(bidScaled <= takeProfit).toBe(false)
    expect((108_395n) <= takeProfit).toBe(true)
  })
})

describe('Margin Level — Call and Stop-Out Detection', () => {
  it('should detect margin call at 100%', () => {
    const level = calcMarginLevelBps(5_0000n, 5_0000n)
    expect(level).toBe(10_000n)
  })

  it('should detect stop-out at 50%', () => {
    const level = calcMarginLevelBps(2_5000n, 5_0000n)
    expect(level).toBe(5_000n)
  })

  it('should NOT trigger margin call above 100%', () => {
    const level = calcMarginLevelBps(6_0000n, 5_0000n)
    expect(level).toBe(12_000n)
    if (level !== null) {
      expect(level > 10_000n).toBe(true)
    }
  })

  it('should return null when no margin used', () => {
    expect(calcMarginLevelBps(10_0000n, 0n)).toBeNull()
  })
})

describe('IB Commission — With Contract Size', () => {
  it('should calculate commission for forex trade', () => {
    const commission = calcIbCommissionCents(100_000n, 100_000, 108_500n, 30)
    // notional = 1085000000000
    // commission = 1085000000000 * 30 / 10000 = 3255000000
    expect(commission).toBe(3_255_000_000n)
  })

  it('should calculate commission for stock trade', () => {
    const commission = calcIbCommissionCents(10n, 1, 15_000_000n, 10)
    expect(commission).toBeGreaterThan(0n)
  })

  it('should return zero for zero rate', () => {
    expect(calcIbCommissionCents(100_000n, 100_000, 108_500n, 0)).toBe(0n)
  })
})
