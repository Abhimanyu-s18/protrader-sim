---
name: shared-utilities-patterns
description: Rules for using shared utility functions and types
applyTo: 'packages/utils/src/**/*.ts, packages/types/src/**/*.ts, apps/*/src/**/*.ts'
---

# Shared Utilities & Types Patterns

## Philosophy

`@protrader/utils` and `@protrader/types` are the **single source of truth** for common functions and types. All apps import from these packages, ensuring consistency across the platform.

```
packages/
├── types/           ← Enums, API response shapes, TypeScript types
├── utils/           ← Formatting, conversions, API client factory
└── ...

apps/
├── web/             ┐
├── auth/            ├─ All import from @protrader/types & @protrader/utils
├── platform/        │
├── admin/           ┤
├── ib-portal/       │
└── api/             ┘
```

## Money Formatting & Conversion

### Dollar ↔ Cents Conversion

All money is stored as **cents** (BigInt) in the database. Convert to/from dollars in:

- API responses (display as cents strings)
- API requests (client sends cents as strings or numbers)
- Components (display as formatted dollars)

```typescript
// packages/utils/src/money.ts
import type { MoneyString } from '@protrader/types'

/**
 * Convert dollars to cents (BigInt).
 * @example dollarsToCents('100.50') = 10050n
 */
export function dollarsToCents(dollars: string | number): bigint {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars

  if (isNaN(num)) {
    throw new Error(`Invalid dollar amount: ${dollars}`)
  }

  // Multiply by 100 to convert to cents, round to handle floating point
  const cents = Math.round(num * 100)

  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Dollar amount ${dollars} too large`)
  }

  return BigInt(cents)
}

/**
 * Convert cents to dollars string.
 * @example centsToDollars(10050n) = '100.50'
 */
export function centsToDollars(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents
  if (abs > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Cents value ${cents} exceeds safe conversion range`)
  }
  const dollars = Number(abs) / 100
  const sign = cents < 0n ? '-' : ''
  return sign + dollars.toFixed(2)
}
  const dollars = Number(abs) / 100
  const sign = cents < 0n ? '-' : ''
  return sign + dollars.toFixed(2)
}

/**
 * Format cents as localized currency string.
 * Validates precision before converting to Number to prevent silent data loss.
 * @example formatMoney(10050n, 'USD') = '$100.50'
 * @throws {Error} If cents value exceeds safe JavaScript number range
 */
export function formatMoney(cents: bigint | string, currency: string = 'USD'): string {
  const centsNum = typeof cents === 'string' ? BigInt(cents) : cents

  // Validate precision — same check as centsToDollars
  // JavaScript's Number.MAX_SAFE_INTEGER is 9007199254740991
  const MAX_SAFE_CENTS = 9007199254740991n
  if (centsNum > MAX_SAFE_CENTS || centsNum < -MAX_SAFE_CENTS) {
    throw new Error(`Cents value ${centsNum} exceeds safe conversion range`)
  }

  const dollars = Number(centsNum) / 100

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars)
}
```

### Price Formatting & Scaling

Prices are stored scaled ×100000 (5 decimal places). Convert to/from display format:

```typescript
// packages/utils/src/price.ts
import type { PriceString } from '@protrader/types'

const PRICE_SCALE = 100000n

/**
 * Convert decimal price to scaled BigInt.
 * @example priceToScaled('1.08500') = 108500n
 */
export function priceToScaled(price: string | number): bigint {
  const str = typeof price === 'string' ? price : price.toString()
  const parts = str.split('.')

  if (parts.length > 2) {
    throw new Error(`Invalid price format: ${str}`)
  }

  const whole = BigInt(parts[0] || '0')
  const decimal = parts[1] || ''

  // Pad decimal to 5 places, then convert to BigInt
  const decimalStr = decimal.padEnd(5, '0').slice(0, 5)
  const decimalNum = BigInt(decimalStr)
  export function scaledToPrice(scaled: bigint): string {
    const isNegative = scaled < 0n
    const abs = isNegative ? -scaled : scaled

    const whole = abs / PRICE_SCALE
    const remainder = abs % PRICE_SCALE

    const wholeStr = (isNegative ? -whole : whole).toString()
    const remainderStr = remainder.toString().padStart(5, '0')

    return `${wholeStr}.${remainderStr}`
  }
  const whole = scaled / PRICE_SCALE
  const remainder = scaled % PRICE_SCALE

  const wholeStr = whole.toString()
  const remainderStr = remainder.toString().padStart(5, '0')

  return `${wholeStr}.${remainderStr}`
}

/**
 * Format scaled price as display string.
 * @example formatPrice(108500n, 4) = '1.0850'
 */
export function formatPrice(scaled: bigint, decimalPlaces: number = 5): string {
  const price = scaledToPrice(scaled)
  const parts = price.split('.')
  const decimals = parts[1].slice(0, decimalPlaces)
  return `${parts[0]}.${decimals}`
}
```

## Type Definitions

### Money & Price Types

Define these types once in `packages/types`:

```typescript
// packages/types/src/index.ts
export type MoneyString = string & { readonly __brand: 'MoneyString' }
export type PriceString = string & { readonly __brand: 'PriceString' }

/**
 * Create branded money type at runtime (for validation).
 * Use only when you've validated the value is cents as a string.
 */
export function asMoney(value: string): MoneyString {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Invalid money format: ${value}`)
  }
  return value as MoneyString
}

/**
 * Validates and brands a string as PriceString (scaled price in BigInt format).
 * Prices are positive-only integers (no negative deltas at validation time).
 * For price changes (deltas), compute the difference after validation.
 * Note: This differs from asMoney which allows negative values for account balances.
 * @example asPrice('108500') returns valid PriceString representing 1.08500
 * @throws {Error} If value is not a positive integer or contains non-digits/minus signs
 */
export function asPrice(value: string): PriceString {
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `Invalid price format: ${value} — prices must be positive integers. For deltas, compute (after - before) after individual price validation.`,
    )
  }
  return value as PriceString
}
```

### API Response Types

All responses follow a consistent shape:

```typescript
// packages/types/src/api.ts
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  next_cursor?: string
  has_more: boolean
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// Used across all apps
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse
```

### Shared Enums

```typescript
// packages/types/src/enums.ts
export enum TradeDirection {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum TradeStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PENDING = 'PENDING',
}

export enum KYCStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  TRADER = 'TRADER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  IB_TEAM_LEADER = 'IB_TEAM_LEADER',
  AGENT = 'AGENT',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.IB_TEAM_LEADER]: 3,
  [UserRole.AGENT]: 2,
  [UserRole.TRADER]: 1,
}
```

## API Client Factory

Create a single API client used across all frontend apps:

```typescript
// packages/utils/src/api-client.ts
import type { ApiResponse, ApiErrorResponse } from '@protrader/types'

export interface ApiClientConfig {
  baseURL: string
  timeout?: number
}

/**
 * Creates a typed API client for all frontend apps.
 * Handles:
 * - Request/response serialization
 * - Error handling
 * - Authorization (JWT in headers)
 */
export class ApiClient {
  private baseURL: string
  private timeout: number

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL
    this.timeout = config.timeout || 30000
  }

  /**
   * Type guard to validate response conforms to ApiResponse<T> shape at runtime.
   *
   * IMPORTANT: This performs only a shallow check for the presence of a 'data' property.
   * It does NOT validate that obj.data actually conforms to type T at runtime.
   *
   * For strict validation of response data shape, pass an optional schema validator:
   * - Use a Zod schema: validateApiResponse(data, z.object({ id: z.string(), ... }))
   * - Or provide a custom validator function: validateApiResponse(data, (d) => typeof d.id === 'string')
   *
   * @param obj - The object to validate
   * @param schema - Optional Zod schema or validator function to validate obj.data
   * @returns Type guard result
   * @throws {Error} If response does not have expected structure or data validation fails
   */
  private validateApiResponse<T>(obj: unknown, schema?: { parse: (data: unknown) => T } | ((data: unknown) => boolean)): obj is ApiResponse<T> {
    if (obj === null || typeof obj !== 'object') return false
    if (!('data' in obj)) return false

    // If a schema is provided, perform deeper validation
    if (schema) {
      try {
        if (typeof schema.parse === 'function') {
          // Zod-like schema
          schema.parse((obj as Record<string, unknown>).data)
        } else if (typeof schema === 'function') {
          // Custom validator function
          if (!schema((obj as Record<string, unknown>).data)) {
            return false
          }
        }
      } catch (error) {
        return false
      }
    }

    return true
  }

  async get<T>(path: string, options?: RequestInit, schema?: { parse: (data: unknown) => T }): Promise<T> {
    const response = await this.request(path, { ...options, method: 'GET' })
    const data = await response.json()

    // Validate response structure at runtime
    if (!this.validateApiResponse<T>(data, schema)) {
      throw new Error(`Invalid response structure: expected ApiResponse<T> with 'data' property, got ${JSON.stringify(data)}`)
    }

    return data.data
  }

  async post<T>(path: string, body?: unknown, options?: RequestInit, schema?: { parse: (data: unknown) => T }): Promise<T> {
    const response = await this.request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
    const data = await response.json()

    // Validate response structure at runtime
    if (!this.validateApiResponse<T>(data, schema)) {
      throw new Error(`Invalid response structure: expected ApiResponse<T> with 'data' property, got ${JSON.stringify(data)}`)
    }
    return data.data
  }

  async patch<T>(path: string, body?: unknown, options?: RequestInit, schema?: { parse: (data: unknown) => T }): Promise<T> {
    const response = await this.request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    const data = await response.json()

    // Validate response structure at runtime
    if (!this.validateApiResponse<T>(data, schema)) {
      throw new Error(`Invalid response structure: expected ApiResponse<T> with 'data' property, got ${JSON.stringify(data)}`)
    }
    return data.data
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await this.request(path, { ...options, method: 'DELETE' })
    const data = await response.json()

    // Validate response structure at runtime
    if (!this.validateApiResponse<T>(data)) {
      throw new Error(`Invalid response structure: expected ApiResponse<T> with 'data' property, got ${JSON.stringify(data)}`)
    }
    return data.data
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.baseURL}${path}`

    const request = new Request(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        ...this.getAuthHeaders(),
      },
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(request, { signal: controller.signal })
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        let errorCode = 'HTTP_ERROR'

        const contentType = response.headers.get('Content-Type')
        if (contentType?.includes('application/json')) {
          try {
            const error = (await response.json()) as ApiErrorResponse
            errorCode = error.error.code
            errorMessage = error.error.message
          } catch {
            // Fall back to default error message
          }
        }

        throw new ApiError(errorCode, errorMessage, response.status)
      }
      }

      return response
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Retrieves authorization headers from secure HttpOnly cookie.
   *
   * **Security Note**: Token is stored in HttpOnly, Secure, SameSite=Strict cookie
   * set by the server during login. This prevents XSS from accessing tokens via
   * JavaScript. Do NOT retrieve tokens from localStorage or sessionStorage.
   *
   * Required mitigations (implemented at application level):
   * - Strict Content-Security-Policy (no unsafe-eval, no unsafe-inline)
   * - Input sanitization on all user data (prevents XSS injection)
   * - Server sets HttpOnly flag on auth cookies during login
   * - CSRF tokens for state-changing requests
   *
   * The browser automatically includes cookies in fetch requests with
   * credentials: 'include', so this method returns empty headers while
   * the cookie is sent transparently.
   */
  private getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {} // Server-side

    // HttpOnly cookies are automatically sent by the browser with credentials: 'include'
    // This method exists for clarity and future non-cookie auth mechanisms.
    // Do NOT access localStorage or sessionStorage here.
    return {}
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

// Factory function for creating client
export function createApiClient(baseURL: string): ApiClient {
  return new ApiClient({ baseURL })
}
```

## Using in Frontend Apps

All frontend apps use the same utilities:

```typescript
// apps/platform/src/lib/api-client.ts
import { createApiClient } from '@protrader/utils'

export const apiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')

// apps/admin/src/lib/api-client.ts
import { createApiClient } from '@protrader/utils'

export const apiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
```

## Using in Components

```typescript
// apps/platform/src/components/AccountDisplay.tsx
'use client'

import { formatMoney, formatPrice } from '@protrader/utils'
import type { MoneyString, PriceString } from '@protrader/types'

interface Props {
  balance: MoneyString
  price: PriceString
}

export function AccountDisplay({ balance, price }: Props) {
  return (
    <div>
      <div>Balance: {formatMoney(balance)}</div>
      <div>Entry Price: {formatPrice(price, 4)}</div>
    </div>
  )
}
```

## Validation Schemas

Share Zod schemas across frontend and backend:

```typescript
// packages/types/src/schemas.ts
import { z } from 'zod'
import type { MoneyString } from './index'

export const openTradeSchema = z.object({
  instrumentId: z.string().min(1),
  direction: z.enum(['BUY', 'SELL']),
  units: z.number().int().positive(),
  leverage: z.number().int().min(1).max(500),
})

export type OpenTradeInput = z.infer<typeof openTradeSchema>

// Used in both API and frontend
// apps/platform/src/hooks/useOpenTrade.ts
import { openTradeSchema } from '@protrader/types'

// apps/api/src/routes/trades.ts
import { openTradeSchema } from '@protrader/types'
```

## Utility Functions to Reuse

Consider extracting to `@protrader/utils`:

```typescript
/**
 * Calculate percentage change using BigInt arithmetic to avoid precision loss.
 * Uses fixed scaling (100) for decimal precision.
 * @example percentChange(100n, 110n) = 10.0 (10% increase)
 * @example percentChange(100n, 90n) = -10.0 (10% decrease)
 * @example percentChange(0n, 100n) = 0 (cannot compute change from zero)
 */
export function percentChange(before: bigint, after: bigint): number {
  if (before === 0n) return 0

  // Use BigInt for the ratio calculation to maintain precision
  // Scale the numerator by 100 to preserve 2 decimal places
  const SCALE = 100n
  const ratio = ((after - before) * SCALE) / before

  // Convert final result to Number and remove the scaling factor
  return Number(ratio) / Number(SCALE)
}

// Format basis points as percentage
export function formatBasisPoints(bps: string | number): string {
  const num = typeof bps === 'string' ? parseInt(bps) : bps
  return `${(num / 100).toFixed(2)}%`
}

// Parse ISO timestamp to relative time
export function timeAgo(timestamp: string | number): string {
  const ms = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
  const seconds = Math.floor((Date.now() - ms) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
```

## Checklist

- [ ] All money conversions use `dollarsToCents()` / `centsToDollars()`
- [ ] All price conversions use `priceToScaled()` / `scaledToPrice()`
- [ ] All formatted display uses `formatMoney()` / `formatPrice()`
- [ ] API responses typed with `ApiResponse<T>`
- [ ] Paginated responses typed with `PaginatedResponse<T>`
- [ ] Enums defined in `@protrader/types`, imported everywhere
- [ ] API client created via `createApiClient()` in each app
- [ ] No hardcoded BigInt operations — use `packages/utils` helpers
- [ ] No duplicate utility functions across apps
- [ ] Validation schemas defined in `@protrader/types`, used in both API and frontend
- [ ] All typed types imported from `@protrader/types` (MoneyString, PriceString, ApiResponse)
- [ ] New utilities added to `@protrader/utils` for reuse
