# ProTraderSim
## PTS-UI-002 — UI Functional Specification (Part 2)
### Screens 16–30, Design System, Business Logic, Integrations
**Version 1.0 | March 2026 | CONFIDENTIAL**

---

## 4. Screens 16–30

### Screen 16 — ID Verification Sub-Modal

**Entry point:** "Your ID" → from Documents Hub (Screen 15)

| Element | Details |
|---|---|
| Title | "ID Verification" |
| Instruction | "Upload a coloured copy of an identification document showing all four corners" |
| Radio options | Passport (default), National ID card, Driving licence, Other |
| Upload Zone 1 (Primary) | Light-blue drop zone. Icon matches selected radio. "Upload a file" (orange) or "Take a photo" (bold orange). Click or drag to upload. |
| Upload Zone 2 (Additional) | "Additional Document" — grayed, unlocks after Zone 1 has a file. Same action links (faded until Zone 1 filled). |
| Dynamic behaviour | Selecting a different radio changes Zone 1 icon and label in real-time |
| CANCEL | Returns to Documents Hub |
| CONTINUE | Solid orange, disabled until Zone 1 has a file |

**File requirements:**
- Accepted types: image/jpeg, image/png, application/pdf
- Maximum size: 10 MB per file (enforced client and server)
- Minimum resolution for images: 800×600px
- MIME type verified from file bytes server-side (not extension)

**Document state machine:**

| Status | Meaning |
|---|---|
| not_submitted | No file uploaded yet |
| uploaded | File received, awaiting admin review. Trader sees "Under review". |
| under_review | Admin has opened the file. Locked from re-upload. |
| approved | Admin marked as valid. |
| rejected | Admin rejected with reason code. Re-upload enabled. |
| expired | Document accepted but past validity period. |

---

### Screen 17 — Address Verification Sub-Modal

| Element | Details |
|---|---|
| Title | "Address Verification" |
| Instruction | "Upload a personal document that is showing your address" |
| Radio options | Utility Bill (default), Bank Statement, Credit Card Statement, Local Authority Tax Bill, Other |
| Upload Zones | Identical dual-zone layout to ID Verification. Zone 1 label matches selected radio type. |
| Compliance note | Document must show: full legal name + current residential address. Must be dated within 3 months. |
| CANCEL / CONTINUE | Same behavior as ID Verification |

---

### Screen 18 — Miscellaneous Documents Sub-Modal

| Element | Details |
|---|---|
| Title | "Miscellaneous" |
| Instruction | "Upload any type of document which was requested and not included under the other options" |
| Radio option | "Other" (pre-selected, no alternatives) |
| Upload Zones | Same dual-zone layout. Zone 1 label: "Other". |
| Use cases | Tax residency certificate, source-of-funds doc, court orders, enhanced due diligence requests |
| CANCEL / CONTINUE | Same behavior. CONTINUE disabled until Zone 1 has a file. |

---

### Screen 19 — My Account — Financial Summary Tab

**Zone:** Platform (app.protrader.com/account/financial)

**Layout:** Two-column. "Current" on left, "Summary" (lifetime) on right.

**Left — Current Account State:**

| Metric | Definition |
|---|---|
| Balance | Cash: deposits − withdrawals + settled trade P&L |
| Account Equity | Balance + Unrealized P&L |
| Margin Level | (Equity / Used Margin) × 100%. Below 50% = stop-out risk. |
| Used Margin | Total margin locked in open positions |
| Available | Equity − Used Margin |
| Maintenance Margin | Minimum equity to keep positions open |
| Unrealized P&L | Floating P&L on all open positions (tick-by-tick) |
| Realized P&L | Cumulative P&L from all closed trades |
| Buying Power | Available / Margin Rate — maximum new notional position |
| Exposure | Sum of (Units × Current Price) across all open positions |

All Current values are computed in real-time — never stored.

**Right — Lifetime Summary:**

| Metric | Source Transaction Type |
|---|---|
| Deposits | SUM where type = DEPOSIT |
| Withdrawals | SUM where type = WITHDRAWAL |
| Rollover Paid | SUM where type = ROLLOVER |
| Trading Benefits | SUM where type = TRADING_BENEFIT |
| Cashback | SUM where type = CASHBACK |
| Manual Adjustments | SUM where type = MANUAL_ADJUSTMENT |
| Cash Dividends | SUM where type = DIVIDEND |
| Taxes | SUM where type = TAX |
| Commissions | SUM where type = COMMISSION |
| Fees | SUM where type = FEE or INACTIVITY_FEE |
| Stock Split Rounding | SUM where type = STOCK_SPLIT_ROUNDING |
| Transfers | SUM where type = TRANSFER |

---

### Screen 20 — My Account — Legal Tab

**Zone:** Platform (app.protrader.com/account/legal)

**Purpose:** Centralized library of all regulatory and legal documents. Each opens in a new browser tab.

| Document | Compliance Requirement |
|---|---|
| AML Policy | Required by FSC/FSA. Must be version-controlled and accessible at all times. |
| Complaints Handling Procedure | Regulatory requirement with regulator escalation path. |
| Cookies Policy | GDPR/data protection compliance. |
| Credit Card Declaration | Payment-specific agreement (applicable if card payments added in future). |
| First Protected Positions | T&C for the "Protected Position" feature. |
| Privacy Policy | GDPR compliance. Required for all regulated platforms. |
| Risk Disclosure Document | Mandatory FSC/FSA. Must be accepted via checkbox at registration. |
| Rollover of Contracts T&C | Governs overnight swap fee calculation, timing, and rates. |
| Special Power of Attorney | Optional. For managed/authorized accounts. |
| Terms and Conditions | Master service agreement. Must be accepted at registration. |
| Trading Benefits T&C | Governs bonuses, cashback, and rebate programs. |

**Implementation notes:**
- All documents stored as PDFs in Cloudflare R2 or static CDN path
- Each row is a hyperlink: `target='_blank' rel='noopener noreferrer'`
- External link icon displayed next to each name
- Documents are version-controlled in admin back-office
- Risk Disclosure and T&C must be explicitly accepted (checkbox) at registration — linking alone is insufficient
- AML Policy reference URL must appear in platform footer

---

### Screen 21 — Economic Calendar

**Zone:** Platform (app.protrader.com/calendar)

**Purpose:** Filterable global economic events feed.

**Page header:**
- Title: "Economic Calendar" (h1)
- Date range picker (default: current week)
- Currency filter: multi-select checkboxes for currency codes (USD, EUR, GBP, JPY, etc.)
- Impact filter: 1-star / 2-star / 3-star importance

**Table columns:**

| Column | Contents |
|---|---|
| Time | Event time in user's selected timezone |
| Currency | Country flag + 3-letter code |
| Impact | 1–3 star rating |
| Event Name | Full economic event description |
| Previous | Prior period value |
| Forecast | Analyst consensus estimate |
| Actual | Released figure (green if better than forecast, red if worse) |

**Data source:** Trading Economics API, Forex Factory feed, or licensed Refinitiv/LSEG feed.

---

### Screen 22 — Signals Page

**Zone:** Platform (app.protrader.com/signals)

**Purpose:** Algorithmically or analyst-generated trade signals by asset class.

**Page header:**
- Title: "Signals" (h1)
- "Go to Portfolio" orange link (top-right)
- Symbol search (real-time filter)

**Asset class tabs:** My Watchlist (default), Stock, Index, Commodity, Crypto, Currency. Settings gear icon.

**Signals table:**

| Column | Contents |
|---|---|
| Symbol | Instrument code + logo/flag |
| Type | BUY (green badge) or SELL (red badge) |
| Pattern | Technical pattern: MACD Cross, Head & Shoulders, RSI Divergence, Fibonacci, etc. |
| Interval | Timeframe: 1H, 4H, 1D, 1W |
| Added | Date + time signal was generated |
| Target | Target price level |

**Empty state (My Watchlist):** "Oops.. there are no trading signals for your watchlist symbols at the moment. No worries, check out the other tabs here!"

Signals are system-generated only. Traders cannot create or modify signals.

---

### Screen 23 — Alerts Page

**Zone:** Platform (app.protrader.com/alerts)

**Purpose:** Price alert management.

**Page header:**
- Title: "Alerts" (h1)
- "Set an alert" orange text link (top-right)
- Symbol search (filters active alerts)

**Asset class tabs:** All (default), My Watchlist, Stock, Index, Commodity, Crypto, Currency.

**Alerts table:**

| Column | Contents |
|---|---|
| Symbol | Flag + instrument code |
| Alert Type | Price reaches / Price above / Price below / Pct change |
| Trigger | Numeric trigger price or percentage |
| Sell | Current bid price |
| Buy | Current ask price |
| Actions | Edit (pencil), Delete (X) |

**Empty state:** "You have no active alerts" + "+ Set an alert" orange button.

**Set an Alert flow:**
1. Click "Set an alert" → modal opens
2. Select symbol (searchable list)
3. Choose alert type: Price reaches / Price above / Price below / Percentage change
4. Enter trigger value
5. Select notification channels (checkboxes): In-app popup, Email, Push notification
6. Optional: set expiration date (default = GTC, no expiry)
7. Click "Save" / "Create Alert"
8. Alert appears in table with status: Active
9. BullMQ worker monitors on each price tick using Redis sorted set (`alert_index:{SYMBOL}`) for O(log n) queries
10. On condition met: dispatch notifications, set alert.status = 'Triggered'

---

### Screen 24 — Make a Withdrawal Modal

**Trigger:** "Make a withdrawal" button on Funds tab.

**Modal:**
- Title: "Make a Withdrawal"
- Amount input: validated against available_cents in real-time
- "Available for withdrawal: ${available}" shown below input
- Minimum: $50 USD
- Maximum per transaction: $5,000 USD
- Crypto currency selector: BTC / ETH / USDT
- Wallet address input (required)
- Reason text field (optional)
- CONTINUE button — orange, disabled until amount and wallet address are valid

**Confirmation step:** Summary screen showing amount, currency, wallet address (masked). "Confirm Withdrawal" button.

**Post-submission:** "Your withdrawal request has been submitted and is under review."

---

### Screen 25 — News

**Zone:** Platform (app.protrader.com/news)

**Purpose:** Curated market news feed.

**Layout:** News article cards in a feed.

**Card structure:** Source logo + headline + summary + asset class tag + timestamp + "Read more →" link.

**Filter bar:** All / Forex / Stocks / Crypto / Commodities / Indices.

**Data source:** Twelve Data news endpoint or licensed news feed provider.

---

### Screen 26 — Academy

**Zone:** Platform (app.protrader.com/academy)

**Purpose:** Educational content hub for traders.

**Layout:** Category cards grid + featured article/video.

**Content categories:** Getting Started, Chart Reading, Risk Management, Trading Strategies, Platform Guide, Market Analysis.

**Article/video cards:** Thumbnail + title + reading time / video duration + difficulty level badge.

---

### Screen 27 — Portfolio (ProTraderSim Enhancement)

**Zone:** Platform (app.protrader.com/portfolio)

**Purpose:** Comprehensive performance analytics.

**Layout sections:**
- Asset allocation pie chart (% breakdown by asset class: Forex, Stocks, Indices, Commodities, Crypto)
- Performance chart (equity curve over time — daily snapshots from pnl-snapshot BullMQ job)
- Key statistics:
  - Win Rate (% of profitable closed trades)
  - Average Win / Average Loss
  - Profit Factor
  - Max Drawdown %
  - Sharpe Ratio
  - Total trades / Open trades
  - Best trade / Worst trade
- Position history table (all closed trades with P&L contribution)

---

### Screen 28 — Dedicated Trading Panel (ProTraderSim Enhancement)

**Zone:** Platform (app.protrader.com/terminal)

**Purpose:** Full-screen professional trading workspace.

**Panel layout (resizable):**
- Main chart panel (TradingView, full indicators + drawing tools)
- Order book panel (bid/ask depth visualization)
- Trade entry form panel (same fields as Screen 09/10 but larger)
- Open positions panel (same as My Trades → Open Trades tab but integrated)
- Market overview ticker (horizontal strip at top)

Panel widths are user-adjustable via drag handles. Layout persists to user preferences.

---

### Screen 29 — Admin Back-Office

**Zone:** admin.protrader.com
**Access:** SUPER_ADMIN and ADMIN roles only.

**Sidebar navigation sections:**
- Dashboard (overview metrics)
- Users (trader list + profile + account management)
- KYC Review (review queue with pending submissions)
- Deposits (approval queue + history)
- Withdrawals (approval queue + history)
- Leads (all registered users including unverified)
- Instruments (view + edit instrument configuration)
- Signals (create / manage signals)
- Reports (generate CSV/Excel exports)

**KYC Review screen:**
- Queue table: Trader name, Account number, Submission date, Status
- Click trader → profile panel: personal info + uploaded documents
- For each document: "View" button generates R2 presigned URL (15-min expiry), opens in new tab
- Approve / Reject / Request More buttons
- Rejection: dropdown for reason code + text field for message to trader
- Approve: updates kyc_status, increments kyc_level, triggers approval email

**Deposit approval:**
- Table: Trader, Currency, Crypto amount, USD amount, NowPayments invoice ID, Status, Date
- Approve: confirms ledger entry, optionally adds bonus_cents
- Reject: updates status, triggers notification to trader

**Withdrawal approval:**
- Table: Trader, Amount, Crypto, Wallet (masked), Status, Requested at
- Approve: triggers NowPayments Payout API call
- Reject: triggers reversal ledger entry, notifies trader with rejection reason

---

### Screen 30 — IB Portal

**Zone:** ib.protrader.com
**Access:** IB_TEAM_LEADER and AGENT roles.

**Agent Dashboard sections:**
- My Traders — list: name, account number, balance, last active, total volume
- My Commissions — paginated list: trade, trader, amount, date, status (PENDING / PAID)
- Commission Summary — total earned, total paid, pending payout balance
- Performance chart — daily/weekly/monthly commission earned bar chart

**Team Leader Dashboard (additional sections):**
- My Agents — list: name, trader count, total volume, commissions generated
- Network Overview — total traders, total volume, total commissions
- Per-Agent Drilldown — click agent → their trader list + commission detail
- Override Commissions — TL override commission earnings (separate track)

---

## 5. Business Logic

### 5.1 Order Types

**Market Order:**
- Executes immediately at next available market price
- BUY executes at ask_price, SELL at bid_price
- Submit button text: "Buy [SYMBOL] at [CURRENT_ASK_PRICE]"

**Entry Order:**
- Executes when market reaches a user-specified trigger price
- BUY entry: triggers when ask_price reaches trigger_price
- SELL entry: triggers when bid_price reaches trigger_price
- Validation: rate must be above ASK + min_stop_distance or below BID - min_stop_distance
- Optional: expiration date (GTC if not set)
- Submit text: "Sell [SYMBOL] at [ORDER_RATE]" (faded until valid rate entered)

### 5.2 SL/TP Logic

| SL/TP | Direction | Trigger |
|---|---|---|
| Stop Loss | BUY (long) | current_price <= stop_loss_price |
| Take Profit | BUY (long) | current_price >= take_profit_price |
| Stop Loss | SELL (short) | current_price >= stop_loss_price |
| Take Profit | SELL (short) | current_price <= take_profit_price |

Available for both Market Orders and Entry Orders.

### 5.3 Account Metrics Definitions

| Metric | Formula |
|---|---|
| Balance | Deposits − Withdrawals + Settled trade P&L (sum of ledger) |
| Equity | Balance + Unrealized P&L |
| Available | Equity − Used Margin |
| Used Margin | Sum of all open position margin requirements |
| Margin Level | (Equity / Used Margin) × 100%. >100% = healthy. |
| Unrealized P&L | Sum of all open position floating P&L (tick-by-tick) |
| Realized P&L | Sum of all closed position P&L |
| Exposure | Sum of (Units × Market Price) for all open positions |
| Buying Power | Available / Margin Rate |

---

## 6. Design System

### 6.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| --primary | #E8650A | Primary orange — CTAs, active states, links, highlights |
| --dark-bg | #1A2332 | Dark backgrounds — sidebar, auth left panel, nav |
| --surface | #FFFFFF | Card backgrounds, form areas, content panels |
| --surface-alt | #F5F7FA | Alternate row backgrounds, secondary surfaces |
| --text-primary | #1C1C1E | Primary body text |
| --text-secondary | #4A4A5A | Secondary labels, helper text |
| --text-muted | #8A8A9A | Placeholder text, disabled states |
| --success | #1A7A3C | Positive P&L, Buy trend, profitable states |
| --danger | #C0392B | Negative P&L, Sell trend, error states |
| --border | #E8EAED | Table borders, card borders, dividers |

**Asset-class category colors:**

| Token | Hex | Asset Class |
|---|---|---|
| --asset-stocks | #3B82F6 | Blue-500 — Stocks |
| --asset-forex | #8B5CF6 | Violet-500 — Forex |
| --asset-commodities | #F59E0B | Amber-500 — Commodities |
| --asset-crypto | #EC4899 | Pink-500 — Crypto |
| --asset-indices | #6366F1 | Indigo-500 — Indices |
| --pnl-positive | #10B981 | Emerald-500 — Profit / Buy |
| --pnl-negative | #EF4444 | Red-500 — Loss / Sell |
| --pnl-neutral | #64748B | Slate-500 — Flat / Pending |
| --pnl-positive-bg | #A7F3D0 | Emerald-200 — Profit row highlight |
| --pnl-negative-bg | #FECACA | Red-200 — Loss row highlight |

*Accessibility: colors must never be the sole indicator of category or direction. Always pair with text label or icon. Test with color-blindness simulator before Sprint 8 sign-off.*

### 6.2 Animation Timing Tokens

```css
:root {
  --duration-instant:  0ms;     /* Skip transitions entirely (e.g. tab switches) */
  --duration-fast:     150ms;   /* Hover effects, focus rings, micro-interactions */
  --duration-normal:   250ms;   /* Standard UI transitions (state changes) */
  --duration-slow:     400ms;   /* Modal / drawer open-close animations */
  --duration-page:     600ms;   /* Full page transitions */

  --ease-out-cubic:  cubic-bezier(0.33, 1, 0.68, 1);      /* Natural movement */
  --ease-out-quart:  cubic-bezier(0.25, 1, 0.5, 1);       /* Snappy interactions */
  --ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);       /* Smooth modal entries */
  --ease-bounce:     cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Confirm feedback */
}
```

| Interaction Type | Duration Token | Easing Token |
|---|---|---|
| Hover effects (buttons, rows) | --duration-fast (150ms) | --ease-out-cubic |
| Loading states & spinners | --duration-normal (250ms) | --ease-out-quart |
| Modal / drawer open-close | --duration-slow (400ms) | --ease-out-expo |
| P&L / price data updates | --duration-normal (250ms) | --ease-out-cubic + stagger |
| Order confirmation feedback | --duration-normal (250ms) | --ease-bounce |

*All animations wrapped in `@media (prefers-reduced-motion: no-preference) { }`. Only animate `transform` and `opacity` — never animate height, width, or background-color directly.*

### 6.3 Typography Scale

| Role | Size | Weight | Color |
|---|---|---|---|
| Display / Page Title | 36–40px | Bold | #1C1C1E |
| Section Heading | 28px | Bold | #E8650A or dark |
| Subsection Heading | 22px | SemiBold | #1A1A2E |
| Body Text | 14px | Regular | #1C1C1E |
| Secondary / Labels | 12px | Regular | #4A4A5A |
| Caption / Legal | 10px | Regular | #8A8A9A |
| Price Data | 18–24px | Bold | Monospace / tabular nums |
| Button Text | 14px | Bold/SemiBold | — |

*Mobile: increase all base font sizes by 2px (14px body → 16px, 12px caption → 14px).*

### 6.4 Component Inventory

**Buttons:**
- Primary — solid orange (#E8650A), white text, 4–6px border-radius, 40–48px height
- Secondary — outlined orange border, orange text, transparent background
- Danger — red background for destructive actions
- Ghost — no border, link-style, orange text
- Disabled — opacity 0.4–0.5, pointer-events: none

**Form Inputs:**
- Style: underline-only (no box border)
- Label floats above on focus (animated)
- Password fields: show/hide eye icon toggle
- Country code selector: split inline with phone number field

**Cards:**
- White background, 8–12px border-radius, subtle box-shadow
- Padding: 24–32px
- Section headers: 16px bold text

**Navigation:**
- Sidebar: 200px fixed, dark background (#1A2332), icon + label items
- Active state: orange left border (3–4px) + lighter background fill
- Top nav: white background, full-width, fixed

**Modals:**
- White card, centered, backdrop overlay (rgba 0,0,0, 0.5)
- Close X button top-right
- Rounded corners 12–16px
- Full-width orange CTA button at bottom

**Tables:**
- Striped rows (alternating white / #F9FAFB)
- Header: dark background (#1A2332) with white bold text
- 1px #DDDDDD borders
- Hover state: light orange row highlight

---

## 7. Instrument Logo / Icon Display Rules

| Asset Class | Display Method | Source |
|---|---|---|
| Forex pairs | Currency flag pair (2 flags side-by-side, 32×20px each) | flagcdn.com CDN. Base + quote currency flags derived from symbol string. |
| Indices | Text badge (dark navy background, white mono text, 48px wide) | No image needed — ticker IS the identity. e.g. "US30" badge, "NAS100" badge. |
| Commodities | Standardised SVG icons | Stored in /public/instruments/commodities/. Gold = bar icon, Silver = coin, Oil = drop, Gas = flame, Wheat = grain. |
| Stocks | Official company logo (SVG/PNG, max 32×32px) | Downloaded from Twelve Data company metadata or licensed source. Cached to R2 on first fetch. |
| Cryptocurrencies | Official project logo (SVG/PNG) | CoinGecko or Twelve Data logo URLs. Cached to R2. Use official brand colors (BTC = orange, ETH = purple/grey). |

**Fallback rule:** If no logo or flag is available, show a text badge with the instrument ticker in uppercase monospace font on a dark navy background. No broken image states.

**Implementation:**
- Create `/packages/shared/src/instrumentLogos.ts` mapping each symbol to its display type and asset path
- Forex flags: resolve base and quote ISO codes from symbol string → construct flagcdn.com URL dynamically
- Stock/crypto logos: fetch on first render, cache resolved URL in Redis (`logo:{symbol}`, 24h TTL)
- All logo images: `loading="lazy"` attribute, defined `width` and `height` to prevent CLS

---

## 8. Mobile Touch Target Specifications

| Specification | PTS Minimum |
|---|---|
| Minimum touch target size | 48 × 48px (Android standard) |
| Minimum spacing between targets | 8px horizontal, 4px vertical |
| Input field height (forms) | 48px |
| Bottom navigation tab height | 56px |
| Floating action button (trade) | 56px diameter with 16px shadow clearance |

**Required gesture support:**
- Swipe left/right: navigate between asset classes on Markets page
- Pinch to zoom: on TradingView chart (handled natively by the widget)
- Pull to refresh: on Open Positions list and Notifications list
- Long press: on position row to open quick-close confirmation

---

## 9. Complete Page Inventory (All 30 Screens)

| # | Screen Name | Zone | Status |
|---|---|---|---|
| 01 | Landing Page | Public | Core |
| 02 | Registration | Auth | Core |
| 03 | Login | Auth | Core |
| 04 | Change Password (Auth) | Auth | Core |
| 05 | KYC Onboarding Wizard | Auth | Core |
| 06 | Symbols / Trading | Platform | Core |
| 07 | Create Trade Modal | Platform | Core |
| 08 | My Trades (5 tabs) | Platform | Core |
| 09 | Trade Panel (Market Order) | Platform | Core |
| 10 | Trade Panel (Entry Order) | Platform | Core |
| 11 | Header Stats Reorder Modal | Platform | Core |
| 12 | My Account — Funds Tab | Platform | Core |
| 13 | My Account — Profile Tab | Platform | Core |
| 14 | Change Password (Modal) | Platform | Core |
| 15 | Documents Hub Modal | Platform | Core |
| 16 | ID Verification Modal | Platform | Core |
| 17 | Address Verification Modal | Platform | Core |
| 18 | Miscellaneous Docs Modal | Platform | Core |
| 19 | My Account — Financial Summary | Platform | Core |
| 20 | My Account — Legal Tab | Platform | Core |
| 21 | Economic Calendar | Platform | Core |
| 22 | Signals | Platform | Core |
| 23 | Alerts | Platform | Core |
| 24 | Make a Withdrawal Modal | Platform | Core |
| 25 | News | Platform | Core |
| 26 | Academy | Platform | Core |
| 27 | Portfolio | Platform | Enhancement |
| 28 | Dedicated Trading Panel | Platform | Enhancement |
| 29 | Admin Back-Office | Admin | Enhancement |
| 30 | IB Portal | IB Zone | Enhancement |

---

## 10. Third-Party Integration Requirements

| Integration | Provider | Purpose |
|---|---|---|
| Market Data | Twelve Data | Real-time and historical prices for all 60 instruments |
| Economic Calendar | Trading Economics API or Forex Factory | Economic events feed |
| Charts | TradingView Charting Library (self-hosted) | Professional chart with indicators and drawing tools |
| Crypto Payments | NowPayments | Crypto deposit processing (BTC, ETH, USDT) |
| Email | Resend | Transactional emails: verification, KYC, statements, alerts |
| File Storage | Cloudflare R2 | KYC documents, annual statement PDFs, cached logos |
| Social Auth | Google / Facebook OAuth | Sign up / login with social accounts |
| Real-time | Socket.io | Live prices, P&L updates, order status notifications |
| Job Scheduling | BullMQ (Redis-backed) | Rollover, alerts, inactivity, scheduled reports |
| Live Chat / Support | Telegram + Chat Widget | Embedded support: Telegram link + chat bubble |

---

*ProTraderSim — PTS-UI-002 — UI Functional Specification Part 2 — v1.0 — March 2026*
