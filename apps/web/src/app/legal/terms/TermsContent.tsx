'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const TERMS_EFFECTIVE_DATE = 'January 1, 2025'

const SECTIONS = [
  {
    id: 'introduction',
    title: '1. Introduction',
    content: `Welcome to ProTraderSim. These Terms of Service ("Terms") govern your access to and use of the ProTraderSim trading simulation platform, website, and related services (collectively, the "Service") operated by ProTraderSim Ltd ("Company", "we", "us", or "our"). By creating an account or using the Service in any way, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you may not use the Service. We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.`,
  },
  {
    id: 'registration',
    title: '2. Account Registration',
    content: `You must be at least 18 years of age to create an account and use the Service. By registering, you represent and warrant that all information you provide is accurate, current, and complete. You agree to maintain the accuracy of your information and update it as necessary. You are permitted to hold only one account per person — creating multiple accounts is strictly prohibited and may result in immediate account termination. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must notify us immediately of any unauthorised use of your account.`,
  },
  {
    id: 'trading',
    title: '3. Trading Conditions',
    content: `ProTraderSim operates as a simulation platform offering Contracts for Difference (CFDs) on Forex, Stocks, Indices, Commodities and Cryptocurrencies. CFDs are leveraged products that carry a high degree of risk. You should only trade with capital you can afford to lose. Margin requirements are published on our instruments page and may change without notice. All positions are subject to automatic close-out if your margin level falls below the stop-out threshold. We reserve the right to modify trading conditions, including spreads, leverage, and margin requirements, at any time and without prior notice.`,
  },
  {
    id: 'deposits',
    title: '4. Deposits & Withdrawals',
    content: `All funds deposited into your ProTraderSim account are virtual simulation funds for educational and practice purposes only. No real money is involved in any transactions on the Platform. Withdrawals of virtual funds are not permitted. The platform simulates the deposit and withdrawal process for training purposes. You acknowledge that any "funds" on the platform have no real monetary value and cannot be redeemed for cash or any assets of real value.`,
  },
  {
    id: 'privacy',
    title: '5. Privacy & Data',
    content: `We collect and process personal data in accordance with our Privacy Policy. By using the Service, you consent to such processing. We implement appropriate technical and organisational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Your data is stored on secure servers and we limit access to authorized personnel only.`,
  },
  {
    id: 'liability',
    title: '6. Limitation of Liability',
    content: `ProTraderSim is provided "as is" for educational and simulation purposes only. We do not guarantee that the Service will be uninterrupted, secure, or error-free. To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Service. The simulation is designed for learning purposes and should not be considered financial advice.`,
  },
  {
    id: 'termination',
    title: '7. Termination',
    content: `We reserve the right to suspend or terminate your account at any time for any reason without prior notice. Upon termination, your right to use the Service ceases immediately. You may also terminate your account at any time by contacting support. All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability.`,
  },
  {
    id: 'governing',
    title: '8. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the United Kingdom, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of the United Kingdom.`,
  },
]

export function TermsContent() {
  const [activeSection, setActiveSection] = useState('introduction')
  const ignoreObserverUntilRef = useRef(0)

  useEffect(() => {
    const visibleSections = new Set<string>()
    const lastSectionId = SECTIONS[SECTIONS.length - 1]?.id

    const observer = new IntersectionObserver(
      (entries) => {
        // Ignore observer updates if a recent manual selection is active (debounce window)
        if (Date.now() < ignoreObserverUntilRef.current) return

        // Update the visible set based on intersection state
        for (const entry of entries) {
          const id = entry.target.id
          if (id) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              visibleSections.add(id)
            } else {
              visibleSections.delete(id)
            }
          }
        }

        // Compute the topmost visible section and update state once
        if (visibleSections.size > 0) {
          const sortedByPosition = Array.from(visibleSections).sort((aId, bId) => {
            const aEl = document.getElementById(aId)
            const bEl = document.getElementById(bId)
            if (!aEl || !bEl) return 0
            return (aEl.getBoundingClientRect().top || 0) - (bEl.getBoundingClientRect().top || 0)
          })
          const activeId = sortedByPosition[0]
          if (activeId) setActiveSection(activeId)
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    // Detect scroll-to-end and activate the last section if applicable
    const handleScroll = () => {
      // Respect the debounce mechanism to prevent interference with programmatic scrolling
      if (Date.now() < ignoreObserverUntilRef.current) return

      if (lastSectionId) {
        const scrolledToEnd =
          document.documentElement.scrollHeight - window.innerHeight - window.scrollY <= 100
        if (scrolledToEnd) {
          setActiveSection(lastSectionId)
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Sidebar TOC */}
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
                      onClick={() => {
                        setActiveSection(s.id)
                        ignoreObserverUntilRef.current = Date.now() + 500
                      }}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:p-8">
          <div className="mx-auto max-w-3xl bg-white p-6 lg:rounded-2xl lg:p-10 lg:shadow-sm">
            <header className="mb-10 border-b border-surface-border pb-8">
              <h1 className="text-3xl font-bold text-dark-700 md:text-4xl">Terms of Service</h1>
              <p className="mt-4 text-gray-500">Last updated: {TERMS_EFFECTIVE_DATE}</p>
            </header>

            <div className="space-y-12">
              {SECTIONS.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="mb-4 text-xl font-bold text-dark-700">{s.title}</h2>
                  <p className="leading-relaxed text-gray-600">{s.content}</p>
                </section>
              ))}
            </div>

            <div className="mt-12 border-t border-surface-border pt-8">
              <p className="text-sm text-gray-400">
                If you have questions about these Terms, please{' '}
                <Link href="/about/contact" className="text-primary-500 hover:underline">
                  contact us
                </Link>
                .
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
