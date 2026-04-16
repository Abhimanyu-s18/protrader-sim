'use client'

import { useState } from 'react'
import Link from 'next/link'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button, Card, Input } from '@protrader/ui'
import { login } from '@/lib/api'
import { safeStorage } from '@/lib/safeStorage'

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

      try {
        safeStorage.set('access_token', token, data.remember_me ?? false)
      } catch {
        throw new Error('Unable to save login session. Please check your browser settings.')
      }

      // Set a cookie so server-side middleware on other apps (platform, admin, ib-portal)
      // can verify authentication. Cookie is scoped to the root domain so it's readable
      // across ports on localhost and across subdomains in production.
      const maxAge = data.remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60
      const isSecure = window.location.protocol === 'https:'
      document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`

      const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002'
      window.location.href = `${platformUrl}/dashboard`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="mb-6 text-center">
        <p className="text-dark-200 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium">
          <span className="text-primary">✦</span> Trusted by 50,000+ traders worldwide
        </p>
      </div>
      <Card className="w-full space-y-4">
        <h1 className="text-dark text-2xl font-semibold">Log in to ProTraderSim</h1>
        <p className="text-dark-400 text-sm">Access your trading dashboard.</p>
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
