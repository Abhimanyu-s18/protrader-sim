'use client'

import { QueryClientProviderWrapper } from '../lib/queryClient'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
}
