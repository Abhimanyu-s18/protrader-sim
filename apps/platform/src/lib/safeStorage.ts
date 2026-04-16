/**
 * Safe wrappers around localStorage/sessionStorage.
 * In Safari private browsing and some enterprise policies, storage access throws a SecurityError.
 * These helpers silently fall back to null/no-op rather than crashing the app.
 */
export const safeStorage = {
  /**
   * Set a value — tries localStorage first, then sessionStorage as fallback.
   * Silently no-ops on Storage errors (private browsing, quota exceeded, etc.).
   */
  set(key: string, value: string): void {
    // Try localStorage first
    try {
      localStorage.setItem(key, value)
      // Clear from sessionStorage to avoid stale data
      try {
        sessionStorage.removeItem(key)
      } catch {
        // ignore
      }
      return
    } catch {
      // localStorage access failed or quota exceeded, continue to sessionStorage
    }

    // Try sessionStorage as fallback
    try {
      sessionStorage.setItem(key, value)
      // Clear from localStorage to avoid stale data
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    } catch {
      // sessionStorage access also failed — silently ignore
    }
  },

  /** Get a value — tries localStorage first, then sessionStorage. Returns null on error or miss. */
  get(key: string): string | null {
    // Try localStorage first
    try {
      const localValue = localStorage.getItem(key)
      if (localValue !== null) return localValue
    } catch {
      // localStorage access failed, continue to sessionStorage
    }

    // Try sessionStorage as fallback
    try {
      return sessionStorage.getItem(key)
    } catch {
      // sessionStorage access also failed
      return null
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
