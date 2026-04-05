'use client'

import { type ReactNode } from 'react'
import { QueryClientProviderWrapper } from '../lib/queryClient'

export default function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
}
