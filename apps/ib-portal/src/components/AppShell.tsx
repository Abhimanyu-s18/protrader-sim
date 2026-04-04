'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

/** Reads the access token from storage (client-side only). */
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token')
  } catch {
    return null
  }
}

interface AppShellProps {
  children: React.ReactNode
}

/**
 * Authenticated app shell for IB Portal.
 * Reads the access token on mount and redirects to auth if missing.
 */
export default function AppShell({ children }: AppShellProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      const authUrl = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'
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
