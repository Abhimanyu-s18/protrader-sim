import { Suspense } from 'react'
import ResetPasswordForm from '@/components/ResetPasswordForm'

function LoadingSpinner() {
  return (
    <div
      className="flex min-h-[200px] items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-dark-600 border-t-primary"
        role="status"
      >
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
