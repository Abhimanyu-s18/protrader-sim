'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 409, 422])

/** Creates a fresh QueryClient instance with recommended defaults. */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const status =
            error &&
            typeof error === 'object' &&
            'status' in error &&
            typeof (error as { status?: unknown }).status === 'number'
              ? (error as { status: number }).status
              : undefined

          if (status !== undefined && NON_RETRYABLE_STATUSES.has(status)) return false
          return failureCount < 2
        },
      },
    },
  })
}

/** Wraps the app with React Query context. */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
