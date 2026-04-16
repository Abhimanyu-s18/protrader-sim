'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { useSocket } from '../hooks/useSocket'
import { safeStorage } from '../lib/safeStorage'

/** Reads a cookie value by name. */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

/**
 * Reads the token — tries localStorage/sessionStorage first (same-origin),
 * then falls back to a cookie (shared across ports on the same domain, set by
 * the auth app after cross-origin login).
 * When found in a cookie, mirrors it into sessionStorage so subsequent reads
 * on this origin don't need to re-parse the cookie.
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null

  const stored = safeStorage.get('access_token')
  if (stored) return stored

  const fromCookie = getCookie('access_token')
  if (fromCookie) {
    // Mirror to sessionStorage so this origin's safeStorage works going forward
    try {
      safeStorage.set('access_token', fromCookie)
    } catch (err) {
      console.warn('Failed to mirror token to storage:', err)
    }
    return fromCookie
  }

  return null
}

function isTokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return false

  try {
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadBase64.padEnd(
      payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
      '=',
    )
    const payloadJson = atob(padded)
    const payloadText = decodeURIComponent(
      payloadJson
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    const payload = JSON.parse(payloadText) as { exp?: number }

    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

interface AppShellProps {
  children: React.ReactNode
}

/**
 * Authenticated app shell: reads the access token, redirects to auth on missing/expired,
 * and initialises the Socket.io connection for the entire session.
 */
export default function AppShell({ children }: AppShellProps) {
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = getToken()
    const authUrl = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'

    if (!t || !isTokenValid(t)) {
      window.location.href = `${authUrl}/login`
      return
    }

    setToken(t)
    setReady(true)
  }, [])

  // Initialise Socket.io once we have a token
  useSocket(token)

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <span className="text-sm text-gray-400">Loading…</span>
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
