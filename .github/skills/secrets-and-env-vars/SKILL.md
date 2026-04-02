---
name: 'secrets-and-env-vars'
description: 'Use when: managing environment variables, configuring secrets for different environments, rotating credentials, setting up secure secret storage, or troubleshooting environment configuration issues. Ensures secrets are never hardcoded and are properly managed across all environments. Primary agents: @security, @devops.'
---

# Skill: Secrets and Environment Variables

**Scope**: Environment variable management, secret storage, credential rotation, secure configuration
**Primary Agents**: @security, @devops
**When to Use**: Configuring environments, managing secrets, rotating credentials, securing sensitive data

---

## Core Principles

### 1. Never Commit Secrets

- `.env.local` files are gitignored
- Use `.env.example` as template (no real values)
- Secrets stored in environment-specific secret managers

### 2. Environment Parity

All environments use the same variable names:

| Variable              | Local             | Staging            | Production          |
| --------------------- | ----------------- | ------------------ | ------------------- |
| `DATABASE_URL`        | Docker Compose    | Supabase dashboard | Supabase dashboard  |
| `JWT_PRIVATE_KEY`     | Generated locally | Railway dashboard  | AWS Secrets Manager |
| `NOWPAYMENTS_API_KEY` | Test key          | Staging key        | Production key      |

### 3. Least Privilege

Each environment has its own credentials:

- Separate database users per environment
- Separate API keys per environment
- Separate JWT key pairs per environment

---

## Environment Variable Categories

### Public (Safe to Commit)

```bash
# .env.example - These are configuration, not secrets
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3002
API_URL=http://localhost:4000
LOG_LEVEL=debug
```

### Private (Never Commit)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/db
DIRECT_URL=postgresql://user:password@host:5432/db

# Authentication
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...

# External Services
NOWPAYMENTS_API_KEY=xxx
NOWPAYMENTS_IPN_SECRET=xxx
TWELVE_DATA_API_KEY=xxx
RESEND_API_KEY=xxx

# Storage
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET=xxx
```

---

## Secret Storage by Environment

### Local Development

```bash
# File-based (gitignored)
apps/api/.env.local
apps/platform/.env.local
apps/auth/.env.local
apps/admin/.env.local
apps/ib-portal/.env.local

# Generate JWT keys for local dev
openssl genpkey -algorithm RSA -out apps/api/.jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in apps/api/.jwt-private.pem -out apps/api/.jwt-public.pem
```

### Staging (Railway)

```bash
# Railway dashboard → Project → Variables
# Or via CLI:
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_PRIVATE_KEY="$(cat .jwt-private.pem)"
```

### Production (AWS)

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name protrader-prod/DATABASE_URL \
  --secret-string "postgresql://..."

# Reference in ECS task definition
"secrets": [
  {
    "name": "DATABASE_URL",
    "valueFrom": "arn:aws:secretsmanager:eu-west-1:ACCOUNT:secret:protrader-prod/DATABASE_URL"
  }
]
```

---

## .env.example Template

```bash
# ProTraderSim Environment Configuration
# Copy this file to .env.local and fill in the values

# ============================================
# Application
# ============================================
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3002
API_URL=http://localhost:4000
LOG_LEVEL=debug

# ============================================
# Database (PostgreSQL 17)
# ============================================
# Local: postgresql://protrader:protrader_local_dev@localhost:5432/protrader_dev
# Production: Get from Supabase dashboard
DATABASE_URL=postgresql://user:password@host:5432/dbname
DIRECT_URL=postgresql://user:password@host:5432/dbname

# ============================================
# Cache (Redis 7)
# ============================================
# Local: redis://localhost:6379
# Production: Get from ElastiCache endpoint
REDIS_URL=redis://host:6379

# ============================================
# Authentication (JWT RS256)
# ============================================
# Generate with:
# openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
# openssl rsa -pubout -in jwt-private.pem -out jwt-public.pem
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# ============================================
# Payments (NowPayments)
# ============================================
# Get from https://nowpayments.io/dashboard
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret

# ============================================
# Market Data (Twelve Data)
# ============================================
# Get free API key at https://twelvedata.com
TWELVE_DATA_API_KEY=your_api_key

# ============================================
# Email (Resend)
# ============================================
# Get from https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key

# ============================================
# Storage (Cloudflare R2)
# ============================================
# Get from Cloudflare dashboard → R2
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET=protrader-kyc
CLOUDFLARE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com

# ============================================
# SMTP (Local Development)
# ============================================
# Local: Mailhog on localhost:1025
# Production: Use Resend or transactional email service
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

---

## Secret Rotation

### JWT Key Rotation

```bash
# 1. Generate new key pair
openssl genpkey -algorithm RSA -out new-jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in new-jwt-private.pem -out new-jwt-public.pem

# 2. Update secrets manager (staging/production)
aws secretsmanager update-secret \
  --secret-id protrader-prod/JWT_PRIVATE_KEY \
  --secret-string file://new-jwt-private.pem

# 3. Deploy with dual validation period
# Code validates both old and new public keys

# 4. After 24 hours, remove old key support
# Deploy code that only validates new key
```

### Database Password Rotation

```bash
# 1. Update password in Supabase dashboard
# 2. Update DATABASE_URL in secret manager
# 3. Deploy new configuration
# 4. Verify connections working
# 5. Remove old password access
```

### API Key Rotation

```bash
# 1. Generate new API key in provider dashboard
# 2. Update secret manager
# 3. Deploy new configuration
# 4. Test functionality
# 5. Revoke old API key
```

---

## Security Best Practices

### 1. Validate Environment Variables at Startup

```typescript
// apps/api/src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().min(1).startsWith('postgresql://'),
  REDIS_URL: z.string().min(1).startsWith('redis://'),
  JWT_PRIVATE_KEY: z.string().min(100),
  JWT_PUBLIC_KEY: z.string().min(100),
  NOWPAYMENTS_API_KEY: z.string().min(1),
  NOWPAYMENTS_IPN_SECRET: z.string().min(1),
  TWELVE_DATA_API_KEY: z.string().min(1),
})

export function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment variables:')
    console.error((error as z.ZodError).errors)
    process.exit(1)
  }
}
```

### 2. Never Log Secrets

```typescript
// ❌ WRONG: Logs sensitive data
logger.info('Database connected', { url: process.env.DATABASE_URL })

// ✅ CORRECT: Log connection status only
logger.info('Database connected', { host: 'localhost', port: 5432 })
```

### 3. Use Separate Keys Per Environment

```bash
# Never share JWT keys between environments
# Local: Generate on first run
# Staging: Unique key pair
# Production: Unique key pair (different from staging)
```

---

## Troubleshooting

### Missing Environment Variable

```bash
# Check which variables are loaded
node -e "console.log(Object.keys(process.env).sort().join('\n'))"

# Validate environment
node --loader ts-node/esm -e "import('./src/lib/env.js').then(m => m.validateEnv())"
```

### Invalid JWT Key Format

```bash
# Verify key format
cat apps/api/.jwt-private.pem | head -1
# Should output: -----BEGIN RSA PRIVATE KEY-----

# Regenerate if corrupted
openssl genpkey -algorithm RSA -out apps/api/.jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in apps/api/.jwt-private.pem -out apps/api/.jwt-public.pem
```

### Database Connection Failed

```bash
# Test connection string
psql "$DATABASE_URL"

# Check if URL is properly formatted
echo "$DATABASE_URL" | grep -E "^postgresql://"
```

---

## References

- [Deployment Railway ECS Skill](../deployment-railway-ecs/SKILL.md)
- [Authentication JWT Flow Skill](../authentication-jwt-flow/SKILL.md)
- [PTS-ENV-001](../../../docs/Development%20&%20Operations/PTS-ENV-001_Environment_Setup.md)
