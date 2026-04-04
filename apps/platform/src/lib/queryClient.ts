'use client'

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
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

        if (status === 400 || status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
    },
  },
})
