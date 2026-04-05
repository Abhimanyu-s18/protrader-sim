'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { formatDateTime } from '@protrader/utils'
import { api } from '../../../lib/api'
import type { IbTrader } from '../../../types/ib'

interface TradersResponse {
  data: IbTrader[]
  next_cursor: string | null
  has_more: boolean
}

function kycBadgeClass(status: string): string {
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

function accountBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-400'
    case 'SUSPENDED':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

/** Full trader list with KYC and account status badges. */
export default function TradersPage() {
  const { data, isLoading, isError, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['ib', 'traders'],
    queryFn: ({ pageParam }) =>
      api.get<TradersResponse>('/v1/ib/traders', {
        params: { limit: '50', ...(pageParam ? { cursor: pageParam } : {}) },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
  })

  const traders = data?.pages.flatMap((page) => page.data) ?? []
  const loadedCount = traders.length
  const hasMore = data?.pages[data.pages.length - 1]?.has_more ?? false

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Traders</h1>
        {data && (
          <span className="text-sm text-gray-400">
            {loadedCount}
            {hasMore && '+'}
            {' loaded'}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {isLoading && traders.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">Loading…</p>
        ) : isError ? (
          <div className="flex gap-3 p-5">
            <p className="text-sm text-red-400">Failed to load traders.</p>
            <button
              type="button"
              onClick={() => fetchNextPage()}
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : traders.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No traders linked to your account yet.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    Account #
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    KYC Status
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    Account Status
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {traders.map((trader) => (
                  <tr key={trader.id} className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 font-mono text-gray-300">{trader.accountNumber}</td>
                    <td className="px-5 py-3 text-white">{trader.fullName}</td>
                    <td className="px-5 py-3 text-gray-400">{trader.email}</td>
                    <td className={`px-5 py-3 font-medium ${kycBadgeClass(trader.kycStatus)}`}>
                      {trader.kycStatus}
                    </td>
                    <td
                      className={`px-5 py-3 font-medium ${accountBadgeClass(trader.accountStatus)}`}
                    >
                      {trader.accountStatus}
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDateTime(trader.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div className="flex justify-center p-4">
                <button
                  type="button"
                  onClick={() => setCursor(data?.next_cursor ?? null)}
                  disabled={isLoading}
                  className="rounded-md bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading more...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
