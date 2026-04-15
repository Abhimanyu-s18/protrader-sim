'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const SECTIONS = [
  {
    id: 'introduction',
    title: '1. Introduction',
  },
  {
    id: 'registration',
    title: '2. Account Registration',
  },
  {
    id: 'trading',
    title: '3. Trading Conditions',
  },
  {
    id: 'deposits',
    title: '4. Deposits & Withdrawals',
  },
  {
    id: 'privacy',
    title: '5. Privacy & Data',
  },
  {
    id: 'liability',
    title: '6. Limitation of Liability',
  },
  {
    id: 'termination',
    title: '7. Termination',
  },
  {
    id: 'governing',
    title: '8. Governing Law',
  },
]

export function TermsSidebar() {
  const [activeSection, setActiveSection] = useState('introduction')

  useEffect(() => {
    // Update based on URL hash on mount
    if (window.location.hash) {
      const id = window.location.hash.substring(1)
      if (SECTIONS.some((s) => s.id === id)) setActiveSection(id)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const sorted = [...entries].sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )
        const topmost = sorted.find(
          (entry) => entry.isIntersecting && entry.intersectionRatio > 0.5,
        )
        if (topmost?.target.id) {
          setActiveSection(topmost.target.id)
        }
      },
      { threshold: [0.5, 0.75, 1] },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <aside className="w-full border-b border-surface-border bg-white lg:order-1 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="sticky top-0 p-6 lg:p-8">
        <Link href="/" className="mb-8 block">
          <span className="text-xl font-bold text-dark-700">ProTraderSim</span>
        </Link>
        <nav>
          <ul className="space-y-1" role="list">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={activeSection === s.id ? 'location' : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                    activeSection === s.id
                      ? 'bg-primary-500/10 font-medium text-primary-500'
                      : 'text-gray-600 hover:bg-surface-alt hover:text-dark-700'
                  }`}
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
