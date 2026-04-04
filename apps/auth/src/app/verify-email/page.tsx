'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Card } from '@protrader/ui'
import { verifyEmail } from '@/lib/api'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    let isMounted = true

    // Parse token from URL on client side only
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      if (isMounted) {
        setStatus('error')
        setMessage('Verification token is missing.')
      }
      return
    }

    verifyEmail(token)
      .then((res) => {
        if (!isMounted) return
        setStatus('success')
        setMessage(res.message ?? 'Your email has been verified successfully.')
      })
      .catch((err) => {
        if (!isMounted) return
        setStatus('error')
        setMessage(
          err instanceof Error ? err.message : 'Email verification failed. Please try again.',
        )
      })

    return () => {
      isMounted = false
    }
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
            onClick={() => {
              const baseUrl = process.env.NEXT_PUBLIC_PLATFORM_URL
              if (!baseUrl) {
                console.error('NEXT_PUBLIC_PLATFORM_URL is not configured')
                return
              }
              window.location.href = `${baseUrl}/dashboard`
            }}
          >
            Go to platform
          </Button>
        ) : status === 'error' ? (
          <Link href="/login" className="text-primary mt-4 inline-block hover:underline">
            Return to login
          </Link>
        ) : null}
      </Card>
    </div>
  )
}
