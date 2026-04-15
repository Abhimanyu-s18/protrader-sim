/**
 * Shared constants for home page components
 *
 * NOTE: TICKER_ITEMS is placeholder/mock data for UI development.
 * Real-time market prices should be loaded from a live pricing API in production.
 */

export interface TickerItem {
  symbol: string
  price: string
  change: string
}

export interface AccountType {
  name: string
  tagline: string
  slug: string
  spreadsPips: number
  leverageNumerator: number
  leverageDenominator: number
  commissionPerLot: number | null
  minDepositAmount: number
  minDepositCurrency: string
  highlighted: boolean
  features: string[]
}

export const TICKER_ITEMS: TickerItem[] = [
  { symbol: 'EUR/USD', price: '1.08452', change: '+0.12%' },
  { symbol: 'GBP/USD', price: '1.26731', change: '-0.08%' },
  { symbol: 'USD/JPY', price: '149.821', change: '+0.31%' },
  { symbol: 'BTC/USD', price: '67,240', change: '+1.45%' },
  { symbol: 'Gold', price: '2,341.50', change: '+0.22%' },
  { symbol: 'S&P 500', price: '5,187.3', change: '+0.54%' },
  { symbol: 'AAPL', price: '189.84', change: '+0.67%' },
  { symbol: 'EUR/GBP', price: '0.85621', change: '-0.03%' },
  { symbol: 'Crude Oil', price: '78.43', change: '-0.91%' },
  { symbol: 'ETH/USD', price: '3,521', change: '+2.18%' },
]

const buildLeverageFeature = (numerator: number, denominator: number) =>
  `Up to ${numerator}:${denominator} leverage`

const createAccountType = (
  account: Omit<AccountType, 'features'> & { extraFeatures: string[] },
): AccountType => ({
  ...account,
  features: [
    'Access to all 150+ instruments',
    buildLeverageFeature(account.leverageNumerator, account.leverageDenominator),
    ...account.extraFeatures,
  ],
})

// Sample/demo account tier values. Leverage figures are illustrative only and are not live offerings.
// Actual leverage is subject to local regulatory limits and may be lower than displayed.
export const ACCOUNT_TYPES: AccountType[] = [
  createAccountType({
    name: 'Standard',
    tagline: 'Perfect for beginners',
    slug: 'standard',
    spreadsPips: 1.0,
    leverageNumerator: 30,
    leverageDenominator: 1,
    commissionPerLot: null,
    minDepositAmount: 100,
    minDepositCurrency: 'USD',
    highlighted: false,
    extraFeatures: ['MetaTrader-style interface', 'Email & chat support'],
  }),
  createAccountType({
    name: 'Pro',
    tagline: 'For active traders',
    slug: 'pro',
    spreadsPips: 0.1,
    leverageNumerator: 50,
    leverageDenominator: 1,
    commissionPerLot: 3,
    minDepositAmount: 500,
    minDepositCurrency: 'USD',
    highlighted: true,
    extraFeatures: [
      'Priority order routing',
      'Advanced analytics dashboard',
      'Dedicated account manager',
      'API access included',
    ],
  }),
  createAccountType({
    name: 'VIP',
    tagline: 'Institutional-grade',
    slug: 'vip',
    spreadsPips: 0.0,
    leverageNumerator: 30,
    leverageDenominator: 1,
    commissionPerLot: 2,
    minDepositAmount: 5000,
    minDepositCurrency: 'USD',
    highlighted: false,
    extraFeatures: [
      'Institutional-grade execution',
      'Private liquidity pool',
      'Bespoke risk management',
      'Direct dealer line',
      'Monthly performance reports',
    ],
  }),
]
