export interface IbTrader {
  id: string
  fullName: string
  email: string
  accountNumber: string
  kycStatus: string
  accountStatus: string
  createdAt: string
}

export interface IbCommission {
  id: string
  agentId: string
  traderId: string
  tradeId: string
  amountCents: string
  rateBps: number
  status: 'PENDING' | 'PAID'
  createdAt: string
  trader: { fullName: string; accountNumber: string }
  trade: {
    direction: string
    units: string
    openAt: string
    instrument: { symbol: string }
  }
}

export interface IbCommissionSummary {
  totalCents: string
  totalFormatted: string
  pendingCents: string
  pendingFormatted: string
  paidCents: string
  paidFormatted: string
}

export interface IbNetworkStats {
  totalTraders: number
  activeTraders: number
  totalTradeVolume: string
  pendingCommissionCents: string
}

export interface IbAgentApiResponse {
  id: string
  full_name: string
  email: string
  ref_code?: string
  commission_rate_bps: number
  is_active: boolean
  created_at: string
  trader_count: number
  total_commission_cents: string
}

export interface IbAgent {
  id: string
  fullName: string
  email: string
  refCode?: string
  commissionRateBps: number
  isActive: boolean
  createdAt: string
  traderCount: number
  totalCommissionCents: string
}

export interface IbCommissionsResponse {
  data: IbCommission[]
  nextCursor: string | null
  hasMore: boolean
}
