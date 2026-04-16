import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ProTraderSim',
  description: 'Multi-Asset CFD Simulation Trading Platform',
}

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

function Logo() {
  return (
    <Link
      href={WEB_URL}
      className="group inline-flex items-center gap-2.5"
      aria-label="ProTraderSim home"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary transition-colors duration-150 group-hover:bg-primary-600">
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <polyline
            points="2,13 6,8 9,11 12,5 16,7"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight text-white">
        ProTrader<span className="text-primary">Sim</span>
      </span>
    </Link>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="auth-bg font-sans text-white antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="flex justify-center px-4 pb-4 pt-10">
            <Logo />
          </header>

          <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-2">
            {children}
          </main>

          <footer className="pb-8 pt-2 text-center text-xs text-dark-400">
            © 2025 ProTraderSim · All rights reserved ·{' '}
            <Link
              href={`${WEB_URL}/legal/privacy`}
              className="transition-colors hover:text-dark-300"
            >
              Privacy Policy
            </Link>{' '}
            ·{' '}
            <Link
              href={`${WEB_URL}/legal/terms`}
              className="transition-colors hover:text-dark-300"
            >
              Terms
            </Link>
          </footer>
        </div>
      </body>
    </html>
  )
}
