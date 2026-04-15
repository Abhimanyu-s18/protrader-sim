import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    template: '%s | ProTraderSim',
    default: 'ProTraderSim — Trade Global Markets',
  },
  description:
    'Trade 150+ instruments across Forex, Stocks, Indices, Commodities & Crypto. Professional CFD simulation platform with ultra-low spreads and high leverage.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={inter.variable}
      style={{ '--navbar-height': '72px' } as React.CSSProperties}
    >
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
