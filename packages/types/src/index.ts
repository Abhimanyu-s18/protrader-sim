// ProTraderSim — Shared TypeScript Types
// All monetary values are BigInt serialized as strings in API responses

// ── Enums ─────────────────────────────────────────────────────────
export type KycStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADDITIONAL_REQUIRED'
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type StaffRole = 'SUPER_ADMIN' | 'ADMIN' | 'IB_TEAM_LEADER' | 'AGENT'
export type AssetClass = 'FOREX' | 'STOCK' | 'INDEX' | 'COMMODITY' | 'CRYPTO'
/**
 * Jurisdiction - Regulatory region or authority
 * - EU: European Union
 * - UK: United Kingdom
 * - US: United States
 * - ASIC: Australian Securities and Investments Commission
 * - DFSA: Dubai Financial Services Authority
 * - SC: Seychelles Financial Services Authority (Seychelles Commission)
 * - MU: Mauritius Financial Services Commission (FSC Mauritius)
 * - OTHER: Other regulatory jurisdictions
 */
export type Jurisdiction = 'EU' | 'UK' | 'US' | 'ASIC' | 'DFSA' | 'SC' | 'MU' | 'OTHER'
export type TradeDirection = 'BUY' | 'SELL'
export type TradeStatus = 'OPEN' | 'CLOSED' | 'PENDING' | 'CANCELLED'
export type OrderType = 'MARKET' | 'ENTRY'
export type ClosedBy =
  | 'USER'
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'MARGIN_CALL'
  | 'STOP_OUT'
  | 'ADMIN'
  | 'EXPIRED'
export type AlertType =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'PRICE_REACHES'
  | 'PCT_CHANGE_ABOVE'
  | 'PCT_CHANGE_BELOW'
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'CANCELLED'
export type CommissionStatus = 'PENDING' | 'PAID'
export type DepositStatus = 'PENDING' | 'CONFIRMING' | 'COMPLETED' | 'REJECTED' | 'EXPIRED'
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'
export type KycDocumentCategory = 'IDENTITY' | 'ADDRESS' | 'MISCELLANEOUS'
export type KycDocumentStatus = 'UPLOADED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_REVERSAL'
  | 'TRADE_CLOSE'
  | 'ROLLOVER'
  | 'TRADING_BENEFIT'
  | 'CASHBACK'
  | 'MANUAL_ADJUSTMENT'
  | 'DIVIDEND'
  | 'TAX'
  | 'COMMISSION'
  | 'FEE'
  | 'STOCK_SPLIT_ROUNDING'
  | 'TRANSFER'
  | 'BONUS'
  | 'NEGATIVE_BALANCE_PROTECTION'

// ── Money type (BigInt serialized as string in API) ────────────────
export type MoneyString = string // e.g. "10050" (represents $100.50)
export type PriceString = string // e.g. "108500" (represents 1.08500)

// ── API Standard Response ─────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error_code: string
  message: string
  details?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
  total_count?: number
}

// ── User / Auth ───────────────────────────────────────────────────
export interface User {
  id: string
  account_number: string
  lead_id: string
  email: string
  full_name: string
  phone: string
  country: string
  address_line1?: string
  address_city?: string
  address_country?: string
  date_of_birth?: string
  trading_experience?: string
  profession?: string
  language_preference: string
  jurisdiction: Jurisdiction
  kyc_status: KycStatus
  account_status: AccountStatus
  email_verified: boolean
  popup_sound_enabled: boolean
  avatar_url?: string
  agent_id?: string
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>
  access_token: string
  refresh_token: string
}

// ── Account Metrics (computed in real-time) ────────────────────────
export interface AccountMetrics {
  balance_cents: MoneyString
  balance_formatted: string
  unrealized_pnl_cents: MoneyString
  unrealized_pnl_formatted: string
  equity_cents: MoneyString
  equity_formatted: string
  used_margin_cents: MoneyString
  used_margin_formatted: string
  available_cents: MoneyString
  available_formatted: string
  margin_level_bps: MoneyString | null
  margin_level_pct: string | null // e.g. "150.00"
  exposure_cents: MoneyString
  exposure_formatted: string
  buying_power_cents: MoneyString
  buying_power_formatted: string
  realized_pnl_cents: MoneyString
  realized_pnl_formatted: string
}

// ── Instrument ────────────────────────────────────────────────────
export interface Instrument {
  id: string
  symbol: string
  display_name: string
  asset_class: AssetClass
  base_currency: string
  quote_currency: string
  contract_size: number
  leverage: number
  min_units: number
  max_units: number
  unit_step: number
  spread_pips: number
  pip_decimal_places: number
  swap_buy_bps: string
  swap_sell_bps: string
  margin_call_bps: string
  stop_out_bps: string
  trading_hours_start?: string
  trading_hours_end?: string
  trading_days: string
  is_active: boolean
  country_flag_code?: string
}

// ── Live Price ────────────────────────────────────────────────────
export interface LivePrice {
  symbol: string
  bid_scaled: PriceString
  ask_scaled: PriceString
  mid_scaled: PriceString
  bid_display: string // human-readable e.g. "1.08490"
  ask_display: string
  mid_display: string
  change_bps: string
  change_pct: string // e.g. "-0.12"
  ts: string
}

// ── Trade ─────────────────────────────────────────────────────────
export interface Trade {
  id: string
  user_id: string
  instrument_id: string
  symbol: string
  display_name: string
  order_type: OrderType
  direction: TradeDirection
  units: string
  open_rate_scaled: PriceString
  open_rate_display: string
  close_rate_scaled?: PriceString
  close_rate_display?: string
  stop_loss_scaled?: PriceString
  stop_loss_display?: string
  take_profit_scaled?: PriceString
  take_profit_display?: string
  trailing_stop_pips?: number
  is_protected: boolean
  margin_required_cents: MoneyString
  margin_required_formatted: string
  unrealized_pnl_cents: MoneyString
  unrealized_pnl_formatted: string
  realized_pnl_cents?: MoneyString
  realized_pnl_formatted?: string
  rollover_accumulated_cents: MoneyString
  overnight_count: number
  commission_cents: MoneyString
  status: TradeStatus
  open_at: string
  close_at?: string
  closed_by?: ClosedBy
  expiry_at?: string
}

// ── Deposit / Withdrawal ──────────────────────────────────────────
export interface Deposit {
  id: string
  user_id: string
  amount_cents: MoneyString
  amount_formatted: string
  crypto_currency: string
  status: DepositStatus
  bonus_cents: MoneyString
  created_at: string
  processed_at?: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount_cents: MoneyString
  amount_formatted: string
  crypto_currency: string
  wallet_address: string
  reason?: string
  status: WithdrawalStatus
  rejection_reason?: string
  created_at: string
}

// ── KYC ──────────────────────────────────────────────────────────
export interface KycDocument {
  id: string
  user_id: string
  document_category: KycDocumentCategory
  document_type: string
  file_name: string
  file_size_bytes: number
  mime_type: string
  is_primary: boolean
  status: KycDocumentStatus
  rejection_reason?: string
  created_at: string
}

// ── Alert ─────────────────────────────────────────────────────────
export interface Alert {
  id: string
  user_id: string
  instrument_id: string
  symbol: string
  alert_type: AlertType
  trigger_scaled: PriceString
  trigger_display: string
  notification_channels: string
  status: AlertStatus
  triggered_at?: string
  expires_at?: string
  created_at: string
}

// ── Watchlist ─────────────────────────────────────────────────────
export interface WatchlistItem {
  id: string
  instrument_id: string
  symbol: string
  display_name: string
  asset_class: AssetClass
  sort_order: number
  // Populated from live price cache
  live_price?: LivePrice
}

// ── Notification ──────────────────────────────────────────────────
export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  read_at?: string
  created_at: string
}

// ── Ledger Transaction ────────────────────────────────────────────
export interface LedgerTransaction {
  id: string
  transaction_type: TransactionType
  amount_cents: MoneyString
  amount_formatted: string
  balance_after_cents: MoneyString
  balance_after_formatted: string
  description?: string
  created_at: string
}

// ── Financial Summary ─────────────────────────────────────────────
export interface FinancialSummary {
  current: AccountMetrics
  summary: {
    deposits_cents: MoneyString
    deposits_formatted: string
    withdrawals_cents: MoneyString
    withdrawals_formatted: string
    rollover_paid_cents: MoneyString
    rollover_paid_formatted: string
    trading_benefits_cents: MoneyString
    cashback_cents: MoneyString
    manual_adjustments_cents: MoneyString
    cash_dividends_cents: MoneyString
    taxes_cents: MoneyString
    commissions_cents: MoneyString
    fees_cents: MoneyString
    stock_split_rounding_cents: MoneyString
    transfers_cents: MoneyString
  }
}

// ── IB Types ──────────────────────────────────────────────────────
export interface IbCommission {
  id: string
  trader_id: string
  trader_name: string
  trade_id: string
  amount_cents: MoneyString
  amount_formatted: string
  rate_bps: number
  status: CommissionStatus
  paid_at?: string
  created_at: string
}

export interface AgentSummary {
  id: string
  full_name: string
  email: string
  ref_code?: string
  trader_count: number
  total_volume_cents: MoneyString
  total_commission_cents: MoneyString
  pending_commission_cents: MoneyString
}

// ── WebSocket Events ──────────────────────────────────────────────
export interface WsPriceUpdate {
  symbol: string
  bid_scaled: string
  ask_scaled: string
  mid_scaled: string
  change_bps: string
  ts: string
}

export interface WsTradeUpdate {
  trade_id: string
  unrealized_pnl_cents: string
  margin_required_cents: string
}

export interface WsAccountMetrics {
  balance_cents: string
  unrealized_pnl_cents: string
  equity_cents: string
  used_margin_cents: string
  available_cents: string
  margin_level_bps: string | null
}

export interface WsMarginCall {
  margin_level_bps: string
  equity_cents: string
  used_margin_cents: string
}
