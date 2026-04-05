export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
export type TradeDirection = 'BUY' | 'SELL'

/** String is used for all cent/volume fields to avoid JS integer precision issues with large values. */
export interface IbTrader {
  id: string
  fullName: string
  email: string
  accountNumber: string
  kycStatus: KycStatus
  accountStatus: AccountStatus
  createdAt: string
}

/** String is used for all cent/volume fields to avoid JS integer precision issues with large values. */
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
    direction: TradeDirection
    units: string
    openAt: string
    instrument: { symbol: string }
  }
}

/** String is used for all cent/volume fields to avoid JS integer precision issues with large values. */
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

export interface IbNetworkStatsApiResponse {
  total_traders: number
  active_traders: number
  total_trade_volume: string
  pending_commission_cents: string
}

export interface IbCommissionSummaryApiResponse {
  total_cents: string
  total_formatted: string
  pending_cents: string
  pending_formatted: string
  paid_cents: string
  paid_formatted: string
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
