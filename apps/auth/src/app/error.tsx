'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Root error boundary for the auth app (login/register/KYC).
 * Catches unhandled errors and renders a user-friendly fallback.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for debugging and monitoring (production ready)
    console.error(error)
    // TODO: Send to error reporting service (Sentry, DatadogRUM, etc.) when configured
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-3 text-sm text-gray-600">
          An unexpected error occurred. Please try again or return to the login page.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            Try again
          </button>
          <a
            href="/login"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  )
}
