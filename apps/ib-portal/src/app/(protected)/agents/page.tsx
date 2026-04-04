'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatMoney, formatDateTime } from '@protrader/utils'
import { api } from '../../../lib/api'
import type { IbAgentApiResponse, IbAgent } from '../../../types/ib'

/** Decode the JWT payload to extract the user's role without verifying signature. */
function getUserRole(): string | null {
  try {
    const token = localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token')
    if (!token) return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]!)) as { role?: string }
    return payload.role ?? null
  } catch {
    return null
  }
}

/** Agents management page — only accessible to IB_TEAM_LEADER role. */
export default function AgentsPage() {
  const [role, setRole] = useState<string | null>(null)
  const [roleChecked, setRoleChecked] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    setRole(getUserRole())
    setRoleChecked(true)
  }, [])

  const {
    data: agentResponses,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['ib', 'agents'],
    queryFn: () => api.get<IbAgentApiResponse[]>('/v1/ib/agents'),
    enabled: role === 'IB_TEAM_LEADER',
  })

  // Normalize agent data from snake_case API response to camelCase
  const agents: IbAgent[] =
    agentResponses?.map((agent) => ({
      id: agent.id,
      fullName: agent.full_name,
      email: agent.email,
      refCode: agent.ref_code,
      commissionRateBps: agent.commission_rate_bps,
      isActive: agent.is_active,
      createdAt: agent.created_at,
      traderCount: agent.trader_count,
      totalCommissionCents: agent.total_commission_cents,
    })) ?? []

  // Pagination logic
  const totalAgents = agents.length
  const totalPages = Math.ceil(totalAgents / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedAgents = agents.slice(startIndex, endIndex)

  if (!roleChecked) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (role !== 'IB_TEAM_LEADER') {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-lg font-semibold text-white">Access Restricted</p>
          <p className="mt-2 text-sm text-gray-400">
            This page is only available to IB Team Leaders.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Agents</h1>
        {agents && (
          <span className="text-sm text-gray-400">
            {totalAgents} total • Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {isLoading ? (
          <p className="p-5 text-sm text-gray-400">Loading…</p>
        ) : isError ? (
          <p className="p-5 text-sm text-red-400">Failed to load agents.</p>
        ) : !agents || agents.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No agents found in your network.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Ref Code
                  </th>
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Commission Rate
                  </th>
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Active
                  </th>
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Traders
                  </th>
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Total Commission
                  </th>
                  <th className="px-5 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-white">{agent.fullName}</td>
                    <td className="px-5 py-3 text-gray-400">{agent.email}</td>
                    <td className="px-5 py-3 font-mono text-gray-300">
                      {agent.refCode ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-300">{agent.commissionRateBps} bps</td>
                    <td className="px-5 py-3">
                      <span
                        className={`font-medium ${agent.isActive ? 'text-green-400' : 'text-gray-500'}`}
                      >
                        {agent.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{agent.traderCount}</td>
                    <td className="px-5 py-3 font-medium text-white">
                      {formatMoney(agent.totalCommissionCents)}
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDateTime(agent.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-800 px-5 py-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
