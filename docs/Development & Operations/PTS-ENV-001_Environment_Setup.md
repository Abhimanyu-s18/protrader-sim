# ProTraderSim
## PTS-ENV-001 — Environment Setup Guide
**Version 1.0 | March 2026 | CONFIDENTIAL**
*Local development, Railway staging, and AWS production setup*

---

## Prerequisites

Before starting, confirm you have the following installed:

| Tool | Required Version | Install |
|---|---|---|
| Node.js | 20.x LTS or higher | https://nodejs.org |
| pnpm | 9.x or higher | `npm install -g pnpm` |
| Docker Desktop | Latest stable | https://docker.com |
| Git | Any recent version | https://git-scm.com |

Verify your installation:
```bash
node --version     # Should print v20.x.x or higher
pnpm --version     # Should print 9.x.x or higher
docker --version   # Should print Docker version 25.x or higher
git --version      # Any version
```

---

## 1. Initial Repository Setup

```bash
# Clone the repository
git clone https://github.com/[your-org]/protrader-sim.git
cd protrader-sim

# Install all dependencies across all packages and apps
pnpm install

# Confirm Turborepo is working
pnpm turbo --version
```

---

## 2. Local Environment Variables

Each app and the root needs its own `.env` file. The repository includes `.env.example` templates for every location. Copy them:

```bash
# Root level
cp .env.example .env

# Each app
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/auth/.env.example apps/auth/.env.local
cp apps/platform/.env.example apps/platform/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/ib-portal/.env.example apps/ib-portal/.env.local

# Database package
cp packages/db/.env.example packages/db/.env
```

### Root `.env` (shared by all services via Turborepo)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/protrader_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT — generate keys using the script in step 3
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Market Data (development — use Twelve Data dev key)
TWELVE_DATA_API_KEY="your_twelve_data_api_key"

# Payments (use NowPayments sandbox in development)
NOWPAYMENTS_API_KEY="your_nowpayments_sandbox_key"
NOWPAYMENTS_IPN_SECRET="your_sandbox_ipn_secret"

# Email (use Resend dev key — sends to your verified test email only)
RESEND_API_KEY="re_your_resend_api_key"

# Storage (use Cloudflare R2 dev bucket)
CLOUDFLARE_R2_ACCOUNT_ID="your_account_id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your_access_key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your_secret_key"
CLOUDFLARE_R2_BUCKET_NAME="protrader-kyc-docs-dev"

# App URLs (local development)
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3002"

# Environment
NODE_ENV="development"
```

### `apps/api/.env.local`

```bash
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/protrader_dev"
REDIS_URL="redis://localhost:6379"
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
TWELVE_DATA_API_KEY="..."
NOWPAYMENTS_API_KEY="..."
NOWPAYMENTS_IPN_SECRET="..."
RESEND_API_KEY="..."
CLOUDFLARE_R2_ACCOUNT_ID="..."
CLOUDFLARE_R2_ACCESS_KEY_ID="..."
CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
CLOUDFLARE_R2_BUCKET_NAME="protrader-kyc-docs-dev"
CORS_ORIGINS="http://localhost:3000,http://localhost:3002,http://localhost:3003,http://localhost:3004"
```

### `apps/web/.env.local`

```bash
PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

### `apps/auth/.env.local`

```bash
PORT=3005
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3002"
```

### `apps/platform/.env.local`

```bash
PORT=3002
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

### `apps/admin/.env.local`

```bash
PORT=3003
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### `apps/ib-portal/.env.local`

```bash
PORT=3004
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 3. Generating JWT Keys (RS256)

Run this once per environment. Store the output in your `.env` files and in AWS Secrets Manager for production.

```bash
# Generate RSA private key
openssl genrsa -out jwt_private.pem 2048

# Derive public key from private key
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

# Print in single-line format for .env files (replace newlines with \n)
cat jwt_private.pem | tr '\n' '|' | sed 's/|/\\n/g'
cat jwt_public.pem  | tr '\n' '|' | sed 's/|/\\n/g'
```

Copy the outputs into `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in your `.env` files.

> **Never commit JWT keys to Git.** They must only exist in `.env` files (which are in `.gitignore`) and in AWS Secrets Manager.

---

## 4. Starting Local Services with Docker Compose

The `docker-compose.yml` at the root starts PostgreSQL and Redis locally.

```bash
# Start PostgreSQL and Redis in the background
docker compose up -d

# Confirm both services are running
docker compose ps

# Expected output:
# protrader-postgres   running   0.0.0.0:5432->5432/tcp
# protrader-redis      running   0.0.0.0:6379->6379/tcp
```

### docker-compose.yml reference

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: protrader-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: protrader_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: protrader-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
```

---

## 5. Database Setup

```bash
# Navigate to the database package
cd packages/db

# Generate Prisma client from the schema
pnpm prisma generate

# Run all migrations to create the database tables
pnpm prisma migrate dev --name init

# Seed the database with all 60 instruments, swap rates, and test data
pnpm prisma db seed

# Verify tables were created
pnpm prisma studio
# Opens a browser UI at http://localhost:5555 to browse your database
```

### Resetting the database (development only)

```bash
# Drop all tables and re-run migrations and seed
pnpm prisma migrate reset
# When prompted: type 'y' to confirm
```

---

## 6. Starting All Applications

```bash
# From the repository root — starts ALL apps in parallel
pnpm dev

# This runs the Turborepo dev pipeline:
# - apps/api       → http://localhost:3001
# - apps/web       → http://localhost:3000
# - apps/auth      → http://localhost:3005
# - apps/platform  → http://localhost:3002
# - apps/admin     → http://localhost:3003
# - apps/ib-portal → http://localhost:3004
```

To start individual apps:

```bash
# API only
cd apps/api && pnpm dev

# Platform frontend only
cd apps/platform && pnpm dev

# With Turborepo (starts app + its dependencies only)
pnpm turbo dev --filter=@protrader/api
pnpm turbo dev --filter=@protrader/platform
```

---

## 7. Running Tests

```bash
# Run all tests across all packages
pnpm test

# Run tests for a specific package
pnpm turbo test --filter=@protrader/api
pnpm turbo test --filter=@protrader/utils

# Run with coverage report
pnpm test -- --coverage

# Run a specific test file
cd apps/api && pnpm jest src/services/trading.test.ts

# Run E2E tests (requires all apps running)
cd apps/platform && pnpm playwright test
```

---

## 8. Useful Development Commands

```bash
# Type-check all packages (same as CI)
pnpm typecheck

# Lint all packages (same as CI)
pnpm lint

# Format all files with Prettier
pnpm format

# Build all apps for production
pnpm build

# View Prisma schema
cd packages/db && pnpm prisma studio

# Connect to local PostgreSQL
docker exec -it protrader-postgres psql -U postgres -d protrader_dev

# Connect to local Redis
docker exec -it protrader-redis redis-cli

# View all Turborepo tasks
pnpm turbo run --dry-run
```

---

## 9. Railway Staging Setup

Railway is used for the staging environment. Each app runs as a separate Railway service connected to shared PostgreSQL and Redis add-ons.

### One-time setup

1. Create a Railway account and project: `protrader-sim-staging`
2. Install Railway CLI: `npm install -g @railway/cli`
3. Log in: `railway login`
4. Link project: `railway link` (from the repo root)

### Services to create in Railway

Create one service for each app, plus the add-ons:

| Service Name | Source | Start Command |
|---|---|---|
| protrader-api | apps/api | `node dist/index.js` |
| protrader-web | apps/web | `node .next/standalone/server.js` |
| protrader-auth | apps/auth | `node .next/standalone/server.js` |
| protrader-platform | apps/platform | `node .next/standalone/server.js` |
| protrader-admin | apps/admin | `node .next/standalone/server.js` |
| protrader-ib-portal | apps/ib-portal | `node .next/standalone/server.js` |
| PostgreSQL | Railway add-on | — |
| Redis | Railway add-on | — |

### Railway environment variables

In Railway, set the same variables as your root `.env` but use production-appropriate values:
- `NODE_ENV=staging`
- `DATABASE_URL` — from Railway PostgreSQL add-on (auto-injected)
- `REDIS_URL` — from Railway Redis add-on (auto-injected)
- `NOWPAYMENTS_API_KEY` — NowPayments sandbox key
- All other keys identical to production except NowPayments (use sandbox)

### Deploy to staging

```bash
# Deploy from main branch (automatic via GitHub Actions)
git push origin main

# Manual deploy
railway up --service protrader-api
```

---

## 10. AWS Production Setup

Production runs on AWS ECS (Fargate) in the eu-west-1 region.

### Prerequisites

- AWS CLI installed and configured with appropriate IAM permissions
- ECR repositories created for each app
- ECS cluster `protrader-prod` created
- RDS PostgreSQL 16 instance provisioned (Multi-AZ, db.t3.medium)
- ElastiCache Redis 7 cluster provisioned (cache.t3.micro)
- Secrets Manager secrets created for all API keys and JWT keys

### ECR repository names

```
protrader-sim/api
protrader-sim/web
protrader-sim/auth
protrader-sim/platform
protrader-sim/admin
protrader-sim/ib-portal
```

### Building and pushing Docker images

```bash
# Authenticate with ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin \
  {AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com

# Build and push (example for api service)
docker build -f apps/api/Dockerfile -t protrader-sim/api:$(git rev-parse --short HEAD) .
docker tag protrader-sim/api:latest \
  {AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/protrader-sim/api:$(git rev-parse --short HEAD)
docker push {AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/protrader-sim/api:$(git rev-parse --short HEAD)
```

GitHub Actions handles this automatically on merge to `main`. Manual pushes should only be needed for emergency hotfixes.

### Production environment variables

In ECS task definitions, environment variables are sourced from AWS Secrets Manager using the `secrets` field:

```json
{
  "secrets": [
    { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:eu-west-1:{account}:secret:protrader/database_url" },
    { "name": "JWT_PRIVATE_KEY", "valueFrom": "arn:aws:secretsmanager:eu-west-1:{account}:secret:protrader/jwt_private_key" },
    { "name": "TWELVE_DATA_API_KEY", "valueFrom": "arn:aws:secretsmanager:eu-west-1:{account}:secret:protrader/twelve_data_key" },
    { "name": "NOWPAYMENTS_API_KEY", "valueFrom": "arn:aws:secretsmanager:eu-west-1:{account}:secret:protrader/nowpayments_key" },
    { "name": "RESEND_API_KEY", "valueFrom": "arn:aws:secretsmanager:eu-west-1:{account}:secret:protrader/resend_key" }
  ]
}
```

Non-sensitive environment variables are set directly in the task definition:
```json
{
  "environment": [
    { "name": "NODE_ENV", "value": "production" },
    { "name": "NEXT_PUBLIC_API_URL", "value": "https://api.protrader.com" },
    { "name": "NEXT_PUBLIC_WS_URL", "value": "wss://api.protrader.com" },
    { "name": "CLOUDFLARE_R2_BUCKET_NAME", "value": "protrader-kyc-docs" }
  ]
}
```

### Running production database migrations

```bash
# SSH into a running ECS task (using ECS Exec)
aws ecs execute-command \
  --cluster protrader-prod \
  --task {task-id} \
  --container api \
  --interactive \
  --command "/bin/sh"

# Inside the container:
npx prisma migrate deploy
```

Migrations run automatically as part of the deployment pipeline via a one-off ECS task before the new service version starts.

---

## 11. Cloudflare R2 Bucket Setup

KYC documents are stored in a private Cloudflare R2 bucket.

### Create the bucket

1. Log in to Cloudflare dashboard
2. Navigate to R2 → Create Bucket
3. Name: `protrader-kyc-docs` (production) or `protrader-kyc-docs-dev` (development)
4. Location: Europe (eu-west-1 equivalent)
5. Set bucket to **Private** — no public access

### Create an API token

1. R2 → Manage R2 API Tokens → Create API Token
2. Permissions: Object Read & Write on the specific bucket
3. Copy: Account ID, Access Key ID, Secret Access Key
4. Add to environment variables and AWS Secrets Manager

### Bucket lifecycle policy (production)

Files in the `kyc/` prefix must be protected from deletion. Add a lifecycle rule in the R2 dashboard:
- Prefix: `kyc/`
- Action: No automatic deletion (disable expiry)
- Minimum storage duration: 5 years (1,825 days)

---

## 12. Troubleshooting Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `Cannot connect to database` | Docker not running or wrong DATABASE_URL | Run `docker compose up -d` and verify DATABASE_URL matches |
| `Prisma Client is not generated` | Skipped `prisma generate` | Run `cd packages/db && pnpm prisma generate` |
| `pnpm: command not found` | pnpm not installed globally | Run `npm install -g pnpm` |
| `Port 5432 already in use` | Another PostgreSQL instance running | Stop it with `sudo lsof -i :5432` then `kill {PID}` |
| `JWT error: invalid signature` | JWT_PRIVATE_KEY and JWT_PUBLIC_KEY mismatch | Regenerate both from the same key pair (Section 3) |
| `TWELVE_DATA: rate limit` | Too many API calls during development | Use Redis price cache — avoid calling Twelve Data directly in tests |
| `R2: Access Denied` | Wrong R2 credentials or wrong bucket name | Verify CLOUDFLARE_R2_BUCKET_NAME and credentials match the bucket you created |
| `pnpm turbo: cache miss every time` | Remote caching not configured | Set TURBO_TOKEN and TURBO_TEAM in environment, or skip cache with `--no-cache` |
| `Next.js: Module not found: @protrader/ui` | Shared packages not built | Run `pnpm build --filter=@protrader/ui` first |

---

*ProTraderSim — PTS-ENV-001 — Environment Setup Guide — v1.0 — March 2026*
