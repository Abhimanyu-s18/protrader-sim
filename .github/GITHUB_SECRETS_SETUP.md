# GitHub Secrets & Variables Setup Guide for ProTraderSim CI/CD

**Last Updated**: April 2026  
**Environments**: Local Dev | Staging (Railway) | Production (AWS ECS)

---

## Quick Navigation

- [Overview](#overview)
- [Secret Categories](#secret-categories)
- [Setup Instructions](#setup-instructions)
- [Secrets Checklist](#secrets-checklist)
- [Validation & Testing](#validation--testing)
- [Secret Rotation](#secret-rotation)

---

## Overview

ProTraderSim CI/CD requires **20 GitHub repository secrets** organized into 6 categories:

| Category            | Secrets                                                                                                                         | Environment  | Storage           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------- |
| **Build**           | TURBO_TOKEN, TURBO_TEAM                                                                                                         | All          | Vercel            |
| **Database**        | DATABASE_URL, DIRECT_URL                                                                                                        | Staging/Prod | Supabase/RDS      |
| **Auth**            | JWT_PRIVATE_KEY_TEST, JWT_PUBLIC_KEY_TEST                                                                                       | CI/Test      | Generated         |
| **Deployment**      | RAILWAY_TOKEN, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, VERCEL_TOKEN, VERCEL_ORG_ID                                            | Staging/Prod | External Services |
| **Vercel Projects** | VERCEL_PROJECT_ID_WEB, VERCEL_PROJECT_ID_AUTH, VERCEL_PROJECT_ID_PLATFORM, VERCEL_PROJECT_ID_ADMIN, VERCEL_PROJECT_ID_IB_PORTAL | Production   | Vercel Dashboard  |
| **Application**     | NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, STAGING_API_URL, PROD_API_URL                                                          | Staging/Prod | Endpoint Config   |

---

## Secret Categories

### Category 1: Build & Caching (Turborepo)

**Environment**: All (local, staging, production, CI)  
**Scope**: Build optimization and Turborepo remote caching  
**Security**: Medium (allows caching, no sensitive data)

#### 1.1 `TURBO_TOKEN`

| Property      | Value                                 |
| ------------- | ------------------------------------- |
| **Type**      | GitHub Secret                         |
| **Source**    | Vercel dashboard                      |
| **Format**    | `vercel_..._` (long hex string)       |
| **When Used** | pnpm turbo commands in CI/CD          |
| **Rotate**    | Quarterly or on team member departure |

**How to Obtain**:

1. Go to https://vercel.com/account/tokens
2. Create new token: Type="Full Account", Expiration="No Expiration" (managed by org)
3. Copy the token (shown only once)
4. Set as GitHub Secret

**Validation**:

```bash
# Local test (requires token in env)
TURBO_TOKEN=your_token TURBO_TEAM=your_team pnpm turbo build --cache-dir=.turbo
```

---

#### 1.2 `TURBO_TEAM`

| Property      | Value                            |
| ------------- | -------------------------------- |
| **Type**      | GitHub Variable (not sensitive)  |
| **Source**    | Vercel dashboard                 |
| **Format**    | Team name (e.g., `krishan-team`) |
| **When Used** | TURBO_TOKEN context in CI/CD     |
| **Rotate**    | Never (team name)                |

**How to Obtain**:

1. Go to https://vercel.com/teams
2. Select your team → Settings → General
3. Copy "Team Slug" (e.g., `krishan-team`)
4. Set as GitHub Variable (not secret, can be public)

---

### Category 2: Database Connections

**Environment**: Staging & Production only  
**Scope**: Prisma ORM database access  
**Security**: **CRITICAL** (database credentials)

#### 2.1 `DATABASE_URL`

| Property      | Value                                         |
| ------------- | --------------------------------------------- |
| **Type**      | GitHub Secret                                 |
| **Source**    | Supabase or RDS                               |
| **Format**    | `postgresql://user:password@host:5432/dbname` |
| **When Used** | Prisma queries, migrations                    |
| **Rotate**    | Quarterly in Supabase/RDS                     |

**How to Obtain**:

**Option A: Supabase (Recommended)**

1. Go to https://supabase.com/dashboard/projects
2. Select project → Settings → Database
3. Connection pooling → Session mode (recommended)
4. Copy connection string (includes encrypted password)
5. Store in GitHub Secret

**Option B: AWS RDS**

1. Go to AWS → RDS → Databases
2. Select database → Connectivity & security
3. Copy Endpoint (e.g., `protrader-prod.cxxx.eu-west-1.rds.amazonaws.com`)
4. Construct: `postgresql://dbuser:dbpassword@endpoint:5432/dbname`
5. Store in GitHub Secret

**CI Usage**:

```yaml
- name: Generate Prisma client
  run: pnpm --filter @protrader/db db:generate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

---

#### 2.2 `DIRECT_URL`

| Property      | Value                                         |
| ------------- | --------------------------------------------- |
| **Type**      | GitHub Secret                                 |
| **Source**    | Supabase or RDS                               |
| **Format**    | `postgresql://user:password@host:5432/dbname` |
| **When Used** | Database migrations only                      |
| **Rotate**    | Quarterly in Supabase/RDS                     |

**Why Two URLs?**

- `DATABASE_URL`: Connection pooler (PgBouncer) for application queries
- `DIRECT_URL`: Direct connection for Prisma migrations (direct DB endpoint that bypasses all pooling)

**Connection Pooling**: DIRECT_URL must use a direct database connection (bypassing any pooler) so migrations can execute DDL statements, while DATABASE_URL may use the pooled connection endpoint for normal runtime queries.

**How to Obtain for Supabase**:

1. For DIRECT_URL: Settings → Database → Connection string (direct connection, not pooler)
2. For DATABASE_URL: Settings → Database → Connection pooling → Use session mode and copy the pooled connection string

**How to Obtain**:

**Supabase**:

1. Settings → Database → Connection pooling
2. Disable "Session mode" (to ensure DIRECT_URL is a fully direct connection)
3. Copy the standard connection string for DIRECT_URL
4. For DATABASE_URL, use the connection pooler endpoint if available, or the same direct connection for initial setup

**AWS RDS**:
Same as DATABASE_URL (RDS doesn't have pooler at this tier)

---

### Category 3: Authentication (JWT Keys)

**Environment**: CI/Test, Staging (optional), Production  
**Scope**: RS256 JWT token signing/verification  
**Security**: **CRITICAL** (private key exposure = security breach)

#### 3.1 `JWT_PRIVATE_KEY_TEST`

| Property      | Value                                     |
| ------------- | ----------------------------------------- |
| **Type**      | GitHub Secret                             |
| **Source**    | Generated (2048-bit RSA)                  |
| **Format**    | PEM with escaped newlines                 |
| **When Used** | Unit/integration tests in CI              |
| **Rotate**    | Quarterly or On Demand (managed manually) |

**How to Generate**:

```bash
# Generate 2048-bit RSA key pair (PKCS#8 format)
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl pkey -pubout -in jwt-private.pem -out jwt-public.pem

# Display for copy-paste (with escaped newlines) - cross-platform alternatives:
# Option 1: Using awk (macOS/Linux/Windows Git Bash)
cat jwt-private.pem | awk '{printf "%s\\n", $0}'

# Option 2: Using tr+sed (macOS/Linux)
cat jwt-private.pem | tr '\n' '§' | sed 's/§/\\n/g'

# Option 3: Using Perl (if available)
cat jwt-private.pem | perl -pe 's/\n/\\n/g'

# Expected output:
# -----BEGIN PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n...\n-----END PRIVATE KEY-----\n

# Copy the entire output (including \n) and paste as GitHub Secret: JWT_PRIVATE_KEY_TEST
```

**Validation**:

```typescript
// Test: Verify key is valid
import jwt from 'jsonwebtoken'

const privateKey = process.env.JWT_PRIVATE_KEY_TEST!
const token = jwt.sign({ sub: '123', role: 'TRADER' }, privateKey, {
  algorithm: 'RS256',
  expiresIn: '24h',
})
console.log('✓ JWT generation successful')
```

---

#### 3.2 `JWT_PUBLIC_KEY_TEST`

| Property      | Value                                     |
| ------------- | ----------------------------------------- |
| **Type**      | GitHub Secret                             |
| **Source**    | Extracted from JWT_PRIVATE_KEY_TEST       |
| **Format**    | PEM with escaped newlines                 |
| **When Used** | Token verification in test routes         |
| **Rotate**    | Quarterly or On Demand (with private key) |

**How to Generate**:

```bash
# Extract public key from private key (using openssl pkey, the modern approach)
openssl pkey -pubout -in jwt-private.pem -out jwt-public.pem

# Display for copy-paste (with escaped newlines) - cross-platform alternatives:
# Option 1: Using awk (macOS/Linux/Windows Git Bash)
cat jwt-public.pem | awk '{printf "%s\\n", $0}'

# Option 2: Using tr+sed (macOS/Linux)
cat jwt-public.pem | tr '\n' '§' | sed 's/§/\\n/g'

# Option 3: Using Perl (if available)
cat jwt-public.pem | perl -pe 's/\n/\\n/g'

# Expected output:
# -----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n...\n-----END PUBLIC KEY-----\n

# Copy the entire output (including \n) and paste as GitHub Secret: JWT_PUBLIC_KEY_TEST
```

**Validation**:

```typescript
// Test: Verify public key matches private key
import jwt from 'jsonwebtoken'

const privateKey = process.env.JWT_PRIVATE_KEY_TEST!
const publicKey = process.env.JWT_PUBLIC_KEY_TEST!

const token = jwt.sign({ sub: '123' }, privateKey, { algorithm: 'RS256' })
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] })
console.log('✓ JWT verification successful')
```

**Production Keys** (different from test keys):

- Generate separate RSA pair for production
- Store as `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (without \_TEST suffix)
- Deploy to Railway/AWS separately
- Should be rotated annually and stored in AWS Secrets Manager

---

### Category 4: Deployment Platforms

**Environment**: Staging & Production  
**Scope**: Deploy to Railway and AWS ECS  
**Security**: **CRITICAL** (deployment access)

#### 4.1 `RAILWAY_TOKEN`

| Property      | Value                                 |
| ------------- | ------------------------------------- |
| **Type**      | GitHub Secret                         |
| **Source**    | Railway account                       |
| **Format**    | `$2a$10$...` (bcrypt hash)            |
| **When Used** | `railway up` deployments to staging   |
| **Rotate**    | Quarterly or on team member departure |

**How to Obtain**:

1. Go to https://railway.app/account/tokens
2. Copy existing token or create new one
3. Store in GitHub Secret

**CI Usage**:

```yaml
- name: Deploy to Railway
  run: railway up --service api
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Validation**:

```bash
# Local test
RAILWAY_TOKEN=your_token railway whoami
# Should output: Logged in as: your-account
```

---

#### 4.2 `AWS_ACCESS_KEY_ID`

| Property      | Value                                 |
| ------------- | ------------------------------------- |
| **Type**      | GitHub Secret                         |
| **Source**    | AWS IAM Console                       |
| **Format**    | `AKIA...` (20 character alphanumeric) |
| **When Used** | ECR push, ECS deployment              |
| **Rotate**    | Every 90 days (AWS best practice)     |

**How to Obtain**:

1. Go to AWS IAM → Users → Select CI/CD user
2. Security credentials → Create access key
3. Choose "Command Line Interface (CLI)"
4. Copy Access Key ID
5. Store as GitHub Secret

**Required IAM Permissions**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:eu-west-1:ACCOUNT:repository/protrader-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeTasks",
        "ecs:ListTasks"
      ],
      "Resource": [
        "arn:aws:ecs:eu-west-1:ACCOUNT:service/protrader-prod/*",
        "arn:aws:ecs:eu-west-1:ACCOUNT:task-definition/protrader-*"
      ]
    }
  ]
}
```

---

#### 4.3 `AWS_SECRET_ACCESS_KEY`

| Property      | Value                                          |
| ------------- | ---------------------------------------------- |
| **Type**      | GitHub Secret                                  |
| **Source**    | AWS IAM Console (generated with ACCESS_KEY_ID) |
| **Format**    | 40 character alphanumeric                      |
| **When Used** | ECR push, ECS deployment authentication        |
| **Rotate**    | Every 90 days                                  |

**How to Obtain**:

- Generated together with `AWS_ACCESS_KEY_ID`
- Shown only once during creation
- If lost, regenerate from IAM console

**Storage Note**:

```bash
# NEVER commit to git or logs
# Always use: aws-actions/configure-aws-credentials@v4
# Do NOT echo or print in CI logs
```

---

#### 4.4 `VERCEL_TOKEN`

| Property      | Value                                       |
| ------------- | ------------------------------------------- |
| **Type**      | GitHub Secret                               |
| **Source**    | Vercel account                              |
| **Format**    | `vercel_...` (long hex string)              |
| **When Used** | Frontend deployments (`pnpm vercel deploy`) |
| **Rotate**    | Quarterly                                   |

**How to Obtain**:

1. Go to https://vercel.com/account/tokens
2. Create new token: Scope="Full Account"
3. Copy token
4. Store as GitHub Secret

---

#### 4.5 `VERCEL_ORG_ID`

| Property      | Value                               |
| ------------- | ----------------------------------- |
| **Type**      | GitHub Variable (not sensitive)     |
| **Source**    | Vercel account                      |
| **Format**    | Hex string (e.g., `team_xxxxxxxxx`) |
| **When Used** | Scope for VERCEL_TOKEN              |
| **Rotate**    | Never                               |

**How to Obtain**:

1. Go to https://vercel.com/account/settings
2. Copy "Organization/Team ID"
3. Store as GitHub Variable (not secret)

---

### Category 5: Vercel Project IDs

**Environment**: Production only  
**Scope**: Each of the 5 Next.js frontend apps is deployed to its own Vercel project. The `deploy-frontend` CI job runs as a matrix over all five apps and reads the project ID for whichever app it is currently deploying.  
**Security**: Low-medium (public project identifiers, but control deployment targets)

> **Why these were missing from earlier docs**: The `deploy-frontend` job uses a GitHub Actions matrix expression (`secrets[matrix.vercel_project_id_secret]`) to resolve the correct project ID at runtime. Because this is a dynamic secret lookup rather than a literal `secrets.SECRET_NAME` reference, it was easy to overlook when the docs were first written. Without all five, the matrix job will fail for any app whose project ID secret is absent.

#### 5.1 `VERCEL_PROJECT_ID_WEB`

| Property      | Value                                     |
| ------------- | ----------------------------------------- |
| **Type**      | GitHub Secret                             |
| **Source**    | Vercel dashboard → `web` project settings |
| **Format**    | `prj_xxxxxxxxxxxxxxxxxxxx`                |
| **When Used** | `deploy-frontend` matrix job (app: web)   |
| **Rotate**    | Never (stable project identifier)         |

**How to Obtain**:

```bash
cd apps/web && vercel link
# Follow the prompts to link the app to your Vercel project
cat .vercel/project.json   # → { "projectId": "prj_xxxx", "orgId": "..." }
```

Or via the Vercel dashboard: **web project → Settings → General → Project ID**

> **Do not commit** the generated `.vercel/` directory. It is already in `.gitignore`.

---

#### 5.2 `VERCEL_PROJECT_ID_AUTH`

| Property      | Value                                      |
| ------------- | ------------------------------------------ |
| **Type**      | GitHub Secret                              |
| **Source**    | Vercel dashboard → `auth` project settings |
| **Format**    | `prj_xxxxxxxxxxxxxxxxxxxx`                 |
| **When Used** | `deploy-frontend` matrix job (app: auth)   |
| **Rotate**    | Never                                      |

**How to Obtain**:

```bash
cd apps/auth && vercel link
cat .vercel/project.json
```

---

#### 5.3 `VERCEL_PROJECT_ID_PLATFORM`

| Property      | Value                                          |
| ------------- | ---------------------------------------------- |
| **Type**      | GitHub Secret                                  |
| **Source**    | Vercel dashboard → `platform` project settings |
| **Format**    | `prj_xxxxxxxxxxxxxxxxxxxx`                     |
| **When Used** | `deploy-frontend` matrix job (app: platform)   |
| **Rotate**    | Never                                          |

**How to Obtain**:

```bash
cd apps/platform && vercel link
cat .vercel/project.json
```

---

#### 5.4 `VERCEL_PROJECT_ID_ADMIN`

| Property      | Value                                       |
| ------------- | ------------------------------------------- |
| **Type**      | GitHub Secret                               |
| **Source**    | Vercel dashboard → `admin` project settings |
| **Format**    | `prj_xxxxxxxxxxxxxxxxxxxx`                  |
| **When Used** | `deploy-frontend` matrix job (app: admin)   |
| **Rotate**    | Never                                       |

**How to Obtain**:

```bash
cd apps/admin && vercel link
cat .vercel/project.json
```

---

#### 5.5 `VERCEL_PROJECT_ID_IB_PORTAL`

| Property      | Value                                           |
| ------------- | ----------------------------------------------- |
| **Type**      | GitHub Secret                                   |
| **Source**    | Vercel dashboard → `ib-portal` project settings |
| **Format**    | `prj_xxxxxxxxxxxxxxxxxxxx`                      |
| **When Used** | `deploy-frontend` matrix job (app: ib-portal)   |
| **Rotate**    | Never                                           |

**How to Obtain**:

```bash
cd apps/ib-portal && vercel link
cat .vercel/project.json
```

**Linking all apps at once** (run from repo root):

```bash
for app in web auth platform admin ib-portal; do
  echo "--- Linking apps/$app ---"
  cd apps/$app && vercel link && cat .vercel/project.json && cd ../..
done
```

---

### Category 6: Application Configuration

**Environment**: Staging & Production  
**Scope**: Frontend API endpoints  
**Security**: Low (URLs are publicly known)

#### 6.1 `NEXT_PUBLIC_API_URL`

| Property      | Value                                                        |
| ------------- | ------------------------------------------------------------ |
| **Type**      | GitHub Variable (not secret, but in secrets for consistency) |
| **Source**    | API deployment URL                                           |
| **Format**    | Full HTTPS URL                                               |
| **When Used** | Next.js build time (NEXT*PUBLIC*\* prefix)                   |
| **Rotate**    | On API URL change only                                       |

**Values by Environment**:

- Local: `http://localhost:4000`
- Staging: `https://api-staging.railway.app`
- Production: `https://api.protrader-sim.com`

**CI Usage**:

```yaml
- name: Build all apps
  run: pnpm turbo build
  env:
    NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
```

---

#### 6.2 `NEXT_PUBLIC_WS_URL`

| Property      | Value                               |
| ------------- | ----------------------------------- |
| **Type**      | GitHub Variable                     |
| **Source**    | Same host as NEXT_PUBLIC_API_URL    |
| **Format**    | WebSocket URL (wss:// for HTTPS)    |
| **When Used** | Socket.io subscriptions in frontend |
| **Rotate**    | On API URL change only              |

**Values by Environment**:

- Local: `ws://localhost:4000`
- Staging: `wss://api-staging.railway.app`
- Production: `wss://api.protrader-sim.com`

**Protocol Rules**:

- Use `ws://` for HTTP (local only)
- Use `wss://` for HTTPS (staging/production)

---

#### 6.3 `STAGING_API_URL`

| Property      | Value                                                           |
| ------------- | --------------------------------------------------------------- |
| **Type**      | GitHub Secret                                                   |
| **Source**    | Railway staging environment                                     |
| **Format**    | Health check endpoint: `https://api-staging.railway.app/health` |
| **When Used** | Post-deployment validation in Railway                           |
| **Rotate**    | Only if staging domain changes                                  |

**How to Obtain**:

1. Deploy to Railway
2. Go to Railway dashboard → Services → API
3. Copy domain (e.g., `api-staging-abc123.railway.app`)
4. Append `/health`: `https://api-staging-abc123.railway.app/health`
5. Store as GitHub Secret

---

#### 6.4 `PROD_API_URL`

| Property      | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| **Type**      | GitHub Secret                                                 |
| **Source**    | AWS ECS or load balancer                                      |
| **Format**    | Health check endpoint: `https://api.protrader-sim.com/health` |
| **When Used** | Post-deployment validation in ECS                             |
| **Rotate**    | Only if production domain changes                             |

**How to Obtain**:

1. Deploy to AWS ECS
2. Get load balancer domain from AWS Console
3. Append `/health`
4. Store as GitHub Secret

---

## Setup Instructions

### Step-by-Step: Adding Secrets to GitHub

#### Method 1: GitHub Web UI (Easiest)

1. **Navigate to Secrets**
   - Go to repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"

2. **Add Secret**
   - Name: (e.g., `TURBO_TOKEN`)
   - Value: (paste the secret)
   - Click "Add secret"

3. **Verify Addition**
   - Secret appears in list (value hidden)
   - Can be updated or deleted

#### Method 2: GitHub CLI (Faster for multiple)

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Add single secret
gh secret set TURBO_TOKEN --body "your_token_value" -R krishan/protrader-sim

# Add multiple secrets from file
cat secrets.txt | while IFS="=" read -r name value; do
  gh secret set "$name" --body "$value" -R krishan/protrader-sim
done
```

#### Method 3: Terraform (Infrastructure-as-Code)

```hcl
# terraform/github.tf
resource "github_actions_secret" "turbo_token" {
  repository       = "protrader-sim"
  secret_name      = "TURBO_TOKEN"
  plaintext_value  = var.turbo_token
}
```

---

### Setup Sequence (Recommended Order)

Follow this order to minimize CI failures:

**Phase 1: Build Infrastructure** (first, so CI can cache builds)

1. TURBO_TOKEN
2. TURBO_TEAM

**Phase 2: Database Setup** (needed for Prisma generation)

3. DATABASE_URL
4. DIRECT_URL

**Phase 3: Authentication** (needed for tests)

5. JWT_PRIVATE_KEY_TEST
6. JWT_PUBLIC_KEY_TEST

**Phase 4: Deployment Infrastructure** (for staging/prod)

7. RAILWAY_TOKEN
8. AWS_ACCESS_KEY_ID
9. AWS_SECRET_ACCESS_KEY
10. VERCEL_TOKEN
11. VERCEL_ORG_ID

**Phase 5: Vercel Project IDs** (one per frontend app — link each app first)

12. VERCEL_PROJECT_ID_WEB
13. VERCEL_PROJECT_ID_AUTH
14. VERCEL_PROJECT_ID_PLATFORM
15. VERCEL_PROJECT_ID_ADMIN
16. VERCEL_PROJECT_ID_IB_PORTAL

**Phase 6: Application Configuration** (final)

17. NEXT_PUBLIC_API_URL
18. NEXT_PUBLIC_WS_URL
19. STAGING_API_URL
20. PROD_API_URL

---

## Secrets Checklist

- [ ] All external service accounts created (Vercel, Railway, AWS, Supabase)
- [ ] All API keys and tokens generated and copied to safe location
- [ ] JWT RSA key pair generated and formatted with `\n` escapes
- [ ] Database URLs constructed and tested locally
- [ ] Repository Settings → Secrets tab accessible

### Adding Secrets

| #   | Secret Name                 | Source                    | Format                            | Added | Verified |
| --- | --------------------------- | ------------------------- | --------------------------------- | ----- | -------- |
| 1   | TURBO_TOKEN                 | Vercel                    | `vercel_...`                      | ☐     | ☐        |
| 2   | TURBO_TEAM                  | Vercel                    | `team-name`                       | ☐     | ☐        |
| 3   | DATABASE_URL                | Supabase/RDS              | `postgresql://...`                | ☐     | ☐        |
| 4   | DIRECT_URL                  | Supabase/RDS              | `postgresql://...`                | ☐     | ☐        |
| 5   | JWT_PRIVATE_KEY_TEST        | Generated                 | `-----BEGIN RSA...\\n...`         | ☐     | ☐        |
| 6   | JWT_PUBLIC_KEY_TEST         | Generated                 | `-----BEGIN PUBLIC...\\n...`      | ☐     | ☐        |
| 7   | RAILWAY_TOKEN               | Railway                   | `$2a$10$...`                      | ☐     | ☐        |
| 8   | AWS_ACCESS_KEY_ID           | AWS IAM                   | `AKIA...`                         | ☐     | ☐        |
| 9   | AWS_SECRET_ACCESS_KEY       | AWS IAM                   | `40-char-secret`                  | ☐     | ☐        |
| 10  | VERCEL_TOKEN                | Vercel                    | `vercel_...`                      | ☐     | ☐        |
| 11  | VERCEL_ORG_ID               | Vercel                    | `team_...`                        | ☐     | ☐        |
| 12  | VERCEL_PROJECT_ID_WEB       | `vercel link` / Dashboard | `prj_...`                         | ☐     | ☐        |
| 13  | VERCEL_PROJECT_ID_AUTH      | `vercel link` / Dashboard | `prj_...`                         | ☐     | ☐        |
| 14  | VERCEL_PROJECT_ID_PLATFORM  | `vercel link` / Dashboard | `prj_...`                         | ☐     | ☐        |
| 15  | VERCEL_PROJECT_ID_ADMIN     | `vercel link` / Dashboard | `prj_...`                         | ☐     | ☐        |
| 16  | VERCEL_PROJECT_ID_IB_PORTAL | `vercel link` / Dashboard | `prj_...`                         | ☐     | ☐        |
| 17  | NEXT_PUBLIC_API_URL         | Config                    | `https://api-staging...`          | ☐     | ☐        |
| 18  | NEXT_PUBLIC_WS_URL          | Config                    | `wss://api-staging...`            | ☐     | ☐        |
| 19  | STAGING_API_URL             | Railway                   | `https://api-staging.../health`   | ☐     | ☐        |
| 20  | PROD_API_URL                | AWS/LB                    | `https://api.protrader.../health` | ☐     | ☐        |

### Post-Setup Verification

- [ ] GitHub Actions CI starts successfully
- [ ] Typecheck job passes (DATABASE_URL working)
- [ ] Test job passes (JWT keys working)
- [ ] Build job passes (NEXT*PUBLIC*\* URLs working)
- [ ] Deploy-staging completes (RAILWAY_TOKEN working)
- [ ] Deploy-production completes (AWS keys working)
- [ ] Deploy-frontend matrix (5 apps) completes (VERCEL*TOKEN, VERCEL_ORG_ID, and all VERCEL_PROJECT_ID*\* working)
- [ ] Health checks pass (STAGING_API_URL, PROD_API_URL working)

---

## Validation & Testing

### Test Each Secret Category

#### Build Secrets (TURBO_TOKEN, TURBO_TEAM)

```bash
# Local test
TURBO_TOKEN=your_token TURBO_TEAM=your_team pnpm turbo build --remote-only
# Should hit Turbo cache
```

#### Database Secrets (DATABASE_URL, DIRECT_URL)

```bash
# Test connection
DATABASE_URL=your_url psql  # If Supabase/RDS accepts psql
# Or:
pnpm --filter @protrader/db db:generate
```

#### Auth Secrets (JWT_PRIVATE_KEY_TEST, JWT_PUBLIC_KEY_TEST)

```bash
# Run tests (CI will use these keys)
pnpm turbo test
# Should pass without "JWT key not found" errors
```

#### Deployment Secrets

```bash
# Railway token test
RAILWAY_TOKEN=your_token railway whoami

# AWS credentials test
aws configure
aws sts get-caller-identity

# Vercel token test
VERCEL_TOKEN=your_token vercel whoami
```

### CI Pipeline Validation

After all secrets are added, trigger a test run:

```bash
# Force-push to develop branch to trigger staging deploy
git push -f origin develop

# Monitor GitHub Actions:
# 1. Typecheck should pass ✓
# 2. Lint should pass ✓
# 3. Test should pass ✓ (uses JWT_*_TEST keys)
# 4. Build should pass ✓ (uses NEXT_PUBLIC_* vars)
# 5. Deploy-staging should pass ✓ (uses RAILWAY_TOKEN)
```

---

## Secret Rotation

### Rotation Schedule

| Secret                     | Frequency              | Procedure                                                         |
| -------------------------- | ---------------------- | ----------------------------------------------------------------- |
| JWT production keys        | Annually               | Generate new pair, redeploy to all environments                   |
| JWT test keys              | Quarterly or On Demand | Manually generate with openssl, update GitHub Secrets when needed |
| AWS_ACCESS_KEY_ID / SECRET | 90 days                | Create new pair in IAM, update both in GitHub                     |
| DATABASE_URL / DIRECT_URL  | On password change     | Update in GitHub, redeploy                                        |

### Rotation Checklist

```bash
# 1. Generate new secret
# 2. Test locally
# 3. Add new secret with _v2 suffix to GitHub
# 4. Update CI workflow to use new secret
# 5. Trigger test deployment
# 6. Verify no issues
# 7. Delete old secret from GitHub
# 8. Document rotation in CHANGELOG
```

### Emergency Rotation

If secret is compromised:

```bash
# 1. Immediately regenerate in source system (Vercel, AWS IAM, etc.)
# 2. Update GitHub Secret immediately
# 3. Redeploy all services
# 4. Scan CI logs for old secret exposure
# 5. Audit access logs
# 6. Document incident
```

---

## Troubleshooting

### "Secret not found" in CI

**Cause**: Secret name misspelled or not added  
**Fix**:

1. Check Settings → Secrets → Actions
2. Verify exact name matches (case-sensitive)
3. Commit and push again

### Build fails with "JWT key not found"

**Cause**: JWT keys not added as secrets  
**Fix**:

1. Verify JWT_PRIVATE_KEY_TEST in GitHub Secrets
2. Regenerate and re-add if needed
3. Check newline escaping (`\n` characters)

### Deployment fails with "Authentication failed"

**Cause**: RAILWAY_TOKEN or AWS credentials expired/invalid  
**Fix**:

1. Test token locally: `railway whoami` or `aws sts get-caller-identity`
2. Regenerate token in source system
3. Update GitHub Secret
4. Retry deployment

### Database generation fails in CI

**Cause**: DATABASE_URL invalid or unreachable  
**Fix**:

1. Test URL locally: `psql $DATABASE_URL`
2. Verify IP whitelisting (Supabase/AWS)
3. Check credentials are correct
4. Update GitHub Secret if needed

---

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Vercel Tokens](https://vercel.com/account/tokens)
- [Railway Tokens](https://railway.app/account/tokens)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [JWT RS256 Standards](https://tools.ietf.org/html/rfc7518#section-3.3)
