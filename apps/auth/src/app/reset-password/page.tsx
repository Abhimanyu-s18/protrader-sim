import { Suspense } from 'react'
import ResetPasswordForm from '@/components/ResetPasswordForm'

function LoadingSpinner() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="border-dark-600 border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
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
