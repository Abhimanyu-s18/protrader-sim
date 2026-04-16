'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Root error boundary for the IB portal app.
 * Catches unhandled errors and renders a dark-themed user-friendly fallback.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)

    if ('Sentry' in window) {
      try {
        const Sentry = (window as unknown as { Sentry: { captureException: (err: Error) => void } })
          .Sentry
        Sentry.captureException(error)
      } catch (err) {
        console.debug('Failed to report to Sentry:', err)
      }
    } else if ('datadogRum' in window) {
      try {
        const datadogRum = (
          window as unknown as {
            datadogRum: { addError: (err: unknown, context?: unknown) => void }
          }
        ).datadogRum
        datadogRum.addError(error, { source: 'ErrorBoundary' })
      } catch (err) {
        console.debug('Failed to report to Datadog:', err)
      }
    }
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
          An unexpected error occurred in the IB portal. Please try again or contact support if the
          issue persists.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-500">Error ID: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex items-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
