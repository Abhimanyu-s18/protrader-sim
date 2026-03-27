# ProTraderSim

**Multi-Asset Offshore CFD Simulation Trading Platform**

Regulated under FSC Mauritius + FSA Seychelles | IB (Introducing Broker) Model

## Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 15 (App Router) + TypeScript |
| Backend | Express.js + Socket.io |
| Database | PostgreSQL 17 (Supabase, eu-west-1) |
| Cache | Redis 7 (ElastiCache) |
| Queue | BullMQ |
| Market Data | Twelve Data |
| Payments | NowPayments |
| Storage | Cloudflare R2 |
| Email | Resend |
| ORM | Prisma |

## Apps

| App | Port | Description |
|-----|------|-------------|
| `web` | 3000 | Public marketing site |
| `auth` | 3001 | Login / Register / KYC |
| `platform` | 3002 | Trading dashboard |
| `admin` | 3003 | Back-office admin panel |
| `ib-portal` | 3004 | IB Agent / Team Leader portal |
| `api` | 4000 | REST API + Socket.io |

## Quick Start

```bash
# Prerequisites: Node.js >=20, pnpm >=9, Docker

# 1. Clone and install
git clone https://github.com/YOUR_ORG/protrader-sim.git
cd protrader-sim
pnpm install

# 2. Start local infrastructure
docker compose up -d

# 3. Set up environment
cp .env.example apps/api/.env.local
# Fill in all values in apps/api/.env.local

# 4. Push database schema
cd packages/db
pnpm db:generate
pnpm db:migrate

# 5. Seed instruments and staff
pnpm db:seed

# 6. Start all apps
pnpm dev
```

## Database

- **Project**: protrader-sim (Supabase eu-west-1)
- **Project ID**: zmzhhwrhrsjwqrremguv
- **Tables**: 17 production tables + computed views
- **Instruments**: 60 (Forex: 40, Stocks: 15, Indices: 3, Commodities: 2, Crypto: 10)

## Key Architectural Decisions

- All monetary values stored as **BIGINT cents** (never Decimal/Float)
- All prices stored as **BIGINT scaled ×100000** (5 decimal places)
- Balance is **never stored** — always computed from `ledger_transactions`
- 4-role staff hierarchy: SUPER_ADMIN → ADMIN → IB_TEAM_LEADER → AGENT
- IB commissions tracked per trade in `ib_commissions` table

## Documentation

Full Master Technical Specification (MTS) covers architecture, all 14 trading formulas,
API catalogue (70+ endpoints), KYC compliance (SOP-COMP-001), deployment, and sprint plan.
