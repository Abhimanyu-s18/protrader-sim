export type InstrumentCategory = 'Forex' | 'Stocks' | 'Indices' | 'Commodities' | 'Crypto'

/**
 * Discriminated union representing trading hours availability.
 * @example { kind: '24/5' } or { kind: 'custom', customRange: '14:30–21:00 UTC' }
 */
export type HoursType =
  | { kind: '24/7' }
  | { kind: '24/5' }
  | { kind: '23/5' }
  | { kind: 'custom'; customRange: string }

/**
 * Represents the spread with value and unit.
 * @example { value: 0.7, unit: 'pips' } or { value: 0.02, unit: '$' }
 */
export interface SpreadType {
  value: number
  unit: 'pips' | 'percentage' | 'points' | '$'
}

export interface Instrument {
  symbol: string
  name: string
  category: InstrumentCategory
  spread: SpreadType
  leverage: string
  hours: HoursType
}

/**
 * Instrument leverage limits are set with regulatory compliance as a priority:
 *
 * - Forex majors (EUR/USD, GBP/USD, etc.): 30:1 max (complies with ESMA, ASIC, DFSA limits)
 * - Forex minors/exotics: 20:1 (conservative for lower-liquidity pairs)
 * - Stocks: 20:1 (appropriate for equity leverage caps)
 * - Indices: 100:1 (standard for index CFDs)
 * - Commodities: 100:1 (standard for commodity CFDs)
 * - Crypto: 5–10:1 (conservative due to high volatility)
 *
 * Note: The Instrument model in the database stores leverage as an Int column.
 * This is displayed data only; the actual leverage enforced during trading is controlled
 * by the API and enforced per-user jurisdiction via middleware.
 *
 * TODO: Implement jurisdiction-aware leverage enforcement:
 * 1. Add user.jurisdiction field to Prisma schema
 * 2. Create getLeverageLimit(jurisdiction, assetClass) helper
 * 3. Enforce via requireKYC middleware in API routes
 * 4. Add unit tests validating leverage per jurisdiction
 */
export const INSTRUMENTS = [
  // Forex - REGULATORY COMPLIANT LEVERAGE
  // ESMA (EU), ASIC (AU), DFSA (UAE) cap majors at 30:1 for retail
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'Forex',
    spread: { value: 0.7, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    category: 'Forex',
    spread: { value: 0.9, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    category: 'Forex',
    spread: { value: 1.1, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  {
    symbol: 'AUD/USD',
    name: 'Australian Dollar / US Dollar',
    category: 'Forex',
    spread: { value: 1.0, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  {
    symbol: 'USD/CHF',
    name: 'US Dollar / Swiss Franc',
    category: 'Forex',
    spread: { value: 1.2, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  {
    symbol: 'USD/CAD',
    name: 'US Dollar / Canadian Dollar',
    category: 'Forex',
    spread: { value: 1.4, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  {
    symbol: 'NZD/USD',
    name: 'New Zealand Dollar / US Dollar',
    category: 'Forex',
    spread: { value: 1.3, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  {
    symbol: 'EUR/GBP',
    name: 'Euro / British Pound',
    category: 'Forex',
    spread: { value: 1.5, unit: 'pips' },
    leverage: '30:1',
    hours: { kind: '24/5' },
  },
  // Stocks
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'Stocks',
    spread: { value: 0.02, unit: '$' },
    leverage: '20:1',
    hours: { kind: 'custom', customRange: '14:30–21:00 UTC' },
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    category: 'Stocks',
    spread: { value: 0.03, unit: '$' },
    leverage: '20:1',
    hours: { kind: 'custom', customRange: '14:30–21:00 UTC' },
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    category: 'Stocks',
    spread: { value: 0.05, unit: '$' },
    leverage: '10:1',
    hours: { kind: 'custom', customRange: '14:30–21:00 UTC' },
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    category: 'Stocks',
    spread: { value: 0.04, unit: '$' },
    leverage: '20:1',
    hours: { kind: 'custom', customRange: '14:30–21:00 UTC' },
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    category: 'Stocks',
    spread: { value: 0.04, unit: '$' },
    leverage: '20:1',
    hours: { kind: 'custom', customRange: '14:30–21:00 UTC' },
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    category: 'Stocks',
    spread: { value: 0.05, unit: '$' },
    leverage: '10:1',
    hours: { kind: 'custom', customRange: '14:30–21:00 UTC' },
  },
  // Indices
  {
    symbol: 'US500',
    name: 'S&P 500 Index',
    category: 'Indices',
    spread: { value: 0.4, unit: 'points' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  {
    symbol: 'US30',
    name: 'Dow Jones Industrial',
    category: 'Indices',
    spread: { value: 3.0, unit: 'points' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  {
    symbol: 'US100',
    name: 'NASDAQ 100',
    category: 'Indices',
    spread: { value: 1.0, unit: 'points' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  {
    symbol: 'UK100',
    name: 'FTSE 100 Index',
    category: 'Indices',
    spread: { value: 1.5, unit: 'points' },
    leverage: '100:1',
    // NOTE: UK stock exchange hours (08:00–16:30 UTC) are fixed UTC windows.
    // No seasonal DST adjustment applied here; backend/frontend should handle DST locally if needed.
    hours: { kind: 'custom', customRange: '08:00–16:30 UTC' },
  },
  {
    symbol: 'GER40',
    name: 'DAX 40 Index',
    category: 'Indices',
    spread: { value: 1.8, unit: 'points' },
    leverage: '100:1',
    // NOTE: German stock exchange hours (08:00–16:30 UTC) are fixed UTC windows.
    // No seasonal DST adjustment applied here; backend/frontend should handle DST locally if needed.
    hours: { kind: 'custom', customRange: '08:00–16:30 UTC' },
  },
  {
    symbol: 'JPN225',
    name: 'Nikkei 225',
    category: 'Indices',
    spread: { value: 7.0, unit: 'points' },
    leverage: '100:1',
    hours: { kind: 'custom', customRange: '00:00–11:30 UTC' }, // includes extended/futures session
  },
  // Commodities
  {
    symbol: 'XAUUSD',
    name: 'Gold',
    category: 'Commodities',
    spread: { value: 0.35, unit: '$' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  {
    symbol: 'XAGUSD',
    name: 'Silver',
    category: 'Commodities',
    spread: { value: 0.03, unit: '$' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  {
    symbol: 'USOIL',
    name: 'Crude Oil WTI',
    category: 'Commodities',
    spread: { value: 0.05, unit: '$' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  {
    symbol: 'UKOIL',
    name: 'Brent Crude',
    category: 'Commodities',
    spread: { value: 0.05, unit: '$' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  {
    symbol: 'NATGAS',
    name: 'Natural Gas',
    category: 'Commodities',
    spread: { value: 0.003, unit: '$' },
    leverage: '100:1',
    hours: { kind: '23/5' },
  },
  // Crypto
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    category: 'Crypto',
    spread: { value: 40, unit: '$' },
    leverage: '10:1',
    hours: { kind: '24/7' },
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum',
    category: 'Crypto',
    spread: { value: 3.0, unit: '$' },
    leverage: '10:1',
    hours: { kind: '24/7' },
  },
  {
    symbol: 'BNB/USD',
    name: 'BNB',
    category: 'Crypto',
    spread: { value: 0.5, unit: '$' },
    leverage: '5:1',
    hours: { kind: '24/7' },
  },
  {
    symbol: 'SOL/USD',
    name: 'Solana',
    category: 'Crypto',
    spread: { value: 0.2, unit: '$' },
    leverage: '5:1',
    hours: { kind: '24/7' },
  },
  {
    symbol: 'XRP/USD',
    name: 'Ripple',
    category: 'Crypto',
    spread: { value: 0.0003, unit: '$' },
    leverage: '5:1',
    hours: { kind: '24/7' },
  },
] as const satisfies Instrument[]

export const INSTRUMENTS_COUNT = INSTRUMENTS.length
