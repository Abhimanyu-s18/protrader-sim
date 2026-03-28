# ProTraderSim
## PTS-CALC-001 — Trading Calculations & Business Rules
**Version 1.0 | March 2026 | CONFIDENTIAL**

---

## IMPLEMENTATION MANDATE

> **ALL calculations are performed SERVER-SIDE ONLY.**
> The client (browser) NEVER performs financial calculations.
> The client receives computed values from the API and displays them.
>
> **All intermediate values use BIGINT arithmetic.**
> Division is the LAST step. Never cast to float during intermediate steps.
> Round only at final display step.

---

## 1. Instrument Precision Reference

| Asset Class | Price Scale | Pip Decimal | Contract Size | Example |
|---|---|---|---|---|
| Forex (4-decimal) | ×100,000 | 4 | 100,000 | EURUSD: 1.08500 = 108500 |
| Forex (2-decimal, JPY) | ×100,000 | 2 | 100,000 | USDJPY: 154.500 = 15450000 |
| Stocks | ×100,000 | 2 | 1 | AAPL: 189.50 = 18950000 |
| Indices | ×100,000 | 1 | 1 | US500: 5123.5 = 512350000 |
| Commodities (Gold) | ×100,000 | 2 | 100 | XAUUSD: 2050.50 = 205050000 |
| Crypto | ×100,000 | 2 | 1 | BTCUSD: 68500.00 = 6850000000 |

---

## 2. Spread Application

```
mid_price   = raw_feed_price from Twelve Data

half_spread_scaled = (spread_pips × 10) / 2    -- for 5-decimal pairs
bid_scaled  = mid_scaled - half_spread_scaled
ask_scaled  = mid_scaled + half_spread_scaled
```

**BUY trades execute at ask_price. SELL trades execute at bid_price.**
This is mandatory for correct P&L calculation.

Example: EURUSD mid = 1.08500 (108500), spread = 2 pips
```
half_spread_scaled = (2 × 10) / 2 = 10
bid_scaled = 108500 - 10 = 108490  →  1.08490
ask_scaled = 108500 + 10 = 108510  →  1.08510
```

---

## 3. Margin Calculation

```
margin_cents = (units × contract_size × open_rate_scaled × 100)
               / (leverage × 100000)
```

`×100` converts scaled price to cents. `/100000` removes price scale. `/leverage` applies leverage.

**Example:** BUY 4000 units AUDCAD at 0.95770 (scaled: 95770), leverage 500, contract 100,000:
```
margin_cents = (4000 × 100000 × 95770 × 100) / (500 × 100000)
             = 38,308,000,000,000 / 50,000,000
             = 766,160 cents  =  $7,661.60
```

**Test case (mandatory):** BUY 10,000 units EURUSD at 1.08500, leverage 500 → margin = $21.70 (2170 cents)

---

## 4. P&L Calculation

**BUY position:**
```
pnl_cents = (current_bid_scaled - open_rate_scaled) × units × contract_size × 100 / 100000
```
Subtract open rate from current bid (where the position can be closed).

**SELL position:**
```
pnl_cents = (open_rate_scaled - current_ask_scaled) × units × contract_size × 100 / 100000
```
Subtract current ask (where the position can be closed) from open rate.

**Cross-currency P&L conversion (non-USD quote currency):**
```
If quote_currency != 'USD':
    pnl_usd_cents = pnl_in_quote × USDXXX_rate
    -- Fetch live USDXXX rate from price cache for conversion
```

**Test cases (mandatory):**
- P&L BUY: opened at 1.08500, closed at 1.09000, 10,000 units = +$50.00 (+5000 cents)
- P&L SELL: opened at 1.08500, closed at 1.08000, 10,000 units = +$50.00 (+5000 cents)

---

## 5. Account Metrics (Computed — Never Stored)

All values below are computed in real-time from ledger_transactions + open positions + live prices. They are never stored as columns on the users table.

```sql
-- Balance (from ledger)
SELECT COALESCE(SUM(amount_cents), 0) AS balance_cents
FROM ledger_transactions WHERE user_id = $1;

-- Unrealized P&L (from open trades)
SELECT COALESCE(SUM(unrealized_pnl_cents), 0) AS unrealized_pnl_cents
FROM trades WHERE user_id = $1 AND status = 'OPEN';

-- Used margin (from open trades)
SELECT COALESCE(SUM(margin_required_cents), 0) AS used_margin_cents
FROM trades WHERE user_id = $1 AND status = 'OPEN';
```

```
equity_cents       = balance_cents + unrealized_pnl_cents
available_cents    = equity_cents - used_margin_cents
margin_level_bps   = IF used_margin_cents = 0: NULL (display as '--')
                     ELSE: (equity_cents × 10000) / used_margin_cents
                     -- 10000 = 100.00% in basis points. 15000 bps = 150.00%
buying_power_cents = (available_cents × leverage) / 100
exposure_cents     = SUM(units × contract_size × current_price_scaled × 100 / 100000) over open trades
```

**Test cases (mandatory):**
- Margin level: equity = $1,000, used_margin = $500 → margin_level = 200.00% (20000 bps)
- Balance: deposit $1,000, trade closed +$50, withdrawal -$200 → balance = $850

---

## 6. Rollover / Overnight Swap Fee

Rollover is applied to all open positions at 22:00 UTC server time. Positions opened AND closed before 22:00 on the same day do not incur a charge.

```
daily_swap_cents = (units × contract_size × open_rate_scaled × 100 / 100000)
                   × swap_rate_bps / 10000 / 365
```

`swap_rate_bps` is direction-specific (BUY or SELL rate from swap_rates table).
Negative result = debit from account. Positive result = credit to account.

**Wednesday Triple-Swap Rule:**
On Wednesday rollover: `daily_swap_cents × 3`
This accounts for the weekend (Friday–Sunday) positions that remain open but for which rollover cannot be charged as markets are closed.

**Rollover application (BullMQ job — 22:00 UTC Mon–Fri):**
1. BullMQ job `rollover-daily` triggers at 22:00 UTC
2. Query all trades WHERE status='OPEN'
3. For each trade: calculate daily_swap_cents using current swap_rate from swap_rates table
4. If Wednesday: multiply by 3
5. INSERT ledger_transactions (transaction_type='ROLLOVER', amount_cents = -swap_cents)
6. UPDATE trades: rollover_accumulated_cents += swap_cents, overnight_count += 1

**Test case (mandatory):**
- 10,000 units EURUSD, swap_rate_bps = -2 (buy rate), open_rate = 1.08500 → verify debit calculated correctly
- Same calculation × 3 on Wednesday

---

## 7. Liquidation Engine

The liquidation engine monitors all accounts with open positions on every price tick.

### Margin Call Level — 100% (Warning Only)

```
IF margin_level_bps <= 10000 (100.00%):
    - Emit margin:call to user Socket.io room
    - Send email notification
    - Log margin_call_warning event
    - NO automatic position closure at this level (warning only)
```

### Stop-Out Level — 50% (Auto-Close)

```
IF margin_level_bps <= 5000 (50.00%):
    - Begin stop-out sequence
    - Select position: LARGEST UNREALIZED LOSS first (most negative unrealized_pnl_cents)
    - Close that position at current market price
    - INSERT realized P&L to ledger
    - Recalculate margin_level_bps
    - IF margin_level_bps still <= 5000: close next largest loss position
    - REPEAT until margin_level_bps > 5000 OR all positions closed
```

> **OPEN DECISION:** Stop-out at 50% vs 20%. Must be resolved before Sprint 5 begins.
> Current MTS value: 50% (5000 bps). May change to 20% (2000 bps).
> This value is in `instruments.stop_out_bps` per-instrument AND used in the monitoring logic.

### Negative Balance Protection

```
AFTER all positions are closed:
IF balance_cents < 0:
    INSERT ledger_transactions (
        transaction_type = 'MANUAL_ADJUSTMENT',
        amount_cents = ABS(balance_cents)
    )
    -- Platform absorbs negative balance. Required for FSC/FSA compliance.
    -- Trader balance reset to 0. Event logged for risk review.
```

**Test case (mandatory):** equity = -$100 after stop-out → balance reset to $0.

### Real-Time Monitoring

```
Price tick received via Twelve Data WebSocket
  → Update Redis: SET prices:{symbol} {bid, ask, mid, change_bps, ts} EX 60
  → Publish to Redis pub/sub: PUBLISH price_updates '{symbol,...}'
  → All API server instances subscribed to price_updates channel
  → Each server: socket.io.to('prices:{symbol}').emit('price:update', data)
  → Redis SMEMBERS margin_watch:{symbol} → get user IDs with open positions
  → For each user: recalculate unrealized_pnl + margin_level
  → If margin_level change crosses 100% or 50%: dispatch call/stop-out
  → Emit trade:pnl_update to user:{USER_ID} room for each affected trade
```

---

## 8. Stop Loss & Take Profit Logic

| Condition | Direction | Trigger | Action |
|---|---|---|---|
| Stop Loss | BUY (long) | current_price <= stop_loss_price | Close at current market price; insert ledger entry; emit notification |
| Take Profit | BUY (long) | current_price >= take_profit_price | Close at current market price; insert ledger entry; emit notification |
| Stop Loss | SELL (short) | current_price >= stop_loss_price | Close at current market price; same ledger/notification flow |
| Take Profit | SELL (short) | current_price <= take_profit_price | Close at current market price; same ledger/notification flow |

**Validation at order creation:**
- BUY SL: must be below entry price by at least min_stop_distance_pips
- BUY TP: must be above entry price by at least min_stop_distance_pips
- SELL SL: must be above entry price by at least min_stop_distance_pips
- SELL TP: must be below entry price by at least min_stop_distance_pips

---

## 9. Trailing Stop Engine

The trailing stop is a dynamic stop-loss that moves with price to lock in profit as price moves favourably.

**Phase 1 scope:** Trailing Stop available for Market orders only (not on pending/entry orders).

**Storage:** `trades.trailing_stop_distance BIGINT` — distance in integer pips × 100.
**State:** `trades.peak_price_scaled BIGINT` — highest (BUY) or lowest (SELL) price since trade open.

**Algorithm (evaluated on every price tick for trades with trailing_stop_distance set):**

```
For BUY trades:
    IF current_bid > peak_price_scaled:
        peak_price_scaled = current_bid            -- update peak (favourable move)
    stop_trigger = peak_price_scaled - (trailing_stop_distance × pip_size)
    IF current_bid <= stop_trigger:
        close_trade()                              -- trailing stop triggered

For SELL trades:
    IF current_ask < peak_price_scaled:
        peak_price_scaled = current_ask            -- update trough (favourable move)
    stop_trigger = peak_price_scaled + (trailing_stop_distance × pip_size)
    IF current_ask >= stop_trigger:
        close_trade()                              -- trailing stop triggered
```

Trailing stop closure follows the same code path as a standard stop-loss trigger — same ledger entry, same notification, `closed_by = 'TRAILING_STOP'`.

---

## 10. Entry Order Engine

**Validation at order creation:**
```
BUY Entry:   trigger_price must be BELOW current ask_price - min_stop_distance
             OR ABOVE current ask_price + min_stop_distance
SELL Entry:  trigger_price must be ABOVE current bid_price + min_stop_distance
             OR BELOW current bid_price - min_stop_distance
```

`min_stop_distance_pips` is configurable per instrument.

**Order monitoring (BullMQ + Redis):**
1. On each price tick: check all PENDING orders for this instrument
2. BUY Entry triggers: when ask_price reaches trigger_price
3. SELL Entry triggers: when bid_price reaches trigger_price
4. On trigger: execute as market order at current price (may differ from exact trigger by one tick)
5. If expiry_at is set and not triggered: cancel order at expiry_at via BullMQ delayed job
6. On trigger: set status = 'OPEN', set open_rate_scaled = fill price, clear entry_rate_scaled

---

## 11. Pip Value Calculation

For USD-quoted pairs (EURUSD, GBPUSD, AUDUSD):
```
pip_value_cents = pip_size_scaled × units × contract_size × 100 / 100000
```

For non-USD quoted pairs (EURJPY, GBPJPY):
```
pip_value_in_quote = pip_size × units × contract_size
pip_value_cents    = pip_value_in_quote / JPYUSD_rate × 100
```

Pip value is displayed in the trading panel to help traders understand risk per pip.

---

## 12. Commission Calculation Per Asset Class

Commission is charged at trade open AND trade close separately. Inserted as a ledger transaction with `transaction_type = 'COMMISSION'`.

```
-- Forex: no commission (spread only)
commission_cents = 0

-- Indices (per_lot):
notional_lots = (units × contract_size × open_rate_scaled) / (100 × 100000)
commission_cents = notional_lots × commission_rate   -- rate = 100 cents = $1.00 per lot

-- Commodities (per_lot):
commission_cents = notional_lots × commission_rate   -- rate = 150 cents = $1.50 per lot

-- Stocks (per_share):
commission_cents = MAX(units × commission_rate, 100)  -- rate = 2 cents per share; minimum $1.00

-- Crypto (percentage of notional):
notional_cents = units × open_rate_scaled × 100 / 100000
commission_cents = notional_cents × commission_rate / 10000  -- rate = 10 bps = 0.10%
```

---

## 13. Inactivity Fee

**Definition:** An account is inactive if no trade has been opened or closed for 90 consecutive calendar days.

**Fee:** $25.00 USD (2500 cents) per month, charged on the first calendar day of each month.

**Application rules:**
- Debit from real balance only (not bonus balance)
- If balance < $25.00: charge full remaining balance (balance cannot go below $0 from inactivity fees)
- Ledger entry: `transaction_type = 'INACTIVITY_FEE'`
- Resume: any trade open or close resets the 90-day inactivity clock (updates `users.last_active_at`)
- Warning: send email notification 7 days before first inactivity fee is applied

**BullMQ job (`inactivity-check`):** Runs at 00:01 UTC on the first day of each month.
1. Query users WHERE last_active_at < NOW() - INTERVAL '90 days'
2. For each inactive user with balance > 0: charge fee, insert ledger entry, update last notification sent

---

## 14. Financial Module Rules

### Deposit Rules
- Minimum deposit: $200 USD (20,000 cents)
- No maximum deposit limit
- KYC must be APPROVED (kyc_level >= 2) before first deposit
- Supported crypto: BTC, ETH, USDT (TRC20), USDT (ERC20)
- Exchange rate provided by NowPayments at invoice creation time
- Deposit expires if not paid within 60 minutes

### Withdrawal Rules
- Minimum: $50 USD (5,000 cents)
- Maximum per transaction: $5,000 USD (500,000 cents)
- Daily limit: $5,000 USD across all withdrawals
- Processing time: 2–3 business days
- Balance deducted at request time (not on approval) to prevent over-withdrawal
- If rejected: INSERT ledger reversal (transaction_type='WITHDRAWAL_REVERSAL', amount_cents = +amount)
- Requirements: KYC approved, sufficient available balance, no negative equity

### Balance Computation (Canonical SQL)
```sql
-- Step 1: Get ledger balance
SELECT COALESCE(SUM(amount_cents), 0) AS balance_cents
FROM ledger_transactions WHERE user_id = $1;

-- Step 2: Get unrealized P&L from open trades
SELECT COALESCE(SUM(unrealized_pnl_cents), 0) AS unrealized_pnl_cents
FROM trades WHERE user_id = $1 AND status = 'OPEN';

-- Step 3: Get used margin from open trades
SELECT COALESCE(SUM(margin_required_cents), 0) AS used_margin_cents
FROM trades WHERE user_id = $1 AND status = 'OPEN';

-- Step 4: Derive all account metrics
equity_cents       = balance_cents + unrealized_pnl_cents
available_cents    = equity_cents - used_margin_cents
margin_level_bps   = CASE WHEN used_margin_cents = 0 THEN NULL
                         ELSE (equity_cents × 10000 / used_margin_cents) END
```

---

*ProTraderSim — PTS-CALC-001 — Trading Calculations & Business Rules — v1.0 — March 2026*
