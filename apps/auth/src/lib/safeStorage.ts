/**
 * Safe wrappers around localStorage/sessionStorage.
 * In Safari private browsing and some enterprise policies, storage access throws a SecurityError.
 * These helpers silently fall back to null/no-op rather than crashing the app.
 */
export const safeStorage = {
  /** Get a value — tries localStorage first, then sessionStorage. Returns null on error or miss. */
  get(key: string): string | null {
    if (typeof window === 'undefined') return null
    let value: string | null = null
    try {
      value = localStorage.getItem(key)
    } catch {
      // localStorage unavailable
    }
    if (value !== null) {
      return value
    }
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },

  /** Persist to localStorage (persist=true) or sessionStorage (persist=false). Silently no-ops on error. */
  set(key: string, value: string, persist: boolean): void {
    try {
      if (persist) {
        localStorage.setItem(key, value)
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, value)
        localStorage.removeItem(key)
      }
    } catch {
      // Storage unavailable (private browsing, enterprise policy) — silently ignore
    }
  },

  /** Remove a key from both storages. Silently no-ops on error. */
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    try {
      sessionStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}
