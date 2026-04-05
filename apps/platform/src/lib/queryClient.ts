'use client'

import { QueryClient } from '@tanstack/react-query'

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 409, 422])

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

        if (status !== undefined && NON_RETRYABLE_STATUSES.has(status)) return false
        return failureCount < 2
      },
    },
  },
})
