# ProTraderSim

## PTS-ARCH-001 — System Architecture & Deployment

**Version 1.0 | March 2026 | CONFIDENTIAL**
_Multi-Asset Offshore CFD Simulation Trading Platform_

---

## 1. Locked Technology Decisions

All decisions below are permanently locked. Changes require CTO sign-off and full impact assessment.

| Domain           | Decision                                                    | Rationale                                                   |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Frontend         | Next.js 15 (App Router) + TypeScript                        | SSR, file-based routing, ISR for public pages               |
| Backend          | Node.js + Express.js                                        | Lightweight, rich middleware ecosystem                      |
| ORM              | Prisma                                                      | Type-safe queries, migration management, PostgreSQL support |
| Database         | PostgreSQL 16+                                              | ACID compliance, JSONB, full-text search, proven at scale   |
| Monetary Storage | BIGINT (cents) for money; BIGINT scaled integers for prices | Eliminates floating-point rounding errors                   |
| Primary Keys     | BIGINT auto-increment (GENERATED ALWAYS AS IDENTITY)        | 8-byte integer vs 16-byte UUID on high-frequency joins      |
| Cache            | Redis 7+ (ElastiCache in production)                        | Price cache, session store, BullMQ backend, pub/sub         |
| Message Queue    | BullMQ (Redis-backed)                                       | Rollover jobs, alert monitoring, KYC notifications          |
| Real-time        | Socket.io 4+                                                | Rooms per symbol, per user, proven scaling pattern          |
| Market Data      | Twelve Data (production only)                               | Licensed, covers all 60 instruments, WebSocket + REST       |
| File Storage     | Cloudflare R2                                               | S3-compatible, zero egress fees, private bucket for KYC     |
| Email            | Resend                                                      | Modern API, React Email templates, excellent deliverability |
| Monorepo         | Turborepo + pnpm workspaces                                 | Shared packages, build caching, independent deployments     |
| State Management | Zustand (client) + TanStack Query (server)                  | Minimal boilerplate, correct separation of concerns         |
| Dev/Staging      | Railway                                                     | Zero-config deployments, environment management             |
| Production       | AWS ECS (Fargate) + RDS + ElastiCache (eu-west-1)           | Regulatory data residency in EU                             |
| Charts           | TradingView Charting Library (self-hosted)                  | Industry standard, 100+ indicators, drawing tools           |
| Payments         | NowPayments.io                                              | Crypto-only deposits/withdrawals, webhook support           |

### Prohibited Technologies (Never Use)

| Prohibited                              | Reason                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Finnhub                                 | Insufficient coverage for all 60 instruments across 5 asset classes                                |
| YFinance / Yahoo Finance                | Scraping library; not a licensed data provider; Terms of Service prohibit commercial financial use |
| Supabase Edge Functions (as backend)    | Cannot maintain persistent WebSocket connections or long-running BullMQ workers                    |
| Fastify                                 | Different middleware model from Express; PTS is Express throughout                                 |
| Python services                         | Separate runtime requiring its own Docker image and pipeline; all services run Node.js             |
| DECIMAL / FLOAT / DOUBLE / NUMERIC      | Floating-point produces rounding errors on financial calculations                                  |
| Vite + React 18 (as frontend framework) | PTS uses Next.js 15 App Router with SSR and multi-domain middleware                                |

---

## 2. Monorepo Structure

```
protrader-sim/
  apps/
    web/           # Public marketing site (Next.js 15, SSR/SSG)
    auth/          # Login, Register, KYC wizard (Next.js 15)
    platform/      # Authenticated trading dashboard (Next.js 15)
    admin/         # Back-office admin panel (Next.js 15)
    ib-portal/     # IB Team Leader + Agent portal (Next.js 15)
    api/           # Express.js REST API + Socket.io server

  packages/
    ui/            # Shared React component library (shadcn/ui base)
    db/            # Prisma schema, migrations, generated client, seed
    config/        # Shared ESLint, TypeScript, Tailwind configs
    types/         # Shared TypeScript type definitions
    utils/         # Shared utility functions (financial calcs, formatters)
    email/         # React Email templates (Resend)
```

---

## 3. Application Routing Architecture

| App       | Domain              | Purpose & Auth                                                                 |
| --------- | ------------------- | ------------------------------------------------------------------------------ |
| web       | www.protrader.com   | Public. No auth. Landing page, legal pages, asset info, register/login CTAs.   |
| auth      | auth.protrader.com  | Public + Auth flows. Login, Register, Forgot Password, KYC Wizard. Issues JWT. |
| platform  | app.protrader.com   | Protected. Requires valid JWT + KYC approved. Trading dashboard.               |
| admin     | admin.protrader.com | Protected. Requires admin JWT with role: SUPER_ADMIN or ADMIN.                 |
| ib-portal | ib.protrader.com    | Protected. Requires IB JWT with role: IB_TEAM_LEADER or AGENT.                 |
| api       | api.protrader.com   | All REST endpoints + Socket.io. JWT validated on every request.                |

---

## 4. Four-Role Staff Hierarchy

| Role           | DB Enum        | Capabilities                                                                                            |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| Super Admin    | SUPER_ADMIN    | Full system access. System settings. Instrument configuration. Creates Admins and IB Team Leaders.      |
| Admin          | ADMIN          | User management. KYC review. Deposit/withdrawal processing. Reporting. Cannot change system settings.   |
| IB Team Leader | IB_TEAM_LEADER | Manages Agent network. Views team commissions. Assigns traders to agents. Views aggregated network P&L. |
| Agent          | AGENT          | Manages own trader clients. Views trader list and activity. Earns per-trade commissions.                |

Traders are not staff. Traders have their own `users` table with role='TRADER' in the JWT.

---

## 5. Production Infrastructure (AWS eu-west-1)

```
[Cloudflare CDN]
     |
[ALB — Application Load Balancer]
     |
     +---> [ECS Fargate: api (2–4 tasks, auto-scale)]
     |          |
     |          +---> [RDS PostgreSQL 16 (Multi-AZ, db.t3.medium)]
     |          |
     |          +---> [ElastiCache Redis 7 (cache.t3.micro)]
     |
     +---> [ECS Fargate: web / auth / platform / admin / ib-portal]

[Cloudflare R2]  <--- KYC document uploads (presigned URL, private bucket)

[Twelve Data WebSocket] ---> [api price feed worker]
     ---> [Redis price cache] ---> [Socket.io broadcast]

[NowPayments webhook] ---> [api /webhooks/nowpayments]
     ---> [BullMQ deposit-confirm queue]

[BullMQ workers (ECS)] ---> rollover-job, alert-monitor,
                            kyc-reminder, report-gen,
                            inactivity-check
```

### ECS Service Specifications

| Service   | vCPU     | RAM  | Min Tasks | Max Tasks | Scale Trigger |
| --------- | -------- | ---- | --------- | --------- | ------------- |
| api       | 1 vCPU   | 2 GB | 2         | 8         | 70% CPU       |
| web       | 0.5 vCPU | 1 GB | 1         | 3         | 80% CPU       |
| auth      | 0.5 vCPU | 1 GB | 1         | 3         | 80% CPU       |
| platform  | 0.5 vCPU | 1 GB | 1         | 4         | 70% CPU       |
| admin     | 0.5 vCPU | 1 GB | 1         | 2         | 80% CPU       |
| ib-portal | 0.5 vCPU | 1 GB | 1         | 2         | 80% CPU       |

### Supporting Services

- **ALB**: Routes traffic by domain name to ECS services
- **RDS**: Multi-AZ PostgreSQL 16. Automated daily snapshots, 7-day retention
- **ElastiCache Redis 7**: Used for price cache, sessions, BullMQ
- **ECR**: Docker images stored and pulled by ECS tasks
- **Secrets Manager**: API keys, JWT private key, DB credentials
- **CloudWatch**: Container logs, metrics, alarms. Alert on error rate > 1%, latency > 2s

---

## 6. Security Architecture

### 6.1 Transport Security

- All traffic over HTTPS (TLS 1.2 minimum, TLS 1.3 preferred)
- HSTS header enforced: `max-age=31536000; includeSubDomains`
- Cloudflare proxies all public-facing domains — DDoS protection at edge
- WebSocket connections over WSS (TLS-encrypted)

### 6.2 Input Validation & Injection Prevention

- All API inputs validated with Zod schema before any processing
- Prisma ORM uses parameterized queries — SQL injection impossible by design
- File uploads: MIME type validated from file bytes (not filename extension)
- File names sanitized: strip path traversal characters, replace with UUID
- HTML input: DOMPurify on client, strip-tags on server for user-provided content
- Max request body: 10 MB for file uploads, 100 KB for JSON endpoints

### 6.3 Authentication Security

- Passwords: bcrypt with cost factor 12
- Password requirements: min 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
- Brute force protection: 5 failed logins → account locked for 15 minutes
- Refresh tokens: HttpOnly + Secure + SameSite=Strict cookies
- CSRF protection: custom header `X-Requested-With` on state-changing requests
- JWT private key: stored in AWS Secrets Manager, rotated annually
- No JWT in localStorage: eliminates XSS token theft vector

### 6.4 Rate Limiting

| Endpoint Group                    | Limit          | Window                             |
| --------------------------------- | -------------- | ---------------------------------- |
| POST /v1/auth/login               | 5 attempts     | 15 minutes per IP                  |
| POST /v1/auth/register            | 10 attempts    | 1 hour per IP                      |
| POST /v1/auth/forgot-password     | 3 attempts     | 1 hour per IP                      |
| POST /v1/trades                   | 30 per minute  | Per user                           |
| GET /v1/instruments/:symbol/price | 120 per minute | Per user (use WebSocket instead)   |
| POST /v1/webhooks/nowpayments     | Unlimited      | IP whitelist: NowPayments IPs only |
| All other authenticated endpoints | 100 per minute | Per user                           |

### 6.5 Data Protection

- KYC documents: stored in Cloudflare R2 private bucket — never publicly accessible
- Signed URLs for document access: 15-minute expiry, generated per admin request
- Sensitive fields in logs: `password_hash`, `refresh_token`, `wallet_address` redacted
- PII in logs: email and phone masked (first 3 chars + \*\*\* + domain)
- Database encryption at rest: AWS RDS AES-256
- Database encryption in transit: all connections require SSL
- API keys: stored in AWS Secrets Manager

### 6.6 Security Headers (all responses)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tradingview.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 7. Environment Strategy

| Environment | Platform             | Purpose                                                   |
| ----------- | -------------------- | --------------------------------------------------------- |
| Development | Local Docker Compose | Full stack local. Seeded test data. No real crypto.       |
| Staging     | Railway              | Production mirror. Real Twelve Data. NowPayments sandbox. |
| Production  | AWS ECS (eu-west-1)  | Live. Real payments. Monitored. Auto-scaling.             |

---

## 8. CI/CD Pipeline (GitHub Actions)

1. Push to `main` branch triggers pipeline
2. Step 1: Type check (`tsc --noEmit` on all packages)
3. Step 2: Lint (ESLint on all packages)
4. Step 3: Unit + integration tests (Jest)
5. Step 4: Build Docker images for changed apps
6. Step 5: Push images to ECR with commit SHA tag
7. Step 6: Deploy to staging (Railway) — automatic
8. Step 7: Run E2E tests against staging (Playwright)
9. Step 8: Manual approval gate → deploy to production ECS
10. Step 9: Post-deploy health check — verify all `/health` endpoints return 200

**Deploy-blocking criteria (any failure blocks production deploy):**

| Metric                               | Critical Threshold |
| ------------------------------------ | ------------------ |
| First Contentful Paint (FCP)         | > 3000ms           |
| Largest Contentful Paint (LCP)       | > 4000ms           |
| First Input Delay (FID)              | > 300ms            |
| Cumulative Layout Shift (CLS)        | > 0.25             |
| Chart initial render                 | > 1000ms           |
| WebSocket latency (end-to-end)       | > 150ms            |
| Order execution (UI to confirmation) | > 500ms            |
| Error rate (5xx / total requests)    | > 1%               |

---

## 9. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...                     # From Secrets Manager

# Cache
REDIS_URL=redis://...                             # ElastiCache endpoint

# Auth
JWT_PRIVATE_KEY=...                               # RS256 PEM, from Secrets Manager
JWT_PUBLIC_KEY=...                                # From Secrets Manager

# Market Data
TWELVE_DATA_API_KEY=...                           # From Secrets Manager

# Payments
NOWPAYMENTS_API_KEY=...                           # From Secrets Manager
NOWPAYMENTS_IPN_SECRET=...                        # Webhook HMAC signature key

# Email
RESEND_API_KEY=...                                # From Secrets Manager

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=protrader-kyc-docs

# App URLs
NEXT_PUBLIC_API_URL=https://api.protrader.com
NEXT_PUBLIC_WS_URL=wss://api.protrader.com
NEXT_PUBLIC_APP_URL=https://app.protrader.com

# Feature Flags
NODE_ENV=production                               # development | staging | production
```

---

_ProTraderSim — PTS-ARCH-001 — System Architecture & Deployment — v1.0 — March 2026_
