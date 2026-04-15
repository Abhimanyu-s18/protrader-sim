'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { safeStorage } from '../lib/safeStorage'

const AUTH_URL = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/users', label: 'Users', icon: '◎' },
  { href: '/kyc', label: 'KYC', icon: '◉' },
  { href: '/deposits', label: 'Deposits', icon: '↓' },
  { href: '/withdrawals', label: 'Withdrawals', icon: '↑' },
]

async function logout() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const token = safeStorage.get('access_token')
    if (token) {
      await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
    }
  } catch (err) {
    // Log or handle error, but always proceed with client-side logout
    console.warn('Logout request failed or timed out:', err)
  } finally {
    clearTimeout(timeout)
  }
  safeStorage.remove('access_token')
  window.location.href = `${AUTH_URL}/login`
}

/** Admin sidebar navigation. */
export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-900">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <span className="text-lg font-bold text-white">Admin Panel</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <span className="w-4 text-center">⎋</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
