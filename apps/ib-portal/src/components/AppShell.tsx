'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { safeStorage } from '../lib/safeStorage'

/** Reads the access token from storage via safe abstraction (client-side only). */
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return safeStorage.get('access_token')
}

/** Validates a JWT's expiry by decoding the payload (no signature check). */
function isTokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return false
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = base64 + (pad === 2 ? '==' : pad === 3 ? '=' : '')
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    // Subtract 30s safety buffer to ensure tokens are treated as expired 30s earlier,
    // preventing them from being rejected by the server due to clock skew.
    const SKEW_MS = 30000
    return typeof payload.exp === 'number' && payload.exp * 1000 - SKEW_MS > Date.now()
  } catch {
    return false
  }
}

interface AppShellProps {
  children: React.ReactNode
}

/**
 * Authenticated app shell for IB Portal.
 * Reads the access token on mount, validates expiry, and redirects to auth if missing/expired.
 */
export default function AppShell({ children }: AppShellProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getToken()
    const authUrl = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'
    if (!token || !isTokenValid(token)) {
      window.location.href = `${authUrl}/login`
      return
    }
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-gray-950"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="text-sm text-gray-400">Loading application…</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
