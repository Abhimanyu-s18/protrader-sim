import type { Metadata } from 'next'
import { TermsContent } from './TermsContent'
import { TermsSidebar } from './TermsSidebar'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'ProTraderSim Terms of Service — read our full terms and conditions.',
}

const LAST_UPDATED = 'January 1, 2025'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Sidebar TOC */}
        <TermsSidebar />

        {/* Main content */}
        <main className="flex-1 lg:p-8">
          <div className="mx-auto max-w-3xl bg-white p-6 lg:rounded-2xl lg:p-10 lg:shadow-sm">
            <header className="mb-10 border-b border-surface-border pb-8">
              <h1 className="text-3xl font-bold text-dark-700 md:text-4xl">Terms of Service</h1>
              <p className="mt-4 text-gray-500">Last updated: {LAST_UPDATED}</p>
            </header>

            <TermsContent />
          </div>
        </main>
      </div>
    </div>
  )
}
