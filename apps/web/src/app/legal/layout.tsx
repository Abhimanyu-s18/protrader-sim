import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Legal',
  description: 'ProTraderSim legal pages including terms, privacy, and related policies.',
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children
}
