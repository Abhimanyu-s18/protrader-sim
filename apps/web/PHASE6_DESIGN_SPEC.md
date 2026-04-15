# Phase 6: Public Marketing Website — Design Handoff Spec

## Overview

A professional public-facing marketing website inspired by IC Markets and Exness. Dark, premium aesthetic with orange brand accents. Showcases trading instruments, platform capabilities, account types, and drives user registration.

---

## Design Tokens

| Token            | Class                                 | Value     | Usage                                                                                     |
| ---------------- | ------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| Brand Orange     | `bg-primary-500` / `text-primary-500` | `#E8650A` | CTAs, highlights, active nav                                                              |
| Dark Navy        | `bg-dark-700`                         | `#1A2332` | Hero sections, header, footer                                                             |
| Dark Navy Deep   | `bg-dark-800`                         | `#111827` | Footer, deepest bg                                                                        |
| Dark Mid         | `bg-dark-600`                         | `#2C3E5C` | Cards on dark bg, hover states                                                            |
| Light Surface    | `bg-surface-alt`                      | `#F5F7FA` | Alternating light sections                                                                |
| Border           | `border-surface-border`               | `#E8EAED` | Dividers, card borders                                                                    |
| Buy/Green        | `text-buy`                            | `#1A7A3C` | Positive P&L, gain indicators                                                             |
| Sell/Red         | `text-sell`                           | `#C0392B` | Negative, sell indicators                                                                 |
| Risk Warning BG  | `bg-risk-warning` / `bg-alert-dark`   | `#2B2B2B` | Risk/alert background (dark)                                                              |
| Font             | Inter (400, 600, 700)                 | —         | All text, fallback: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial |
| Radius: Base     | `rounded-lg`                          | 8px       | Base radius for buttons, inputs, cards on light bg                                        |
| Radius: Elevated | `rounded-xl`                          | 12px      | Elevated components, cards on dark bg                                                     |
| Radius: Compact  | `rounded-sm`                          | 4px       | Compact elements, alerts, risk warning container                                          |

---

## Site Architecture

### Navigation (Mega-Menu Header)

```
[ProTraderSim Logo] | Trading ▼ | Platforms | Accounts ▼ | Education ▼ | About ▼ | [Login] [Open Account →]
```

**Trading Dropdown** (mega-menu, 2 columns):

- Forex Trading → `/trading/forex`
- Stocks & ETFs → `/trading/stocks`
- Indices → `/trading/indices`
- Commodities → `/trading/commodities`
- Cryptocurrencies → `/trading/crypto`
- All Instruments → `/trading/instruments`

**Accounts Dropdown**:

- Account Types → `/accounts`
- Compare Accounts → `/accounts/compare`
- Open Live Account → `https://auth.protrader.sim/register`

**Education Dropdown**:

- Courses → `/education/courses`
- Webinars → `/education/webinars`
- Glossary → `/education/glossary`

**About Dropdown**:

- About Us → `/about`
- Why ProTraderSim → `/about#why`
- Contact Us → `/about/contact`

### Footer Columns

1. **ProTraderSim** — Logo, tagline, social links (Twitter, LinkedIn, YouTube, Facebook)
2. **Trading** — Forex, Stocks, Indices, Commodities, Crypto, All Instruments
3. **Platforms** — Web Platform, Mobile App, API Trading, Platform Features
4. **Company** — About Us, Contact, Careers, Awards
5. **Legal** — Terms of Service, Privacy Policy, Risk Disclosure, Cookie Policy

Bottom bar: Risk warning text + copyright

---

## Pages

### 1. Home Page (`/`)

**Hero Section** — Full viewport, `bg-dark-700`, radial gradient overlay:

- Badge: "Trusted by 50,000+ Traders"
- H1: "Trade Global Markets with Confidence" (text-5xl/6xl, bold, white)
- Subheading: "Access 150+ instruments across Forex, Stocks, Indices, Commodities & Crypto. Competitive spreads, high leverage, professional-grade tools."
- CTA: `[Open Free Account]` (primary-500) + `[Try Demo]` (ghost/outline)
- Decorative: Dark trading chart graphic (CSS/SVG mock)

**Stats Strip** — Dark bg `dark-800`, 4 stats in a row:

- 150+ Instruments | From 0.0 Pips | Up to 500:1 Leverage | 24/5 Support

**Why Choose Us** — White bg, 3-column grid:

- Ultra-Low Spreads → `heroicons/ChartBarIcon`
- Advanced Execution → `lucide/LightningIcon`
- Secure & Regulated → `heroicons/ShieldCheckIcon`
- 24/5 Expert Support → `heroicons/HeadsetIcon`

**Icon System:** Use Heroicons (heroicons.com) for most icons, Lucide (lucide.dev) for additional icons. Import directly or use centralized Icon component:

```tsx
// Direct import (recommended for single use)
import { ChartBarIcon } from '@heroicons/react/24/outline'

// Centralized component for consistency
import { Icon } from '@protrader/ui'
;<Icon name="chart-bar" />
```

All icon names must map to the exact package identifier. Maintain an icon mapping table in the implementation guide.

**Instruments Tabs** — `bg-surface-alt`, tabs: Forex | Stocks | Indices | Crypto | Commodities

- Each tab shows 5 instrument rows: Symbol | Bid | Ask | Spread | Daily Change

**Platform Preview** — Dark section, split layout (text left, mockup right):

- "Professional-Grade Trading Platform"
- Feature bullets: Advanced charting, One-click trading, Risk management tools, Mobile trading

**Account Types** — White bg, 3 cards:

- Standard | Pro | VIP
- Spreads from, Leverage, Commission, Min deposit

**Testimonials** — `bg-surface-alt`, 3 cards with stars, quote, trader name

**Trust Statement** — White bg, clarifying non-regulatory status:

> "ProTraderSim is an educational simulation platform. All trading activity uses virtual funds in a risk-free environment. We do not offer regulated financial services."

_Note: Display only simulation-only recognitions or educational platform awards. Do not display broker/dealer certifications or regulatory body logos._

**Final CTA** — Dark bg, centered: "Ready to Start Trading?" + two CTAs

---

### 2. Trading Sub-pages (Forex/Stocks/Indices/Commodities/Crypto)

Each page follows this template:

1. **Hero** — Dark bg, asset-specific headline + key specs (spread, leverage, instruments count)
2. **What Is Asset** — Light section, 2-col (text + info cards)
3. **Why Trade Asset With Us** — 3-4 feature cards
4. **Instruments Table** — Full table with Symbol, Description, Typical Spread, Max Leverage, Trading Hours
5. **Key Specs** — Icon + text grid (min trade size, margin, swap rates)
6. **How to Trade** — Numbered steps
7. **CTA Section** — Dark, "Start Trading Asset Today"

---

### 3. All Instruments Page (`/trading/instruments`)

- Filter tabs: All | Forex | Stocks | Indices | Commodities | Crypto
- Search input
- Full table: Symbol | Name | Category | Spread | Leverage | Min Size | Trading Hours
- Pagination

---

### 4. Platforms Page (`/platforms`)

1. **Hero** — "One Platform for All Markets"
2. **Web Platform** — Split: screenshot mockup + feature list
3. **Mobile Trading** — Split (reversed): phone mockup + app store badges
4. **API Trading** — Code snippet + feature bullets
5. **Platform Features Grid** — 6-8 feature cards
6. **CTA**

---

### 5. Account Types Page (`/accounts`)

1. **Hero** — "Choose the Right Account"
2. **Account Cards** — Standard | Pro | VIP (with recommended badge on Pro)
3. **Full Comparison Table** — All features row by row with ✓/✗
4. **FAQ** — Accordion, 5-6 questions about accounts
5. **CTA**

---

### 6. Compare Accounts Page (`/accounts/compare`)

- Side-by-side comparison table of all 3 account types
- Feature categories: Spreads, Leverage, Commission, Min Deposit, Platforms, Support, Execution

---

### 7. About Page (`/about`)

1. **Hero** — "Empowering Traders Worldwide"
2. **Our Story** — Timeline or narrative
3. **Our Values** — 4 value cards
4. **By the Numbers** — Stats: traders, countries, instruments, years
5. **Team** — 3-4 leadership cards (generic/placeholder)

---

### 8. Education Pages

#### 8a. Courses Page (`/education/courses`)

1. **Hero** — "Master Trading with Expert-Led Courses"
2. **Course Categories** — Cards: Forex Basics, Technical Analysis, Risk Management, Advanced Strategies
3. **Featured Courses** — 3-4 course cards with thumbnail, title, duration, level
4. **Learning Path** — Step-by-step progression for beginners to advanced
5. **CTA**

#### 8b. Webinars Page (`/education/webinars`)

1. **Hero** — "Live & Recorded Trading Webinars"
2. **Upcoming Webinars** — Date/time, topic, presenter, register button
3. **Past Webinars** — Recorded sessions with topics
4. **CTA**

#### 8c. Glossary Page (`/education/glossary`)

1. **Hero** — "Trading Glossary & Terms"
2. **Search/Filter** — Search bar + A-Z index
3. **Terms List** — Alphabetically organized terms with definitions
4. **CTA**

### 9. Contact Page (`/about/contact`)

1. **Hero** — Small hero "We're Here to Help"
2. **Contact Methods** — 3 cards: Live Chat, Email Support, Phone
3. **Contact Form** — Name, Email, Subject, Message, Submit
4. **Office Info** — Address + map placeholder

---

### 10. Legal Pages (`/legal/terms`, `/legal/privacy`)

- Simple prose layout
- Sidebar TOC on desktop
- Sections with headers, paragraphs
- Standard legal content

---

## Component Patterns

### Primary Button

```
bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-lg font-semibold
transition-colors duration-200 inline-flex items-center gap-2
```

### Ghost Button (on dark bg)

```
border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-lg font-semibold
transition-colors duration-200
```

### Section Container

```
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

### Section Padding

```
py-16 md:py-24
```

### Card (on white)

```
bg-white border border-surface-border rounded-xl p-6 shadow-card hover:shadow-card-hover
transition-shadow duration-200
```

### Card (on dark)

```
bg-dark-600 border border-white/10 rounded-xl p-6
```

### Section Heading

```
text-3xl md:text-4xl font-bold text-dark-700  (on light bg)
text-3xl md:text-4xl font-bold text-white     (on dark bg)
```

---

## Responsive Behavior

| Breakpoint          | Changes                                |
| ------------------- | -------------------------------------- |
| Desktop (≥1024px)   | Full mega-menu, multi-column layouts   |
| Tablet (768-1023px) | Hamburger menu, 2-col → 1-col sections |
| Mobile (<768px)     | Single column, stacked nav             |

### Mobile Navigation

#### Hamburger Icon

- **Placement:** Fixed position, right-aligned with 16px margin from edge
- **Position:** `fixed top-4 right-4 z-50`
- **Size:** 24x24px (w-6 h-6), touch target minimum 44x44px
- **Styling:** White icon on transparent/dark background
- **Accessible Label:** `aria-label="Open navigation menu"` / `aria-label="Close navigation menu"`

#### Mobile Menu Container

- **Type:** Full-screen overlay drawer (slides in from right) OR bottom sheet drawer
- **Direction:** Slide-in from right (`translate-x-full` → `translate-x-0`)
- **Backdrop:** Semi-transparent black (`bg-black/60`), backdrop-blur-sm
- **Z-Index:** `z-40` for backdrop, `z-50` for drawer container
- **Width:** 100% viewport width (max-width: 320px for side drawer)
- **Padding:** `p-6` for content, additional safe-area padding for notched devices

#### Mega-Menu Dropdown Behavior

- All mega-menu dropdowns must collapse/convert to accordion-style items
- Each menu category (Trading, Accounts, Education, About) becomes an expandable accordion item
- Accordion header: Category name + chevron icon (rotates 180° when expanded)
- Accordion content: Full list of links without nested dropdowns
- Default state: All accordions collapsed on mobile

#### Animations & Transitions

- **Duration:** 200-300ms for open/close animations
- **Easing:** `ease-out` for open, `ease-in` for close
- **Backdrop:** Fade in/out (`opacity-0` ↔ `opacity-100`), 200ms
- **Drawer:** Slide transform, 300ms ease-out
- **Accordion:** Height animation, 200ms ease-out

#### Close Controls & Behaviors

- **Close Button:** X icon in top-right corner of drawer (`absolute top-4 right-4`)
- **Tap Outside:** Clicking backdrop closes the menu
- **Back Button:** Browser back button should close menu (use History API)
- **ESC Key:** Pressing ESC key closes the menu
- **Link Click:** Selecting any navigation link automatically closes the menu
- **Focus Management:** Trap focus within open drawer, restore focus to trigger on close

---

## Accessibility

- All interactive elements have focus rings (`focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`)
- All color combinations must meet WCAG AA standards (contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text).

**Verification Process:** Before release, the design/QA team must verify all text/background color pairs using a WCAG contrast checker (e.g., WebAIM Contrast Checker, Chrome DevTools). Document results in `ACCESSIBILITY_AUDIT.md` with each color pair, its contrast ratio, and pass/fail status. All pairs must pass WCAG AA before deployment.

- Nav landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`
- Images have descriptive alt text
- Buttons have accessible labels

---

## Risk Warning (Required in Footer)

**Placement:** Full-width horizontal bar below all footer columns and above site copyright. Always visible, never collapsible.

**Visual Specification:**

- **Background Color:** `bg-risk-warning` / `bg-alert-dark` (#2B2B2B) — token class is **mandatory**; the token must exist in the design system. Build/CI validation must fail if `bg-risk-warning` or `bg-alert-dark` is missing or unresolved. Hardcoded fallback `#2B2B2B` is **not permitted** — if the token is absent, the build must error, not silently fall back.

**Design Token Validation:**

- Implement `npm run validate-design-tokens` script that loads design token source (Tailwind config or tokens JSON)
- Script must check for exact token keys `"bg-risk-warning"` and `"bg-alert-dark"`
- Exit with non-zero status if tokens are missing, with error message naming missing tokens
- Integrate into CI pipeline and optional pre-commit/pre-push hooks
- Alternative: Implement as Tailwind custom plugin that throws during compilation rather than fallback
- Validation must NOT allow fallback hex `#2B2B2B` - only exact token matches
- **Text Color:** `#FFFFFF` (white)
- **Font Size:** `12px` / `0.75rem`
- **Font Weight:** `600` (semibold, Inter)
- **Padding:** `12px 16px`
- **Border Radius:** `rounded-sm` (4px, use token from Radius: Compact)
- **Width:** Full-width container (edge-to-edge on mobile, max-w-7xl on desktop)
- **Accessibility:** Option 1 (preferred): Use `<aside aria-labelledby="risk-warning-heading">` with an invisible `<h2 id="risk-warning-heading">Risk Warning</h2>`. Option 2 (fallback when `<aside>` cannot be used): `<div role="complementary" aria-labelledby="risk-warning-heading">`. Do NOT add `role="complementary"` to an existing `<aside>` element — `<aside>` has implicit ARIA role and adding the attribute is redundant.

**Content:**

> "CFD trading involves significant risk of loss and is not suitable for all investors. Please ensure you fully understand the risks involved. ProTraderSim is a simulation platform for educational purposes."

**Color Contrast:** White text (#FFFFFF) on #2B2B2B background meets WCAG AA standard (contrast ratio 15.3:1, verified 2026-04-14 via WCAG Color Contrast Checker). Any changes to these colors must be re-verified using a WCAG contrast checker and documented before deployment. Maintain minimum contrast ratio ≥ 4.5:1 for WCAG AA compliance.

**Responsive Behavior:**

- Desktop/Tablet: Centered within `max-w-7xl mx-auto` container with standard section padding
- Mobile: Full-width with adjusted padding (`px-4 sm:px-6 lg:px-8`)
- Text remains single-line on desktop; may wrap to 2 lines on tablet/mobile
