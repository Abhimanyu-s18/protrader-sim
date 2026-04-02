---
name: 'deployment-railway-ecs'
description: 'Use when: deploying to Railway or AWS ECS, configuring CI/CD pipelines, managing environment variables, setting up zero-downtime deployments, or troubleshooting deployment failures. Ensures reliable deployments with proper health checks and rollback strategies. Primary agents: @devops, @security, @architecture.'
---

# Skill: Deployment (Railway + AWS ECS)

**Scope**: Deployment to Railway (staging) and AWS ECS (production), CI/CD pipelines, environment management
**Primary Agents**: @devops, @security, @architecture
**When to Use**: Deploying applications, configuring CI/CD, managing environments, handling deployment failures

---

## Core Principles

### 1. Environment Parity

All environments should be as similar as possible:

| Aspect     | Local          | Staging (Railway) | Production (ECS) |
| ---------- | -------------- | ----------------- | ---------------- |
| Node.js    | 20.x           | 20.x              | 20.x             |
| PostgreSQL | 17 (Docker)    | 17 (Supabase)     | 17 (Supabase)    |
| Redis      | 7 (Docker)     | 7 (ElastiCache)   | 7 (ElastiCache)  |
| Container  | Docker Compose | Railway Docker    | ECS Fargate      |
| Domain     | localhost      | \*.railway.app    | \*.protrader.com |

### 2. Zero-Downtime Deployments

- Use blue-green or rolling deployments
- Health checks must pass before traffic switch
- Database migrations run BEFORE code deployment
- Feature flags for risky changes

### 3. Immutable Deployments

- Each deployment creates new containers
- Never SSH into production to fix things
- Rollback by deploying previous image
- All configuration via environment variables

---

## Railway Deployment (Staging)

### Prerequisites

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link
```

### Deployment Steps

```bash
# 1. Ensure you're on the correct branch
git checkout develop

# 2. Run quality checks
pnpm lint && pnpm typecheck && pnpm test

# 3. Build all apps
pnpm build

# 4. Deploy (auto-deploys on push to develop)
git push origin develop
```

### Railway Configuration

#### API Service (`apps/api`)

```yaml
# railway.toml (in apps/api/)
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

#### Platform App (`apps/platform`)

```yaml
# railway.toml (in apps/platform/)
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/"
healthcheckTimeout = 300
```

### Environment Variables (Railway)

Set in Railway dashboard or via CLI:

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# JWT
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...

# External Services
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
TWELVE_DATA_API_KEY=...
RESEND_API_KEY=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...

# Application
NODE_ENV=staging
PORT=4000
FRONTEND_URL=https://platform-staging.railway.app
API_URL=https://api-staging.railway.app
```

### Railway Services Architecture

```
Railway Project: protrader-sim-staging
├── api (Express.js)
│   ├── Port: 4000
│   ├── Domain: api-staging.railway.app
│   └── Depends on: postgres, redis
├── platform (Next.js)
│   ├── Port: 3002
│   ├── Domain: platform-staging.railway.app
│   └── Depends on: api
├── auth (Next.js)
│   ├── Port: 3001
│   ├── Domain: auth-staging.railway.app
│   └── Depends on: api
├── admin (Next.js)
│   ├── Port: 3003
│   ├── Domain: admin-staging.railway.app
│   └── Depends on: api
├── ib-portal (Next.js)
│   ├── Port: 3004
│   ├── Domain: ib-portal-staging.railway.app
│   └── Depends on: api
├── postgres (Supabase)
│   └── External service
└── redis (Upstash)
    └── External service
```

---

## AWS ECS Deployment (Production)

### Infrastructure Overview

```
AWS eu-west-1
├── ECS Cluster: protrader-prod
│   ├── Service: api (Fargate)
│   │   ├── Task Definition: api-task
│   │   ├── Desired Count: 2 (auto-scaling)
│   │   ├── Load Balancer: api-alb
│   │   └── Security Group: api-sg
│   ├── Service: platform (Fargate)
│   │   ├── Task Definition: platform-task
│   │   ├── Desired Count: 2
│   │   ├── Load Balancer: platform-alb
│   │   └── Security Group: platform-sg
│   └── Service: worker (Fargate)
│       ├── Task Definition: worker-task
│       ├── Desired Count: 1
│       └── Security Group: worker-sg
├── ECR Repositories
│   ├── protrader/api
│   ├── protrader/platform
│   └── protrader/worker
├── ElastiCache (Redis)
│   └── Cluster: protrader-redis
├── Supabase (External)
│   └── Database: protrader-prod
└── Route 53
    ├── api.protrader.com → api-alb
    ├── platform.protrader.com → platform-alb
    └── admin.protrader.com → platform-alb
```

### Dockerfile (API)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy monorepo files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/prisma ./packages/db/prisma
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN cd packages/db && pnpm db:generate

# Build API
RUN pnpm --filter @protrader/api build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install curl for health checks (required for ECS health-check command)
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma

USER nodeuser

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
```

### ECS Task Definition

```json
{
  "family": "api-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/protrader/api:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "4000" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:ACCOUNT:secret:protrader/DATABASE_URL"
        },
        {
          "name": "JWT_PRIVATE_KEY",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:ACCOUNT:secret:protrader/JWT_PRIVATE_KEY"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/protrader-api",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## CI/CD Pipeline (GitHub Actions)

### Production Deployment Workflow

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push API image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: protrader/api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f apps/api/Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Download task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition api-task \
            --query taskDefinition > task-definition.json

      - name: Fill in new image ID
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: api
          image: ${{ steps.login-ecr.outputs.registry }}/protrader/api:${{ github.sha }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: api-service
          cluster: protrader-prod
          wait-for-service-stability: true

  post-deploy:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Run smoke tests
        run: |
          curl -f https://api.protrader.com/health
          curl -f https://platform.protrader.com/

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deployment ${{ job.status }}: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Database Migration Deployment

### Critical Rule: Migrations BEFORE Code

```bash
# 1. Run migrations first
pnpm db:migrate

# 2. Verify migration succeeded
pnpm db:studio  # Check schema

# 3. Deploy new code
# (via CI/CD or manual deployment)
```

### Migration Safety Checklist

- [ ] Migration tested on staging first
- [ ] Backward compatible (old code works with new schema)
- [ ] No destructive changes (DROP TABLE, DROP COLUMN) without backup
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] Rollback plan documented
- [ ] Database backup taken before migration

### Zero-Downtime Migration Pattern

```typescript
// Step 1: Add new column (nullable)
// Migration: ALTER TABLE trades ADD COLUMN new_field TEXT;

// Step 2: Deploy code that writes to both old and new fields
// Code handles both fields during transition

// Step 3: Backfill data
// Migration: UPDATE trades SET new_field = old_field WHERE new_field IS NULL;

// Step 4: Deploy code that reads from new field only

// Step 5: Remove old column (in separate migration)
// Migration: ALTER TABLE trades DROP COLUMN old_field;
```

---

## Health Checks

### API Health Endpoint

```typescript
// src/routes/health.ts
import { Router } from 'express'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

const router = Router()

router.get('/health', async (_req, res) => {
  const checks = {
    database: false,
    redis: false,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    databaseError: undefined as string | undefined,
    redisError: undefined as string | undefined,
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Database health check failed', error)
    checks.databaseError = message.slice(0, 100)
  }

  try {
    await redis.ping()
    checks.redis = true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Redis health check failed', message)
    checks.redisError = message.slice(0, 100)
  }

  const isHealthy = checks.database && checks.redis
  const statusCode = isHealthy ? 200 : 503

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks: {
      database: checks.database,
      redis: checks.redis,
      uptime: checks.uptime,
      timestamp: checks.timestamp,
      ...(checks.databaseError && { databaseError: checks.databaseError }),
      ...(checks.redisError && { redisError: checks.redisError }),
    },
  })
})

export default router
```

### Load Balancer Configuration

```yaml
# ALB Health Check Settings
HealthCheckPath: /health
HealthCheckIntervalSeconds: 30
HealthCheckTimeoutSeconds: 5
HealthyThresholdCount: 3
UnhealthyThresholdCount: 2
Matcher:
  HttpCode: '200'
```

---

## Rollback Strategy

To find the previous task definition revision before rolling back, run:

```bash
# List recent task definition revisions for api-task family
aws ecs list-task-definitions \
  --family-prefix api-task \
  --sort DESC \
  --max-items 10
```

Pick the previous revision identifier (either the full ARN like `arn:aws:ecs:us-east-1:123456789012:task-definition/api-task:5` or the shorthand `api-task:5`) and substitute it for `PREVIOUS_REVISION` in the `aws ecs update-service` command below.

### Immediate Rollback

```bash
# Rollback to previous image
aws ecs update-service \
  --cluster protrader-prod \
  --service api-service \
  --force-new-deployment \
  --task-definition api-task:PREVIOUS_REVISION
```

### Automated Rollback Triggers

Rollback automatically if:

- Health check fails for > 2 minutes
- Error rate exceeds 5%
- Response time exceeds 2 seconds
- Database connection pool exhausted

---

## Environment Variable Management

### Secrets Storage

| Environment | Storage Method            |
| ----------- | ------------------------- |
| Local       | `.env.local` (gitignored) |
| Staging     | Railway dashboard         |
| Production  | AWS Secrets Manager       |

### Secret Rotation

```bash
# Rotate JWT keys (requires coordinated deployment)
# 1. Generate new key pair
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem

# 2. Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id protrader/JWT_PRIVATE_KEY \
  --secret-string file://private.pem

# 3. Deploy with both old and new keys (dual validation period)
# 4. After 24 hours, remove old key support
```

---

## Monitoring & Alerting

### CloudWatch Alarms

```yaml
# Key metrics to monitor
Alarms:
  - HighErrorRate:
      Metric: 5xx error rate
      Threshold: > 5% for 5 minutes
      Action: SNS notification + auto-rollback

  - HighLatency:
      Metric: P95 response time
      Threshold: > 2 seconds for 5 minutes
      Action: SNS notification

  - LowHealthyHosts:
      Metric: Healthy host count
      Threshold: < 1 for 2 minutes
      Action: Auto-scaling trigger

  - DatabaseConnections:
      Metric: Active connections
      Threshold: > 80% of max for 5 minutes
      Action: SNS notification
```

### Log Aggregation

```typescript
// Structured logging for CloudWatch
logger.info('Request completed', {
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  duration: Date.now() - startTime,
  userId: req.user?.id,
  traceId: req.headers['x-request-id'],
})
```

---

## Common Deployment Issues

### Issue: Container Fails to Start

```bash
# Check logs
aws logs tail /ecs/protrader-api --follow

# Common causes:
# 1. Missing environment variable
# 2. Wrong port in Dockerfile
# 3. Prisma client not generated
# 4. Node modules not installed
```

### Issue: Database Migration Fails

```bash
# Check migration status
pnpm db:migrate status

# Handle failed migration
# Option 1: Mark as rolled back and fix
pnpm db:migrate resolve --rolled-back <migration-name>

# Option 2: Restore from backup and reapply
# Restore database, then run migrations again

# Fix migration file and retry
```

### Issue: Health Check Fails

```bash
# Test health endpoint manually
curl -v https://api.protrader.com/health

# Check dependencies:
# 1. Database connection
# 2. Redis connection
# 3. Environment variables loaded
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Lint and type-check passing
- [ ] Container image security scan (e.g., Trivy or AWS ECR image scanning) and remediate critical findings
- [ ] Database migrations tested on staging
- [ ] Environment variables updated
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

### During Deployment

- [ ] Deploy to staging first
- [ ] Run smoke tests on staging
- [ ] Deploy database migrations
- [ ] Deploy application code
- [ ] Verify health checks passing
- [ ] Monitor error rates

### Post-Deployment

- [ ] Run smoke tests on production
- [ ] Verify critical user flows
- [ ] Monitor logs for 30 minutes
- [ ] Update CHANGELOG.md
- [ ] Notify team of successful deployment

---

## References

- [PTS-ENV-001](../../../docs/Development%20&%20Operations/PTS-ENV-001_Environment_Setup.md)
- [PTS-SPRINT-001](../../../docs/Development%20&%20Operations/PTS-SPRINT-001_Dev_Roadmap.md)
- [Financial Calculations Skill](../financial-calculations/SKILL.md)
- [Error Handling Patterns Skill](../error-handling-patterns/SKILL.md)

**Note**: The following skills are planned but not yet created:

- `docker-local-development` — Local Docker Compose setup
- `secrets-and-env-vars` — Environment variable management
