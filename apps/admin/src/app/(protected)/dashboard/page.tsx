'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDateTime } from '@protrader/utils'
import type { User, PaginatedResponse } from '@protrader/types'

interface KpiCardProps {
  label: string
  value: string | number
  isLoading: boolean
  isError?: boolean
}

function KpiCard({ label, value, isLoading, isError }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      {isLoading ? (
        <p className="mt-1 text-2xl font-bold text-gray-600">…</p>
      ) : isError ? (
        <p className="mt-1 text-2xl font-bold text-red-400">Failed to load</p>
      ) : (
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      )}
    </div>
  )
}

function kycStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'text-green-400'
    case 'PENDING':
      return 'text-yellow-400'
    case 'REJECTED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

interface CountResponse {
  count: number
}

export default function DashboardPage() {
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorObj,
  } = useQuery({
    queryKey: ['admin', 'users', 'list'],
    queryFn: () => api.get<PaginatedResponse<User>>('/v1/admin/users?limit=10'),
  })

  const {
    data: kycCountData,
    isLoading: kycLoading,
    isError: kycError,
    error: kycErrorObj,
  } = useQuery<CountResponse>({
    queryKey: ['admin', 'kyc', 'pending-count'],
    queryFn: () => api.get<CountResponse>('/v1/admin/kyc/count?status=UPLOADED'),
  })

  const {
    data: depositsCountData,
    isLoading: depositsLoading,
    isError: depositsError,
    error: depositsErrorObj,
  } = useQuery<CountResponse>({
    queryKey: ['admin', 'deposits', 'pending-count'],
    queryFn: () => api.get<CountResponse>('/v1/admin/deposits/count?status=PENDING'),
  })

  const tzOffsetMinutes = new Date().getTimezoneOffset() * -1
  const {
    data: todayCountData,
    isLoading: todayCountLoading,
    isError: todayCountError,
    error: todayCountErrorObj,
  } = useQuery<CountResponse>({
    queryKey: ['admin', 'users', 'today-count', tzOffsetMinutes],
    queryFn: () =>
      api.get<CountResponse>(`/v1/admin/users/today-count?tz_offset_minutes=${tzOffsetMinutes}`),
  })

  const recentUsers: User[] = usersData?.data ?? []
  const todayCount = todayCountData?.count ?? 0
  const pendingKycCount = kycCountData?.count ?? 0
  const pendingDepositsCount = depositsCountData?.count ?? 0

  // Log errors when they occur
  useEffect(() => {
    if (usersError && usersErrorObj) {
      console.error('Failed to load users:', usersErrorObj)
    }
  }, [usersError, usersErrorObj])

  useEffect(() => {
    if (kycError && kycErrorObj) {
      console.error('Failed to load KYC count:', kycErrorObj)
    }
  }, [kycError, kycErrorObj])

  useEffect(() => {
    if (depositsError && depositsErrorObj) {
      console.error('Failed to load deposits count:', depositsErrorObj)
    }
  }, [depositsError, depositsErrorObj])

  useEffect(() => {
    if (todayCountError && todayCountErrorObj) {
      console.error("Failed to load today's user count:", todayCountErrorObj)
    }
  }, [todayCountError, todayCountErrorObj])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Users"
          value={usersData?.total_count ?? usersData?.data?.length ?? 0}
          isLoading={usersLoading}
          isError={usersError}
        />
        <KpiCard
          label="Pending KYC"
          value={pendingKycCount}
          isLoading={kycLoading}
          isError={kycError}
        />
        <KpiCard
          label="Pending Deposits"
          value={pendingDepositsCount}
          isLoading={depositsLoading}
          isError={depositsError}
        />
        <KpiCard
          label="Today's Registrations"
          value={todayCount}
          isLoading={todayCountLoading}
          isError={todayCountError}
        />
      </div>

      <div className="flex gap-3">
        <Link
          href="/kyc"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Review KYC
        </Link>
        <Link
          href="/deposits"
          className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          Review Deposits
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Recent Registrations</h2>
        {usersLoading && <p className="text-sm text-gray-400">Loading…</p>}
        {!usersLoading && usersError && (
          <p className="text-sm text-red-400">Failed to load users.</p>
        )}
        {!usersLoading && !usersError && recentUsers.length === 0 && (
          <p className="text-sm text-gray-500">No users found.</p>
        )}
        {!usersLoading && !usersError && recentUsers.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Account #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">KYC Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Registered</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-800 bg-gray-900 hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 font-mono text-gray-300">{user.account_number}</td>
                    <td className="px-4 py-3 text-white">{user.full_name}</td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${kycStatusColor(user.kyc_status)}`}>
                        {user.kyc_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
