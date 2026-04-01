# ProTraderSim
## PTS-UI-001 — UI Functional Specification (Part 1)
### Global Layout, Auth Zone, Trading Platform Screens 01–15
**Version 1.0 | March 2026 | CONFIDENTIAL**

---

## 1. Platform Zones

| Zone | Domain | Contents |
|---|---|---|
| Public Marketing | www.protrader.com | Landing page, public pages, Login/Register CTAs |
| Auth Zone | auth.protrader.com | Login, Register, Forgot Password, KYC Wizard |
| Trading Platform | app.protrader.com | All authenticated pages: Trading, Symbols, My Trades, Account |
| Admin Back-Office | admin.protrader.com | KYC review, user management, financial ops |
| IB Portal | ib.protrader.com | IB Team Leader / Agent dashboards and commissions |

---

## 2. Global Layout System (Trading Platform)

All authenticated trading platform pages share the same shell layout.

### 2.1 Global Top Navigation Bar (Header)

Fixed horizontal bar, full viewport width, highest z-index layer. Present on every authenticated page.

| Section | Contents |
|---|---|
| Left | Brand logo (icon + name). Notification bell with unread badge count. Grid/menu icon. |
| Center-Left | "Activate Rebate Plan" CTA (orange text link). "Get Vault" CTA (orange text link). |
| Center Stats | Five live account metric chips: Unrealized P&L ($), Margin Level (%), Account Equity ($), Balance ($), Available ($). Each chip has a label below the value. Chevron expands to show additional metrics. |
| Right | Time-of-day greeting: "Good morning/afternoon/evening, [FirstName]". Avatar/profile icon button. |
| Background | White with subtle bottom border. |

**Header Stats Customization:** Users click the chevron to open the "Reorder account details" modal. The modal has two sections:
- Section 1 — "Data shown on the header block": Active metrics with drag handles (reorder) and red minus buttons (remove)
- Section 2 — "Data shown in the dropdown menu": Available metrics with green plus buttons (promote to header)
- Default header metrics: Unrealized P&L, Margin Level, Account Equity, Balance, Available
- Default dropdown metrics: Exposure, Buying Power, Realized P&L, Used Margin

### 2.2 Left Sidebar Navigation

Fixed vertical sidebar, ~200px wide (desktop), collapses to icon-only on mobile.

| Element | Details |
|---|---|
| Top Label | "Trade" — active state highlighted in orange rectangle |
| Deposit CTA | Orange button with upward arrow + "Deposit" text. Primary conversion CTA, always visible. |
| Navigation Items | Symbols (candlestick icon), My Trades (grid icon), News (newspaper icon), Economic Calendar (calendar icon), Alerts (bell icon), Signals (trend icon), Academy (graduation cap icon), My Account (person icon) |
| Active State | Orange left border (3–4px) + lighter background fill |
| Bottom | Telegram icon (teal circle). Chat support icon (dark circle). |
| Collapsed State | Icon-only with expand arrow at bottom left. |

---

## 3. Screen-by-Screen Specification

### Screen 01 — Public Landing Page

**Zone:** Public (www.protrader.com)

**Purpose:** Top-of-funnel marketing. Converts anonymous visitors to registered traders.

**Header navigation:**
- Logo top-left
- Nav links: Company (dropdown), Trading (dropdown), Assets (dropdown), Contact Us
- Utility: Search icon, WhatsApp icon, Language selector
- Auth buttons: Login (outlined orange), Register (solid orange)
- Trust signal: "Regulated by FSC" link directly below nav bar
- Cookie consent banner at top of page

**Hero section:**
- Dark charcoal background with trading imagery
- Headline: "Take trading to the next level"
- Primary CTA: "Join Now" — large orange button
- Mobile device mockup of the trading app
- Carousel with left/right arrows and dot indicators

**Content sections (in order):**
1. Live asset ticker table — tabs: Best Popular CFDs, CFDs on Stocks, CFDs on Forex, CFDs on Currencies
2. "Why ProTraderSim?" — 5 feature icons: Full Transparency, Reliability, Simple Deposits, Tight Spreads, Attractive Leverage
3. Mobile app promotion — App Store + Google Play download buttons
4. "Research tools" — Candlestick charts, Economic Calendar, Fundamental Analysis
5. Beginner's Guide section — orange background, book mockup
6. "Best-performing assets" — asset carousel with trading buttons (Gold, Oil, major stocks)
7. Multi-device support section — Desktop/Android download CTAs
8. Support CTA banner — orange background
9. Footer — Links: About, Terms, Cookie Policy, Privacy, Risk Disclosure. Regulatory disclaimer. Payment icons.

---

### Screen 02 — Registration / Sign Up Page

**Zone:** Auth (auth.protrader.com/register)

**Layout:** Split-screen. Dark left panel (branding + trust) + white right panel (form card).

**Left panel:**
- Dark background (#1A2332 approx)
- Full brand logo with name
- Three trust badges: "Regulated broker", "Dedicated Customer Support Officer", "Open an account in 5 minutes"
- Legal disclaimer text (regulatory reference, company registration, address)
- Copyright line

**Right panel — Registration form:**
- Title: "SIGN UP" (bold, large)
- "Already have an account? Log in" (orange link)
- Social auth: "SIGN UP WITH GOOGLE" button, "SIGN UP WITH FACEBOOK" button
- Full Name (text input)
- Phone: country code selector (split inline) + number field. IP-geolocation pre-fills country code.
- Country: dropdown (auto-detected or manual)
- Email (email input)
- Password (show/hide eye icon, 8+ characters hint)
- Pool Code / Verification Code (conditional): Mandatory if IB configuration flag set at registration. Format: alphanumeric, case-insensitive, length 6-12, expiry timestamp checked server-side. Backend controller key (flag name): `pool_code_required` in staff settings or account configuration. Validation: return INVALID_POOL_CODE error for invalid format or expired code. Enforce at registration time (Step 2). UX: visible field when required, optional otherwise; tooltip explains "Required by your IB" if mandatory.
- Terms checkbox: "I agree with the Terms and Conditions" (linked)
- CTA: "CREATE AN ACCOUNT" — full-width orange button
- Language selector: top-right dropdown

**Validation:**
- Password minimum 12 characters (or 8+ with complexity: upper, lower, digit, symbol)
- Character variety required: at least one uppercase, one lowercase, one digit, one symbol (@!#$%^&*)
- Check against breached-password database (e.g., Have I Been Pwned API) and common-password denylist
- No restrictive maximum length (recommend up to 128 characters for future-proofing)
- Rate limiting on repeated failed password attempts: lock account after 5 consecutive failures for 15 minutes
- Terms checkbox must be checked before submission
- Pool Code: validated against active staff records server-side

---

### Screen 03 — Login Page

**Zone:** Auth (auth.protrader.com/login)

**Layout:** Same split-screen as Registration. Different trust badges on left panel: "Open an account in 5 minutes", "Zero commission", "Dedicated account manager".

**Login form:**
- Title: "Log In" (bold)
- "Don't have an account? Sign up" (orange link)
- Social auth: "CONTINUE WITH GOOGLE", "CONTINUE WITH FACEBOOK"
- Username field (accepts email address)
- Password field with show/hide toggle (eye icon)
- Remember Me checkbox
- "Forgot password?" orange text link (bottom-right)
- CTA: "LOG IN" — full-width orange button
- Language selector top-right
- Floating chat support bubble (bottom-right)

---

### Screen 04 — Change Password (Auth Zone — Full Page)

**Zone:** Auth (auth.protrader.com/change-password)

**Purpose:** Used when navigating from password reset email link. Full-page split-screen layout.

**Form:**
- Title: "Change password"
- Instruction: "In order to change your account password, please fill in the following information:"
- Username field (pre-filled email, read-only)
- Current Password (show/hide toggle)
- New Password (empty input)
- Retype New Password (confirm input)
- Back chevron (top-left of card)
- CTA: "CONFIRM" — full-width orange button

---

### Screen 05 — KYC Onboarding Wizard

**Zone:** Auth (auth.protrader.com/onboarding)

**Purpose:** Multi-step wizard collecting trader information and KYC documents. Shown on first login after registration.

**Left sidebar — Step progress:**
| Step | Label | State |
|---|---|---|
| 1 | Personal Information | ✓ (completed on registration) |
| 2 | Address | Completed or current |
| 3 | Top Up | Pending |
| 4 | Financial Details | Pending |
| 5 | Identity Verification | Pending |
| 6 | Start Trading | Pending |

**Step 1 — Personal Information:** Full name, date of birth, nationality (auto-filled from registration; editable).

**Step 2 — Address:** Address line 1, city, country, postal code.

**Step 3 — Top Up:**
- Title: "TOP UP YOUR ACCOUNT"
- Trust line: "All payments are 100% secure"
- For ProTraderSim: shows NowPayments crypto deposit options (BTC, ETH, USDT)
- Skip/close X button top-right (optional step)

**Step 4 — Financial Details:**
- Employment status (dropdown)
- Annual income range (dropdown)
- Source of funds (dropdown: Employment, Self-employment, Savings, Investments, Other)
- Trading experience (dropdown: Beginner, Intermediate, Advanced, Professional)
- Trading motive (dropdown/text)
- Trading goal (text)

**Step 5 — Identity Verification:** Opens Documents Hub modal chain (see Screen 15 onwards).

**Step 6 — Start Trading:** Completion screen. CTA: "GO TO TRADING PLATFORM" → redirects to app.protrader.com.

---

### Screen 06 — Symbols / Trading Page (Main Trading View)

**Zone:** Platform (app.protrader.com/symbols) — default landing after login.

**Purpose:** Primary trading interface. Symbol watchlist + live prices + chart + trade panel.

**Page header:**
- Title: "Symbols" (h1 bold)
- Actions: "+ Add symbol" (orange link), "Go to Portfolio" (orange link)
- Symbol search input (top-right of content area)

**Symbol category tabs:**
- My Watchlist (n) — user's saved symbols
- Stock (28), Index (15), Commodity (15), Crypto (12), Currency (15)
- Settings gear icon (right) — column visibility and display preferences

**Symbols table columns:**

| Column | Data | Notes |
|---|---|---|
| Symbol | Logo/flag + code + full name | Asset-class icon rules (see attached icon table below for asset class designations) |
| Change | % + trend direction | Red = down, green = up |
| 1D Low/High | Price range with visual bar | Shows position in daily range |
| Sell | Red-bordered button with bid price | Click opens sell order in trade panel |
| Buy | Green-bordered button with ask price | Click opens buy order in trade panel |
| Trend | % sell/buy bar | 33% Sell / 67% Buy indicator |
| Actions | Bell (alert), Eye (watchlist toggle), Chart (chart view) | |

Selected row: light orange background highlight. Clicking a row loads symbol in chart and trade panel.

**Chart toolbar (between table and chart):**
- Search (magnifier), Indicators, Timeframe selector (e.g. "1H"), Drawing tools (pencil, crosshair, arrow)
- Comparison symbol (+), Reset/refresh, Grid layout toggle, Fullscreen expand

**Candlestick chart:**
- TradingView Charting Library (self-hosted)
- Symbol header: name + current price + 24h % change
- Price axis (right), time axis (bottom)
- Dashed horizontal line at current price
- Full interactivity: hover crosshair, zoom, pan, drawing tools, 100+ indicators

---

### Screen 07 — Create a Trade Modal

**Purpose:** Opens from "+ Create a trade" button on My Trades page.

**Modal structure:**
- Title: "Create a trade" + "Select a symbol" subtitle
- Symbol search input
- Symbol grid/list: instrument logo + code + name + current price
- Cancel button (gray) + Create (orange, enabled after selecting a symbol)
- On selection: navigates to Symbols page with the selected instrument loaded in trade panel

---

### Screen 08 — My Trades

**Zone:** Platform (app.protrader.com/my-trades)

**Layout:** Full-page with 5 tabs.

**Tab 1 — Open Trades:**
| Column | Contents |
|---|---|
| Symbol | Logo + code |
| Type | BUY / SELL badge |
| Units | Position size |
| Open Rate | Entry price |
| Current | Live bid/ask |
| Unrealized P&L | Floating value (green/red) |
| Margin | Margin requirement |
| Swap | Accumulated rollover |
| Actions | Close (X), Edit SL/TP, Partial Close |

Each row expandable to show SL, TP, trailing stop, protection status.

**Tab 2 — Pending Orders (Entry Orders):**
Same columns + "Order Rate" (trigger price) + Expiry + Cancel button

**Tab 3 — Closed Trades:**
| Column | Contents |
|---|---|
| Symbol | Code |
| Type | BUY / SELL |
| Units | |
| Open Rate | |
| Close Rate | |
| Realized P&L | Final settled value |
| Closed By | USER / STOP_LOSS / TAKE_PROFIT / STOP_OUT / ADMIN |
| Duration | Time open |

**Tab 4 — Orders History:**
All entry orders ever created — both triggered and cancelled. Includes CANCELLED status.

**Tab 5 — Activity Log:**
Paginated feed of all account events: trades opened, closed, deposits, withdrawals, KYC status changes, password changes.

---

### Screen 09 — Trade Panel (Market Order)

**Zone:** Right-side panel on Symbols page. Opens when symbol is selected.

**Panel structure:**

| Element | Details |
|---|---|
| Symbol header | Asset-class logo/flag + code + name + % change (red/green). Optionally includes "Protected!" badge if account-level trade protection is active (investor protection scheme or capital guarant shield flag set on account). Badge: green pill-shaped background, white text "Protected!", right-aligned in header. Tooltip on hover: "Your account benefits from investor protection insurance." Bell + Eye icons. |
| Tab bar | Trade \| Positions \| Info \| Chart \| Features \| Signals \| Alerts |
| SELL direction | Large SELL price (red text). Red underline when selected. |
| BUY direction | Large BUY price (gray when unselected). Click to activate. |
| Units field | Label + info icon + "(minimum is {min_units} units)" hint. +/- stepper. Large value display. |
| Margin calc | "Funds required to open position: ${calculated}" (orange, auto-calculated). "Available: ${available}" |
| Order type toggle | "Market order" \| "Entry order" — yellow fill for active |
| Stop Loss | Checkbox → reveals stop loss price input when checked |
| Take Profit | Checkbox → reveals take profit price input when checked |
| Submit | Full-width orange: "Sell [SYMBOL] at [PRICE]" or "Buy [SYMBOL] at [PRICE]". Disabled when margin insufficient. |

---

### Screen 10 — Trade Panel (Entry Order)

**Same as Screen 09, with these additions when "Entry order" is toggled:**

| Element | Details |
|---|---|
| Order Rate field | Price input with +/- stepper |
| Validation hint | "Rate should be above {ask+distance} or below {bid-distance}" |
| Expiration Date | Checkbox → reveals datetime picker (optional, default = no expiry = GTC) |

Submit button text changes to: "Sell [SYMBOL] at {order_rate}" (faded until valid rate entered).

---

### Screen 11 — Header Stats Reorder Modal

**Trigger:** Click chevron next to stats bar in header.

**Section 1 — "Data shown on the header block":**
- List of currently active metrics (default: Unrealized P&L, Margin Level, Account Equity, Balance, Available)
- Each row: drag handle (left) + metric name + red minus button (remove from header)

**Section 2 — "Data shown in the dropdown menu":**
- Metrics not in header (default: Exposure, Buying Power, Realized P&L, Used Margin)
- Each row: green plus button (promote to header) + metric name

**Action buttons:** Cancel (gray), Save (orange)

---

### Screen 12 — My Account — Funds Tab

**Zone:** Platform (app.protrader.com/account/funds)

**Left panel — Account summary:**
- Circular ring chart showing Margin Level %
- Balance: large bold figure
- Equity, Used Margin, Available — below balance

**Right panel — Actions:**
- "Deposit" — orange button (triggers deposit flow)
- "Make a withdrawal" — outlined orange button (triggers withdrawal modal)
- "Annual Statement" — link (downloads PDF from R2)

**Deposits history section:**
- Paginated table: Date, Currency, Amount (crypto), USD Amount, Status, Reference

**Withdrawals history section:**
- Paginated table: Date, Currency, Amount, Wallet Address (masked), Status

---

### Screen 13 — My Account — Profile Tab

**Zone:** Platform (app.protrader.com/account/profile)

**Layout:** Two cards side by side.

**Left card — Personal Information:**
| Field | Details |
|---|---|
| Avatar | Large circle, placeholder silhouette, no upload visible |
| Full Name | Bold display name, directly below avatar |
| Change Password | Gray outlined button — triggers in-platform Change Password modal (Screen 14) |
| Name | Read-only with underline separator |
| Date of Birth | DD/MM/YYYY format |
| Email | Read-only |
| Phone Number | Value with country code. Telegram paper-plane icon on right (opens Telegram) |
| Address | Multi-line: street, city/district, country |
| Documents | "Upload documents →" orange link — triggers Documents Hub modal (Screen 15) |
| Language | Value with flag emoji. Pencil icon opens language selector |
| Account Number | Numeric ID. Copy-to-clipboard icon |
| User ID | Internal user ID. Copy-to-clipboard icon |

**Right card — Communication Preferences:**
- Title: "Communication preferences"
- "Pop up sound" toggle (default ON) — audio notifications for price alerts, trade executions, platform events

---

### Screen 14 — Change Password Modal (In-Platform)

**Trigger:** "Change password" gray button on Profile tab.
**Distinction:** This is a modal overlay. Screen 04 is a full-page in the auth zone.

**Modal:**
- Title: "Change password"
- Field 1: "Password *" — current password with eye toggle
- Field 2: "New password (12+ characters) *" — with eye toggle
- Field 3: "Retype new password *" — must match Field 2
- Cancel (gray), Change password (orange)

**Validation:**
- Current password verified server-side (wrong = 401, inline error below Field 1)
- New password: minimum 12 characters (client-side)
- Confirm: must match new password (client-side, shown on submit attempt)

**Success:** Modal closes, success toast: "Password changed successfully"

---

### Screen 15 — Documents Hub Modal

**Entry points:** (1) "Upload documents →" on Profile tab; (2) Step 5 of KYC onboarding wizard.

**Modal:**
- Title: "Documents"
- Description: "We may contact you if we need additional documentation."
- Row 1: "Your ID" + "Upload →" orange link → opens ID Verification sub-modal (Screen 16)
- Row 2: "Your address" + "Upload →" orange link → opens Address Verification sub-modal (Screen 17)
- Row 3: "Other documents (optional)" + "Upload →" → opens Miscellaneous sub-modal (Screen 18)
- CANCEL (outlined orange) — dismisses modal
- UPLOAD ALL (solid orange) — batch confirmation for all three categories

Each "Upload →" click replaces modal content with the specific sub-modal (same modal frame, no new layer).

### Screen 16 — ID Verification Sub-Modal

**Entry:**Triggered by "Your ID" → "Upload →" in Documents Hub (Screen 15).

**Modal:**
- Title: "ID Verification"
- Instruction: "Upload a scanned copy of your personal ID"
- Radio options (mutually exclusive): Passport (default), National ID, Driver's License, Residence Permit
- Upload Zones: Identical dual-zone layout to legacy KYC (Zone 1: "Front of {selected document}", Zone 2: "Back of {selected document}")
- File requirements: JPEG, PNG, PDF; max 10MB per file; min 800×600px for images
- Compliance note: "Must be: clear and legible, issued by government authority, not expired or expiring within 3 months"
- Document state: uploaded → under_review → approved/rejected (with ability to re-upload if rejected)
- CANCEL (outlined) / CONTINUE (solid orange, disabled until Zone 1 has a file)

### Screen 17 — Address Verification Sub-Modal

**Entry:** Triggered by "Your address" → "Upload →" in Documents Hub (Screen 15).

**Modal:** Same structure as Screen 16.
- Title: "Address Verification"
- Instruction: "Upload a personal document showing your current address"
- Radio options: Utility Bill (default), Bank Statement, Credit Card Statement, Local Authority Tax Bill, Other
- Upload Zones: Identical dual-zone layout. Zone 1 label matches selected radio type.
- Compliance note: "Document must show: full legal name + current residential address. Must be dated within 3 months."
- CANCEL / CONTINUE: Same behavior as ID Verification

### Screen 18 — Miscellaneous Documents Sub-Modal

**Entry:** Triggered by "Other documents (optional)" → "Upload →" in Documents Hub (Screen 15).

**Modal:** Same structure as Screens 16–17.
- Title: "Miscellaneous"
- Instruction: "Upload any document requested and not included above"
- Radio option: "Other" (pre-selected, single choice)
- Upload Zones: Same dual-zone layout. Zone 1 label: "Document".
- Use cases: Tax residency certificate, source-of-funds documentation, court orders, enhanced due diligence requests
- CANCEL / CONTINUE: Same behavior

---

*ProTraderSim — PTS-UI-001 — UI Functional Specification Part 1 — v1.0 — March 2026*
