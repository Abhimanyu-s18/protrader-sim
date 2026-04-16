'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { LucideProps } from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import { LayoutDashboard, Users, CircleDollarSign, UserCircle, LogOut } from 'lucide-react'
import { safeStorage } from '../lib/safeStorage'

const AUTH_URL = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'

if (process.env.NODE_ENV === 'production' && !process.env['NEXT_PUBLIC_AUTH_URL']) {
  console.error('NEXT_PUBLIC_AUTH_URL is not configured for production')
}

type IconComponent = ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
>

const NAV_ITEMS: { href: string; label: string; icon: IconComponent }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/traders', label: 'Traders', icon: Users },
  { href: '/commissions', label: 'Commissions', icon: CircleDollarSign },
  { href: '/agents', label: 'Agents', icon: UserCircle },
]

async function logout() {
  if (process.env.NODE_ENV === 'production' && !process.env['NEXT_PUBLIC_AUTH_URL']) {
    console.error('Auth URL not configured for production')
    safeStorage.remove('access_token')
    window.location.href = '/'
    return
  }

  const token = safeStorage.get('access_token')

  try {
    if (token) {
      const response = await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })
      if (!response.ok) {
        console.error(
          `Logout failed: ${response.status} ${response.statusText}`,
          await response.text(),
        )
      }
    }
  } catch (error) {
    console.error('Logout request failed:', error)
  }

  safeStorage.remove('access_token')
  window.location.href = `${AUTH_URL}/login`
}

/** Dark sidebar navigation for the IB Portal. */
export default function Sidebar() {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-900">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <span className="text-lg font-bold text-white">IB Portal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="w-4 text-center" aria-hidden="true">
                <item.icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-800 px-3 py-3">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="w-4 text-center" aria-hidden="true">
            <LogOut className="h-4 w-4" />
          </span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
