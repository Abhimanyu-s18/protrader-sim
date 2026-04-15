// Forex trading content data
// Last reviewed: 2026-04-05
// Source: ProTraderSim trading specifications
// NOTE: CMS/API integration is implemented via getTradingContent() which fetches from
// /api/content/forex-trading with fallback to static constants. Ensure backend endpoint
// is created to serve dynamic content; currently all requests fall back to static data.

import type React from 'react'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'
export interface ForexPair {
  symbol: string
  description: string
  minSpread: string
  typicalSpread: string
  maxLeverage: string
  hours: string
  lastUpdated: string
  source: string
}

export interface KeySpec {
  label: string
  value: string
  lastUpdated: string
  source: string
}

export interface Feature {
  title: string
  description: string
  icon: () => React.ReactElement
  lastUpdated: string
  source: string
}

export interface Step {
  number: string
  title: string
  description: string
  time: string
  lastUpdated: string
  source: string
}

export const FOREX_PAIRS: readonly ForexPair[] = [
  {
    symbol: 'EUR/USD',
    description: 'Euro / US Dollar',
    minSpread: '0.0',
    typicalSpread: '0.7',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    symbol: 'GBP/USD',
    description: 'British Pound / US Dollar',
    minSpread: '0.0',
    typicalSpread: '0.9',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    symbol: 'USD/JPY',
    description: 'US Dollar / Japanese Yen',
    minSpread: '0.0',
    typicalSpread: '1.1',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    symbol: 'USD/CHF',
    description: 'US Dollar / Swiss Franc',
    minSpread: '0.0',
    typicalSpread: '1.2',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    symbol: 'AUD/USD',
    description: 'Australian Dollar / US Dollar',
    minSpread: '0.0',
    typicalSpread: '1.0',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    symbol: 'USD/CAD',
    description: 'US Dollar / Canadian Dollar',
    minSpread: '0.0',
    typicalSpread: '1.4',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    symbol: 'NZD/USD',
    description: 'New Zealand Dollar / US Dollar',
    minSpread: '0.0',
    typicalSpread: '1.3',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    symbol: 'EUR/GBP',
    description: 'Euro / British Pound',
    minSpread: '0.0',
    typicalSpread: '1.5',
    maxLeverage: '500:1',
    hours: '24/5',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
] as const

export const KEY_SPECS: readonly KeySpec[] = [
  {
    label: 'Contract Size',
    value: '100,000 units',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    label: 'Min Trade Size',
    value: '0.01 lots',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    label: 'Pip Value',
    value: '$10 per lot (majors)',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    label: 'Margin Requirement',
    value: 'From 0.2%',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    label: 'Swap',
    value: 'Charged at 00:00 server time',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    label: 'Max Order Size',
    value: '50 lots',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
] as const

export const FEATURES: readonly Feature[] = [
  {
    title: 'Tight Raw Spreads',
    description: 'EUR/USD from 0.0 pips on Pro accounts with direct market access pricing.',
    icon: () => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    title: 'Fast Execution',
    description: 'Sub-millisecond execution with no requotes, no dealing desk intervention.',
    icon: () => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    title: '24/5 Market Access',
    description: 'Trade Sunday 22:00 to Friday 22:00 UTC across all major currency pairs.',
    icon: () => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
  {
    title: 'Advanced Risk Tools',
    description:
      'Stop loss, take profit, and trailing stop on every order to manage your exposure.',
    icon: () => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading specifications',
  },
] as const

export const STEPS: readonly Step[] = [
  {
    number: '01',
    title: 'Open Your Account',
    description: 'Complete registration in under 3 minutes with just your email address.',
    time: '3 min',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim onboarding process',
  },
  {
    number: '02',
    title: 'Fund Your Account',
    description: 'Deposit via crypto with near-instant confirmation and no hidden fees.',
    time: 'Instant',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim payment integration',
  },
  {
    number: '03',
    title: 'Select a Forex Pair',
    description: 'Browse 60+ currency pairs and select your preferred instrument.',
    time: '1 min',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim instrument selection',
  },
  {
    number: '04',
    title: 'Place Your Trade',
    description: 'Set your lot size, stop loss, and take profit then execute at market price.',
    time: '1 click',
    lastUpdated: '2026-04-05',
    source: 'ProTraderSim trading interface',
  },
] as const

// Loader function for fetching trading content
// TODO: Replace with actual API/CMS integration
export interface TradingContent {
  forexPairs: readonly ForexPair[]
  keySpecs: readonly KeySpec[]
  features: readonly Feature[]
  steps: readonly Step[]
}

const forexPairSchema = z.object({
  symbol: z.string(),
  description: z.string(),
  minSpread: z.string(),
  typicalSpread: z.string(),
  maxLeverage: z.string(),
  hours: z.string(),
  lastUpdated: z.string(),
  source: z.string(),
})

const keySpecSchema = z.object({
  label: z.string(),
  value: z.string(),
  lastUpdated: z.string(),
  source: z.string(),
})

const featureSchema = z.object({
  title: z.string(),
  description: z.string(),
  lastUpdated: z.string(),
  source: z.string(),
  icon: z.unknown(),
})

const stepSchema = z.object({
  number: z.string(),
  title: z.string(),
  description: z.string(),
  time: z.string(),
  lastUpdated: z.string(),
  source: z.string(),
})

const tradingContentSchema = z.object({
  forexPairs: z.array(forexPairSchema),
  keySpecs: z.array(keySpecSchema),
  features: z.array(featureSchema),
  steps: z.array(stepSchema),
})

const DEFAULT_TIMEOUT_MS = 10000 // 10 seconds

function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BASE_URL environment variable is not set. Cannot construct API URL for server-side fetching.',
    )
  }
  return `${baseUrl}${path}`
}

async function fetchTradingContentFromApi(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<TradingContent> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(getApiUrl('/api/content/forex-trading'), {
      signal: controller.signal,
      next: { revalidate: 300 },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch trading content: ${response.status} ${response.statusText}`)
    }

    const parsed = await response.json()

    const validationResult = tradingContentSchema.safeParse(parsed)
    if (!validationResult.success) {
      const issues = validationResult.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      throw new Error(
        `Trading content validation failed: ${issues}. Response: ${JSON.stringify(parsed).slice(0, 500)}`,
      )
    }

    return parsed as TradingContent
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(`Trading content fetch timed out after ${timeoutMs}ms`)
      }
      throw err
    }
    throw new Error(`Unexpected error fetching trading content: ${String(err)}`)
  }
}

const getCachedTradingContent = unstable_cache(
  async (): Promise<TradingContent> => {
    try {
      const data = await fetchTradingContentFromApi()
      return data
    } catch (err) {
      console.error('Failed to fetch trading content:', err)
      throw err
    }
  },
  ['trading-content'],
  {
    revalidate: 300, // 5 minutes
    tags: ['forex-trading'],
  },
)

export async function getTradingContent(): Promise<TradingContent> {
  try {
    return await getCachedTradingContent()
  } catch {
    // Fall back to static constants if fetch fails
    return {
      forexPairs: FOREX_PAIRS,
      keySpecs: KEY_SPECS,
      features: FEATURES,
      steps: STEPS,
    }
  }
}
