# GitHub Secrets Implementation Checklist

**Repo**: ProTraderSim  
**Started**: \***\*\_\_\_\*\***  
**Completed**: \***\*\_\_\_\*\***  
**Completed By**: \***\*\_\_\_\*\***

---

## Phase 1: Pre-Setup Verification ✓

- [ ] GitHub repository access confirmed
- [ ] Settings → Secrets and variables → Actions page accessible
- [ ] All external service accounts created:
  - [ ] Vercel account (https://vercel.com)
  - [ ] Railway account (https://railway.app)
  - [ ] AWS account with IAM user for CI/CD
  - [ ] Supabase or RDS database created
- [ ] Team members with secret access identified
- [ ] Backup plan for secret rotation documented
- [ ] CI workflow file `.github/workflows/ci.yml` reviewed

**Notes**:

```


```

---

## Phase 2: Build Secrets (Turborepo Cache)

### Secret #1: TURBO_TOKEN

- [ ] Generate token at https://vercel.com/account/tokens
  - [ ] Token type: Personal Account
  - [ ] Expiration: No Expiration (managed by organization)
  - [ ] Scope: Full Account
- [ ] Token copied to secure location (password manager)
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub (appears in list)
- [ ] Local test run:
  ```bash
  # SECURE: Use export or temp file, DO NOT put secrets on command line
  export TURBO_TOKEN=<your-token>
  export TURBO_TEAM=<your-team>
  pnpm turbo build --remote-only
  unset TURBO_TOKEN TURBO_TEAM
  ```

**Token Format**: `vercel_...` (long hex string)  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #2: TURBO_TEAM

- [ ] Retrieved from Vercel dashboard
  - [ ] Go to https://vercel.com/teams
  - [ ] Select team
  - [ ] Copy "Team Slug" from settings
- [ ] Value copied (e.g., `krishan-team`)
- [ ] Added to GitHub Variables (not Secret - it's public)
- [ ] Verified in GitHub

**Team Slug Format**: `team-name` (no spaces)  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

## Phase 3: Database Secrets

### Secret #3: DATABASE_URL

- [ ] Database created (Supabase or AWS RDS)
- [ ] Connection string obtained:
  - [ ] **Supabase method**:
    - [ ] Go to project → Settings → Database
    - [ ] Select Connection pooling → Session mode
    - [ ] Copy connection string
  - [ ] **AWS RDS method**:
    - [ ] Go to RDS dashboard
    - [ ] Copy endpoint
    - [ ] Construct: `postgresql://user:password@endpoint:5432/dbname`
- [ ] Connection tested locally: `psql $DATABASE_URL`
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub

**URL Format**: `postgresql://user:password@host:5432/dbname`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #4: DIRECT_URL

- [ ] Connection string obtained (direct connection, no pooler):
  - [ ] **Supabase method**:
    - [ ] Go to project → Settings → Database
    - [ ] Disable Session mode connection pooling
    - [ ] Copy "Standard connection" string
  - [ ] **AWS RDS method**:
    - [ ] Same as DATABASE_URL (RDS doesn't have pooler)
- [ ] Connection tested: `psql $DIRECT_URL`
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub

**URL Format**: `postgresql://user:password@host:5432/dbname`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

## Phase 4: Authentication Secrets (JWT)

### Secret #5: JWT_PRIVATE_KEY_TEST

**Generate in Terminal**:

```bash
# Step 1: Generate 2048-bit RSA private key (PKCS#8 format)
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048

# Step 2: Display with escaped newlines
cat jwt-private.pem | sed ':a;N;$!ba;s/\n/\\n/g'

# Step 3: Copy the entire output (including \n characters)
# Example output starts with: -----BEGIN PRIVATE KEY-----\nMIIEpAI...
```

- [ ] 2048-bit RSA key generated locally
- [ ] Public key extracted
- [ ] Private key formatted with escaped newlines (`\n`)
- [ ] Entire PEM content copied
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub (value hidden)
- [ ] Local files cleaned up: `rm jwt-private.pem jwt-public.pem`

**Key Format**: `-----BEGIN PRIVATE KEY-----\nMIIEpAI...\n-----END PRIVATE KEY-----`
**Date Added**: \***\*\_\_\_\*\***  
**Verified In Tests**: [ ] \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #6: JWT_PUBLIC_KEY_TEST

**Generate in Terminal**:

```bash
# Extract from existing private key
openssl rsa -pubout -in jwt-private.pem -out jwt-public.pem

# Format with escaped newlines
cat jwt-public.pem | sed ':a;N;$!ba;s/\n/\\n/g'

# Copy the entire output
# Example: -----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQ...
```

- [ ] Public key extracted from private key
- [ ] Formatted with escaped newlines (`\n`)
- [ ] Entire PEM content copied
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub (value hidden)

**Key Format**: `-----BEGIN PUBLIC KEY-----\nMIIBIjA...\n-----END PUBLIC KEY-----`  
**Date Added**: \***\*\_\_\_\*\***  
**Verified In Tests**: [ ] \***\*\_\_\_\*\***  
**Notes**:

```


```

---

## Phase 5: Deployment Secrets

### Secret #7: RAILWAY_TOKEN

- [ ] Generated at https://railway.app/account/tokens
- [ ] Token type: Account token (full access)
- [ ] Token copied to secure location
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub
- [ ] Local test: `RAILWAY_TOKEN=xxx railway whoami`

**Token Format**: `$2a$10$...` (bcrypt hash)  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #8: AWS_ACCESS_KEY_ID

**AWS IAM Setup**:

- [ ] AWS account has IAM user for CI/CD (username: `protrader-ci`)
- [ ] IAM user has policies:
  - [ ] ECR push permissions
  - [ ] ECS deployment permissions
  - [ ] (See attached IAM policy in setup guide)

**Access Key Creation**:

- [ ] Go to AWS IAM → Users → `protrader-ci`
- [ ] Security credentials → Create access key
- [ ] Use case: Command Line Interface (CLI)
- [ ] Access Key ID copied
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub
- [ ] Local test: `aws configure` + `aws sts get-caller-identity` (then remove credentials via `rm ~/.aws/credentials` or `aws configure` again with empty values)
- [ ] Alternative: Use temporary env vars: `export AWS_ACCESS_KEY_ID=... && export AWS_SECRET_ACCESS_KEY=... && aws sts get-caller-identity && unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY`

**Key Format**: `AKIA...` (20 alphanumeric)  
**Date Added**: \***\*\_\_\_\*\***  
**Rotation Due**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #9: AWS_SECRET_ACCESS_KEY

- [ ] Generated together with AWS_ACCESS_KEY_ID
- [ ] Secret key copied (shown only once)
- [ ] Added to GitHub Secrets **immediately**
- [ ] Verified in GitHub
- [ ] NEVER echoed in CI logs or terminal history
- [ ] AWS Access Key ID from step #8 paired with this

**Key Format**: 40 character alphanumeric  
**Date Added**: \***\*\_\_\_\*\***  
**Rotation Due**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #10: VERCEL_TOKEN

- [ ] Generated at https://vercel.com/account/tokens
- [ ] Type: Full Account scope (not Project-scoped)
- [ ] Token copied to secure location
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub

**Token Format**: `vercel_...` (long hex string)  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #11: VERCEL_ORG_ID

- [ ] Retrieved from https://vercel.com/account/settings
- [ ] "Organization/Team ID" copied (shown at top of settings)
- [ ] Added to GitHub Variables (not Secret - it's public)
- [ ] Verified in GitHub

**ID Format**: `team_xxxxxxxxx` or `xxxxxxxxx`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

## Phase 5b: Vercel Project IDs

> ⚠️ **These 5 secrets were missing from the original documentation.** The `deploy-frontend` CI job uses a matrix to deploy all 5 Next.js apps to Vercel and resolves each app's project ID dynamically at runtime. Without these secrets, the `deploy-frontend` job will fail for every app.

For each app: run `vercel link` inside the app directory, follow the prompts, then read the project ID from `.vercel/project.json`. Do **not** commit the generated `.vercel/` directories.

### Secret #12: VERCEL_PROJECT_ID_WEB

- [ ] `cd apps/web` and run `vercel link`
- [ ] Follow prompts to connect to (or create) the Vercel project for `web`
- [ ] Read project ID: `cat .vercel/project.json` → copy `projectId` value
- [ ] Added to GitHub Secrets as `VERCEL_PROJECT_ID_WEB`
- [ ] Verified in GitHub
- [ ] `.vercel/` directory NOT committed

**ID Format**: `prj_xxxxxxxxxxxxxxxxxxxx`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #13: VERCEL_PROJECT_ID_AUTH

- [ ] `cd apps/auth` and run `vercel link`
- [ ] Follow prompts to connect to the Vercel project for `auth`
- [ ] Read project ID: `cat .vercel/project.json` → copy `projectId` value
- [ ] Added to GitHub Secrets as `VERCEL_PROJECT_ID_AUTH`
- [ ] Verified in GitHub
- [ ] `.vercel/` directory NOT committed

**ID Format**: `prj_xxxxxxxxxxxxxxxxxxxx`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #14: VERCEL_PROJECT_ID_PLATFORM

- [ ] `cd apps/platform` and run `vercel link`
- [ ] Follow prompts to connect to the Vercel project for `platform`
- [ ] Read project ID: `cat .vercel/project.json` → copy `projectId` value
- [ ] Added to GitHub Secrets as `VERCEL_PROJECT_ID_PLATFORM`
- [ ] Verified in GitHub
- [ ] `.vercel/` directory NOT committed

**ID Format**: `prj_xxxxxxxxxxxxxxxxxxxx`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #15: VERCEL_PROJECT_ID_ADMIN

- [ ] `cd apps/admin` and run `vercel link`
- [ ] Follow prompts to connect to the Vercel project for `admin`
- [ ] Read project ID: `cat .vercel/project.json` → copy `projectId` value
- [ ] Added to GitHub Secrets as `VERCEL_PROJECT_ID_ADMIN`
- [ ] Verified in GitHub
- [ ] `.vercel/` directory NOT committed

**ID Format**: `prj_xxxxxxxxxxxxxxxxxxxx`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #16: VERCEL_PROJECT_ID_IB_PORTAL

- [ ] `cd apps/ib-portal` and run `vercel link`
- [ ] Follow prompts to connect to the Vercel project for `ib-portal`
- [ ] Read project ID: `cat .vercel/project.json` → copy `projectId` value
- [ ] Added to GitHub Secrets as `VERCEL_PROJECT_ID_IB_PORTAL`
- [ ] Verified in GitHub
- [ ] `.vercel/` directory NOT committed

**ID Format**: `prj_xxxxxxxxxxxxxxxxxxxx`  
**Date Added**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

## Phase 6: Application Configuration

### Secret #17: NEXT_PUBLIC_API_URL

**Staging Value**:

- [ ] Railway staging API deployed
- [ ] URL copied: `https://api-staging.railway.app`
- [ ] Added to GitHub Secrets

**Production Value**:

- [ ] AWS ECS staging API deployed
- [ ] Load balancer domain obtained
- [ ] Full URL constructed: `https://api.protrader-sim.com`
- [ ] Added to GitHub Secrets

**Values by Environment**:

- Local: `http://localhost:4000`
- Staging: `https://api-staging.railway.app`
- Production: `https://api.protrader-sim.com`

**Date Added (Staging)**: \***\*\_\_\_\*\***  
**Date Added (Production)**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #18: NEXT_PUBLIC_WS_URL

**Staging Value**:

- [ ] Railway API deployed
- [ ] Domain: `api-staging.railway.app`
- [ ] WebSocket URL: `wss://api-staging.railway.app`
- [ ] Added to GitHub Secrets

**Production Value**:

- [ ] AWS ECS API deployed
- [ ] Domain: `api.protrader-sim.com`
- [ ] WebSocket URL: `wss://api.protrader-sim.com`
- [ ] Added to GitHub Secrets

**Protocol Rules**:

- Local only: `ws://localhost:4000` (HTTP)
- Staging/Prod: `wss://...` (HTTPS)

**Date Added (Staging)**: \***\*\_\_\_\*\***  
**Date Added (Production)**: \***\*\_\_\_\*\***  
**Notes**:

```


```

---

### Secret #19: STAGING_API_URL

- [ ] Railway staging API deployed and running
- [ ] Health endpoint verified: curl `https://api-staging.railway.app/health`
- [ ] Full health URL: `https://api-staging.railway.app/health`
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub

**Format**: `https://api-staging.railway.app/health`  
**Date Added**: \***\*\_\_\_\*\***  
**Health Check Passed**: [ ] Yes / [ ] No  
**Notes**:

```


```

---

### Secret #20: PROD_API_URL

- [ ] AWS ECS production API deployed and running
- [ ] Load balancer endpoint obtained
- [ ] Health endpoint verified: curl `https://api.protrader-sim.com/health`
- [ ] Full health URL: `https://api.protrader-sim.com/health`
- [ ] Added to GitHub Secrets
- [ ] Verified in GitHub

**Format**: `https://api.protrader-sim.com/health`  
**Date Added**: \***\*\_\_\_\*\***  
**Health Check Passed**: [ ] Yes / [ ] No  
**Notes**:

```


```

---

## Phase 7: Verification & Testing

### GitHub UI Verification

- [ ] Navigate to Settings → Secrets and variables → Actions
- [ ] All 20 secrets appear in list:
  - [ ] TURBO_TOKEN ✓
  - [ ] TURBO_TEAM ✓
  - [ ] DATABASE_URL ✓
  - [ ] DIRECT_URL ✓
  - [ ] JWT_PRIVATE_KEY_TEST ✓
  - [ ] JWT_PUBLIC_KEY_TEST ✓
  - [ ] RAILWAY_TOKEN ✓
  - [ ] AWS_ACCESS_KEY_ID ✓
  - [ ] AWS_SECRET_ACCESS_KEY ✓
  - [ ] VERCEL_TOKEN ✓
  - [ ] VERCEL_ORG_ID ✓
  - [ ] VERCEL_PROJECT_ID_WEB ✓
  - [ ] VERCEL_PROJECT_ID_AUTH ✓
  - [ ] VERCEL_PROJECT_ID_PLATFORM ✓
  - [ ] VERCEL_PROJECT_ID_ADMIN ✓
  - [ ] VERCEL_PROJECT_ID_IB_PORTAL ✓
  - [ ] NEXT_PUBLIC_API_URL ✓
  - [ ] NEXT_PUBLIC_WS_URL ✓
  - [ ] STAGING_API_URL ✓
  - [ ] PROD_API_URL ✓

**Date Verified**: \***\*\_\_\_\*\***

---

### CI Pipeline Validation

Trigger test run:

```bash
git push -f origin develop
# Monitor: https://github.com/krishan/protrader-sim/actions
```

**Expected Results**:

- [ ] **typecheck** ✓ PASS (uses DATABASE_URL)
- [ ] **lint** ✓ PASS
- [ ] **test** ✓ PASS (uses JWT\_\*\_TEST keys)
- [ ] **build** ✓ PASS (uses NEXT*PUBLIC*\* vars)
- [ ] **deploy-staging** ✓ PASS (uses RAILWAY_TOKEN)
- [ ] **deploy-production** ✓ PASS (uses AWS keys)
- [ ] **deploy-frontend** ✓ PASS — all 5 matrix runs (uses VERCEL*TOKEN, VERCEL_ORG_ID, and all VERCEL_PROJECT_ID*\* secrets)
- [ ] Staging health check: **200 OK**
- [ ] Production health check: **200 OK**

**Date Tested**: \***\*\_\_\_\*\***  
**Result**: [ ] All Pass / [ ] Failures (see notes)

**Failures (if any)**:

```


```

---

### Local Validation Tests

```bash
# Test 1: Build caching
TURBO_TOKEN=<value> TURBO_TEAM=<value> pnpm turbo build --remote-only
# Expected: Cache hits, no errors

# Test 2: Database generation (if local DB available)
DATABASE_URL="postgresql://user:pass@host:5432/db" pnpm db:generate
# Expected: Prisma client generated successfully

# Test 3: JWT key validation (manual test)
# Create a test token and verify signature
# Code provided in setup guide

# Test 4: AWS credentials
aws configure  # Set keys
aws sts get-caller-identity
# Expected: Account ID and user ARN displayed

# Test 5: Railway token
RAILWAY_TOKEN=<value> railway whoami
# Expected: Account name displayed
```

**Date Tested**: \***\*\_\_\_\*\***

- [ ] Test 1 (Turbo): PASS / FAIL
- [ ] Test 2 (DB): PASS / FAIL
- [ ] Test 3 (JWT): PASS / FAIL
- [ ] Test 4 (AWS): PASS / FAIL
- [ ] Test 5 (Railway): PASS / FAIL

---

### Endpoint Tests

**Staging Endpoint**:

```bash
curl -I https://api-staging.railway.app/health
# Expected: 200 OK
```

- [ ] Status: 200 OK
- [ ] Tested: \***\*\_\_\_\*\***

**Production Endpoint**:

```bash
curl -I https://api.protrader-sim.com/health
# Expected: 200 OK
```

- [ ] Status: 200 OK
- [ ] Tested: \***\*\_\_\_\*\***

---

## Sign-Off

- [ ] All 20 secrets added to GitHub
- [ ] All CI/CD jobs passing
- [ ] Staging deployment verified (Railway)
- [ ] Production deployment verified (AWS ECS)
- [ ] Health endpoints responding
- [ ] No errors in GitHub Actions logs
- [ ] Documentation updated
- [ ] Team members notified

**Completed By**: \***\*\_\_\_\*\***  
**Completion Date**: \***\*\_\_\_\*\***  
**Review Date**: \***\*\_\_\_\*\***  
**Reviewer**: \***\*\_\_\_\*\***

**Final Notes**:

```




```

---

## Next Steps (After Completion)

1. **Share credentials** with team members who need CI access
2. **Schedule rotation** reminders (quarterly for API tokens, 90 days for AWS keys)
3. **Document** in team wiki/handbook
4. **Monitor** GitHub Actions for any secret-related errors
5. **Review** secret access audit log monthly

---

## Reference Documents

- [Detailed Setup Guide](./GITHUB_SECRETS_SETUP.md)
- [Quick Reference](./GITHUB_SECRETS_QUICK_REF.md)
- [CI Workflow](../workflows/ci.yml)
- [Environment Template](../apps/api/.env.example)
