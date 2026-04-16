import Link from 'next/link'

// ---------------------------------------------------------------------------
// Social icons (SVG path data, no text elements)
// ---------------------------------------------------------------------------

function IconTwitterX() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M13.64 2H15.98L10.9 7.8L16.89 16H12.2L8.56 11.16L4.37 16H2.02L7.46 9.79L1.73 2H6.54L9.84 6.43L13.64 2ZM12.83 14.56H14.13L5.85 3.33H4.46L12.83 14.56Z" />
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg width="21" height="18" viewBox="0 0 21 18" fill="currentColor" aria-hidden="true">
      <path d="M4.44 2C3.37 2 2.5 2.87 2.5 3.94C2.5 5.01 3.37 5.88 4.44 5.88C5.51 5.88 6.38 5.01 6.38 3.94C6.38 2.87 5.51 2 4.44 2Z" />
      <path d="M2.72 7.2H6.16V16H2.72V7.2Z" />
      <path d="M9.8 7.2H13.08V8.72H13.13C13.59 7.87 14.7 6.97 16.35 6.97C19.83 6.97 20.5 9.25 20.5 12.22V16H17.06V12.92C17.06 11.65 17.04 10.02 15.3 10.02C13.54 10.02 13.28 11.41 13.28 12.83V16H9.84L9.8 7.2Z" />
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M16.82 4.52C16.62 3.77 16.03 3.18 15.28 2.98C13.91 2.6 9 2.6 9 2.6C9 2.6 4.09 2.6 2.72 2.98C1.97 3.18 1.38 3.77 1.18 4.52C0.8 5.89 0.8 9 0.8 9C0.8 9 0.8 12.11 1.18 13.48C1.38 14.23 1.97 14.82 2.72 15.02C4.09 15.4 9 15.4 9 15.4C9 15.4 13.91 15.4 15.28 15.02C16.03 14.82 16.62 14.23 16.82 13.48C17.2 12.11 17.2 9 17.2 9C17.2 9 17.2 5.89 16.82 4.52ZM7.4 11.6V6.4L11.8 9L7.4 11.6Z" />
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M16 2H2C1.45 2 1 2.45 1 3V15C1 15.55 1.45 16 2 16H9.62V10.62H7.75V8.44H9.62V6.83C9.62 4.97 10.75 3.97 12.42 3.97C13.22 3.97 13.91 4.03 14.12 4.06V6.01H13C12.1 6.01 11.93 6.44 11.93 7.07V8.44H14.05L13.78 10.62H11.93V16H16C16.55 16 17 15.55 17 15V3C17 2.45 16.55 2 16 2Z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Footer link columns data
// ---------------------------------------------------------------------------

interface FooterLink {
  label: string
  href: string
}

interface FooterColumn {
  heading: string
  links: FooterLink[]
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Trading',
    links: [
      { label: 'Forex', href: '/trading/forex' },
      { label: 'Stocks & ETFs', href: '/trading/stocks' },
      { label: 'Indices', href: '/trading/indices' },
      { label: 'Commodities', href: '/trading/commodities' },
      { label: 'Cryptocurrencies', href: '/trading/crypto' },
      { label: 'All Instruments', href: '/trading/instruments' },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'Web Platform', href: '/platforms' },
      { label: 'Mobile App', href: '/platforms/mobile' },
      { label: 'API Trading', href: '/platforms/api' },
      { label: 'Platform Features', href: '/platforms#features' },
      { label: 'Trading Tools', href: '/platforms/tools' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Why Us', href: '/about#why' },
      { label: 'Contact Us', href: '/about/contact' },
      { label: 'Careers', href: '/about/careers' },
      { label: 'Awards', href: '/about/awards' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Risk Disclosure', href: '/legal/risk' },
      { label: 'Cookie Policy', href: '/legal/cookies' },
    ],
  },
]

const SOCIAL_LINKS = [
  {
    label: 'Follow us on X (Twitter)',
    href: 'https://twitter.com/protradersim',
    icon: IconTwitterX,
  },
  {
    label: 'Follow us on LinkedIn',
    href: 'https://linkedin.com/company/protradersim',
    icon: IconLinkedIn,
  },
  {
    label: 'Subscribe on YouTube',
    href: 'https://youtube.com/@protradersim',
    icon: IconYouTube,
  },
  {
    label: 'Follow us on Facebook',
    href: 'https://facebook.com/protradersim',
    icon: IconFacebook,
  },
]

// ---------------------------------------------------------------------------
// Marketing metrics (can be loaded from config/CMS)
// ---------------------------------------------------------------------------

const TRADER_COUNT = process.env.NEXT_PUBLIC_TRADER_COUNT ?? '50,000+'

// ---------------------------------------------------------------------------
// Footer logo (server-safe, no client state)
// ---------------------------------------------------------------------------

function FooterLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500">
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Footer (server component — no 'use client' needed)
// ---------------------------------------------------------------------------

/**
 * Professional 5-column marketing footer with brand column, link columns, risk disclosure, and bottom bar.
 */
export function Footer() {
  return (
    <footer aria-label="Site footer">
      {/* Main footer body */}
      <div className="bg-dark-800 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
            {/* Column 1: Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <FooterLogo />
              <p className="mt-4 text-sm leading-relaxed text-gray-400">
                Professional CFD Trading Simulation
              </p>

              {/* Social links */}
              <div className="mt-6 flex items-center gap-3">
                {SOCIAL_LINKS.map((s) => {
                  const Icon = s.icon
                  return (
                    <a
                      key={s.href}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                    >
                      <Icon />
                    </a>
                  )
                })}
              </div>

              {/* Trader count badge */}
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-buy" aria-hidden="true" />
                <span className="text-xs font-medium text-gray-400">
                  {TRADER_COUNT} traders worldwide
                </span>
              </div>
            </div>

            {/* Columns 2–5: Link groups */}
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-white">
                  {col.heading}
                </h3>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 transition-colors duration-150 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-dark-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:gap-8">
            {/* Copyright */}
            <p className="flex-shrink-0 whitespace-nowrap text-xs text-gray-500">
              &copy; {new Date().getFullYear()} ProTraderSim. All rights reserved.
            </p>

            {/* Risk warning — centre */}
            <p className="flex-1 text-center text-xs font-medium leading-relaxed text-gray-300 lg:text-left">
              CFDs are complex instruments and come with a high risk of losing money rapidly due to
              leverage. 74% of retail investor accounts lose money when trading CFDs. You should
              consider whether you understand how CFDs work and whether you can afford to take the
              high risk of losing your money.
            </p>

            {/* Simulation disclaimer */}
            <p className="flex-shrink-0 whitespace-nowrap text-right text-xs font-medium text-gray-300">
              ProTraderSim is a simulation platform
              <br className="hidden lg:block" /> for educational purposes only.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
