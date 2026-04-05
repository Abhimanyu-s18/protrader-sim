'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef, type ReactNode } from 'react'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount: number, error: unknown) => {
          const status = (error as { status?: number }).status
          if (status && status >= 400 && status < 500) return false
          return failureCount < 2
        },
      },
    },
  })

export function QueryClientProviderWrapper({ children }: { children: ReactNode }) {
  const queryClientRef = useRef<QueryClient>()
  if (!queryClientRef.current) {
    queryClientRef.current = createQueryClient()
  }
  return <QueryClientProvider client={queryClientRef.current}>{children}</QueryClientProvider>
}
