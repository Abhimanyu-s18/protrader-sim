'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

/** Reads the access token from local/session storage (client-side only). */
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token')
}

function isValidToken(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const payloadBase64 = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')
    const payloadJson = atob(payloadBase64)
    const payloadText = decodeURIComponent(
      payloadJson
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    const payload = JSON.parse(payloadText) as { exp?: number }

    if (typeof payload.exp !== 'number') return false
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

interface AppShellProps {
  children: React.ReactNode
}

/**
 * Authenticated app shell for the admin panel.
 * Reads the access token client-side and redirects to the auth app if missing.
 */
export default function AppShell({ children }: AppShellProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getToken()
    const authUrl = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'

    if (!token || !isValidToken(token)) {
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `${authUrl}/login?returnTo=${returnUrl}`
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
