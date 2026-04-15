'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  IconForex,
  IconStocks,
  IconIndices,
  IconCommodities,
  IconStar,
  IconCatalog,
  IconCalendar,
  IconAccount,
  IconCompare,
  IconRegister,
  IconAbout,
  IconMenuOpen,
  IconMenuClose,
  IconChevronDown,
  IconEmail,
} from './icons'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = '72px'

// ---------------------------------------------------------------------------
// Navigation data structures
// ---------------------------------------------------------------------------

interface NavSubItem {
  label: string
  href: string
  description: string
  icon: React.ReactNode
}

interface NavColumn {
  heading: string
  items: NavSubItem[]
}

interface NavItemWithMega {
  label: string
  columns: NavColumn[]
}

interface NavItemSimple {
  label: string
  href: string
}

type NavItem = NavItemWithMega | NavItemSimple

function isMega(item: NavItem): item is NavItemWithMega {
  return 'columns' in item
}

// ---------------------------------------------------------------------------
// Navigation definition
// ---------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Trading',
    columns: [
      {
        heading: 'CFD Instruments',
        items: [
          {
            label: 'Forex Trading',
            href: '/trading/forex',
            description: 'Major & minor pairs',
            icon: <IconForex />,
          },
          {
            label: 'Stocks & ETFs',
            href: '/trading/stocks',
            description: 'Global equities',
            icon: <IconStocks />,
          },
          {
            label: 'Indices',
            href: '/trading/indices',
            description: 'Track market indices',
            icon: <IconIndices />,
          },
          {
            label: 'Commodities',
            href: '/trading/commodities',
            description: 'Gold, oil & more',
            icon: <IconCommodities />,
          },
          {
            label: 'Cryptocurrencies',
            href: '/trading/crypto',
            description: 'BTC, ETH & beyond',
            icon: <IconStar />,
          },
        ],
      },
      {
        heading: 'Tools',
        items: [
          {
            label: 'All Instruments',
            href: '/trading/instruments',
            description: 'Browse the full catalog',
            icon: <IconCatalog />,
          },
          {
            label: 'Economic Calendar',
            href: '/education/calendar',
            description: 'Market events',
            icon: <IconCalendar />,
          },
        ],
      },
    ],
  },
  { label: 'Platforms', href: '/platforms' },
  {
    label: 'Accounts',
    columns: [
      {
        heading: 'Account Options',
        items: [
          {
            label: 'Account Types',
            href: '/accounts',
            description: 'Find the right account for you',
            icon: <IconAccount />,
          },
          {
            label: 'Compare Accounts',
            href: '/accounts/compare',
            description: 'Side-by-side feature comparison',
            icon: <IconCompare />,
          },
          {
            label: 'Open Live Account',
            href: '/register',
            description: 'Get started in minutes',
            icon: <IconRegister />,
          },
        ],
      },
    ],
  },
  { label: 'Education', href: '/education' },
  {
    label: 'About',
    columns: [
      {
        heading: 'Company',
        items: [
          {
            label: 'About Us',
            href: '/about',
            description: 'Our story and mission',
            icon: <IconAbout />,
          },
          {
            label: 'Why ProTraderSim',
            href: '/about#why',
            description: 'What sets us apart',
            icon: <IconStar />,
          },
          {
            label: 'Contact Us',
            href: '/about/contact',
            description: 'Get in touch with our team',
            icon: <IconEmail />,
          },
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label="ProTraderSim home">
      {/* Chart icon */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500 transition-colors duration-150 group-hover:bg-primary-600">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <polyline
            points="2,13 6,8 9,11 12,5 16,7"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-white">
        ProTrader<span className="text-primary-500">Sim</span>
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Mega menu dropdown
// ---------------------------------------------------------------------------

interface MegaMenuProps {
  columns: NavColumn[]
  onClose?: () => void
}

function MegaMenu({ columns, onClose }: MegaMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const focusableItemsRef = useRef<HTMLAnchorElement[]>([])
  const focusedIndexRef = useRef(0)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  // Keep onClose ref up to date
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const updateFocusedIndex = (index: number) => {
    focusedIndexRef.current = index
  }

  // Focus management and keyboard handlers
  useEffect(() => {
    // Store the element that had focus before opening menu
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Collect all focusable Link items in the menu
    if (menuRef.current) {
      const links = Array.from(menuRef.current.querySelectorAll('a')) as HTMLAnchorElement[]
      focusableItemsRef.current = links

      // Focus first item on open
      if (links.length > 0) {
        links[0]?.focus()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      const links = focusableItemsRef.current
      if (links.length === 0) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }

      const currentIndex = focusedIndexRef.current
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault()
        const nextIndex = (currentIndex + 1) % links.length
        updateFocusedIndex(nextIndex)
        links[nextIndex]?.focus()
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault()
        const prevIndex = currentIndex === 0 ? links.length - 1 : currentIndex - 1
        updateFocusedIndex(prevIndex)
        links[prevIndex]?.focus()
      } else if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift+Tab on first item: close menu and move focus to trigger
          if (currentIndex === 0) {
            event.preventDefault()
            previousActiveElementRef.current?.focus()
            onCloseRef.current?.()
            return
          }
        } else if (currentIndex === links.length - 1) {
          // Tab on last item: close menu and move focus to trigger
          event.preventDefault()
          previousActiveElementRef.current?.focus()
          onCloseRef.current?.()
          return
        }
        // Otherwise, allow default Tab behavior within menu
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that opened the menu, but skip if navigation is in progress
      const activeElement = document.activeElement
      const isNavigating =
        activeElement?.tagName === 'A' || (activeElement?.closest && activeElement.closest('a'))
      if (
        !isNavigating &&
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [])

  return (
    <div
      ref={menuRef}
      className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 animate-slide-up"
      role="menu"
      aria-label="Submenu"
    >
      {/* Arrow */}
      <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-surface-border bg-white" />
      <div
        className={cn(
          'rounded-xl border border-surface-border bg-white p-5 shadow-xl',
          'min-w-[480px]',
          columns.length === 1 && 'min-w-[280px]',
        )}
      >
        <div className={cn('grid gap-6', columns.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {columns.map((col, columnIndex) => {
            const columnOffset = columns
              .slice(0, columnIndex)
              .reduce((sum, previous) => sum + previous.items.length, 0)
            return (
              <div key={col.heading}>
                <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-widest text-dark-400">
                  {col.heading}
                </p>
                <ul className="space-y-0.5" role="presentation">
                  {col.items.map((item, index) => (
                    <li key={item.href} role="none">
                      <Link
                        href={item.href}
                        className="group/item flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-surface-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        role="menuitem"
                        onFocus={() => updateFocusedIndex(columnOffset + index)}
                      >
                        <div className="mt-0.5 flex-shrink-0 text-dark-400 transition-colors duration-150 group-hover/item:text-primary-500">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-dark-700 transition-colors duration-150 group-hover/item:text-dark-900">
                            {item.label}
                          </div>
                          <div className="mt-0.5 text-xs leading-snug text-dark-300">
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile nav
// ---------------------------------------------------------------------------

interface MobileNavProps {
  items: NavItem[]
  onClose: () => void
}

function MobileNav({ items, onClose }: MobileNavProps) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  // Keep onClose ref up to date
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  function toggleSection(label: string) {
    setOpenSection((prev) => (prev === label ? null : label))
  }

  // Focus management: move focus into drawer and restore on close
  useEffect(() => {
    // Store the element that had focus before opening
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Move focus to close button
    if (closeButtonRef.current) {
      closeButtonRef.current.focus()
    }

    // Escape key handler
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      // Restore focus to the element that opened the drawer, but skip if navigation is in progress
      const activeElement = document.activeElement
      const isNavigating =
        activeElement?.tagName === 'A' || (activeElement?.closest && activeElement.closest('a'))
      if (
        !isNavigating &&
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [])

  // Focus trap: prevent focus from leaving the drawer
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return

    if (!drawerRef.current) return

    const focusableElements = drawerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [contenteditable], [tabindex]:not([tabindex="-1"])',
    )
    const focusableArray = Array.from(focusableElements) as HTMLElement[]

    if (focusableArray.length === 0) return

    const firstElement = focusableArray[0]
    const lastElement = focusableArray[focusableArray.length - 1]
    const activeElement = document.activeElement

    // Shift+Tab on first element: focus last
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement?.focus()
    }
    // Tab on last element: focus first
    else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-900/80 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 flex h-full w-80 max-w-full flex-col bg-dark-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <Logo />
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <IconMenuClose />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {items.map((item) => {
              if (!isMega(item)) {
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center px-5 py-3 font-medium text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              }

              const isOpen = openSection === item.label
              const safeId = item.label.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
              return (
                <li key={item.label}>
                  <button
                    onClick={() => toggleSection(item.label)}
                    className="flex w-full items-center justify-between px-5 py-3 font-medium text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                    aria-expanded={isOpen}
                    aria-controls={`panel-${safeId}`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={cn(
                        'text-gray-500 transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    >
                      <IconChevronDown />
                    </span>
                  </button>
                  {isOpen && (
                    <div id={`panel-${safeId}`} className="border-y border-white/5 bg-dark-800/50">
                      {item.columns.map((col) => (
                        <div key={col.heading} className="px-5 py-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-dark-400">
                            {col.heading}
                          </p>
                          <ul className="space-y-0.5">
                            {col.items.map((sub) => (
                              <li key={sub.href}>
                                <Link
                                  href={sub.href}
                                  onClick={onClose}
                                  className="flex items-center gap-3 py-2 text-sm text-gray-400 transition-colors duration-150 hover:text-white"
                                >
                                  <span className="text-dark-400">{sub.icon}</span>
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* CTA area */}
        <div className="space-y-3 border-t border-white/10 p-5">
          <Link
            href="/login"
            onClick={onClose}
            className="block w-full rounded-lg border border-white/20 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors duration-150 hover:bg-white/10"
          >
            Log In
          </Link>
          <Link
            href="/register"
            onClick={onClose}
            className="block w-full rounded-lg bg-primary-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-600"
          >
            Open Account
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Header
// ---------------------------------------------------------------------------

/**
 * Sticky site header with mega-menu navigation, auth CTAs, and a responsive mobile drawer.
 * Uses hover-driven dropdowns on desktop and accordion-style expand on mobile.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track scroll for shadow
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current)
      }
    }
  }, [])

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  function handleMouseEnter(label: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setActiveMenu(label)
  }

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setActiveMenu(null)
    }, 120)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 bg-dark-700 transition-shadow duration-200',
          scrolled && 'shadow-[0_2px_16px_0_rgba(0,0,0,0.4)]',
        )}
        style={{ height: HEADER_HEIGHT, '--navbar-height': HEADER_HEIGHT } as React.CSSProperties}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Logo />

          {/* Desktop nav */}
          <nav
            className="hidden h-full items-center gap-1 lg:flex"
            role="navigation"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map((item) => {
              if (!isMega(item)) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                )
              }

              const isOpen = activeMenu === item.label

              return (
                <div
                  key={item.label}
                  className="relative flex h-full items-center"
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150',
                      isOpen
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white',
                    )}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    onClick={() => setActiveMenu(isOpen ? null : item.label)}
                  >
                    {item.label}
                    <span
                      className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
                    >
                      <IconChevronDown />
                    </span>
                  </button>
                  {isOpen && (
                    <MegaMenu columns={item.columns} onClose={() => setActiveMenu(null)} />
                  )}
                </div>
              )
            })}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-600"
            >
              Open Account
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <IconMenuOpen />
          </button>
        </div>
      </header>

      {/* Spacer so content isn't hidden under fixed header */}
      <div style={{ height: HEADER_HEIGHT }} aria-hidden="true" />

      {/* Mobile nav overlay */}
      {mobileOpen && <MobileNav items={NAV_ITEMS} onClose={() => setMobileOpen(false)} />}
    </>
  )
}
