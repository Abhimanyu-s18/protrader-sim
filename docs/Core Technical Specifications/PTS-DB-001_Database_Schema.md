# ProTraderSim

## PTS-DB-001 — Database Schema

**Version 1.0 | March 2026 | CONFIDENTIAL**

---

## MANDATORY PRECISION RULES

> **MONEY fields:** BIGINT stored as cents. $1.00 = 100. $100.50 = 10050.
> **PRICE fields:** BIGINT scaled integers, 5 decimal places. 1.08500 = 108500.
> **PIP fields:** INTEGER. 2 pips = 2 (represents 0.0002 for 5-decimal pairs).
> **RATE fields** (swap/commission %): BIGINT in basis points. 0.50% = 50 bps.
> **PERCENTAGE fields** (margin level): BIGINT in basis points. 150.00% = 15000 bps.
> **NEVER use DECIMAL, FLOAT, DOUBLE, or NUMERIC for any financial field.**

> **NO BALANCE COLUMNS ON USERS TABLE.**
> balance, equity, used_margin, available_margin, margin_level are NOT stored on the users table.
> These are COMPUTED in real-time from ledger_transactions + open positions + live prices.
> Storing them creates irreconcilable sync bugs. They are derived values, never persisted.

---

## Table 1: users

```sql
CREATE TABLE users (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_number        VARCHAR(20) UNIQUE NOT NULL,      -- format: PT00000001
  lead_id               VARCHAR(20) UNIQUE NOT NULL,      -- format: LEAD0000000001
  email                 VARCHAR(255) UNIQUE NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  full_name             VARCHAR(255) NOT NULL,
  phone                 VARCHAR(30) NOT NULL,
  country               VARCHAR(100) NOT NULL,
  address_line1         VARCHAR(255),
  address_city          VARCHAR(100),
  address_country       VARCHAR(100),
  date_of_birth         DATE,
  trading_experience    VARCHAR(50),    -- Beginner/Intermediate/Advanced/Professional
  profession            VARCHAR(100),
  language_preference   VARCHAR(10) DEFAULT 'en',
  financial_capability  VARCHAR(50),
  motive                TEXT,
  goal                  TEXT,
  kyc_status            VARCHAR(30) DEFAULT 'NOT_STARTED',
    -- NOT_STARTED / PENDING / APPROVED / REJECTED / ADDITIONAL_REQUIRED / REQUIRES_RESUBMIT
  kyc_level             SMALLINT DEFAULT 1,               -- 1=Email Verified, 2=Identity Verified, 3=Fully Verified
  account_status        VARCHAR(20) DEFAULT 'ACTIVE',     -- ACTIVE / INACTIVE / SUSPENDED / CLOSED
  email_verified        BOOLEAN DEFAULT FALSE,
  popup_sound_enabled   BOOLEAN DEFAULT TRUE,
  agent_id              BIGINT REFERENCES staff(id),      -- nullable, IB agent assigned
  last_active_at        TIMESTAMPTZ,                      -- updated on every trade open/close (for inactivity fee)
  avatar_url            TEXT,                             -- Cloudflare R2 URL, nullable
  telegram_handle       VARCHAR(100),                     -- optional
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_users_kyc_status   ON users(kyc_status);
CREATE INDEX idx_users_agent_id     ON users(agent_id);
CREATE INDEX idx_users_last_active  ON users(last_active_at);
```

---

## Table 2: staff (Admins + IB roles)

```sql
CREATE TABLE staff (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email                VARCHAR(255) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  full_name            VARCHAR(255) NOT NULL,
  role                 VARCHAR(30) NOT NULL,              -- SUPER_ADMIN / ADMIN / IB_TEAM_LEADER / AGENT
  team_leader_id       BIGINT REFERENCES staff(id),       -- for AGENTs: their team leader
  commission_rate_bps  BIGINT DEFAULT 0,                  -- agent per-trade commission in basis points
  override_rate_bps    BIGINT DEFAULT 0,                  -- team leader override rate in basis points
  ref_code             VARCHAR(50) UNIQUE,                -- referral code for registration links
  pool_code            VARCHAR(50) UNIQUE,                -- pool code for trader registration
  is_active            BOOLEAN DEFAULT TRUE,
  last_login_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table 3: sessions

```sql
CREATE TABLE sessions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT REFERENCES users(id),
  staff_id        BIGINT REFERENCES staff(id),
  refresh_token   VARCHAR(512) UNIQUE NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_user_or_staff_exclusive CHECK (
    (user_id IS NOT NULL AND staff_id IS NULL) OR
    (user_id IS NULL AND staff_id IS NOT NULL)
  )
);
```

---

## Table 4: instruments

```sql
CREATE TABLE instruments (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol                VARCHAR(20) UNIQUE NOT NULL,       -- e.g. EURUSD, AAPL, XAUUSD
  display_name          VARCHAR(100) NOT NULL,
  asset_class           VARCHAR(20) NOT NULL,              -- FOREX / STOCK / INDEX / COMMODITY / CRYPTO
  base_currency         VARCHAR(10) NOT NULL,              -- e.g. EUR, XAU, BTC
  quote_currency        VARCHAR(10) NOT NULL,              -- e.g. USD, GBP
  contract_size         INTEGER NOT NULL,                  -- 100000 for Forex, 1 for stocks
  leverage              INTEGER NOT NULL,                  -- e.g. 500, 5, 100
  min_units             INTEGER NOT NULL,
  max_units             INTEGER NOT NULL,
  unit_step             INTEGER NOT NULL,
  spread_pips           INTEGER NOT NULL,                  -- in pips (integer)
  spread_type           VARCHAR(10) DEFAULT 'VARIABLE',    -- FIXED / VARIABLE
  pip_decimal_places    INTEGER NOT NULL,                  -- 4 for EURUSD, 2 for USDJPY
  swap_buy_bps          BIGINT NOT NULL,                   -- daily swap rate BUY (basis points)
  swap_sell_bps         BIGINT NOT NULL,                   -- daily swap rate SELL (basis points)
  margin_call_bps       BIGINT DEFAULT 10000,              -- 100.00% = 10000 bps
  stop_out_bps          BIGINT DEFAULT 5000,               -- 50.00% = 5000 bps — CONFIRMED default value
  commission_type       VARCHAR(20) DEFAULT 'none',        -- none / per_lot / per_share / percentage
  commission_rate       BIGINT DEFAULT 0,                  -- rate value; interpretation depends on commission_type
  trading_hours_start   TIME,                             -- UTC. NULL = 24h
  trading_hours_end     TIME,
  trading_days          VARCHAR(20) DEFAULT '1234567',     -- ISO day numbers: 1=Mon
  is_active             BOOLEAN DEFAULT TRUE,
  twelve_data_symbol    VARCHAR(30),                       -- symbol as used in Twelve Data API
  country_flag_code     VARCHAR(5),                        -- for UI flag display (forex only)
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### Commission Type Reference

| Asset Class      | commission_type | commission_rate | Applied When              | Rate Units                                        |
| ---------------- | --------------- | --------------- | ------------------------- | ------------------------------------------------- |
| Forex (15 pairs) | `none`          | 0               | Spread is the sole cost   | N/A                                               |
| Indices (15)     | `per_lot`       | 100             | Open AND close separately | cents per lot (e.g., 100 = $1.00 per lot)         |
| Commodities (15) | `per_lot`       | 150             | Open AND close separately | cents per lot (e.g., 150 = $1.50 per lot)         |
| Stocks (30)      | `per_share`     | 2               | Open AND close separately | cents per share (e.g., 2 = $0.02 per share)       |
| Crypto (12)      | `percentage`    | 10              | Open AND close separately | basis points (e.g., 10 = 0.10% of notional value) |

**Rate Units Clarification:**

- For `per_lot` and `per_share` commission types: commission_rate is stored in **cents** (e.g., 100 = $1.00, 2 = $0.02). To calculate commission, multiply the number of lots/shares by this rate in cents.
- For `percentage` commission type: commission_rate is stored in **basis points** (e.g., 10 = 0.10%), following the RATE field convention. To calculate commission, multiply the notional value (in cents) by rate_bps / 10000.

---

## Table 5: instrument_prices (live price cache reference — primarily Redis)

```sql
CREATE TABLE instrument_prices (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id BIGINT REFERENCES instruments(id) NOT NULL,
  bid_scaled    BIGINT NOT NULL,    -- bid × 100000
  ask_scaled    BIGINT NOT NULL,    -- ask × 100000
  mid_scaled    BIGINT NOT NULL,    -- (bid+ask)/2 × 100000
  change_bps    BIGINT,             -- daily change in basis points
  recorded_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_prices_instrument_time ON instrument_prices(instrument_id, recorded_at DESC);
```

---

## Table 6: ohlcv_candles (TradingView chart history)

```sql
CREATE TABLE ohlcv_candles (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id BIGINT REFERENCES instruments(id) NOT NULL,
  interval      VARCHAR(10) NOT NULL,   -- 1min / 5min / 15min / 1h / 4h / 1day / 1week
  open_scaled   BIGINT NOT NULL,
  high_scaled   BIGINT NOT NULL,
  low_scaled    BIGINT NOT NULL,
  close_scaled  BIGINT NOT NULL,
  volume        BIGINT,
  candle_time   TIMESTAMPTZ NOT NULL,
  UNIQUE(instrument_id, interval, candle_time)
);

CREATE INDEX idx_ohlcv ON ohlcv_candles(instrument_id, interval, candle_time DESC);
```

---

## Table 7: trades

```sql
CREATE TABLE trades (
  id                           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                      BIGINT REFERENCES users(id) NOT NULL,
  instrument_id                BIGINT REFERENCES instruments(id) NOT NULL,
  order_type                   VARCHAR(10) NOT NULL,    -- MARKET / ENTRY
  direction                    VARCHAR(4) NOT NULL,     -- BUY / SELL
  units                        BIGINT NOT NULL,
  open_rate_scaled             BIGINT NOT NULL,         -- entry price × 100000
  close_rate_scaled            BIGINT,                  -- exit price × 100000 (null if open)
  entry_rate_scaled            BIGINT,                  -- for ENTRY orders: target trigger price
  stop_loss_scaled             BIGINT,
  take_profit_scaled           BIGINT,
  trailing_stop_distance       BIGINT,                  -- trailing stop distance: pips × 100 for sub-pip precision; null if not set
  peak_price_scaled            BIGINT,                  -- highest (BUY) or lowest (SELL) price since open
  is_protected                 BOOLEAN DEFAULT FALSE,
  protection_fee_cents         BIGINT DEFAULT 0,
  margin_required_cents        BIGINT NOT NULL,         -- margin locked when trade opened
  unrealized_pnl_cents         BIGINT DEFAULT 0,        -- updated on each price tick
  realized_pnl_cents           BIGINT,                  -- set on close
  rollover_accumulated_cents   BIGINT DEFAULT 0,        -- total swap fees charged
  overnight_count              INTEGER DEFAULT 0,
  commission_cents             BIGINT DEFAULT 0,
  status                       VARCHAR(10) DEFAULT 'OPEN',
    -- OPEN / CLOSED / PENDING (entry order waiting) / CANCELLED
  open_at                      TIMESTAMPTZ DEFAULT NOW(),
  close_at                     TIMESTAMPTZ,
  closed_by                    VARCHAR(20),
    -- USER / STOP_LOSS / TAKE_PROFIT / TRAILING_STOP / MARGIN_CALL / STOP_OUT / ADMIN
  expiry_at                    TIMESTAMPTZ,             -- for ENTRY orders with expiry
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_user_status       ON trades(user_id, status);
CREATE INDEX idx_trades_instrument_open   ON trades(instrument_id) WHERE status='OPEN';
CREATE INDEX idx_trades_pending           ON trades(status) WHERE status='PENDING';
```

---

## Table 8: ledger_transactions

```sql
CREATE TABLE ledger_transactions (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             BIGINT REFERENCES users(id) NOT NULL,
  transaction_type    VARCHAR(30) NOT NULL,
    -- DEPOSIT / WITHDRAWAL / WITHDRAWAL_REVERSAL / TRADE_CLOSE / ROLLOVER
    -- TRADING_BENEFIT / CASHBACK / MANUAL_ADJUSTMENT / DIVIDEND / TAX
    -- COMMISSION / FEE / INACTIVITY_FEE / STOCK_SPLIT_ROUNDING / TRANSFER / BONUS
  amount_cents        BIGINT NOT NULL,        -- positive = credit, negative = debit
  currency            VARCHAR(10) DEFAULT 'USD',
  balance_after_cents BIGINT NOT NULL,        -- snapshot balance after this transaction
  reference_id        BIGINT,                 -- FK to trades/deposits/withdrawals id
  reference_type      VARCHAR(30),            -- 'TRADE' / 'DEPOSIT' / 'WITHDRAWAL' etc.
  description         TEXT,
  created_by          BIGINT,                 -- staff.id if admin-initiated, null if system
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_user_time ON ledger_transactions(user_id, created_at DESC);
CREATE INDEX idx_ledger_type      ON ledger_transactions(transaction_type);
```

---

## Table 9: deposits

```sql
CREATE TABLE deposits (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                  BIGINT REFERENCES users(id) NOT NULL,
  amount_cents             BIGINT NOT NULL,           -- USD amount in cents
  crypto_currency          VARCHAR(10) NOT NULL,      -- BTC / ETH / USDT
  crypto_amount_scaled     BIGINT NOT NULL,           -- crypto amount × 10^8
  nowpayments_invoice_id   VARCHAR(255) UNIQUE,
  nowpayments_payment_id   VARCHAR(255) UNIQUE,
  status                   VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING / CONFIRMING / COMPLETED / REJECTED / EXPIRED
  bonus_cents              BIGINT DEFAULT 0,          -- admin-added bonus
  processed_by             BIGINT REFERENCES staff(id),
  processed_at             TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table 10: withdrawals

```sql
CREATE TABLE withdrawals (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                BIGINT REFERENCES users(id) NOT NULL,
  amount_cents           BIGINT NOT NULL,
  crypto_currency        VARCHAR(10) NOT NULL,
  wallet_address         VARCHAR(255) NOT NULL,
  reason                 TEXT,
  status                 VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING / PROCESSING / COMPLETED / REJECTED
  nowpayments_payout_id  VARCHAR(255),
  processed_by           BIGINT REFERENCES staff(id),
  processed_at           TIMESTAMPTZ,
  rejection_reason       TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table 11: kyc_documents

```sql
CREATE TABLE kyc_documents (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             BIGINT REFERENCES users(id) NOT NULL,
  document_category   VARCHAR(20) NOT NULL,    -- IDENTITY / ADDRESS / MISCELLANEOUS
  document_type       VARCHAR(50) NOT NULL,
    -- passport / national_id / driving_licence / utility_bill
    -- bank_statement / credit_card_statement / tax_bill / other
  r2_key              VARCHAR(512) NOT NULL,   -- Cloudflare R2 object key
  file_name           VARCHAR(255) NOT NULL,
  file_size_bytes     INTEGER NOT NULL,
  mime_type           VARCHAR(100) NOT NULL,   -- application/pdf / image/jpeg / image/png
  is_primary          BOOLEAN DEFAULT TRUE,    -- primary vs additional document (Zone 1 vs Zone 2)
  status              VARCHAR(20) DEFAULT 'UPLOADED',
    -- UPLOADED / UNDER_REVIEW / APPROVED / REJECTED / EXPIRED
  rejection_code      VARCHAR(50),             -- DOC_QUALITY_POOR / DOC_EXPIRED / NAME_MISMATCH / etc.
  rejection_reason    TEXT,                    -- human-readable explanation for trader
  reviewed_by         BIGINT REFERENCES staff(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### KYC Rejection Reason Codes

| Code               | Meaning                                         | Action                             |
| ------------------ | ----------------------------------------------- | ---------------------------------- |
| DOC_QUALITY_POOR   | Blurry or illegible scan                        | kyc_status → REQUIRES_RESUBMIT     |
| DOC_EXPIRED        | Identity document has expired                   | kyc_status → REJECTED              |
| NAME_MISMATCH      | Name on document does not match registration    | kyc_status → REJECTED              |
| ADDRESS_MISMATCH   | Address document does not match profile address | kyc_status → REQUIRES_RESUBMIT     |
| DOC_OUTDATED       | Address document dated more than 3 months ago   | kyc_status → REQUIRES_RESUBMIT     |
| PARTIAL_VISIBILITY | Document corners/edges not fully visible        | kyc_status → REQUIRES_RESUBMIT     |
| UNSUPPORTED_TYPE   | Document type not accepted for this category    | kyc_status → REQUIRES_RESUBMIT     |
| PEP_MATCH          | Name/nationality matches PEP/sanctions list     | Immediate suspension, notify Legal |

---

## Table 12: alerts

```sql
CREATE TABLE alerts (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id               BIGINT REFERENCES users(id) NOT NULL,
  instrument_id         BIGINT REFERENCES instruments(id) NOT NULL,
  alert_type            VARCHAR(30) NOT NULL,
    -- PRICE_ABOVE / PRICE_BELOW / PRICE_REACHES / PCT_CHANGE_ABOVE / PCT_CHANGE_BELOW
  trigger_scaled        BIGINT NOT NULL,        -- trigger price × 100000
  notification_channels VARCHAR(100) DEFAULT 'in_app,email',
  status                VARCHAR(20) DEFAULT 'ACTIVE',
    -- ACTIVE / TRIGGERED / EXPIRED / CANCELLED
  triggered_at          TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_active ON alerts(instrument_id) WHERE status='ACTIVE';
```

---

## Table 13: watchlist

```sql
CREATE TABLE watchlist (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT REFERENCES users(id) NOT NULL,
  instrument_id BIGINT REFERENCES instruments(id) NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instrument_id)
);
```

---

## Table 14: ib_commissions

```sql
CREATE TABLE ib_commissions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id      BIGINT REFERENCES staff(id) NOT NULL,
  trader_id     BIGINT REFERENCES users(id) NOT NULL,
  trade_id      BIGINT REFERENCES trades(id) NOT NULL,
  amount_cents  BIGINT NOT NULL,    -- commission earned on this trade
  rate_bps      BIGINT NOT NULL,    -- commission rate applied (basis points)
  status        VARCHAR(20) DEFAULT 'PENDING',   -- PENDING / PAID
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_agent ON ib_commissions(agent_id, status);
```

---

## Table 15: notifications

```sql
CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  staff_id   BIGINT REFERENCES staff(id),
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  channels   VARCHAR(100),    -- comma-separated: in_app, email, sms
  is_read    BOOLEAN DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read) WHERE is_read=FALSE;
```

---

## Table 16: signals

```sql
CREATE TABLE signals (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id    BIGINT REFERENCES instruments(id) NOT NULL,
  signal_type      VARCHAR(4) NOT NULL,     -- BUY / SELL
  pattern_type     VARCHAR(100),            -- MACD Cross, Head & Shoulders, Fibonacci, etc.
  interval         VARCHAR(10) NOT NULL,    -- 1H / 4H / 1D / 1W
  entry_scaled     BIGINT,
  target_scaled    BIGINT,
  stop_loss_scaled BIGINT,
  is_active        BOOLEAN DEFAULT TRUE,
  generated_at     TIMESTAMPTZ NOT NULL,
  expires_at       TIMESTAMPTZ
);
```

---

## Table 17: legal_documents

```sql
CREATE TABLE legal_documents (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_name  VARCHAR(255) NOT NULL,
  document_type  VARCHAR(50) NOT NULL,
  r2_key         VARCHAR(512) NOT NULL,
  version        VARCHAR(20) NOT NULL,
  effective_date DATE NOT NULL,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table 18: swap_rates

```sql
CREATE TABLE swap_rates (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id   BIGINT REFERENCES instruments(id) NOT NULL,
  direction       VARCHAR(4) NOT NULL,     -- BUY / SELL
  rate_bps        BIGINT NOT NULL,         -- annual rate in basis points (negative = debit)
  effective_from  DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instrument_id, direction, effective_from)
);
```

---

## Computed View: user_balances

```sql
CREATE VIEW user_balances AS
SELECT
  user_id,
  COALESCE(SUM(amount_cents), 0) AS balance_cents
FROM ledger_transactions
GROUP BY user_id;
```

This view is the canonical source of truth for account balances. The balance is always the sum of all ledger entries for a user. It is never stored as a column on the users table.

---

## Instrument Catalogue — 60 Instruments

### Forex — 15 Pairs

| Symbol | Name                     | Leverage | Spread (pips) | Hours | Swap Long (annual %) | Swap Short (annual %) |
| ------ | ------------------------ | -------- | ------------- | ----- | -------------------- | --------------------- |
| EURUSD | Euro / USD               | 1:500    | 1.5           | 24/5  | -2.45%               | -0.95%                |
| GBPUSD | British Pound / USD      | 1:500    | 1.8           | 24/5  | -4.15%               | +1.25%                |
| USDJPY | USD / Japanese Yen       | 1:500    | 1.5           | 24/5  | -3.20%               | +0.85%                |
| AUDUSD | Australian Dollar / USD  | 1:500    | 1.6           | 24/5  | -1.85%               | -1.15%                |
| USDCAD | USD / Canadian Dollar    | 1:500    | 2.0           | 24/5  | +0.75%               | -3.45%                |
| USDCHF | USD / Swiss Franc        | 1:500    | 1.8           | 24/5  | +1.25%               | -4.15%                |
| NZDUSD | New Zealand Dollar / USD | 1:500    | 2.0           | 24/5  | -2.65%               | -0.95%                |
| EURGBP | Euro / British Pound     | 1:500    | 1.5           | 24/5  | -1.95%               | -0.75%                |
| EURJPY | Euro / Japanese Yen      | 1:500    | 2.0           | 24/5  | -2.85%               | -0.65%                |
| GBPJPY | British Pound / JPY      | 1:500    | 2.5           | 24/5  | -2.0% to -3.5%       | -0.5% to +1.0%        |
| AUDJPY | Australian Dollar / JPY  | 1:500    | 2.2           | 24/5  | -2.0% to -3.5%       | -0.5% to +1.0%        |
| USDCNH | USD / Chinese Yuan       | 1:500    | 3.0           | 24/5  | -2.0% to -3.5%       | -0.5% to +1.0%        |
| EURAUD | Euro / Australian Dollar | 1:500    | 2.2           | 24/5  | -2.0% to -3.5%       | -0.5% to +1.0%        |
| USDZAR | USD / South African Rand | 1:200    | 5.0           | 24/5  | -2.0% to -3.5%       | -0.5% to +1.0%        |
| USDSGD | USD / Singapore Dollar   | 1:200    | 3.0           | 24/5  | -2.0% to -3.5%       | -0.5% to +1.0%        |

**Swap Rates Resolution:** The ranges shown for GBPJPY, AUDJPY, USDCNH, EURAUD, USDZAR, USDSGD are **placeholder ranges** pending finalization with Victor (Operations) and IB Team Leaders. Before Phase 2 launch, each pair will be assigned a single canonical swap_buy_bps and swap_sell_bps value (recommended: use the midpoint of the range). [TICKET-TBD: Confirm swap rates for non-major crosses]

### Indices — 15 Instruments

| Symbol | Name         | Leverage | Spread | Hours (UTC)         | Swap Long (annual %) | Swap Short (annual %) |
| ------ | ------------ | -------- | ------ | ------------------- | -------------------- | --------------------- |
| US500  | S&P 500      | 1:100    | 0.4    | 23:00–22:00 Mon-Fri | -8.25%               | +6.75%                |
| US100  | NASDAQ 100   | 1:100    | 1.0    | 23:00–22:00 Mon-Fri | -8.25%               | +6.75%                |
| US30   | Dow Jones    | 1:100    | 2.0    | 23:00–22:00 Mon-Fri | -8.25%               | +6.75%                |
| UK100  | FTSE 100     | 1:100    | 1.0    | 07:00–16:30         | -6.50%               | +4.25%                |
| DE40   | DAX 40       | 1:100    | 1.2    | 07:00–21:00         | -6.50%               | +4.25%                |
| FR40   | CAC 40       | 1:100    | 1.5    | 07:00–21:00         | -6.50%               | +4.25%                |
| EU50   | EuroStoxx 50 | 1:100    | 2.0    | 07:00–21:00         | -6.50%               | +4.25%                |
| ES35   | IBEX 35      | 1:100    | 5.0    | 07:00–17:30         | -6.50%               | +4.25%                |
| IT40   | FTSE MIB     | 1:100    | 5.0    | 07:00–17:30         | -6.50%               | +4.25%                |
| JP225  | Nikkei 225   | 1:100    | 10.0   | 00:00–21:00         | -7.75%               | +5.50%                |
| HK50   | Hang Seng    | 1:100    | 5.0    | 01:15–20:00         | -7.75%               | +5.50%                |
| CN50   | China A50    | 1:100    | 6.0    | 01:00–09:00         | -7.75%               | +5.50%                |
| KS200  | KOSPI 200    | 1:100    | 5.0    | 00:00–07:00         | -7.75%               | +5.50%                |
| AUS200 | ASX 200      | 1:100    | 2.0    | 23:50–06:00         | -7.75%               | +5.50%                |
| CA60   | S&P/TSX 60   | 1:100    | 5.0    | 13:30–20:00         | -7.75%               | +5.50%                |

### Commodities — 15 Instruments

| Symbol | Name        | Leverage | Spread | Contract    | Swap Long (annual %) | Swap Short (annual %) |
| ------ | ----------- | -------- | ------ | ----------- | -------------------- | --------------------- |
| XAUUSD | Gold        | 1:50     | 0.30   | 100 oz      | -12.50%              | +8.25%                |
| XAGUSD | Silver      | 1:50     | 0.03   | 5000 oz     | -12.50%              | +8.25%                |
| XPTUSD | Platinum    | 1:20     | 2.00   | 100 oz      | -12.50%              | +8.25%                |
| XPDUSD | Palladium   | 1:20     | 3.00   | 100 oz      | -12.50%              | +8.25%                |
| COPPER | Copper      | 1:20     | 0.02   | 25000 lbs   | -12.50%              | +8.25%                |
| USOIL  | WTI Crude   | 1:50     | 0.05   | 100 bbl     | -15.75%              | +11.50%               |
| UKOIL  | Brent Crude | 1:50     | 0.06   | 100 bbl     | -15.75%              | +11.50%               |
| NG     | Natural Gas | 1:20     | 0.005  | 10000 MMBtu | -15.75%              | +11.50%               |
| COFFEE | Coffee      | 1:10     | 0.50   | 37500 lbs   | -18.25%              | +14.75%               |
| SOYBN  | Soybeans    | 1:10     | 1.00   | 5000 bu     | -18.25%              | +14.75%               |
| CORN   | Corn        | 1:10     | 0.50   | 5000 bu     | -18.25%              | +14.75%               |
| WHEAT  | Wheat       | 1:10     | 0.50   | 5000 bu     | -18.25%              | +14.75%               |
| SUGAR  | Sugar       | 1:10     | 0.05   | 112000 lbs  | -18.25%              | +14.75%               |
| COCOA  | Cocoa       | 1:10     | 5.00   | 10000 lbs   | -18.25%              | +14.75%               |
| COTTON | Cotton      | 1:10     | 0.05   | 50000 lbs   | -18.25%              | +14.75%               |

### Stocks — 30 Instruments

| Symbol | Name                   | Exchange | Leverage | Hours (EST) | Swap Model                          |
| ------ | ---------------------- | -------- | -------- | ----------- | ----------------------------------- |
| AAPL   | Apple Inc              | NASDAQ   | 1:5      | 9:30–16:00  | Base rate + 2.5% / Base rate - 2.5% |
| MSFT   | Microsoft Corp         | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| GOOGL  | Alphabet Inc           | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| AMZN   | Amazon.com Inc         | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| TSLA   | Tesla Inc              | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| META   | Meta Platforms         | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| NVDA   | NVIDIA Corp            | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| NFLX   | Netflix Inc            | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| AMD    | Advanced Micro Devices | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| INTC   | Intel Corp             | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| PYPL   | PayPal Holdings        | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| ORCL   | Oracle Corp            | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| JPM    | JPMorgan Chase         | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| BAC    | Bank of America        | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| V      | Visa Inc               | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| MA     | Mastercard             | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| JNJ    | Johnson & Johnson      | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| WMT    | Walmart Inc            | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| XOM    | Exxon Mobil            | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| BRK.B  | Berkshire Hathaway B   | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| DIS    | Walt Disney Co         | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| KO     | Coca-Cola Co           | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| PFE    | Pfizer Inc             | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| T      | AT&T Inc               | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| GS     | Goldman Sachs          | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| BA     | Boeing Co              | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| CVX    | Chevron Corp           | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| MCD    | McDonald's Corp        | NYSE     | 1:5      | 9:30–16:00  | Same                                |
| SBUX   | Starbucks Corp         | NASDAQ   | 1:5      | 9:30–16:00  | Same                                |
| UBER   | Uber Technologies      | NYSE     | 1:5      | 9:30–16:00  | Same                                |

_Stock swap = US Federal Funds Rate + 2.5% (long) / US Federal Funds Rate - 2.5% (short). Store base_rate_pct as platform-level configuration. BullMQ nightly job reads this config when calculating daily charge._

### Crypto — 12 Instruments

| Symbol   | Name            | Leverage | Spread | Hours | Swap Long (annual %) | Swap Short (annual %) |
| -------- | --------------- | -------- | ------ | ----- | -------------------- | --------------------- |
| BTCUSD   | Bitcoin / USD   | 1:10     | 50.0   | 24/7  | -25.00%              | +15.00%               |
| ETHUSD   | Ethereum / USD  | 1:10     | 5.0    | 24/7  | -25.00%              | +15.00%               |
| BNBUSD   | BNB / USD       | 1:10     | 2.0    | 24/7  | -25.00%              | +15.00%               |
| SOLUSD   | Solana / USD    | 1:10     | 0.5    | 24/7  | -25.00%              | +15.00%               |
| XRPUSD   | Ripple / USD    | 1:10     | 0.002  | 24/7  | -25.00%              | +15.00%               |
| ADAUSD   | Cardano / USD   | 1:10     | 0.001  | 24/7  | -25.00%              | +15.00%               |
| DOTUSD   | Polkadot / USD  | 1:10     | 0.05   | 24/7  | -25.00%              | +15.00%               |
| DOGEUSD  | Dogecoin / USD  | 1:10     | 0.001  | 24/7  | -25.00%              | +15.00%               |
| MATICUSD | Polygon / USD   | 1:10     | 0.002  | 24/7  | -25.00%              | +15.00%               |
| AVAXUSD  | Avalanche / USD | 1:10     | 0.1    | 24/7  | -25.00%              | +15.00%               |
| LTCUSD   | Litecoin / USD  | 1:10     | 0.5    | 24/7  | -25.00%              | +15.00%               |
| LINKUSD  | Chainlink / USD | 1:10     | 0.01   | 24/7  | -25.00%              | +15.00%               |

---

_ProTraderSim — PTS-DB-001 — Database Schema — v1.0 — March 2026_
