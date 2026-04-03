// ── Money formatting helpers ──────────────────────────────────────
export function formatMoney(cents: string | number | bigint, symbol = '$'): string {
  const c = typeof cents === 'bigint' ? cents : BigInt(cents)
  const abs = c < 0n ? -c : c
  const dollars = abs / 100n
  const remainder = abs % 100n
  const formatted = `${symbol}${dollars.toLocaleString()}.${remainder.toString().padStart(2, '0')}`
  return c < 0n ? `-${formatted}` : formatted
}

export function formatPrice(scaled: string | number | bigint, pipDecimalPlaces: number): string {
  const s = typeof scaled === 'bigint' ? scaled : BigInt(scaled)
  const totalDecimals = 5
  const str = s.toString().padStart(totalDecimals + 1, '0')
  return `${str.slice(0, -totalDecimals)}.${str.slice(-totalDecimals)}`
}

export function formatPercentage(bps: string | number | bigint | null): string {
  if (bps === null || bps === undefined) return '--'
  const b = typeof bps === 'bigint' ? bps : BigInt(bps)
  const whole = b / 100n
  const frac = b % 100n
  return `${whole}.${frac.toString().padStart(2, '0')}%`
}

export function formatPnl(cents: string | number | bigint): {
  formatted: string
  isPositive: boolean
  isNegative: boolean
} {
  const c = typeof cents === 'bigint' ? cents : BigInt(cents)
  return {
    formatted: formatMoney(c),
    isPositive: c > 0n,
    isNegative: c < 0n,
  }
}

// ── Date helpers ─────────────────────────────────────────────────
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── API client factory ────────────────────────────────────────────
export function createApiClient(baseURL: string) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const res = await fetch(`${baseURL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error_code: 'UNKNOWN', message: res.statusText }))
      throw Object.assign(new Error(err.message), {
        error_code: err.error_code,
        status: res.status,
      })
    }
    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

// ── Misc ──────────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function truncate(str: string, len: number): string {
  return str.length > len ? `${str.slice(0, len)}...` : str
}
