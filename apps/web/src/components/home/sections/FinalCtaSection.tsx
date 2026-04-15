import { useEffect } from 'react'
import Link from 'next/link'

interface FinalCtaSectionProps {
  anchor?: string
  traderCount?: string
}

/**
 * FinalCtaSection - Final call-to-action section
 */
export function FinalCtaSection({
  anchor = '#why',
  traderCount = '50,000+',
}: FinalCtaSectionProps) {
  useEffect(() => {
    const targetId = anchor.replace(/^#/, '')
    if (!document.getElementById(targetId)) {
      console.warn(`FinalCtaSection: anchor target "${targetId}" not found in document`)
    }
  }, [anchor])

  return (
    <section className="bg-primary-500 py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Start Trading in Minutes</h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-white/80">
          Join {traderCount} traders who trust ProTraderSim. Create your free account today — no
          credit card required.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={process.env.NEXT_PUBLIC_REGISTER_URL ?? '/register'}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-bold text-primary-500 shadow-lg transition-all duration-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            Open Free Account
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href={anchor}
            className="inline-flex items-center rounded-lg border border-white px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  )
}
