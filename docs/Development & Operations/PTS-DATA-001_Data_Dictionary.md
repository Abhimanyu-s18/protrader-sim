# ProTraderSim
## PTS-DATA-001 — Data Dictionary
**Version 1.0 | March 2026 | CONFIDENTIAL**
*Every column of every table — type, business meaning, valid values*

---

## Storage Conventions (Read First)

| Unit | Rule | Example |
|---|---|---|
| Money (USD) | BIGINT cents. $1.00 = 100 | balance_cents = 100050 = $1,000.50 |
| Price | BIGINT scaled ×100,000 | 1.08500 = 108500 |
| Rate / annual % | BIGINT basis points. 1% = 100 bps | -245 bps = -2.45% annual swap |
| Margin level % | BIGINT basis points. 100% = 10000 bps | 15000 bps = 150.00% |
| Commission rate | BIGINT basis points | 10 bps = 0.10% |
| Timestamps | TIMESTAMPTZ (UTC always) | 2026-03-25T10:30:00.000Z |
| Booleans | BOOLEAN (true / false) | email_verified = false |
| IDs (PKs) | BIGINT GENERATED ALWAYS AS IDENTITY | id = 1, 2, 3… |

**NEVER use DECIMAL, FLOAT, DOUBLE, or NUMERIC for any financial field.**
**NEVER store balance, equity, used_margin, margin_level, or available on the users table.**

---

## Table: users

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. Never exposed to traders — use account_number. |
| account_number | VARCHAR(20) | No | Trader-facing ID. Format: `PT` + 8 zero-padded digits (PT00000001). Generated at registration. Unique. Never changes. |
| lead_id | VARCHAR(20) | No | Internal lead tracking ID. Format: `LEAD` + 10 zero-padded digits. Admin lead management. Unique. |
| email | VARCHAR(255) | No | Primary login identifier. Lowercase. Unique. Not changeable without re-verification flow. |
| password_hash | VARCHAR(255) | No | bcrypt hash, cost factor 12. Never returned in responses. Never logged. |
| full_name | VARCHAR(255) | No | Legal full name as on government ID. Must match KYC documents exactly. |
| phone | VARCHAR(30) | No | With country code. Format: +[code][number] e.g. +971551234567. |
| country | VARCHAR(100) | No | Country of residence at registration. ISO country name. |
| address_line1 | VARCHAR(255) | Yes | Street address. Collected in KYC onboarding Step 2. |
| address_city | VARCHAR(100) | Yes | City or district. |
| address_country | VARCHAR(100) | Yes | Country from address document. May differ from registration country. |
| date_of_birth | DATE | Yes | ISO date. Displayed as DD/MM/YYYY. Collected in KYC onboarding. |
| trading_experience | VARCHAR(50) | Yes | Self-declared. Valid values: `Beginner`, `Intermediate`, `Advanced`, `Professional`. |
| profession | VARCHAR(100) | Yes | Self-declared occupation. Free text. |
| language_preference | VARCHAR(10) | Yes | ISO 639-1 code. Default: `en`. Used for email localisation. |
| financial_capability | VARCHAR(50) | Yes | Self-declared financial standing. Used in AML risk assessment. |
| motive | TEXT | Yes | Self-declared trading motive. Onboarding Step 4. |
| goal | TEXT | Yes | Self-declared trading goal. Onboarding Step 4. |
| kyc_status | VARCHAR(30) | No | Current KYC state. Default: `NOT_STARTED`. Valid: `NOT_STARTED`, `PENDING`, `APPROVED`, `REJECTED`, `ADDITIONAL_REQUIRED`, `REQUIRES_RESUBMIT`. Trading blocked unless `APPROVED`. |
| kyc_level | SMALLINT | No | Progressive verification tier. Default: 1. Valid: `1` (Email Verified), `2` (Identity Verified — trading enabled), `3` (Fully Verified — all features). |
| account_status | VARCHAR(20) | No | Overall account state. Default: `ACTIVE`. Valid: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `CLOSED`. |
| email_verified | BOOLEAN | No | Whether trader clicked email verification link. Default: false. Trading blocked until true. |
| popup_sound_enabled | BOOLEAN | No | Audio notification preference. Default: true. |
| agent_id | BIGINT (FK→staff.id) | Yes | Assigned IB Agent. Set at registration via Pool Code lookup. Only Super Admin can change. |
| last_active_at | TIMESTAMPTZ | Yes | Updated on every trade open/close. Used to calculate inactivity fee eligibility (90-day clock). |
| avatar_url | TEXT | Yes | Cloudflare R2 URL for profile picture. Null = default placeholder. |
| telegram_handle | VARCHAR(100) | Yes | Optional. Shown on profile for Telegram-linked support. |
| created_at | TIMESTAMPTZ | No | Registration timestamp. UTC. |
| updated_at | TIMESTAMPTZ | No | Last profile update. Updated by trigger on any field change. |

---

## Table: staff

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| email | VARCHAR(255) | No | Login email. Unique across all staff. |
| password_hash | VARCHAR(255) | No | bcrypt hash. Never returned in responses. |
| full_name | VARCHAR(255) | No | Staff member's full name. |
| role | VARCHAR(30) | No | Access level. Valid: `SUPER_ADMIN`, `ADMIN`, `IB_TEAM_LEADER`, `AGENT`. |
| team_leader_id | BIGINT (FK→staff.id) | Yes | For AGENT role: their Team Leader's ID. Null for all other roles. |
| commission_rate_bps | INTEGER | No | For AGENT: per-trade commission in basis points. 10 bps = 0.10% of notional. Default: 0. |
| override_rate_bps | INTEGER | No | For IB_TEAM_LEADER: override commission rate on all agent network trades. Default: 0. |
| ref_code | VARCHAR(50) | Yes | Unique referral code for registration URL (?ref={ref_code}). |
| pool_code | VARCHAR(50) | Yes | Unique Pool Code required for trader registration. Traders must provide a valid pool_code to register. Unique. |
| is_active | BOOLEAN | No | Whether account can log in. Default: true. |
| last_login_at | TIMESTAMPTZ | Yes | Most recent login. Null if never logged in. |
| created_at | TIMESTAMPTZ | No | Account creation timestamp. |

---

## Table: sessions

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | Yes | Set for trader sessions. Null for staff sessions. Exactly one of user_id or staff_id is populated. |
| staff_id | BIGINT (FK→staff.id) | Yes | Set for staff sessions. Null for trader sessions. |
| refresh_token | VARCHAR(512) | No | Refresh token string. Unique. Validated on token refresh. Deleted on logout. |
| ip_address | INET | Yes | IP address at login. Security audit trail. |
| user_agent | TEXT | Yes | Browser/device user agent string at login. |
| expires_at | TIMESTAMPTZ | No | Refresh token expiry. 7 days standard, 30 days with "remember me". |
| created_at | TIMESTAMPTZ | No | Login timestamp. |

---

## Table: instruments

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| symbol | VARCHAR(20) | No | Unique instrument code. e.g. `EURUSD`, `AAPL`, `XAUUSD`, `BTCUSD`. |
| display_name | VARCHAR(100) | No | Human-readable name. e.g. "Euro / US Dollar", "Apple Inc". |
| asset_class | VARCHAR(20) | No | Valid: `FOREX`, `STOCK`, `INDEX`, `COMMODITY`, `CRYPTO`. |
| base_currency | VARCHAR(10) | No | Base side of pair. EUR for EURUSD, XAU for Gold, BTC for Bitcoin. |
| quote_currency | VARCHAR(10) | No | Quote side. Almost always USD. Exceptions: EURGBP (GBP), EURJPY (JPY). |
| contract_size | INTEGER | No | Units per standard lot. Forex = 100,000. Stocks = 1. Indices = 1. Commodities vary. |
| leverage | INTEGER | No | Max leverage multiplier. Forex = 500, Indices = 100, Stocks = 5, Crypto = 10. |
| min_units | INTEGER | No | Minimum units per trade. Enforced at order creation. |
| max_units | INTEGER | No | Maximum units per trade. Enforced at order creation. |
| unit_step | INTEGER | No | Units must be a multiple of this. e.g. step of 1000 means valid: 1000, 2000, 3000. |
| spread_pips | INTEGER | No | Default spread in pips (integer). Used to derive bid/ask from mid price. |
| spread_type | VARCHAR(10) | No | Valid: `FIXED`, `VARIABLE`. Default: `VARIABLE`. |
| pip_decimal_places | INTEGER | No | Decimal places for one pip. Standard forex = 4. JPY pairs = 2. |
| swap_buy_bps | BIGINT | No | Daily BUY (long) swap in basis points. Negative = debit, positive = credit. |
| swap_sell_bps | BIGINT | No | Daily SELL (short) swap in basis points. |
| margin_call_bps | BIGINT | No | Margin level triggering warning. Default: 10000 (100.00%). |
| stop_out_bps | BIGINT | No | Margin level triggering auto-liquidation. Default: 5000 (50.00%). OPEN DECISION: may change to 2000 (20%) before Sprint 5. |
| commission_type | VARCHAR(20) | No | Valid: `none` (forex), `per_lot` (indices, commodities), `per_share` (stocks), `percentage` (crypto). |
| commission_rate | BIGINT | No | Rate value: per_lot = cents per std lot; per_share = cents per share; percentage = basis points of notional. |
| trading_hours_start | TIME | Yes | UTC start of trading window. Null = 24-hour instrument (crypto). |
| trading_hours_end | TIME | Yes | UTC end. Null = 24-hour. |
| trading_days | VARCHAR(20) | No | ISO day numbers. `1234567` = Mon–Sun. `12345` = Mon–Fri only. |
| is_active | BOOLEAN | No | Whether available for trading. Inactive instruments reject new orders. Default: true. |
| twelve_data_symbol | VARCHAR(30) | Yes | Symbol as used in Twelve Data API. May differ from internal symbol. |
| country_flag_code | VARCHAR(5) | Yes | ISO 3166-1 alpha-2 code for flagcdn.com lookup. Forex only. e.g. `EU` for Euro. |
| created_at | TIMESTAMPTZ | No | Record creation. |

---

## Table: trades

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | No | Trader who owns this position. |
| instrument_id | BIGINT (FK→instruments.id) | No | Instrument being traded. |
| order_type | VARCHAR(10) | No | Valid: `MARKET` (immediate fill), `ENTRY` (triggered at order_rate). |
| direction | VARCHAR(4) | No | Valid: `BUY` (long), `SELL` (short). |
| units | BIGINT | No | Units traded. Must satisfy min/max/step constraints. |
| open_rate_scaled | BIGINT | No | Fill price × 100,000. BUY fills at ask, SELL fills at bid. |
| close_rate_scaled | BIGINT | Yes | Closing price × 100,000. Null while OPEN. |
| entry_rate_scaled | BIGINT | Yes | For ENTRY orders: trigger price × 100,000. Null for MARKET orders. |
| stop_loss_scaled | BIGINT | Yes | SL price × 100,000. Null if no SL. |
| take_profit_scaled | BIGINT | Yes | TP price × 100,000. Null if no TP. |
| trailing_stop_distance | BIGINT | Yes | Trailing stop distance in pips × 100. e.g. 50 pips stored as 5000. Null if not set. |
| peak_price_scaled | BIGINT | Yes | Highest bid (BUY) or lowest ask (SELL) seen since open × 100,000. Updated on each favourable tick. Used for trailing stop trigger calculation. |
| is_protected | BOOLEAN | No | Protected Position feature active. Default: false. |
| protection_fee_cents | BIGINT | No | Fee for position protection. 0 if not protected. |
| margin_required_cents | BIGINT | No | Margin locked at open in cents. Calculated at open_rate using margin formula. |
| unrealized_pnl_cents | BIGINT | No | Floating P&L in cents. Updated every price tick. Positive = profit, negative = loss. |
| realized_pnl_cents | BIGINT | Yes | Final settled P&L in cents. Set on close. Null while OPEN. |
| rollover_accumulated_cents | BIGINT | No | Total cumulative swap fees charged on this position. Default: 0. |
| overnight_count | INTEGER | No | Number of rollovers applied. Incremented by rollover-daily BullMQ job. Default: 0. |
| commission_cents | BIGINT | No | Commission at open. 0 for forex. Commission at close is a separate ledger entry. Default: 0. |
| status | VARCHAR(10) | No | Valid: `OPEN` (active), `CLOSED` (settled), `PENDING` (entry order awaiting trigger), `CANCELLED` (cancelled without triggering). |
| open_at | TIMESTAMPTZ | No | Position open or entry order placed timestamp. |
| close_at | TIMESTAMPTZ | Yes | Close timestamp. Null while OPEN. |
| closed_by | VARCHAR(20) | Yes | Valid: `USER`, `STOP_LOSS`, `TAKE_PROFIT`, `TRAILING_STOP`, `MARGIN_CALL`, `STOP_OUT`, `ADMIN`. |
| expiry_at | TIMESTAMPTZ | Yes | Entry order auto-cancel time. Null = GTC. |
| created_at | TIMESTAMPTZ | No | Record creation. |
| updated_at | TIMESTAMPTZ | No | Last update. |

---

## Table: ledger_transactions

Every financial movement in the platform. Balance = SUM of this table per user.

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | No | Trader this transaction belongs to. |
| transaction_type | VARCHAR(30) | No | Category. Valid: `DEPOSIT`, `WITHDRAWAL`, `WITHDRAWAL_REVERSAL`, `TRADE_CLOSE`, `ROLLOVER`, `TRADING_BENEFIT`, `CASHBACK`, `MANUAL_ADJUSTMENT`, `DIVIDEND`, `TAX`, `COMMISSION`, `FEE`, `INACTIVITY_FEE`, `STOCK_SPLIT_ROUNDING`, `TRANSFER`, `BONUS`. |
| amount_cents | BIGINT | No | **Positive = credit (money in). Negative = debit (money out).** Deposits are +, withdrawals and fees are −. |
| currency | VARCHAR(10) | No | Currency. Default: `USD`. All amounts normalised to USD. |
| balance_after_cents | BIGINT | No | Trader balance snapshot after this transaction. Enables historical balance reconstruction. |
| reference_id | BIGINT | Yes | FK to related record (trades.id, deposits.id, withdrawals.id). |
| reference_type | VARCHAR(30) | Yes | Table of reference. Valid: `TRADE`, `DEPOSIT`, `WITHDRAWAL`, `ADJUSTMENT`. |
| description | TEXT | Yes | Human-readable description shown in activity log. |
| created_by | BIGINT | Yes | staff.id if admin-initiated. Null if system-generated. |
| created_at | TIMESTAMPTZ | No | Transaction timestamp. UTC. **Immutable — never updated.** |

---

## Table: deposits

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | No | Trader making the deposit. |
| amount_cents | BIGINT | No | USD value in cents. Minimum: 20000 ($200.00). |
| crypto_currency | VARCHAR(10) | No | Payment crypto. Valid: `BTC`, `ETH`, `USDT`. |
| crypto_amount_scaled | BIGINT | No | Crypto amount × 10^8 (e.g. satoshis for BTC). |
| nowpayments_invoice_id | VARCHAR(255) | Yes | Invoice ID from NowPayments. Unique. Used to match webhooks. |
| nowpayments_payment_id | VARCHAR(255) | Yes | Payment ID assigned by NowPayments on detection. |
| status | VARCHAR(20) | No | Valid: `PENDING`, `CONFIRMING`, `COMPLETED`, `REJECTED`, `EXPIRED` (60 min timeout). |
| bonus_cents | BIGINT | No | Admin-added bonus alongside this deposit. 0 if no bonus. |
| processed_by | BIGINT (FK→staff.id) | Yes | Admin who actioned this deposit. |
| processed_at | TIMESTAMPTZ | Yes | Admin action timestamp. |
| notes | TEXT | Yes | Internal admin notes. Not shown to trader. |
| created_at | TIMESTAMPTZ | No | Deposit request creation. |

---

## Table: withdrawals

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | No | Trader requesting withdrawal. |
| amount_cents | BIGINT | No | USD in cents. Min: 5000 ($50). Max per tx: 500000 ($5,000). |
| crypto_currency | VARCHAR(10) | No | Payout crypto. Valid: `BTC`, `ETH`, `USDT`. |
| wallet_address | VARCHAR(255) | No | Destination wallet. Masked in API responses after submission. |
| reason | TEXT | Yes | Trader-provided reason. Optional. |
| status | VARCHAR(20) | No | Valid: `PENDING`, `PROCESSING`, `COMPLETED`, `REJECTED`. |
| nowpayments_payout_id | VARCHAR(255) | Yes | Payout ID from NowPayments Payout API. |
| processed_by | BIGINT (FK→staff.id) | Yes | Admin who approved/rejected. |
| processed_at | TIMESTAMPTZ | Yes | Admin decision timestamp. |
| rejection_reason | TEXT | Yes | Reason for rejection. Sent to trader. |
| created_at | TIMESTAMPTZ | No | Request submission timestamp. |

---

## Table: kyc_documents

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | No | Trader who uploaded. |
| document_category | VARCHAR(20) | No | Valid: `IDENTITY`, `ADDRESS`, `MISCELLANEOUS`. |
| document_type | VARCHAR(50) | No | Valid: `passport`, `national_id`, `driving_licence`, `utility_bill`, `bank_statement`, `credit_card_statement`, `tax_bill`, `other`. |
| r2_key | VARCHAR(512) | No | Cloudflare R2 object key. Format: `kyc/{user_id}/{category}/{uuid}.{ext}`. Used to generate presigned URLs. |
| file_name | VARCHAR(255) | No | Original filename. |
| file_size_bytes | INTEGER | No | Bytes. Maximum: 10,485,760 (10 MB). |
| mime_type | VARCHAR(100) | No | Verified from file bytes. Valid: `application/pdf`, `image/jpeg`, `image/png`. |
| is_primary | BOOLEAN | No | True = Zone 1 primary upload. False = Zone 2 additional document. Default: true. |
| status | VARCHAR(20) | No | Valid: `UPLOADED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `EXPIRED`. |
| rejection_code | VARCHAR(50) | Yes | Machine-readable code. Valid: `DOC_QUALITY_POOR`, `DOC_EXPIRED`, `NAME_MISMATCH`, `ADDRESS_MISMATCH`, `DOC_OUTDATED`, `PARTIAL_VISIBILITY`, `UNSUPPORTED_TYPE`, `PEP_MATCH`. |
| rejection_reason | TEXT | Yes | Reviewer's message to trader. Sent in rejection email. |
| reviewed_by | BIGINT (FK→staff.id) | Yes | Staff who reviewed. |
| reviewed_at | TIMESTAMPTZ | Yes | Review decision timestamp. |
| created_at | TIMESTAMPTZ | No | Upload timestamp. |

---

## Table: ib_commissions

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| agent_id | BIGINT (FK→staff.id) | No | Agent or Team Leader earning this commission. |
| trader_id | BIGINT (FK→users.id) | No | Trader whose trade generated this commission. |
| trade_id | BIGINT (FK→trades.id) | No | Trade that triggered this commission. |
| amount_cents | BIGINT | No | Commission earned in cents. = trade_notional × rate_bps / 10000. |
| rate_bps | INTEGER | No | Rate applied in basis points. Snapshot of staff.commission_rate_bps at trade time. |
| status | VARCHAR(20) | No | Valid: `PENDING` (earned, not paid), `PAID` (payout processed by Super Admin). Default: `PENDING`. |
| paid_at | TIMESTAMPTZ | Yes | When marked PAID. Null if PENDING. |
| created_at | TIMESTAMPTZ | No | Created at trade open time. |

---

## Table: alerts

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | No | Trader who created the alert. |
| instrument_id | BIGINT (FK→instruments.id) | No | Instrument to monitor. |
| alert_type | VARCHAR(30) | No | Valid: `PRICE_ABOVE`, `PRICE_BELOW`, `PRICE_REACHES`, `PCT_CHANGE_ABOVE`, `PCT_CHANGE_BELOW`. |
| trigger_scaled | BIGINT | No | Trigger value × 100,000 for price alerts. Basis points for percentage alerts. |
| notification_channels | VARCHAR(100) | No | Comma-separated. Default: `in_app,email`. Valid values: any combination of `in_app`, `email`, `push`. |
| status | VARCHAR(20) | No | Valid: `ACTIVE`, `TRIGGERED`, `EXPIRED`, `CANCELLED`. |
| triggered_at | TIMESTAMPTZ | Yes | When alert fired. Null if ACTIVE. |
| expires_at | TIMESTAMPTZ | Yes | Auto-cancel time. Null = GTC. |
| created_at | TIMESTAMPTZ | No | Creation timestamp. |

---

## Table: swap_rates

| Column | Type | Nullable | Business Meaning & Valid Values |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| instrument_id | BIGINT (FK→instruments.id) | No | Instrument this rate applies to. |
| direction | VARCHAR(4) | No | Valid: `BUY`, `SELL`. |
| rate_bps | BIGINT | No | Annual swap rate in basis points. Negative = debit. Positive = credit. e.g. -245 = -2.45% annual. |
| effective_from | DATE | No | Date from which this rate is effective. Rate history is preserved. |
| created_at | TIMESTAMPTZ | No | Record creation. |

**Unique constraint:** (instrument_id, direction, effective_from).

---

## View: user_balances

A derived view — not a stored table.

| Column | Meaning |
|---|---|
| user_id | Trader's user ID |
| balance_cents | SUM of all ledger_transactions.amount_cents for this user. Positive = net credit (tradeable balance). |

**This view is the canonical balance source. No code ever reads a balance column from the users table — that column does not exist.**

---

## Notifications Table

| Column | Type | Nullable | Business Meaning |
|---|---|---|---|
| id | BIGINT | No | Auto-incremented PK. |
| user_id | BIGINT (FK→users.id) | Yes | Target trader. Null if targeting staff. |
| staff_id | BIGINT (FK→staff.id) | Yes | Target staff member. Null if targeting trader. |
| type | VARCHAR(50) | No | Notification category. e.g. `TRADE_OPENED`, `MARGIN_CALL`, `KYC_APPROVED`, `DEPOSIT_CONFIRMED`. |
| title | VARCHAR(255) | No | Short title for notification panel header. |
| message | TEXT | No | Full notification message body. |
| channels | VARCHAR(100) | Yes | Comma-separated delivery channels: `in_app`, `email`, `sms`. |
| is_read | BOOLEAN | No | Whether trader has read this notification. Default: false. |
| read_at | TIMESTAMPTZ | Yes | When marked as read. Null if unread. |
| created_at | TIMESTAMPTZ | No | Notification creation and dispatch timestamp. |

---

*ProTraderSim — PTS-DATA-001 — Data Dictionary — v1.0 — March 2026*
