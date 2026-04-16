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

      const maxAge = data.remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60
      const isSecure = window.location.protocol === 'https:'

      // Robustly extract registrable domain for cookie
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
      const isIpAddress = ipRegex.test(window.location.hostname)
      const hasDot = window.location.hostname.includes('.')
      let domainCookie = ''

      if (!isIpAddress && hasDot && window.location.hostname !== 'localhost') {
        // Get the last two labels (e.g., 'example.com' from 'app.example.com')
        // This handles most common cases; for complex TLDs, cookies will work without domain restriction
        const parts = window.location.hostname.split('.')
        if (parts.length >= 2) {
          const registrableDomain = parts.slice(-2).join('.')
          domainCookie = `; domain=.${registrableDomain}`
        }
      }

      document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}${domainCookie}`

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
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-dark-200">
          <span className="text-primary">✦</span> Trusted by 50,000+ traders worldwide
        </p>
      </div>
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold text-dark">Log in to ProTraderSim</h1>
        <p className="text-sm text-dark-400">Access your trading dashboard.</p>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-dark">
              <input
                type="checkbox"
                {...register('remember_me')}
                className="h-4 w-4 rounded border-primary"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="text-sm text-dark-500">
          New to ProTraderSim?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  )
}
