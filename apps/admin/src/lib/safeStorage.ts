/**
 * Safe wrappers around localStorage/sessionStorage.
 * In Safari private browsing and some enterprise policies, storage access throws a SecurityError.
 * These helpers silently fall back to null/no-op rather than crashing the app.
 */

/**
 * Helper function to write to preferred storage with fallback and cleanup logic.
 * Preserves exact behavior: try preferred.setItem, remove from fallback on success,
 * on preferred write failure attempt to remove preferred then try fallback.setItem.
 */
function writeWithFallback(
  preferredStorage: Storage,
  fallbackStorage: Storage,
  key: string,
  value: string,
): void {
  try {
    preferredStorage.setItem(key, value)
    try {
      fallbackStorage.removeItem(key)
    } catch {
      // ignore
    }
    return
  } catch {
    // preferred storage write failed — try fallback
    try {
      preferredStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
  try {
    fallbackStorage.setItem(key, value)
  } catch {
    // both storages unavailable — ignore
  }
}

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
   * Attempts to write to preferred storage first; if that fails, falls back to the other storage.
   * Only removes the counterpart entry if the write succeeded.
   * Silently no-ops if storage is unavailable.
   */
  set(key: string, value: string, preferLocal: boolean = true): void {
    if (preferLocal) {
      this.writeWithFallback(localStorage, sessionStorage, key, value)
    } else {
      this.writeWithFallback(sessionStorage, localStorage, key, value)
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
