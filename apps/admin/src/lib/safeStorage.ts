/**
 * Safe wrappers around localStorage/sessionStorage.
 * In Safari private browsing and some enterprise policies, storage access throws a SecurityError.
 * These helpers silently fall back to null/no-op rather than crashing the app.
 */
export const safeStorage = {
  /** Get a value — tries localStorage first, then sessionStorage. Returns null on error or miss. */
  get(key: string): string | null {
    let value: string | null = null
    try {
      value = localStorage.getItem(key)
    } catch {
      // localStorage unavailable
    }
    if (value != null) {
      return value
    }
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },

  /**
   * Write a value to storage (preferLocal=true for localStorage, false for sessionStorage).
   * Performs each storage operation independently to avoid leaving stale values on error.
   * Silently no-ops if storage is unavailable.
   */
  set(key: string, value: string, preferLocal: boolean = true): void {
    if (preferLocal) {
      try {
        localStorage.setItem(key, value)
      } catch {
        // localStorage unavailable — try sessionStorage
      }
      try {
        sessionStorage.removeItem(key)
      } catch {
        // ignore
      }
    } else {
      try {
        sessionStorage.setItem(key, value)
      } catch {
        // sessionStorage unavailable — ignore
      }
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
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
