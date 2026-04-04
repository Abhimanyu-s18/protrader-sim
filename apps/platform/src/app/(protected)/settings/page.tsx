'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { api } from '../../../lib/api'
import type { ApiResponse, User } from '@protrader/types'

// ── Schemas ───────────────────────────────────────────────────────

const ProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().min(5, 'Enter a valid phone number'),
})

const PasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(12, 'Minimum 12 characters')
      .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type ProfileForm = z.infer<typeof ProfileSchema>
type PasswordForm = z.infer<typeof PasswordSchema>

// ── Section card ──────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-400 uppercase">{title}</h2>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const {
    data: meData,
    isLoading: isLoadingMe,
    isError: isErrorMe,
  } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<ApiResponse<User>>('/v1/users/me'),
  })

  const qc = useQueryClient()
  const user = meData?.data

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    values: { full_name: user?.full_name ?? '', phone: user?.phone ?? '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(PasswordSchema),
  })

  const updateProfile = useMutation({
    mutationFn: (data: ProfileForm) => api.put<unknown>('/v1/users/me', data),
    onMutate: () => {
      setProfileSuccess(false)
      setProfileError(null)
    },
    onSuccess: () => {
      setProfileSuccess(true)
      setProfileError(null)
      void qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: Error) => {
      setProfileError(err.message)
      setProfileSuccess(false)
    },
  })

  const changePassword = useMutation({
    mutationFn: (data: PasswordForm) =>
      api.post<unknown>('/v1/auth/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      }),
    onMutate: () => {
      setPasswordSuccess(false)
      setPasswordError(null)
    },
    onSuccess: () => {
      setPasswordSuccess(true)
      setPasswordError(null)
      passwordForm.reset()
    },
    onError: (err: Error) => {
      setPasswordError(err.message)
      setPasswordSuccess(false)
    },
  })

  if (isLoadingMe) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400">Loading your settings...</p>
      </div>
    )
  }

  if (isErrorMe) {
    return (
      <div className="max-w-2xl space-y-6 p-6">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-red-400">Failed to load settings. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      {/* Profile */}
      <SectionCard title="Profile">
        {user && (
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Account #</p>
              <p className="text-white">{user.account_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">KYC Status</p>
              <p className="text-white">{user.kyc_status}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Account Status</p>
              <p className="text-white">{user.account_status}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))}
          className="space-y-3"
        >
          <div>
            <label htmlFor="full_name" className="mb-1 block text-xs text-gray-400">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              {...profileForm.register('full_name')}
              aria-describedby={
                profileForm.formState.errors.full_name ? 'error-full_name' : undefined
              }
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
            {profileForm.formState.errors.full_name && (
              <p id="error-full_name" role="alert" className="mt-1 text-xs text-red-400">
                {profileForm.formState.errors.full_name.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-xs text-gray-400">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...profileForm.register('phone')}
              aria-describedby={profileForm.formState.errors.phone ? 'error-phone' : undefined}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
            {profileForm.formState.errors.phone && (
              <p id="error-phone" role="alert" className="mt-1 text-xs text-red-400">
                {profileForm.formState.errors.phone.message}
              </p>
            )}
          </div>

          {profileError && <p className="text-xs text-red-400">{profileError}</p>}
          {profileSuccess && <p className="text-xs text-green-400">Profile updated.</p>}

          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </SectionCard>

      {/* Change password */}
      <SectionCard title="Change Password">
        <form
          onSubmit={passwordForm.handleSubmit((d) => changePassword.mutate(d))}
          className="space-y-3"
        >
          <div>
            <label htmlFor="current_password" className="mb-1 block text-xs text-gray-400">
              Current Password
            </label>
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('current_password')}
              aria-describedby={
                passwordForm.formState.errors.current_password
                  ? 'error-current_password'
                  : undefined
              }
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
            {passwordForm.formState.errors.current_password && (
              <p id="error-current_password" role="alert" className="mt-1 text-xs text-red-400">
                {passwordForm.formState.errors.current_password.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="new_password" className="mb-1 block text-xs text-gray-400">
              New Password
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('new_password')}
              aria-describedby={
                passwordForm.formState.errors.new_password ? 'error-new_password' : undefined
              }
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
            {passwordForm.formState.errors.new_password && (
              <p id="error-new_password" role="alert" className="mt-1 text-xs text-red-400">
                {passwordForm.formState.errors.new_password.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirm_password" className="mb-1 block text-xs text-gray-400">
              Confirm New Password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('confirm_password')}
              aria-describedby={
                passwordForm.formState.errors.confirm_password
                  ? 'error-confirm_password'
                  : undefined
              }
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
            {passwordForm.formState.errors.confirm_password && (
              <p id="error-confirm_password" role="alert" className="mt-1 text-xs text-red-400">
                {passwordForm.formState.errors.confirm_password.message}
              </p>
            )}
          </div>

          {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
          {passwordSuccess && <p className="text-xs text-green-400">Password changed.</p>}

          <button
            type="submit"
            disabled={changePassword.isPending}
            className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600 disabled:opacity-50"
          >
            {changePassword.isPending ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
