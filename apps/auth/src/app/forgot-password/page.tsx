'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button, Card, Input } from '@protrader/ui'
import { forgotPassword } from '@/lib/api'

const ForgotPasswordSchema = z.object({ email: z.string().email('Enter a valid email') })
type ForgotPasswordForm = z.infer<typeof ForgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(ForgotPasswordSchema) })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setApiError(null)
    setLoading(true)

    try {
      await forgotPassword(data.email)
      setSubmitted(true)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-dark text-2xl font-semibold">Reset your password</h1>
        {!submitted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
            />
            {apiError && <p className="text-danger text-sm">{apiError}</p>}
            <Button type="submit" size="full" loading={loading}>
              Send reset link
            </Button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-dark-500 text-sm">
              If that email exists, we sent a one-time password reset link. Check your inbox.
            </p>
            <Link href="/login" className="text-primary hover:underline">
              Return to login
            </Link>
          </div>
        )}
      </Card>
  )
}
