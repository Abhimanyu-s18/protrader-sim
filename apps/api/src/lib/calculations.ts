/**
 * ProTraderSim Financial Calculation Engine
 *
 * RULES:
 * - ALL inputs and outputs are BigInt
 * - Prices stored scaled x100000 (e.g. 1.08500 = 108500n)
 * - Money stored in cents (e.g. $100.00 = 10000n)
 * - NEVER cast to Number/Float during intermediate steps
 * - Division is always the LAST step, using integer arithmetic
 */

// ── Constants ─────────────────────────────────────────────────────
export const PRICE_SCALE = 100000n   // Price scaling factor (5 decimal places)
export const CENTS = 100n            // Dollar-to-cents factor
export const BPS_SCALE = 10000n      // Basis points scale (10000 bps = 100.00%)
export const DAYS_PER_YEAR = 365n

// ── Spread Application ────────────────────────────────────────────
/**
 * Calculate bid/ask from mid price and spread pips
 * @param midScaled - mid price x100000
 * @param spreadPips - spread in pips (integer)
 * @param pipDecimalPlaces - 4 for EURUSD, 2 for USDJPY
 */
export function calcBidAsk(
  midScaled: bigint,
  spreadPips: number,
  pipDecimalPlaces: number,
): { bidScaled: bigint; askScaled: bigint } {
  // pip size = 10^(5 - pipDecimalPlaces) in scaled units
  const pipSizeScaled = BigInt(10 ** (5 - pipDecimalPlaces))
  const halfSpreadScaled = (BigInt(spreadPips) * pipSizeScaled) / 2n

  return {
    bidScaled: midScaled - halfSpreadScaled,
    askScaled: midScaled + halfSpreadScaled,
  }
}

// ── Margin Calculation ────────────────────────────────────────────
/**
 * Calculate required margin in cents
 *
 * Formula: margin_cents = (units × contractSize × openRateScaled × CENTS) / (leverage × PRICE_SCALE)
 *
 * @param units - number of units (e.g. 10000)
 * @param contractSize - instrument contract size (e.g. 100000 for forex, 1 for stocks)
 * @param openRateScaled - entry price × 100000
 * @param leverage - leverage ratio (e.g. 500)
 */
export function calcMarginCents(
  units: bigint,
  contractSize: number,
  openRateScaled: bigint,
  leverage: number,
): bigint {
  const numerator = units * BigInt(contractSize) * openRateScaled * CENTS
  const denominator = BigInt(leverage) * PRICE_SCALE
  return numerator / denominator
}

// ── P&L Calculation ───────────────────────────────────────────────
/**
 * Calculate unrealized or realized P&L in cents
 * BUY:  pnl = (currentBid - openRate) × units × contractSize × CENTS / PRICE_SCALE
 * SELL: pnl = (openRate - currentAsk) × units × contractSize × CENTS / PRICE_SCALE
 *
 * Returns signed BigInt — positive = profit, negative = loss
 *
 * @param direction - 'BUY' or 'SELL'
 * @param openRateScaled - entry price × 100000
 * @param currentPriceScaled - current bid (for BUY) or ask (for SELL) × 100000
 * @param units - number of units
 * @param contractSize - instrument contract size
 */
export function calcPnlCents(
  direction: 'BUY' | 'SELL',
  openRateScaled: bigint,
  currentPriceScaled: bigint,
  units: bigint,
  contractSize: number,
): bigint {
  const priceDiff = direction === 'BUY'
    ? currentPriceScaled - openRateScaled   // profit when price rises
    : openRateScaled - currentPriceScaled   // profit when price falls

  return (priceDiff * units * BigInt(contractSize) * CENTS) / PRICE_SCALE
}

// ── Margin Level ──────────────────────────────────────────────────
/**
 * Calculate margin level in basis points
 * Formula: (equity / usedMargin) × 10000
 * Returns null when usedMargin is 0 (no open positions)
 *
 * 10000 bps = 100.00%
 * 15000 bps = 150.00%
 */
export function calcMarginLevelBps(
  equityCents: bigint,
  usedMarginCents: bigint,
): bigint | null {
  if (usedMarginCents === 0n) return null
  return (equityCents * BPS_SCALE) / usedMarginCents
}

// ── Account Metrics (computed — never stored) ─────────────────────
export interface AccountMetrics {
  balanceCents: bigint
  unrealizedPnlCents: bigint
  equityCents: bigint
  usedMarginCents: bigint
  availableCents: bigint
  marginLevelBps: bigint | null
  exposureCents: bigint
}

export function calcAccountMetrics(
  balanceCents: bigint,
  unrealizedPnlCents: bigint,
  usedMarginCents: bigint,
  exposureCents: bigint,
): AccountMetrics {
  const equityCents = balanceCents + unrealizedPnlCents
  const availableCents = equityCents - usedMarginCents
  const marginLevelBps = calcMarginLevelBps(equityCents, usedMarginCents)

  return {
    balanceCents,
    unrealizedPnlCents,
    equityCents,
    usedMarginCents,
    availableCents,
    marginLevelBps,
    exposureCents,
  }
}

// ── Rollover / Overnight Swap ─────────────────────────────────────
/**
 * Calculate daily overnight swap fee in cents
 * Formula: (units × contractSize × openRateScaled × CENTS / PRICE_SCALE) × |rateBps| / BPS_SCALE / DAYS_PER_YEAR
 * On Wednesday: multiply by 3
 *
 * Returns positive = fee charged to trader (debit)
 *
 * @param units - position units
 * @param contractSize - contract size
 * @param openRateScaled - open rate × 100000
 * @param rateBps - swap rate in basis points (signed — negative = debit to trader)
 * @param isWednesday - whether to apply triple swap
 */
export function calcRolloverCents(
  units: bigint,
  contractSize: number,
  openRateScaled: bigint,
  rateBps: bigint,
  isWednesday: boolean,
): bigint {
  const notionalCents = (units * BigInt(contractSize) * openRateScaled * CENTS) / PRICE_SCALE
  const dailySwap = (notionalCents * (rateBps < 0n ? -rateBps : rateBps)) / BPS_SCALE / DAYS_PER_YEAR
  const multiplier = isWednesday ? 3n : 1n
  // If rate is negative, it's a debit to the trader (positive charge)
  // If rate is positive, it's a credit to the trader (negative charge = income)
  return rateBps < 0n ? dailySwap * multiplier : -(dailySwap * multiplier)
}

// ── Entry Order Validation ────────────────────────────────────────
/**
 * Validate an entry order rate
 * BUY entry valid if: rate < currentAsk - buffer OR rate > currentAsk + buffer
 * SELL entry valid if: rate > currentBid + buffer OR rate < currentBid - buffer
 *
 * @param direction - 'BUY' or 'SELL'
 * @param entryRateScaled - proposed entry rate × 100000
 * @param bidScaled - current bid × 100000
 * @param askScaled - current ask × 100000
 * @param minStopDistancePips - minimum distance in pips
 * @param pipDecimalPlaces - pip precision
 */
export function validateEntryRate(
  direction: 'BUY' | 'SELL',
  entryRateScaled: bigint,
  bidScaled: bigint,
  askScaled: bigint,
  minStopDistancePips: number,
  pipDecimalPlaces: number,
): { valid: boolean; hint: string } {
  const pipSizeScaled = BigInt(10 ** (5 - pipDecimalPlaces))
  const bufferScaled = BigInt(minStopDistancePips) * pipSizeScaled

  const refPrice = direction === 'BUY' ? askScaled : bidScaled
  const aboveBuffer = refPrice + bufferScaled
  const belowBuffer = refPrice - bufferScaled

  const valid =
    direction === 'BUY'
      ? entryRateScaled < belowBuffer || entryRateScaled > aboveBuffer
      : entryRateScaled > aboveBuffer || entryRateScaled < belowBuffer

  const hint = `Rate should be above ${formatScaledPrice(aboveBuffer, pipDecimalPlaces)} or below ${formatScaledPrice(belowBuffer, pipDecimalPlaces)}`

  return { valid, hint }
}

// ── IB Commission ────────────────────────────────────────────────
/**
 * Calculate IB agent commission on a trade
 * Formula: notionalCents × rateBps / BPS_SCALE
 */
export function calcIbCommissionCents(
  units: bigint,
  contractSize: number,
  openRateScaled: bigint,
  rateBps: number,
): bigint {
  const notionalCents = (units * BigInt(contractSize) * openRateScaled * CENTS) / PRICE_SCALE
  return (notionalCents * BigInt(rateBps)) / BPS_SCALE
}

// ── Display Helpers ───────────────────────────────────────────────
/**
 * Format a scaled price back to decimal string
 * e.g. 108500n with pipDecimalPlaces=4 → "1.08500"
 */
export function formatScaledPrice(scaled: bigint, pipDecimalPlaces: number): string {
  const totalDecimals = 5 // Always 5 decimal places in our scale
  const str = scaled.toString().padStart(totalDecimals + 1, '0')
  const intPart = str.slice(0, -(totalDecimals))
  const decPart = str.slice(-(totalDecimals))
  return `${intPart}.${decPart}`
}

/**
 * Format cents to dollar display string
 * e.g. 10050n → "$100.50"
 */
export function formatCents(cents: bigint, currencySymbol = '$'): string {
  const abs = cents < 0n ? -cents : cents
  const dollars = abs / 100n
  const centsPart = abs % 100n
  const formatted = `${currencySymbol}${dollars}.${centsPart.toString().padStart(2, '0')}`
  return cents < 0n ? `-${formatted}` : formatted
}

/**
 * Safely serialize BigInt values for JSON responses
 * Call this before res.json() on any object containing BigInt
 */
export function serializeBigInt(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))
}
