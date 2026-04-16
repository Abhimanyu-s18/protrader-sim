'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Root error boundary for the admin panel app.
 * Catches unhandled errors and renders a dark-themed user-friendly fallback.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for debugging and production monitoring
    console.error(error)

    // Send to error reporting service when configured (guards reporting behind config check)
    if (process.env.NEXT_PUBLIC_ERROR_REPORTING_DSN) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      // Example integration — replace with actual SDK call when service is configured:
      // Sentry.captureException(error, { extra: { ...context } })
      // or: datadogRum.addError(error, { ...context })
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          digest: error.digest,
          dsn: process.env.NEXT_PUBLIC_ERROR_REPORTING_DSN,
        }),
        signal: controller.signal,
      })
        .finally(() => clearTimeout(timeout))
        .catch(() => {
          // Silently fail — error reporting should not break the app
        })

      // Cleanup function to abort fetch and clear timeout on unmount or error change
      return () => {
        controller.abort()
        clearTimeout(timeout)
      }
    }

    // Return undefined when error reporting is not configured
    return undefined
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <svg
            aria-hidden="true"
            className="h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm text-gray-400">
          An unexpected error occurred in the admin panel. Please try again or contact the
          development team if the issue persists.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-500">Error ID: {error.digest}</p>
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
