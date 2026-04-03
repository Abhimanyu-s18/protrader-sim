'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Card } from '@protrader/ui'
import { verifyEmail } from '@/lib/api'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    // Parse token from URL on client side only
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Verification token is missing.')
      return
    }

    verifyEmail(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.message ?? 'Your email has been verified successfully.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(
          err instanceof Error ? err.message : 'Email verification failed. Please try again.',
        )
      })
  }, [])

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-dark text-2xl font-semibold">Email verification</h1>
        <p
          className={`mt-3 text-sm ${status === 'success' ? 'text-success' : status === 'error' ? 'text-danger' : 'text-dark-500'}`}
        >
          {message}
        </p>
        {status === 'success' ? (
          <Button
            className="mt-4"
            onClick={() => (window.location.href = 'https://platform.protrader.io/dashboard')}
          >
            Go to platform
          </Button>
        ) : (
          <Link href="/login" className="text-primary mt-4 inline-block hover:underline">
            Return to login
          </Link>
        )}
      </Card>
    </div>
  )
}
