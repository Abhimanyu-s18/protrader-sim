'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const AUTH_URL = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/trades', label: 'Trades', icon: '↕' },
  { href: '/account', label: 'Account', icon: '◎' },
  { href: '/alerts', label: 'Alerts', icon: '◉' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch(`${AUTH_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Continue with client-side cleanup even if API call fails
    }
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('access_token')
    window.location.href = `${AUTH_URL}/login`
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-900">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <span className="text-lg font-bold text-white">ProTraderSim</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-800 px-3 py-3">
        <button
          type="button"
          onClick={logout}
          disabled={isLoggingOut}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white ${
            isLoggingOut ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          <span className="w-4 text-center">⎋</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
