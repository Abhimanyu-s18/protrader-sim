# ProTraderSim
## PTS-API-001 — API Specification
**Version 1.0 | March 2026 | CONFIDENTIAL**

---

## 1. Global API Standards

| Standard | Rule |
|---|---|
| Base URL | `https://api.protrader.com/v1` |
| Versioning | `/v1/` prefix on all endpoints. Breaking changes increment to `/v2/`. |
| Auth | `Authorization: Bearer {access_token}` header on all protected endpoints. |
| Content Type | `application/json` for all request and response bodies. |
| Pagination | Cursor-based: `?cursor={last_id}&limit={n}` (default 50, max 200). Response includes `next_cursor`. |
| Rate Limiting | Per-user: 100 req/min standard. 10 req/min for auth endpoints. Returns 429 on breach. |
| Timestamps | ISO 8601 UTC: `2026-03-25T10:30:00.000Z` |
| Money in responses | Return BIGINT cents AND formatted string: `{cents: 10050, formatted: '$100.50'}` |
| Error format | `{error_code: 'INSUFFICIENT_MARGIN', message: 'Human readable', details: {...}}` |
| CORS | Allow-Origin: specific app domains only. Never `*`. |

---

## 2. Standard Error Codes

| HTTP | Error Code | Meaning |
|---|---|---|
| 400 | VALIDATION_ERROR | Request body failed validation. Details contain field errors. |
| 401 | UNAUTHORIZED | Missing or expired JWT token. |
| 403 | FORBIDDEN | Valid token but insufficient role/permission. |
| 403 | KYC_REQUIRED | Trading action blocked — KYC not approved. |
| 404 | NOT_FOUND | Resource does not exist or does not belong to user. |
| 409 | DUPLICATE | Duplicate unique constraint (e.g. email already exists). |
| 409 | INSUFFICIENT_FUNDS | Not enough available balance. |
| 409 | INSUFFICIENT_MARGIN | Not enough available margin for this trade. |
| 409 | MARKET_CLOSED | Instrument not tradable at current time. |
| 422 | INVALID_RATE | Entry order rate fails validation rules. |
| 429 | RATE_LIMITED | Too many requests. Retry-After header indicates wait time. |
| 500 | INTERNAL_ERROR | Unexpected server error. Incident logged automatically. |

---

## 3. Endpoint Catalogue

### Authentication — /v1/auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /v1/auth/register | Public | Register new trader. Returns user + tokens. |
| POST | /v1/auth/login | Public | Login with email+password. Returns access+refresh tokens. |
| POST | /v1/auth/logout | Required | Invalidate refresh token. |
| POST | /v1/auth/refresh | Public | Exchange refresh token for new access token. |
| POST | /v1/auth/forgot-password | Public | Send password reset email with 1-hour token. |
| POST | /v1/auth/reset-password | Public | Reset password using token from email. |
| POST | /v1/auth/change-password | Required | Change password (requires current password). |
| POST | /v1/auth/verify-email | Public | Verify email address using token from email. |
| POST | /v1/auth/oauth | Public | Social login (Google/Facebook). Exchange code for tokens. |
| GET | /v1/auth/sessions | Required | List all active sessions for current user. |
| DELETE | /v1/auth/sessions/:id | Required | Terminate a specific session. |

**Register request body:**
```json
{
  "email": "trader@example.com",
  "password": "SecurePass123",
  "full_name": "Jane Smith",
  "phone": "+971551234567",
  "country": "UAE",
  "pool_code": "IB_POOL_001",
  "terms_accepted": true
}
```

**Pool Code:** Required for all registrations. Must match an active staff.pool_code. This is the IB acquisition model — every trader must be referred by an active Introducing Broker.

---

### Users — /v1/users

| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/users/me | Get current user profile. |
| PUT | /v1/users/me | Update profile fields (name, phone, language, preferences). |
| GET | /v1/users/me/account-metrics | Returns all computed financial metrics (balance, equity, etc.). |
| GET | /v1/users/me/financial-summary | Returns all Financial Summary tab data (current + lifetime). |
| GET | /v1/users/me/ledger | Paginated transaction history. Filter by type and date range. |

**account-metrics response:**
```json
{
  "balance": { "cents": 100000, "formatted": "$1,000.00" },
  "equity": { "cents": 105000, "formatted": "$1,050.00" },
  "unrealized_pnl": { "cents": 5000, "formatted": "+$50.00" },
  "used_margin": { "cents": 20000, "formatted": "$200.00" },
  "available": { "cents": 85000, "formatted": "$850.00" },
  "margin_level_bps": 52500,
  "margin_level_formatted": "525.00%"
}
```

---

### Instruments — /v1/instruments

| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/instruments | List all active instruments. Filter by ?asset_class=FOREX |
| GET | /v1/instruments/:symbol | Get instrument details (spread, leverage, hours, commission). |
| GET | /v1/instruments/:symbol/price | Get current bid/ask/mid from Redis cache. |
| GET | /v1/instruments/:symbol/ohlcv | Get OHLCV candles. Params: interval, from, to, limit. |

---

### Trades — /v1/trades

| Method | Endpoint | Description |
|---|---|---|
| POST | /v1/trades | Open a new trade (market or entry order). Returns trade object. |
| GET | /v1/trades | List trades. Filter: ?status=OPEN\|CLOSED\|PENDING. Paginated. |
| GET | /v1/trades/:id | Get single trade with full details. |
| POST | /v1/trades/:id/close | Close an open trade at current market price. |
| PUT | /v1/trades/:id/sl-tp | Update stop loss and/or take profit on open trade. |
| PUT | /v1/trades/:id/trailing-stop | Set or update trailing stop distance in pips. |
| POST | /v1/trades/:id/partial-close | Close a partial number of units on open trade. |
| DELETE | /v1/trades/:id | Cancel a PENDING entry order. |
| GET | /v1/trades/activity-log | User activity log: all account events paginated. |

**Open trade request body:**
```json
{
  "instrument_id": 1,
  "direction": "BUY",
  "units": 10000,
  "order_type": "MARKET",
  "stop_loss_scaled": 107500,
  "take_profit_scaled": 110000,
  "trailing_stop_distance": 50
}
```

**Trade execution flow (CRITICAL: race condition mitigation):**
1. requireAuth + requireKYC middleware
2. Fetch instrument (check is_active, trading hours, contract_size, leverage)
3. Fetch current price from Redis: `GET prices:{symbol}`
4. Apply spread: open_rate = ask_scaled (BUY) or bid_scaled (SELL)
5. Calculate required margin: `margin_cents = (units × open_rate_scaled × 100) / (leverage × 100000)` (see "Margin Formula" section)
6. **VALIDATION BEFORE TRANSACTION:** Validate SL/TP placement (min_stop_distance enforced)
7. **BEGIN DB TRANSACTION (with row-level lock):**
   - `SELECT balance_cents, unrealized_pnl_cents, used_margin_cents FROM account_state WHERE user_id = $1 FOR UPDATE` (acquire lock on user row)
   - Recalculate available_cents = (balance_cents + unrealized_pnl_cents) - used_margin_cents *UNDER LOCK*
   - Validate: available_cents >= margin_cents → else 409 INSUFFICIENT_MARGIN
   - INSERT trades record (order_type, direction, units, open_rate_scaled, etc.)
   - INSERT ib_commissions if agent assigned
   - INSERT ledger entry for commission if applicable
8. **COMMIT transaction** — relinquish lock; other concurrent trade requests waiting on this user's lock resume
9. After successful commit, add user to Redis `margin_watch:{instrument_id}` set (may update concurrently; eventual consistency acceptable)
10. Emit trade:opened to user:{user_id} Socket.io room
11. Emit account:metrics with updated values (from ledger + live prices)
12. Return 201 with full trade object

**Race Condition Safeguard:** Step 7's row-level lock (`FOR UPDATE`) ensures that concurrent requests cannot both read and mutate the user's available balance without serialization. If available balance changes during the lock hold period (e.g., another trade is opened or closed), the lock holder observes the updated balance and cannot proceed if insufficient.

---

### Deposits & Withdrawals

| Method | Endpoint | Description |
|---|---|---|
| POST | /v1/deposits | Create deposit request. Returns NowPayments invoice URL + QR code. |
| GET | /v1/deposits | List user's deposits paginated. |
| GET | /v1/deposits/:id | Get deposit status. |
| POST | /v1/withdrawals | Submit withdrawal request. |
| GET | /v1/withdrawals | List user's withdrawals paginated. |
| GET | /v1/withdrawals/:id | Get withdrawal status. |
| POST | /v1/webhooks/nowpayments | NowPayments webhook receiver. HMAC-SHA512 verified. Public endpoint. |

**Deposit flow:**
1. POST /v1/deposits with { amount_cents, crypto_currency }
2. Server calls NowPayments API: create_invoice
3. NowPayments returns invoice_id + payment_url
4. INSERT deposits record (status=PENDING)
5. Response: { deposit_id, payment_url, qr_code_url }
6. NowPayments webhook fires on payment events → HMAC-SHA512 verified
7. **Handle each NowPayments webhook payment_status:**
   - `waiting`: Awaiting blockchain transaction. No action; hold deposits record in PENDING.
   - `confirming`: Blockchain transaction detected; awaiting confirmations. No action; hold deposits record in PENDING.
   - `confirmed`: 1+ blockchain confirmation received. UPDATE deposits status=CONFIRMING.
   - `finished`: Sufficient confirmations received (defined by NowPayments). INSERT ledger (transaction_type='DEPOSIT', amount_cents), UPDATE deposits status=COMPLETED, emit account:metrics, send email "Deposit confirmed".
   - `failed`: Payment failed (insufficient funds, network error, etc.). UPDATE deposits status=REJECTED, send email "Deposit failed".
   - `refunded`: Payment refunded by user or system. UPDATE deposits status=REJECTED, send email "Deposit refunded".
   - `expired`: Invoice not paid within 60 minutes. UPDATE deposits status=EXPIRED, no ledger entry (no funds received).

**Withdrawal flow:**
1. POST /v1/withdrawals with { amount_cents, crypto_currency, wallet_address, reason }
2. Validate: amount <= available_cents, KYC approved (kyc_level >= 2), no pending withdrawals
3. INSERT withdrawals record (status=PENDING, reason, wallet_address)
4. INSERT ledger entry (transaction_type='WITHDRAWAL', amount_cents=-amount) — deducts immediately (balance reduced by requested amount)
5. Admin notified via email of new withdrawal request
6. Admin reviews and approves/rejects: PUT /v1/admin/withdrawals/:id with { status, admin_reason (if rejecting) }

**Admin Approval Path:**
- PUT /v1/admin/withdrawals/:id → { status='APPROVED' }: System calls NowPayments Payout API; UPDATE withdrawals status=PROCESSING
- On payout webhook: UPDATE withdrawals status=COMPLETED, send email "Withdrawal processed"

**Admin Rejection Path:**
- PUT /v1/admin/withdrawals/:id → { status='REJECTED', admin_reason='...' }: 
  - INSERT ledger_transactions (transaction_type='WITHDRAWAL_REFUND', amount_cents=+original_amount) to restore funds
  - UPDATE withdrawals (status='REJECTED', rejection_reason=admin_reason)
  - Emit account:metrics to user (balance restored)
  - Send email "Your withdrawal request was rejected: [admin_reason]"

**Payout Failure/Error Handling:**
- If NowPayments payout API call fails or webhook indicates payout failure (failed, expired, etc.):  
  - INSERT ledger_transactions (transaction_type='WITHDRAWAL_REFUND', amount_cents=+original_amount)
  - UPDATE withdrawals (status='FAILED', failure_reason='NowPayments payout failed: [reason]')
  - Emit account:metrics to user (balance restored)
  - Send email "Your withdrawal could not be processed. Funds have been refunded to your account."

---

### KYC — /v1/kyc

| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/kyc/status | Get current KYC status, level, and document list. |
| POST | /v1/kyc/documents | Upload KYC document. Multipart form. Server uploads to R2. |
| GET | /v1/kyc/documents | List all uploaded documents with status and review notes. |
| DELETE | /v1/kyc/documents/:id | Delete document (only if status=UPLOADED and not yet reviewed). |

**Document upload flow:**
1. Client POSTs multipart form to /v1/kyc/documents
2. Server validates: file type (MIME from bytes), size (max 10MB), minimum resolution
3. Generate R2 key: `kyc/{user_id}/{category}/{uuid}.{ext}`
4. Upload to R2 private bucket
5. INSERT kyc_documents record (status='UPLOADED')
6. If both identity + address uploaded: update users.kyc_status = 'PENDING'
7. Notify admin: new KYC submission
8. Admin views document via presigned URL (15-minute expiry, generated on-demand)

---

### Alerts & Watchlist — /v1/alerts, /v1/watchlist

| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/alerts | List active price alerts for current user. |
| POST | /v1/alerts | Create price alert. |
| PUT | /v1/alerts/:id | Update alert trigger or channels. |
| DELETE | /v1/alerts/:id | Delete alert. |
| GET | /v1/watchlist | Get user's watchlist with current prices. |
| POST | /v1/watchlist | Add instrument to watchlist. |
| DELETE | /v1/watchlist/:instrument_id | Remove from watchlist. |
| PUT | /v1/watchlist/reorder | Update sort_order of watchlist items. |

---

### Signals & Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/signals | Get trading signals. Filter by ?asset_class=FOREX |
| GET | /v1/notifications | List notifications. Filter by ?is_read=false. Paginated. |
| PUT | /v1/notifications/:id/read | Mark notification as read. |
| PUT | /v1/notifications/read-all | Mark all notifications as read. |

---

### Admin — /v1/admin (requires SUPER_ADMIN or ADMIN role)

| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/admin/users | List all traders. Filter/search by name, email, status. Paginated. |
| GET | /v1/admin/users/:id | Get full trader profile, metrics, and trade history. |
| PUT | /v1/admin/users/:id/status | Activate / suspend / deactivate trader account. |
| POST | /v1/admin/users/:id/adjustment | Manual balance adjustment with reason and audit trail. |
| POST | /v1/admin/users/:id/trades/:tid/close | Force-close a trader's open position. |
| GET | /v1/admin/kyc | List all KYC submissions. Filter by status. |
| PUT | /v1/admin/kyc/:doc_id | Approve / reject KYC document with reason code. |
| GET | /v1/admin/deposits | List all deposits. Filter/sort/paginate. |
| PUT | /v1/admin/deposits/:id | Approve / reject deposit. Optionally add bonus_cents. |
| GET | /v1/admin/withdrawals | List all withdrawals. Filter/sort/paginate. |
| PUT | /v1/admin/withdrawals/:id | Approve / reject / process withdrawal. |
| GET | /v1/admin/leads | List all leads with Lead IDs. Filter by status, agent. |
| GET | /v1/admin/instruments | List all instruments with full configuration. |
| PUT | /v1/admin/instruments/:id | Update instrument configuration (spread, leverage, active). |
| GET | /v1/admin/reports | Generate reports. Params: type, from, to. |

---

### IB Portal — /v1/ib (requires IB_TEAM_LEADER or AGENT role)

| Method | Endpoint | Description |
|---|---|---|
| GET | /v1/ib/traders | List traders assigned to this agent (or entire network for TL). |
| GET | /v1/ib/traders/:id | Get trader summary: volume, P&L, last activity. |
| GET | /v1/ib/commissions | List commissions earned. Filter by date range, status. |
| GET | /v1/ib/commissions/summary | Aggregate: total earned, pending payout, paid lifetime. |
| GET | /v1/ib/agents | (Team Leader only) List agents in team with their stats. |
| GET | /v1/ib/agents/:id | (Team Leader only) Agent detail with their trader list. |
| GET | /v1/ib/network-stats | Total network volume, active traders, commission summary. |

---

## 4. WebSocket Events (Socket.io)

### Room Naming Convention

```
prices:{SYMBOL}      // e.g. prices:EURUSD — all users watching this symbol
user:{USER_ID}       // e.g. user:12345 — private user notifications and updates
admin:kyc            // KYC submission alerts to admin panel
admin:deposits       // New deposit notifications to admin panel
```

### Server → Client Events

| Event | Payload | Trigger |
|---|---|---|
| price:update | `{symbol, bid, ask, mid, change_bps, ts}` | Every price tick from Twelve Data |
| trade:opened | `{trade_id, symbol, direction, units, open_rate}` | Trade successfully opened |
| trade:closed | `{trade_id, realized_pnl_cents, closed_by}` | Trade closed by any mechanism |
| trade:pnl_update | `{trade_id, unrealized_pnl_cents}` | Every price tick for open positions |
| account:metrics | `{balance, equity, used_margin, available, margin_level}` | After any account-changing event |
| account:kyc_approved | `{kyc_status, kyc_level}` | KYC approved by admin |
| margin:call | `{margin_level_bps, equity_cents, used_margin_cents}` | Margin level drops to/below 100% |
| margin:stop_out | `{positions_closed: [...], final_balance_cents}` | Stop-out sequence completed |
| alert:triggered | `{alert_id, symbol, trigger_price, current_price}` | Alert condition met |
| notification:new | `{id, type, title, message}` | Any new notification for user |
| order:triggered | `{trade_id, symbol, open_rate}` | Entry order activated |

### Client → Server Events

| Event | Payload & Behavior |
|---|---|
| subscribe:prices | `{symbols: ['EURUSD', 'GBPUSD']}` — joins prices:SYMBOL rooms |
| unsubscribe:prices | `{symbols: ['EURUSD']}` — leaves prices:SYMBOL rooms |

---

## 4.1. Margin Formula

The margin required to open a trade depends on:
- **Units:** number of units being traded
- **Price:** current market price of the instrument (in scaled format: price × 100000)
- **Leverage:** specified leverage multiplier for the instrument

**Formula:**
```
margin_cents = (units × open_rate_scaled × 100) / (leverage × PRICE_SCALE)
```

Where `PRICE_SCALE = 100000`.

**Worked Example:** BUY 10,000 units EURUSD at 1.08500 (open_rate_scaled = 108500), leverage 500:
```
margin_cents = (10000 × 108500 × 100) / (500 × 100000)
             = 1,085,000,000 / 50,000,000
             = 2,170 cents = $21.70
```

**Key Point:** Note that `contract_size` does NOT appear in the margin formula. Margin is always calculated as (units × price) / leverage, regardless of the instrument's contract_size.

---

## 5. Authentication Architecture

### JWT Specification

| Parameter | Value |
|---|---|
| Algorithm | RS256 (asymmetric RSA). Private key signs, public key verifies. |
| Access Token Expiry | 15 minutes. Short-lived. |
| Refresh Token Expiry | 7 days standard. 30 days with 'remember me'. |
| Access Token Claims | user_id, email, role, kyc_status, kyc_level, iat, exp, jti |
| Refresh Token Storage | HttpOnly Secure cookie (not localStorage). |
| Token Rotation | Each refresh issues new refresh token. Old token invalidated. |
| Revocation | Refresh tokens stored in sessions table. Logout deletes record. |
| Password Change | All sessions for user deleted. All refresh tokens invalidated. |

### Registration Flow

1. POST /v1/auth/register with { email, password, full_name, phone, country, pool_code, terms_accepted }
2. Validate: pool_code matches active staff record, email unique, **password meets requirements** (see "Password Requirements" section below)
3. Hash password with bcrypt (cost factor 12)
4. Generate account_number: 'PT' + zero-padded 8-digit sequence
5. Generate lead_id: 'LEAD' + zero-padded 10-digit sequence
6. Create user record (kyc_status='NOT_STARTED', kyc_level=1, email_verified=false)
7. Look up staff by pool_code → set users.agent_id
8. Generate email verification token (crypto.randomBytes(32), 24h TTL, stored in Redis)
9. Send welcome + verification email via Resend
10. Create admin notification: new lead in panel
11. Return: { user, access_token, refresh_token }
12. User can login immediately. Cannot trade until email_verified=true AND kyc_status='APPROVED'

### OAuth Flow (Google / Facebook)

1. Client receives OAuth authorization code from provider redirect
2. POST /v1/auth/oauth with { provider, code }
3. Server exchanges code for profile via OAuth provider API
4. Check if email exists in users table
5. If EXISTS: link OAuth to existing account, issue tokens
6. If NEW: create account (no password), generate account_number + lead_id, issue tokens
7. Email is considered verified via OAuth (provider guarantees email ownership)

### Password Requirements

**All passwords must satisfy the following criteria:**
- **Minimum length:** 12 characters
- **Character composition:** At least one uppercase letter (A–Z), one lowercase letter (a–z), one digit (0–9), and one special symbol (!@#$%^&*-_=+)
- **Banned passwords:** Any password matching a common dictionary word or appearing in a known public breach list (checked against a maintained blacklist)
- **Password history:** Users cannot reuse any of their last 5 passwords when changing their password
- **Enforcement:** Server-side validation only. Client may implement real-time hints but must not rely on client-side validation.

**Examples:**
- ✓ Valid: `MyP@ssw0rd!`, `Tr@ding2026Key`, `SecureXyz#12`
- ✗ Invalid: `password123` (no uppercase), `PASSWORD123` (no lowercase), `MyPassword` (no digit/symbol), `password` (less than 12 chars), `admin123456` (common word)

### RBAC Middleware

| Middleware | Logic |
|---|---|
| requireAuth | Validates JWT. Attaches req.user. Returns 401 if missing/expired. |
| requireKYC | Checks req.user.kyc_status === 'APPROVED'. Returns 403 KYC_REQUIRED if not. |
| requireRole(roles) | Checks req.user.role in allowed roles array. Returns 403 FORBIDDEN if not. |
| requireSelf | For user-specific resources: checks resource.user_id === req.user.id. |

---

## 6. IB (Introducing Broker) Model

### Hierarchy

```
Super Admin
  |-- Admin (platform operations, KYC, deposits)
  |
  |-- IB Team Leader
        |-- Agent 1
        |     |-- Trader A
        |     |-- Trader B
        |
        |-- Agent 2
              |-- Trader C
```

### Trader-Agent Assignment

- Each trader has `agent_id` (FK to staff.id) set at registration via pool_code lookup
- Traders can also register via referral link: `auth.protrader.com/register?ref={agent_ref_code}`
- Assignment can be changed by Super Admin only (with audit log entry)

### Commission Calculation

> **DECISION (D-03):** IB commission formula includes `contract_size` for forex/indices/commodities per PTS-CALC-001. Stock/crypto use contract_size=1 effectively.

```
trade_notional_cents = (units × contract_size × open_rate_scaled × 100) / 100000

agent_commission_cents = trade_notional_cents × agent.commission_rate_bps / 10000
tl_commission_cents    = trade_notional_cents × tl.override_rate_bps / 10000
```

**Worked Example:** BUY 10,000 units EURUSD at 1.08500 (open_rate_scaled = 108500, contract_size = 100000), agent commission rate = 20 bps (0.20%):
```
trade_notional_cents = (10000 × 100000 × 108500 × 100) / 100000
                     = 1,085,000,000 cents = $10,850,000.00
agent_commission_cents = 1,085,000,000 × 20 / 10000 = 2,170,000 cents = $21,700.00
```

**Commission trigger:**
1. Trade is OPENED (market order) or ENTRY ORDER is triggered
2. System calculates commission using agent's rate from staff.commission_rate_bps
3. INSERT ib_commissions (agent_id, trader_id, trade_id, amount_cents, rate_bps, status='PENDING')
4. If agent has team_leader_id: also INSERT TL override commission record
5. Commission status changes to PAID when Super Admin processes payout

---

## 7. Real-Time Infrastructure

### Twelve Data Price Feed Integration

```javascript
// Connect to Twelve Data WebSocket
const ws = new WebSocket('wss://ws.twelvedata.com/v1/quotes/price?apikey=KEY');

// Subscribe to all 60 instruments on connect
ws.on('open', () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    params: { symbols: ALL_INSTRUMENT_SYMBOLS.join(',') }
  }));
});
```

**Price tick processing pipeline:**
1. Receive tick: `{symbol, price, timestamp}` from Twelve Data
2. Calculate bid/ask using spread from instruments table
3. Update Redis: `SET prices:{symbol} {bid, ask, mid, change_bps, ts} EX 60`
4. Publish to Redis pub/sub: `PUBLISH price_updates '{symbol,...}'`
5. All API server instances subscribed to price_updates channel
6. Each server: `socket.io.to('prices:{symbol}').emit('price:update', data)`
7. Get watching users: `SMEMBERS margin_watch:{symbol}`
8. For each user: recalculate unrealized_pnl + margin_level
9. Dispatch margin call or stop-out if thresholds crossed
10. Emit trade:pnl_update to user room for each affected trade

### Redis Data Structures

| Key Pattern | Type | Contents |
|---|---|---|
| `prices:{SYMBOL}` | Hash | bid, ask, mid, change_bps, timestamp |
| `margin_watch:{SYMBOL}` | Set | user_id values for all users with open positions |
| `session:{refresh_token}` | String | user_id, expires (fast session validation) |
| `rate_limit:{user_id}` | String | Request count with TTL |
| `email_verify:{token}` | String | user_id, email — 24h TTL |
| `pwd_reset:{token}` | String | user_id — 1h TTL |
| `alert_index:{SYMBOL}` | Sorted Set | alert_id scored by trigger_price for range queries |
| `logo:{symbol}` | String | Resolved logo URL — 24h TTL |
| `base_rate_pct` | String | US Fed Funds Rate for stock swap calculation |

### BullMQ Scheduled Jobs

| Queue | Schedule | Function |
|---|---|---|
| rollover-daily | Cron: `0 22 * * 1,2,4,5` (22:00 UTC Mon–Tue, Thu–Fri; Wed excluded) | Apply overnight swap fees to all open positions |
| wednesday-triple | Cron: `0 22 * * 3` (22:00 UTC Wed only) | Apply 3× rollover for Wednesday triple swap |
| alert-monitor | Event-driven (every price tick) | Check active alerts against new price |
| entry-order-expiry | Delayed job (per order expiry_at) | Cancel expired pending orders |
| kyc-reminder | Cron: `0 9 * * *` (09:00 UTC daily) | Email users with KYC NOT_STARTED after 3 days |
| deposit-confirm | Event-driven (NowPayments webhook) | Process confirmed deposits |
| pnl-snapshot | Cron: `0 0 * * *` (midnight UTC) | Store daily equity snapshot for performance charts |
| report-generator | On-demand (admin trigger) | Generate CSV/Excel reports and email download link |
| inactivity-check | Cron: `1 0 1 * *` (00:01 UTC 1st of month) | Charge inactivity fee ($25.00 USD) to qualifying accounts; send pre-charge notification 7 days prior |

---

*ProTraderSim — PTS-API-001 — API Specification — v1.0 — March 2026*
