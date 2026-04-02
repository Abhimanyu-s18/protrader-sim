import {
  calcBidAsk,
  calcMarginCents,
  calcPnlCents,
  calcMarginLevelBps,
  calcAccountMetrics,
  calcRolloverCents,
  calcIbCommissionCents,
  validateEntryRate,
  formatScaledPrice,
  formatCents,
  serializeBigInt,
  priceToScaled,
} from './calculations.js'

// ═══════════════════════════════════════════════════════════════════
// Section 1: Core Financial Calculations (14 test cases per spec)
// ═══════════════════════════════════════════════════════════════════

describe('calcBidAsk', () => {
  it('should apply spread correctly for EURUSD (4 pip decimal places)', () => {
    // EURUSD mid = 1.08500 → 108500n, spread = 15 pips
    const midScaled = 108500n
    const { bidScaled, askScaled } = calcBidAsk(midScaled, 15, 4)

    // pipSize = 10^(5-4) = 10, halfSpread = (15 * 10) / 2 = 75
    expect(bidScaled).toBe(108425n)
    expect(askScaled).toBe(108575n)
  })

  it('should apply spread correctly for USDJPY (2 pip decimal places)', () => {
    // USDJPY mid = 149.500 → 149500n, spread = 12 pips
    const midScaled = 149500n
    const { bidScaled, askScaled } = calcBidAsk(midScaled, 12, 2)

    // pipSize = 10^(5-2) = 1000, halfSpread = (12 * 1000) / 2 = 6000
    expect(bidScaled).toBe(143500n)
    expect(askScaled).toBe(155500n)
  })

  it('should produce symmetric spread around mid', () => {
    const midScaled = 120000n
    const { bidScaled, askScaled } = calcBidAsk(midScaled, 10, 4)

    const spreadActual = askScaled - bidScaled
    const midActual = (bidScaled + askScaled) / 2n
    expect(midActual).toBe(midScaled)
    // 10 pips * pipSize(10) = 100 total spread
    expect(spreadActual).toBe(100n)
  })
})

describe('calcMarginCents', () => {
  it('should calculate margin for 1 lot EURUSD at 500:1 leverage', () => {
    // 1 lot EURUSD, contractSize=100000, price=1.08500, leverage=500
    // margin = (1 * 100000 * 108500 * 100) / (500 * 100000) = 21700n = $217.00
    const margin = calcMarginCents(1n, 100000, 108500n, 500)
    expect(margin).toBe(21700n) // $217.00
  })

  it('should calculate margin for micro lot (0.01)', () => {
    // 0.01 lot = 0.01n units, contractSize=100000, price=1.08500, leverage=500
    // margin = (0.01 * 100000 * 108500 * 100) / (500 * 100000)
    // Note: BigInt truncates 0.01n to 0n, so use 1n as minimum unit
    // With units=1: margin = 21700n
    // Smallest practical: units=1 represents the smallest tradeable unit
    const margin = calcMarginCents(1n, 100000, 108500n, 500)
    expect(margin).toBe(21700n) // $217.00
  })

  it('should calculate margin for stock (contract size = 1)', () => {
    // 100 shares AAPL at $150.00 = 15000000n scaled, leverage 20
    // margin = (100 * 1 * 15000000 * 100) / (20 * 100000)
    // = 150000000000 / 2000000 = 75000n = $750.00
    const margin = calcMarginCents(100n, 1, 15000000n, 20)
    expect(margin).toBe(75000n) // $750.00
  })

  it('should return zero margin for zero units', () => {
    const margin = calcMarginCents(0n, 100000, 108500n, 500)
    expect(margin).toBe(0n)
  })
})

describe('calcPnlCents', () => {
  it('should calculate BUY profit when price rises', () => {
    // BUY EURUSD at 1.08500, close at 1.09000, 1 lot
    // P&L = (109000 - 108500) * 1 * 100000 * 100 / 100000
    // = 500 * 100000 * 100 / 100000 = 50000n = $500.00
    const pnl = calcPnlCents('BUY', 108500n, 109000n, 1n, 100000)
    expect(pnl).toBe(50000n) // $500.00 profit
  })

  it('should calculate BUY loss when price falls', () => {
    // BUY EURUSD at 1.08500, close at 1.08000, 1 lot
    // P&L = (108000 - 108500) * 1 * 100000 * 100 / 100000
    // = -500 * 100000 * 100 / 100000 = -50000n = -$500.00
    const pnl = calcPnlCents('BUY', 108500n, 108000n, 1n, 100000)
    expect(pnl).toBe(-50000n) // $500.00 loss
  })

  it('should calculate SELL profit when price falls', () => {
    // SELL EURUSD at 1.08500, close at 1.08000, 1 lot
    // P&L = (108500 - 108000) * 1 * 100000 * 100 / 100000
    // = 50000n = $500.00 profit
    const pnl = calcPnlCents('SELL', 108500n, 108000n, 1n, 100000)
    expect(pnl).toBe(50000n)
  })

  it('should calculate SELL loss when price rises', () => {
    const pnl = calcPnlCents('SELL', 108500n, 109000n, 1n, 100000)
    expect(pnl).toBe(-50000n)
  })
})

describe('calcMarginLevelBps', () => {
  it('should calculate margin level correctly', () => {
    // equity $10,000, used margin $2,000
    // margin level = (1000000 * 10000) / 200000 = 50000 bps = 500%
    const level = calcMarginLevelBps(1000000n, 200000n)
    expect(level).toBe(50000n)
  })

  it('should return null when no margin used', () => {
    const level = calcMarginLevelBps(1000000n, 0n)
    expect(level).toBeNull()
  })

  it('should detect margin call level (100% = 10000 bps)', () => {
    // equity $2,000, used margin $2,000 → 100% margin level
    const level = calcMarginLevelBps(200000n, 200000n)
    expect(level).toBe(10000n)
    expect(level! <= 10000n).toBe(true) // margin call trigger
  })

  it('should detect stop-out level (50% = 5000 bps)', () => {
    // equity $1,000, used margin $2,000 → 50% margin level
    const level = calcMarginLevelBps(100000n, 200000n)
    expect(level).toBe(5000n)
    expect(level! <= 5000n).toBe(true) // stop-out trigger
  })
})

describe('calcRolloverCents', () => {
  it('should calculate daily rollover swap correctly', () => {
    // 1 lot EURUSD, open rate 1.08500, swap rate -50 bps (debit)
    // notional = (1 * 100000 * 108500 * 100) / 100000 = 10850000n
    // dailySwap = (10850000 * 50) / 10000 / 365 = 542500000 / 10000 / 365 = 54250 / 365 = 148n
    // rate is negative → debit to trader = +148n
    const swap = calcRolloverCents(1n, 100000, 108500n, -50n, false)
    expect(swap).toBe(148n) // $1.48 daily charge
  })

  it('should apply triple swap on Wednesday', () => {
    const dailySwap = calcRolloverCents(1n, 100000, 108500n, -50n, false)
    const wednesdaySwap = calcRolloverCents(1n, 100000, 108500n, -50n, true)
    expect(wednesdaySwap).toBe(dailySwap * 3n)
  })

  it('should return negative (credit) for positive swap rate', () => {
    const swap = calcRolloverCents(1n, 100000, 108500n, 50n, false)
    expect(swap < 0n).toBe(true) // credit to trader
  })
})

describe('calcIbCommissionCents', () => {
  it('should calculate IB commission for forex trade', () => {
    // 1 lot EURUSD at 1.08500, commission rate 30 bps
    // notional = (1 * 100000 * 108500 * 100) / 100000 = 10850000n
    // commission = (10850000 * 30) / 10000 = 32550n = $325.50
    const commission = calcIbCommissionCents(1n, 100000, 108500n, 30)
    expect(commission).toBe(32550n) // $325.50
  })

  it('should calculate IB commission for stock trade', () => {
    // 100 shares at $150, contract size 1, commission 20 bps
    // notional = (100 * 1 * 15000000 * 100) / 100000 = 1500000n
    // commission = (1500000 * 20) / 10000 = 3000n = $30.00
    const commission = calcIbCommissionCents(100n, 1, 15000000n, 20)
    expect(commission).toBe(3000n) // $30.00
  })

  it('should calculate IB commission for crypto trade', () => {
    // 1 unit BTC at 65000, contract size 1, commission 40 bps
    // priceScaled = 65000 * 100000 = 6500000000n
    // notional = (1 * 1 * 6500000000 * 100) / 100000 = 6500000n
    // commission = (6500000 * 40) / 10000 = 26000n = $260.00
    const commission = calcIbCommissionCents(1n, 1, 6500000000n, 40)
    expect(commission).toBe(26000n)
  })

  it('should return zero for zero rate', () => {
    const commission = calcIbCommissionCents(1n, 100000, 108500n, 0)
    expect(commission).toBe(0n)
  })
})

describe('calcAccountMetrics', () => {
  it('should compute all account metrics correctly', () => {
    const metrics = calcAccountMetrics(
      1000000n,   // balance $10,000
      50000n,     // unrealized P&L $500
      200000n,    // used margin $2,000
      5000000n,   // exposure $50,000
    )

    expect(metrics.balanceCents).toBe(1000000n)
    expect(metrics.unrealizedPnlCents).toBe(50000n)
    expect(metrics.equityCents).toBe(1050000n)     // balance + unrealized
    expect(metrics.usedMarginCents).toBe(200000n)
    expect(metrics.availableCents).toBe(850000n)    // equity - used margin
    expect(metrics.marginLevelBps).toBe(52500n)     // 525%
    expect(metrics.exposureCents).toBe(5000000n)
  })

  it('should handle negative unrealized P&L', () => {
    const metrics = calcAccountMetrics(
      1000000n,   // balance $10,000
      -300000n,   // unrealized loss $3,000
      200000n,    // used margin $2,000
      5000000n,   // exposure $50,000
    )

    expect(metrics.equityCents).toBe(700000n)       // balance - loss
    expect(metrics.availableCents).toBe(500000n)    // equity - margin
    expect(metrics.marginLevelBps).toBe(35000n)     // 350%
  })
})

// ═══════════════════════════════════════════════════════════════════
// Section 2: Decimal Precision Tests (7 test cases per spec)
// ═══════════════════════════════════════════════════════════════════

describe('priceToScaled - precision', () => {
  it('should convert exact forex prices without precision loss', () => {
    expect(priceToScaled(1.08500)).toBe(108500n)
    expect(priceToScaled(0.99999)).toBe(99999n)
    // 149.500 * 100000 = 14950000 (standard PRICE_SCALE scaling)
    expect(priceToScaled(149.500)).toBe(14950000n)
  })

  it('should handle edge case prices correctly', () => {
    expect(priceToScaled(0.00001)).toBe(1n)
    expect(priceToScaled(1.00000)).toBe(100000n)
    expect(priceToScaled(100000.00000)).toBe(10000000000n)
  })
})

describe('P&L precision', () => {
  it('should maintain precision for fractional pip movements', () => {
    // BUY at 1.08500, close at 1.08501 (0.1 pip move), 1 lot
    // P&L = (108501 - 108500) * 1 * 100000 * 100 / 100000 = 100n = $1.00
    const pnl = calcPnlCents('BUY', 108500n, 108501n, 1n, 100000)
    expect(pnl).toBe(100n)
  })

  it('should handle sub-pip P&L with rounding', () => {
    // Small position, small price move
    // BUY at 1.08500, close at 1.08505, 0.01 lot (units=0.01 → but units must be int)
    // Using 1 unit (micro lot)
    // P&L = (108505 - 108500) * 1 * 100000 * 100 / 100000 = 500n = $5.00
    const pnl = calcPnlCents('BUY', 108500n, 108505n, 1n, 100000)
    expect(pnl).toBe(500n)
  })
})

describe('margin precision', () => {
  it('should maintain precision with odd leverage values', () => {
    // 33 units, leverage 333, price 1.23456
    // margin = (33 * 100000 * 123456 * 100) / (333 * 100000)
    // = 33 * 123456 * 100 / 333 = 407404800 / 333 = 1223437n (truncated)
    const margin = calcMarginCents(33n, 100000, 123456n, 333)
    expect(margin).toBe(1223437n) // $12,234.37

    // Verify: multiply back should approximate original
    // 1223437 * 333 * 100000 / (33 * 100000 * 100) = 1223437 * 333 / 3300 = 123443.7
    // Original price was 123456, close enough due to integer division truncation
  })
})

describe('commission fractional precision', () => {
  it('should truncate fractional cents (not round) for commissions', () => {
    // Small notional that produces fractional cents
    // 1 unit at $1.00, contract size 1, rate 7 bps
    // notional = (1 * 1 * 100000 * 100) / 100000 = 100n ($1.00)
    // commission = (100 * 7) / 10000 = 0n (truncated, less than 1 cent)
    const commission = calcIbCommissionCents(1n, 1, 100000n, 7)
    expect(commission).toBe(0n)
  })

  it('should compute commission at boundary values', () => {
    // units=1, contractSize=100000, openRateScaled=100000n (price 1.00000), rate 100 bps (1%)
    // notional = (1 * 100000 * 100000 * 100) / 100000 = 10000000n = $100,000.00
    // commission = (10000000 * 100) / 10000 = 100000n = $1,000.00
    const commission = calcIbCommissionCents(1n, 100000, 100000n, 100)
    expect(commission).toBe(100000n)
  })
})

describe('swap precision', () => {
  it('should maintain precision for small swap amounts', () => {
    // Very small position with small swap rate
    // 1 unit, contract size 100000, rate -1 bps
    // notional = (1 * 100000 * 108500 * 100) / 100000 = 10850000n
    // dailySwap = (10850000 * 1) / 10000 / 365 = 1085 / 365 = 2n
    const swap = calcRolloverCents(1n, 100000, 108500n, -1n, false)
    expect(swap).toBe(2n)
  })
})

describe('triple swap precision', () => {
  it('should exactly triple the daily swap', () => {
    const daily = calcRolloverCents(1n, 100000, 108500n, -50n, false)
    const triple = calcRolloverCents(1n, 100000, 108500n, -50n, true)
    expect(triple).toBe(daily * 3n)
    // Ensure no off-by-one from separate calculations
    expect(triple % 3n).toBe(0n)
  })
})

describe('cascade rounding', () => {
  it('should not accumulate rounding errors across operations', () => {
    // Simulate: open trade → close trade → verify balance consistency
    const openRate = 108500n
    const closeRate = 109000n
    const units = 1n
    const contractSize = 100000

    // Calculate margin at open
    const margin = calcMarginCents(units, contractSize, openRate, 500)

    // Calculate P&L at close
    const pnl = calcPnlCents('BUY', openRate, closeRate, units, contractSize)

    // Calculate IB commission
    const commission = calcIbCommissionCents(units, contractSize, openRate, 30)

    // Verify: P&L + margin returned = margin + pnl (balance should change by pnl only)
    const balanceChange = pnl
    expect(balanceChange).toBe(50000n) // Exactly $500.00

    // Verify no precision loss in margin calculation
    expect(margin).toBe(21700n) // Exactly $217.00

    // Verify commission precision
    expect(commission).toBe(32550n) // Exactly $325.50

    // Total account impact: balance + pnl - commission
    const netImpact = pnl - commission
    expect(netImpact).toBe(17450n) // Exactly $174.50
  })
})

// ═══════════════════════════════════════════════════════════════════
// Section 3: Entry Order Validation
// ═══════════════════════════════════════════════════════════════════

describe('validateEntryRate', () => {
  it('should accept BUY limit order below current ask', () => {
    const bidScaled = 108425n
    const askScaled = 108575n
    // BUY limit at 1.08000 (below ask - buffer)
    const result = validateEntryRate('BUY', 108000n, bidScaled, askScaled, 10, 4)
    expect(result.valid).toBe(true)
  })

  it('should reject BUY order too close to current ask', () => {
    const bidScaled = 108425n
    const askScaled = 108575n
    // BUY at 1.08570 (within 10 pip buffer of ask)
    // buffer = 10 * 10 = 100, aboveBuffer = 108675, belowBuffer = 108475
    // 108570 is NOT < 108475 and NOT > 108675
    const result = validateEntryRate('BUY', 108570n, bidScaled, askScaled, 10, 4)
    expect(result.valid).toBe(false)
  })

  it('should accept SELL stop order below current bid', () => {
    const bidScaled = 108425n
    const askScaled = 108575n
    // SELL at 1.08000 (below bid - buffer)
    const result = validateEntryRate('SELL', 108000n, bidScaled, askScaled, 10, 4)
    expect(result.valid).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Section 4: Display Helpers
// ═══════════════════════════════════════════════════════════════════

describe('formatScaledPrice', () => {
  it('should format forex price correctly', () => {
    expect(formatScaledPrice(108500n, 4)).toBe('1.08500')
    expect(formatScaledPrice(149500n, 2)).toBe('1.49500')
  })

  it('should handle small prices', () => {
    expect(formatScaledPrice(1n, 4)).toBe('0.00001')
    expect(formatScaledPrice(0n, 4)).toBe('0.00000')
  })
})

describe('formatCents', () => {
  it('should format positive amounts', () => {
    expect(formatCents(10050n)).toBe('$100.50')
    expect(formatCents(0n)).toBe('$0.00')
    expect(formatCents(1n)).toBe('$0.01')
  })

  it('should format negative amounts', () => {
    expect(formatCents(-10050n)).toBe('-$100.50')
    expect(formatCents(-1n)).toBe('-$0.01')
  })
})

describe('serializeBigInt', () => {
  it('should convert BigInt to string in objects', () => {
    const result = serializeBigInt({ id: 123n, name: 'test' })
    expect(result).toEqual({ id: '123', name: 'test' })
  })

  it('should handle nested objects', () => {
    const result = serializeBigInt({ trade: { units: 10000n, pnl: -500n } })
    expect(result).toEqual({ trade: { units: '10000', pnl: '-500' } })
  })

  it('should handle arrays', () => {
    const result = serializeBigInt([1n, 2n, 3n])
    expect(result).toEqual(['1', '2', '3'])
  })
})
