'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button, Card, Input } from '@protrader/ui'
import { resetPassword } from '@/lib/api'

const ResetPasswordSchema = z
  .object({
    password: z.string().min(12, 'Password must be at least 12 characters'),
    confirm_password: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams?.get('token') ?? null
    setToken(tokenParam)
    setInitialized(true)
  }, [searchParams])

  useEffect(() => {
    if (status === 'ok') {
      redirectTimeoutRef.current = setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [status, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(ResetPasswordSchema) })

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setApiError('Token is missing from URL.')
      setStatus('error')
      return
    }

    setLoading(true)
    setApiError(null)

    try {
      await resetPassword(token, data.password)
      setStatus('ok')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Reset password failed')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-dark text-2xl font-semibold">Set a new password</h1>

        {initialized && !token ? (
          <p className="text-danger text-sm">
            Reset token is missing. Please use the link from your email.
          </p>
        ) : status === 'ok' ? (
          <p className="text-success text-sm">
            Password successfully reset. Redirecting to login...
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...register('confirm_password')}
              error={errors.confirm_password?.message}
            />
            {apiError && <p className="text-danger text-sm">{apiError}</p>}
            <Button type="submit" size="full" loading={loading}>
              Reset password
            </Button>
          </form>
        )}

        <Link href="/login" className="text-primary text-sm hover:underline">
          Back to login
        </Link>
      </Card>
    </div>
  )
}
