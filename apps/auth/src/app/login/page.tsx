'use client'

import { useState } from 'react'
import Link from 'next/link'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button, Card, Input } from '@protrader/ui'
import { login } from '@/lib/api'

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
})

type LoginForm = z.infer<typeof LoginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { remember_me: true },
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)

    try {
      const response = await login({
        email: data.email,
        password: data.password,
        remember_me: data.remember_me ?? false,
      })

      const token = response.access_token
      if (!token) throw new Error('Missing auth token from response')

      if (data.remember_me) {
        localStorage.setItem('access_token', token)
        sessionStorage.removeItem('access_token')
      } else {
        sessionStorage.setItem('access_token', token)
        localStorage.removeItem('access_token')
      }

      const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3002'
      window.location.href = `${authUrl}/dashboard`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-dark text-2xl font-semibold">Log in to ProTraderSim</h1>
        <p className="text-dark-500 text-sm">Secure access to your trading dashboard.</p>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />

          <div className="flex items-center gap-3">
            <label className="text-dark inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('remember_me')}
                className="border-primary h-4 w-4 rounded"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-primary text-sm hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <Button type="submit" size="full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="text-dark-500 text-sm">
          New to ProTraderSim?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  )
}
