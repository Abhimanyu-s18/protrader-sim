'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '@/lib/api'
import { formatDateTime } from '@protrader/utils'
import type { User, PaginatedResponse, AccountStatus, KycStatus } from '@protrader/types'

function statusColor(status: AccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-400'
    case 'SUSPENDED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

function kycStatusColor(status: KycStatus) {
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

const ACCOUNT_STATUSES: AccountStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED']

/** Users list page with search, status filter, and cursor pagination. */
export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input by 300ms — only updates debouncedSearch
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search])

  // Reset on filter change
  useEffect(() => {
    setDebouncedSearch('')
    setSearch('')
  }, [statusFilter])

  function buildUrl(pageParam: string | null) {
    const params = new URLSearchParams({ limit: '50' })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter) params.set('status', statusFilter)
    if (pageParam) params.set('cursor', pageParam)
    return `/v1/admin/users?${params.toString()}`
  }

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['admin', 'users', debouncedSearch, statusFilter],
      queryFn: ({ pageParam }) =>
        api.get<PaginatedResponse<User>>(buildUrl(pageParam as string | null)),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
    })

  // Flatten all pages into a single list
  const allUsers = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data])

  function loadMore() {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name, email, account#…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users by name, email, or account number"
          className="w-72 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AccountStatus | '')}
          aria-label="Filter users by account status"
          className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && allUsers.length === 0 && <p className="text-sm text-gray-400">Loading…</p>}
      {isError && <p className="text-sm text-red-400">Failed to load users. Please try again.</p>}

      {allUsers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Account #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">KYC</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Registered</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/users/${user.id}`}
                  className="table-row cursor-pointer border-b border-gray-800 bg-gray-900 hover:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset"
                >
                  <td className="px-4 py-3 font-mono text-gray-300">{user.account_number}</td>
                  <td className="px-4 py-3 text-white">{user.full_name}</td>
                  <td className="px-4 py-3 text-gray-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${kycStatusColor(user.kyc_status)}`}>
                      {user.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${statusColor(user.account_status)}`}>
                      {user.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDateTime(user.created_at)}</td>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && allUsers.length === 0 && !isError && (
        <p className="text-sm text-gray-500">No users found.</p>
      )}

      {hasNextPage && (
        <button
          onClick={loadMore}
          disabled={isFetchingNextPage}
          className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
