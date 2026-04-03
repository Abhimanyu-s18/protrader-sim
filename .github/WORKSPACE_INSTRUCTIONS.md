---
name: ProTraderSim Workspace Instructions
description: Master guide for understanding and using the agent framework, skills, and development patterns
---

# ProTraderSim Workspace Instructions

Welcome to **ProTraderSim** — a regulated, multi-asset offshore CFD simulation trading platform. This file is your **master guide** to the workspace structure, specialized AI agents, domain skills, and development workflows.

> **First time here?** Start with the [Developer Onboarding](#onboarding) section below. For specific tasks, jump to [Common Workflows](#common-workflows). For technical deep dives, see [Agent/Skill Integration](#agent-skill-integration).

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [30-Minute Developer Onboarding](#onboarding)
3. [Agent/Skill Integration](#agent-skill-integration)
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)
6. [Architecture Essentials](#architecture-essentials)

---

## Quick Reference

### Running Code

```bash
# Install & start dev environment
pnpm install && pnpm dev          # All apps
pnpm --filter @protrader/api dev  # Just backend
pnpm --filter @protrader/platform dev # Just trading UI

# Database
pnpm db:migrate && pnpm db:seed   # Clean reset
pnpm db:studio                    # Visual browser

# Testing & quality
pnpm test                         # Run all tests
pnpm lint && pnpm typecheck      # Quality checks
pnpm format                       # Auto-format
```

### Environments

| Service              | Local                          | Staging       | Production        |
| -------------------- | ------------------------------ | ------------- | ----------------- |
| API                  | localhost:4000                 | Railway       | AWS ECS eu-west-1 |
| Platform (Trader UI) | localhost:3002                 | Railway       | Railway           |
| Admin                | localhost:3003                 | Railway       | Railway           |
| Auth                 | localhost:3001                 | Railway       | Railway           |
| Database             | PostgreSQL 17 @ localhost:5432 | Supabase (eu) | Supabase (eu)     |
| Cache                | Redis 7 @ localhost:6379       | ElastiCache   | ElastiCache       |

### Financial Precision Rules (NON-NEGOTIABLE)

- **All money**: BIGINT cents (e.g., `$100.50 = 10050n`)
- **All prices**: BIGINT ×100000 (e.g., `1.08500 = 108500n`)
- **Never use**: Decimal, Float, Double, or number types for money
- **Key helpers**: `formatMoney(cents)`, `parseMoney(string)`, `toCents()`, `scalePrice()`

See [bigint-money-handling SKILL](./skills/bigint-money-handling/SKILL.md) for full reference.

---

## 30-Minute Developer Onboarding {#onboarding}

### Phase 1A: Environment (5 min)

1. **Check you have**: Node 18+, pnpm 8+, Docker Desktop

   ```bash
   node --version          # Should be 18.x or 20.x
   pnpm --version         # Should be 8.x or 9.x
   docker --version       # Should be 24.x or higher
   ```

2. **Clone & install**

   ```bash
   cd protrader-sim
   pnpm install           # Creates all workspaces
   docker compose up -d   # PostgreSQL, Redis, Mailhog, Redis Commander
   ```

3. **Verify database**
   ```bash
   pnpm db:migrate        # Apply schema
   pnpm db:seed           # Load sample instruments & staff
   pnpm db:studio         # Open visual browser (should see tables)
   ```

### Phase 1B: Start Dev Servers (5 min)

```bash
# Terminal 1: Start all apps in dev mode
pnpm dev

# Wait for output like:
#   ▲ Next.js 15.0.0
#   - ready started server on 0.0.0.0:3000, url: http://localhost:3000
#   [express] listening on http://localhost:4000
#
# Test endpoints
curl http://localhost:4000/health     # Should return 200
curl http://localhost:3002            # Should show trading platform
```

### Phase 1C: Understand the Architecture (10 min)

```
ProTraderSim = Turborepo Monorepo

apps/          (6 Next.js frontend apps + 1 Express backend)
├── api/              ← Core Express.js server (4000)
├── platform/         ← Trader UI (3002)
├── admin/            ← Admin panel (3003)
├── auth/             ← Auth flows (3001)
├── ib-portal/        ← IB agent portal (3004)
└── web/              ← Public site (3000)

packages/      (Shared code across all apps)
├── db/               ← Prisma schema + migrations
├── types/            ← TypeScript types (MoneyString, PriceString, etc.)
├── utils/            ← Helper functions (formatMoney, parsePrice, etc.)
├── ui/               ← Shared React components (CVA + Tailwind)
├── config/           ← ESLint, TypeScript, Tailwind configs
└── email/            ← React Email templates via Resend
```

**How requests flow:**

```
Trader clicks "Open Position" on platform (3002)
  → Calls POST /api/trades (to 4000)
  → Route handler validates & calls tradeService
  → Service calculates margin, checks risk, opens trade in DB
  → Service publishes position update via Socket.io
  → Trader receives real-time update in browser
```

### Phase 1D: Key Files to Know (5 min)

| File                               | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `CLAUDE.md`                        | Developer identity & code preferences (you reading it) |
| `copilot-instructions.md`          | Project context for AI agents                          |
| `AGENTS.md`                        | Registry of 14 specialized agents                      |
| `QUICK_REFERENCE.md`               | Quick agent activation guide                           |
| `agents/*.agent.md`                | Individual agent system prompts                        |
| `skills/*/SKILL.md`                | Domain-specific best practices                         |
| `packages/db/prisma/schema.prisma` | Database schema (the source of truth)                  |
| `apps/api/src/lib/calculations.ts` | All financial math (CRITICAL)                          |
| `apps/api/src/routes/`             | API endpoints                                          |
| `apps/api/src/services/`           | Business logic (auth, trades, positions, etc.)         |

---

## Agent/Skill Integration {#agent-skill-integration}

### The Agent Ecosystem

ProTraderSim has **14 specialized AI agents**, each with deep expertise. They're designed to work together via an **Orchestrator Agent** that routes work:

```
Orchestrator (coordinator)
├── Schema Agent          → Database design & migrations
├── Architect Agent      → System design & contracts
├── Coding Agent         → Express.js backend implementation
├── Frontend Agent       → Next.js 15 React components
├── UI/UX Designer       → Interaction flows & wireframes
├── Test Agent           → Unit & integration tests
├── Security Agent       → Auth, KYC, payment security
├── Code Review Agent    → PR reviews & quality gates
├── Debug Agent          → Diagnosis & root cause
├── Performance Agent    → Latency & throughput optimization
├── DevOps Agent         → Deployment & CI/CD
├── Documentation Agent  → READMEs, API docs, changelogs
├── Research Agent       → Vendor evaluation, regulatory research
└── [Helper agents]      → Smaller support roles
```

### How to Invoke Agents

**For complex/multi-step work:** Start with **Orchestrator**

```
→ Prompt: "Build the trader KYC flow — document upload, admin review, approval/rejection."
→ Orchestrator: Decomposes into subtasks, routes to Schema → Security → Coding → Frontend → Test
```

**For focused work:** Use the specialist directly

```
→ Prompt: "Optimize the positions endpoint — it's returning in 800ms, target is 100ms"
→ Performance Agent: Profiles queries, adds indexes, optimizes Socket.io broadcasting
```

### Skills vs. Agents

**Skills** = Best practices & patterns for a domain (stored in `skills/*/SKILL.md`)

- `database-schema-design` — How to design tables, use BIGINT, index strategy
- `financial-calculations` — P&L, margin, leverage formulas with BigInt
- `api-route-creation` — Layering rules, validation, error handling
- `socket-io-real-time` — Room management, authentication, broadcasting
- `trading-calculations` — Position sizing, margin calls, stop-out
- `kyc-compliance-flow` — Document handling, PII, file storage
- `payment-integration` — Deposits, withdrawals, webhook signatures
- `bigint-money-handling` — Converting dollars↔cents, precision pitfalls
- `rbac-implementation` — Role hierarchy, permission checks
- `orm-query-optimization` — N+1 detection, index strategy, Prisma patterns
- `trading-ui-components` — Charts, tables, order forms
- `state-management-trading` — Zustand stores, React Query, Socket.io sync

**Agents** = Coordinators with deep context who APPLY skills to your code

When you invoke an agent, they automatically load the relevant skills for your task.

### Agent Selection Matrix

| I Want To...                    | → Agent              | Skill(s) Used                                                        |
| ------------------------------- | -------------------- | -------------------------------------------------------------------- |
| Add a new API endpoint          | Coding               | api-route-creation, rbac-implementation                              |
| Create a database table         | Schema               | database-schema-design                                               |
| Fix a financial calculation bug | Debug                | financial-calculations, trading-calculations, bigint-money-handling  |
| Build a trades page             | Frontend             | trading-ui-components, state-management-trading, socket-io-real-time |
| Speed up a slow endpoint        | Performance          | orm-query-optimization, socket-io-real-time                          |
| Handle deposits/withdrawals     | Coding + Security    | payment-integration, bigint-money-handling                           |
| Design the KYC flow             | Architect + Security | kyc-compliance-flow                                                  |
| Write comprehensive tests       | Test                 | (reads the implementation, applies all relevant skills)              |

---

## Common Workflows {#common-workflows}

### Workflow 1: Add a New API Endpoint

```
Scenario: Traders need a "close all positions" endpoint
```

**Who**: Coding Agent + Test Agent

**Steps**:

1. Invoke **Coding Agent** with:

   ```
   "Implement POST /api/trades/close-all
   - Authenticate as trader (TRADER role)
   - Close all OPEN trades for that trader
   - Calculate final P&L for each position
   - Return array of closed trades with final P&L
   - Use closedBy = 'USER'"
   ```

2. Coding Agent reads relevant skills:
   - `api-route-creation` (endpoint structure)
   - `financial-calculations` (final P&L)
   - `rbac-implementation` (TRADER role check)

3. Coding Agent delivers:
   - `apps/api/src/routes/trades.ts` — updated with POST /trades/close-all
   - `apps/api/src/services/trade.service.ts` — new closeAllTrades() method
   - Input validation schema

4. Invoke **Test Agent** to cover:
   - Happy path: close 3 open positions
   - Edge case: no open positions
   - Edge case: one position already closed
   - Security: non-trader cannot close others' positions

**Related files to lock:** `packages/types/index.ts` (API response shape) — agree on this first

---

### Workflow 2: Optimize a Slow Database Query

```
Scenario: "GET /api/positions returns in 1.2s, target: <200ms, with 50 open trades"
```

**Who**: Performance Agent

**Invoke**:

```
"The positions endpoint is slow. Traders open it, see ~50 positions with live prices.
Current: 1.2s, Target: 200ms.

Endpoint: GET /api/positions
Database: Prisma query fetches trades + instruments + swap rates + current prices (from Redis)
Socket.io: Broadcasts price updates when any instrument updates

ProfileFirst, then optimize."
```

**Performance Agent will**:

1. Profile queries (find N+1 patterns, missing indexes)
2. Run explain plans on PostgreSQL
3. Check Redis cache hits
4. Suggest fixes (e.g., add index on `trades.user_id` + `status='OPEN'`)
5. Deliver optimized version + benchmark proof

---

### Workflow 3: Build a Trader Feature (End-to-End)

```
Scenario: "Traders want a Watchlist — save/favorite instruments, quick access"
```

**Who**: Orchestrator Agent (will delegate to 4+ agents)

**Invoke**:

```
"Build the watchlist feature:
- Traders can add/remove instruments to a watchlist
- Watchlists are personal (per user)
- Show watchlist on dashboard with live prices
- Persist in database
- Include add/remove/list API endpoints & UI components"
```

**Orchestrator decomposes**:

```
SUBTASK-1: Schema → Add watchlist_items table
    (user_id, instrument_id, added_at, PK, FKs)

SUBTASK-2: Coding → Add 3 API endpoints
    POST /api/watchlist (add)
    DELETE /api/watchlist/:id (remove)
    GET /api/watchlist (list with live prices via Socket.io)

SUBTASK-3: Frontend → Watchlist panel component
    Display list with symbols, prices, changePercent
    Subscribe to prices via Socket.io
    Add/remove buttons

SUBTASK-4: Security → RBAC check
    Confirm only trader can access own watchlist

SUBTASK-5: Test → Unit & integration tests
    Add item, remove item, list, auth boundaries

SUBTASK-6: Docs → Update API docs
```

---

## Troubleshooting {#troubleshooting}

### I'm getting "Cannot read properties of undefined (reading 'balance')"

**Diagnosis**: A service is trying to access user data without checking it exists first.

**Common Causes**:

- User ID from JWT is invalid or missing
- User deleted from database but token still valid
- Middleware didn't set `req.user` properly

**Fix**:

1. Check auth middleware: `apps/api/src/middleware/auth.ts`
2. Verify JWT payload includes `userId`
3. Add null checks in services:
   ```ts
   const user = await prisma.user.findUnique({ where: { id: userId } })
   if (!user) throw new ApiError(404, 'User not found')
   ```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more.

### Financial calculations are off by a few cents

**Diagnosis**: Incorrect BigInt scaling or order of operations.

**Common Causes**:

- Division happens before multiplication (loses precision)
- Mixing PRICE_SCALE and BPS_SCALE incorrectly
- Number type creeping in (should always use BigInt)

**Fix**:

1. Check `apps/api/src/lib/calculations.ts` — this is the source of truth
2. Verify: division is ALWAYS last
3. Read [financial-calculations SKILL](skills/financial-calculations/SKILL.md)

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more.

### Socket.io connections keep dropping

**Diagnosis**: Price feed or user subscription issues.

**Common Causes**:

- JWT expired, socket rejects at handshake
- Client unsubscribing before resubscribing
- Server broadcasting to wrong rooms

**Fix**:

1. Check client subscription logic: `apps/platform/src/hooks/usePriceSubscription.ts`
2. Check room names match: `socket.join('prices:EURUSD')`
3. Verify auth middleware: `socket.handshake.auth.token`

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) & [socket-io-real-time SKILL](skills/socket-io-real-time/SKILL.md).

---

## Architecture Essentials {#architecture-essentials}

### Critical Rules (Memorize These)

| Rule                                  | Why                                           |
| ------------------------------------- | --------------------------------------------- |
| **All money = BIGINT cents**          | Financial precision — no rounding errors      |
| **All prices = BIGINT ×100000**       | Consistent scaling across platform            |
| **Business logic in services/**       | Testable, reusable, not coupled to HTTP       |
| **Routes only handle HTTP**           | Single responsibility, easier testing         |
| **Never use Decimal/Float for money** | They have precision rounding errors           |
| **Leverage must never exceed max**    | Regulatory compliance (FSC/FSA)               |
| **Stop-out = 50% margin level**       | Automatic position close at risk threshold    |
| **All user data scoped to requester** | RBAC prevents trader A seeing trader B's data |

### Key Concepts

**Margin** = Collateral locked to hold a position

```
margin = (units × contractSize × openRate × 100) / (leverage × PRICE_SCALE)
```

**Equity** = Balance + unrealizedP&L

```
equity = balance + unrealizedP&L
```

**Margin Level** = Equity / UsedMargin (null if no open positions)

- > 100% = Safe
- 50%-100% = Margin call warning
- <50% = Stop out (positions auto-closed)

**Trade Close Reasons**: USER, STOP_LOSS, TAKE_PROFIT, TRAILING_STOP, MARGIN_CALL, STOP_OUT, ADMIN, EXPIRED

See [PTS-CALC-001_Trading_Calculations.md](../docs/Core Technical Specifications/PTS-CALC-001_Trading_Calculations.md) for full formulas.

### Database Schema Overview

**Core tables**:

- `users` — Traders with balance, margin, etc.
- `trades` — Open/closed positions, entry/exit prices, P&L
- `instruments` — EUR/USD, AAPL, etc. with leverage, spread, contract size
- `deposits` / `withdrawals` — Payment history
- `ledger_transactions` — Individual account movements (for audit)
- `ib_commissions` — IB agent earnings per trade closed

**Key design**:

- Balance/equity are **never stored** — computed from `ledger_transactions`
- All money in **BIGINT cents**
- All prices in **BIGINT ×100000**
- Instrument fields: `contractSize`, `leverage`, `spreadPips`, `pipDecimalPlaces`, `marginCallBps`, `stopOutBps`

See [packages/db/prisma/schema.prisma](../packages/db/prisma/schema.prisma) for complete schema.

---

## Documentation Index

| Document                                                   | Purpose                          | Audience                   |
| ---------------------------------------------------------- | -------------------------------- | -------------------------- |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md)                   | 1-page agent selector            | All developers             |
| [AGENTS.md](AGENTS.md)                                     | 14-agent registry                | All developers             |
| [AGENT_SKILLS_INTEGRATION.md](AGENT_SKILLS_INTEGRATION.md) | How skills work with agents      | Advanced developers        |
| [COMMON_WORKFLOWS.md](COMMON_WORKFLOWS.md)                 | Step-by-step task guides         | Feature developers         |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md)                   | Diagnosis & fixes                | Debugging developers       |
| [copilot-instructions.md](copilot-instructions.md)         | Project context for AI           | AI agents                  |
| [CLAUDE.md](../CLAUDE.md)                                  | Developer identity & preferences | Krishan + all contributors |

---

## Need Help?

- **"Where do I start?"** → [30-Minute Onboarding](#onboarding)
- **"How do agents work?"** → [Agent/Skill Integration](#agent-skill-integration)
- **"I'm stuck on a bug"** → [Troubleshooting](#troubleshooting)
- **"How do I build X?"** → [Common Workflows](#common-workflows)
- **"What are the rules?"** → [Architecture Essentials](#architecture-essentials)

**Or**:

- Ask the **Explore Agent** for codebase Q&A (quick lookup)
- Ask **Orchestrator Agent** for multi-step features
- Ask specialized agents for focused work (Coding, Frontend, Security, etc.)
