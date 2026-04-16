'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button, Card, Input } from '@protrader/ui'
import { register as registerUser } from '@/lib/api'
import { COUNTRIES } from '@/constants/countries'

const RegisterSchema = z
  .object({
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/,
        'Must include upper, lower, number, and special char',
      ),
    confirm_password: z.string().min(1, 'Confirm your password'),
    country: z.string().min(2, 'Country is required'),
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(/^[+]?[\d\s\-()]{6,}$/, 'Enter a valid phone number')
      .refine(
        (val) => (val.match(/\d/g) || []).length >= 7,
        'Phone number must have at least 7 digits',
      ),
    terms_accepted: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

type RegisterForm = z.infer<typeof RegisterSchema>

const getStrength = (password: string) => {
  if (!password) return { label: 'Too short', score: 0, color: 'bg-danger' }
  let score = 0
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score <= 2) return { label: 'Weak', score, color: 'bg-danger' }
  if (score <= 4) return { label: 'Medium', score, color: 'bg-warning' }
  return { label: 'Strong', score, color: 'bg-success' }
}

export default function RegisterPage() {
  const router = useRouter()
  const [isSubmitted, setSubmitted] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
      country: '',
      phone: '',
      terms_accepted: false,
    },
  })

  const pwd = watch('password', '')
  const strength = useMemo(() => getStrength(pwd), [pwd])

  const onSubmit = async (data: RegisterForm) => {
    setApiError(null)
    setLoading(true)

    try {
      await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        country: data.country,
        phone: data.phone,
        terms_accepted: data.terms_accepted,
      })
      setSubmitted(true)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold text-dark">Check your email</h1>
        <p className="mt-2 text-sm text-dark-500">
          We sent a verification link to the email you provided. Please follow the link to activate
          your account.
        </p>
        <Button className="mt-6" onClick={() => router.push('/login')}>
          Back to login
        </Button>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md space-y-3">
      <h1 className="text-2xl font-semibold text-dark">Create your account</h1>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Full Name"
          type="text"
          {...register('full_name')}
          error={errors.full_name?.message}
        />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Input
          id="phone"
          label="Phone Number"
          type="tel"
          placeholder="+1 234 567 8900"
          {...register('phone')}
          error={errors.phone?.message}
        />
        <Input
          label="Password"
          type="password"
          {...register('password')}
          error={errors.password?.message}
        />

        <div className="space-y-1">
          <div className="h-2 w-full rounded bg-surface-border">
            <div
              className={`h-2 rounded ${strength.color}`}
              style={{ width: `${(strength.score / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs font-medium text-dark-500">Strength: {strength.label}</p>
        </div>

        <Input
          label="Confirm Password"
          type="password"
          {...register('confirm_password')}
          error={errors.confirm_password?.message}
        />

        <div>
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-dark">
            Country
          </label>
          <select
            id="country"
            className="w-full rounded border border-surface-border px-3 py-2 text-sm focus:border-primary"
            {...register('country')}
            aria-describedby={errors.country ? 'country-error' : undefined}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          {errors.country && (
            <p id="country-error" role="alert" className="mt-1 text-xs text-danger">
              {errors.country.message}
            </p>
          )}
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-dark">
          <input
            type="checkbox"
            id="terms_accepted"
            {...register('terms_accepted')}
            className="h-4 w-4 rounded border-primary"
            aria-describedby={errors.terms_accepted ? 'terms-error' : undefined}
            aria-label="I agree to the Terms of Service"
          />
          <span className="inline-flex items-center gap-1">I agree to the</span>
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </div>
        {errors.terms_accepted && (
          <p id="terms-error" role="alert" className="text-xs text-danger">
            {errors.terms_accepted.message}
          </p>
        )}

        {apiError && <p className="text-sm text-danger">{apiError}</p>}

        <Button type="submit" size="full" loading={loading}>
          Register
        </Button>
      </form>

      <p className="text-sm text-dark-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  )
}
