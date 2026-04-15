'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Root error boundary for the web marketing site.
 * Catches unhandled errors in the app directory and renders a user-friendly fallback.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
    // TODO: Send to error reporting service (Sentry, DatadogRUM, etc.) when configured
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 text-center dark:bg-gray-900">
      <div className="max-w-md">
        <h1 className="text-4xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-4 text-base text-gray-600">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-8 inline-flex items-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
