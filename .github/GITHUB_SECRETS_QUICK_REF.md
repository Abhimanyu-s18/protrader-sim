# ProTraderSim GitHub Secrets Quick Reference

## 20 Required Secrets Overview

```
CATEGORY          SECRET NAME                          ENVIRONMENT    STATUS
──────────────────────────────────────────────────────────────────────────────
Build              1. TURBO_TOKEN                      All            [ ]
                   2. TURBO_TEAM                       All            [ ]

Database           3. DATABASE_URL                     Staging/Prod   [ ]
                   4. DIRECT_URL                       Staging/Prod   [ ]

Auth/Test          5. JWT_PRIVATE_KEY_TEST             Test/CI        [ ]
                   6. JWT_PUBLIC_KEY_TEST              Test/CI        [ ]

Deployment         7. RAILWAY_TOKEN                    Staging        [ ]
                   8. AWS_ACCESS_KEY_ID                Prod           [ ]
                   9. AWS_SECRET_ACCESS_KEY            Prod           [ ]
                  10. VERCEL_TOKEN                     All Frontends  [ ]
                  11. VERCEL_ORG_ID                    All Frontends  [ ]

Vercel Projects   12. VERCEL_PROJECT_ID_WEB            Prod           [ ]
                  13. VERCEL_PROJECT_ID_AUTH           Prod           [ ]
                  14. VERCEL_PROJECT_ID_PLATFORM       Prod           [ ]
                  15. VERCEL_PROJECT_ID_ADMIN          Prod           [ ]
                  16. VERCEL_PROJECT_ID_IB_PORTAL      Prod           [ ]

Application       17. NEXT_PUBLIC_API_URL              Staging/Prod   [ ]
                  18. NEXT_PUBLIC_WS_URL               Staging/Prod   [ ]
                  19. STAGING_API_URL                  Staging        [ ]
                  20. PROD_API_URL                     Prod           [ ]
```

---

## Secret Generation Commands

### JWT Keys (Required for CI)

**⚠️ Security Note**: Never commit private keys to the repository. Generate in a secure location and delete local copies after adding to GitHub Secrets.

---

## External Service Sources

| Service          | Secret                      | URL                                 | Notes                                 |
| ---------------- | --------------------------- | ----------------------------------- | ------------------------------------- |
| **Vercel**       | TURBO_TOKEN                 | https://vercel.com/account/tokens   | Account tokens only                   |
|                  | TURBO_TEAM                  | https://vercel.com/teams            | Team slug (not secret)                |
|                  | VERCEL_TOKEN                | https://vercel.com/account/tokens   | Full Account scope                    |
|                  | VERCEL_ORG_ID               | https://vercel.com/account/settings | Team ID (not secret)                  |
|                  | VERCEL_PROJECT_ID_WEB       | `cd apps/web && vercel link`        | `prj_...` from `.vercel/project.json` |
|                  | VERCEL_PROJECT_ID_AUTH      | `cd apps/auth && vercel link`       | `prj_...` from `.vercel/project.json` |
|                  | VERCEL_PROJECT_ID_PLATFORM  | `cd apps/platform && vercel link`   | `prj_...` from `.vercel/project.json` |
|                  | VERCEL_PROJECT_ID_ADMIN     | `cd apps/admin && vercel link`      | `prj_...` from `.vercel/project.json` |
|                  | VERCEL_PROJECT_ID_IB_PORTAL | `cd apps/ib-portal && vercel link`  | `prj_...` from `.vercel/project.json` |
| **Railway**      | RAILWAY_TOKEN               | https://railway.app/account/tokens  | Can be regenerated                    |
| **AWS IAM**      | AWS_ACCESS_KEY_ID           | https://console.aws.amazon.com/iam  | Create new access key                 |
|                  | AWS_SECRET_ACCESS_KEY       | https://console.aws.amazon.com/iam  | Generated with access key             |
| **Supabase/RDS** | DATABASE_URL                | https://supabase.com/dashboard      | Connection pooler                     |
|                  | DIRECT_URL                  | https://supabase.com/dashboard      | Direct connection                     |

---

## Setup Sequence

```
STEP 1: External Services (30 min)
├─☐ Create Vercel account (if not exists)
├─☐ Create Railway account (if not exists)
├─☐ Create AWS IAM user for CI
├─☐ Create Supabase project or AWS RDS instance
└─☐ Set up database backups

STEP 2: Generate Build Secrets (5 min)
├─☐ Generate TURBO_TOKEN from Vercel
└─☐ Get TURBO_TEAM from Vercel

STEP 3: Generate Database Secrets (10 min)
├─☐ Get DATABASE_URL from Supabase/RDS
├─☐ Get DIRECT_URL from Supabase/RDS
└─☐ Test connections locally

STEP 4: Generate Auth Secrets (10 min)
├─☐ Generate JWT RSA key pair
├─☐ Format with escaped newlines
├─☐ Set JWT_PRIVATE_KEY_TEST
└─☐ Set JWT_PUBLIC_KEY_TEST

STEP 5: Generate Deployment Secrets (15 min)
├─☐ Get RAILWAY_TOKEN from Railway
├─☐ Create AWS IAM access key pair
├─☐ Get VERCEL_TOKEN from Vercel
└─☐ Get VERCEL_ORG_ID from Vercel

STEP 5b: Link Vercel Projects (15 min — one per app)
├─☐ cd apps/web && vercel link → copy projectId → set VERCEL_PROJECT_ID_WEB
├─☐ cd apps/auth && vercel link → copy projectId → set VERCEL_PROJECT_ID_AUTH
├─☐ cd apps/platform && vercel link → copy projectId → set VERCEL_PROJECT_ID_PLATFORM
├─☐ cd apps/admin && vercel link → copy projectId → set VERCEL_PROJECT_ID_ADMIN
└─☐ cd apps/ib-portal && vercel link → copy projectId → set VERCEL_PROJECT_ID_IB_PORTAL
    (each projectId is in .vercel/project.json — do NOT commit these files)

STEP 6: Add Application Config (10 min)
├─☐ Set NEXT_PUBLIC_API_URL
├─☐ Set NEXT_PUBLIC_WS_URL (wss:// protocol)
├─☐ Set STAGING_API_URL
└─☐ Set PROD_API_URL

STEP 7: Validation (10 min)
├─☐ Trigger CI pipeline
├─☐ Check all jobs pass (including deploy-frontend matrix — 5 apps)
├─☐ Verify deployments
└─☐ Test health endpoints
```

---

## GitHub Secret Format Reference

### String Format (Most Secrets)

```
Name:  TURBO_TOKEN
Value: vercel_abcd1234efgh5678ijkl9012mnop3456
```

### Multi-line Format (RSA Keys)

Name: JWT_PRIVATE_KEY_TEST
Value: -----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrst
...
-----END RSA PRIVATE KEY-----

Note: Paste the entire PEM format text with actual newlines.
GitHub UI will handle the formatting automatically.

### Database URL Format

```
Name:  DATABASE_URL
Value: postgresql://user:password@host.region.rds.amazonaws.com:5432/dbname

Components:
- protocol: postgresql://
- user: database username
- password: database password
- host: RDS endpoint or Supabase host
- port: 5432 (default PostgreSQL)
- dbname: database name
```

### WebSocket URL Format

```
Name:  NEXT_PUBLIC_WS_URL
Value: wss://api.protrader-sim.com

Rules:
- Use ws:// for HTTP (local development only)
- Use wss:// for HTTPS (staging/production)
- Same host as NEXT_PUBLIC_API_URL
- No trailing path (just base URL)

⚠️  SECURITY: Never use ws:// in staging or production — it is unencrypted and vulnerable
    to eavesdropping and man-in-the-middle attacks. Use wss:// for any non-local environment.
```

---

## Verification Commands

### After Adding Secrets

```bash
# Navigate to GitHub repo settings
# Settings → Secrets and variables → Actions

# Should show all 20 secrets:
# ✓ TURBO_TOKEN
# ✓ TURBO_TEAM
# ✓ DATABASE_URL
# ✓ DIRECT_URL
# ✓ JWT_PRIVATE_KEY_TEST
# ✓ JWT_PUBLIC_KEY_TEST
# ✓ RAILWAY_TOKEN
# ✓ AWS_ACCESS_KEY_ID
# ✓ AWS_SECRET_ACCESS_KEY
# ✓ VERCEL_TOKEN
# ✓ VERCEL_ORG_ID
# ✓ VERCEL_PROJECT_ID_WEB
# ✓ VERCEL_PROJECT_ID_AUTH
# ✓ VERCEL_PROJECT_ID_PLATFORM
# ✓ VERCEL_PROJECT_ID_ADMIN
# ✓ VERCEL_PROJECT_ID_IB_PORTAL
# ✓ NEXT_PUBLIC_API_URL
# ✓ NEXT_PUBLIC_WS_URL
# ✓ STAGING_API_URL
# ✓ PROD_API_URL
```

### Test CI Pipeline

```bash
# Trigger CI with a test commit or re-run from GitHub UI
git commit --allow-empty -m "chore: trigger CI to verify secrets"
git push origin develop

# Or re-run from GitHub Actions UI:
# Repository → Actions → Select workflow → Re-run all jobs

# Monitor at: https://github.com/YOUR_ORG/YOUR_REPO/actions

# Expected outcomes:
# 1. typecheck ✓ (uses DATABASE_URL)
# 2. lint ✓
# 3. test ✓ (uses JWT_*_TEST keys)
# 4. build ✓ (uses NEXT_PUBLIC_* vars)
# 5. deploy-staging ✓ (uses RAILWAY_TOKEN)
# 6. deploy-production ✓ (uses AWS_* keys)
# 7. deploy-frontend ✓ (5 matrix runs — uses VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID_*)
```

### Health Endpoint Validation

```bash
# After deployment
curl https://api-staging.railway.app/health
# Response: {"status":"healthy",...}

curl https://api.protrader-sim.com/health
# Response: {"status":"healthy",...}
```

---

## Get Vercel Project IDs (First-Time Setup)

Run `vercel link` inside each app directory to connect it to a Vercel project. The project ID is written to `.vercel/project.json`.

```bash
# Quick loop — link all 5 apps and print their project IDs
for app in web auth platform admin ib-portal; do
  cd apps/$app
  vercel link   # Follow prompts to select/create the Vercel project
  echo "$app → $(cat .vercel/project.json)"
  cd ../..
done

# Then set each secret in GitHub:
gh secret set VERCEL_PROJECT_ID_WEB       --body "prj_..."
gh secret set VERCEL_PROJECT_ID_AUTH      --body "prj_..."
gh secret set VERCEL_PROJECT_ID_PLATFORM  --body "prj_..."
gh secret set VERCEL_PROJECT_ID_ADMIN     --body "prj_..."
gh secret set VERCEL_PROJECT_ID_IB_PORTAL --body "prj_..."
```

> ⚠️ Do **not** commit the generated `.vercel/` directories. They are already listed in `.gitignore`.

---

## Regenerate Old Secrets (Future Reference)

### Vercel Token Rotation (Quarterly)

```bash
# 1. Generate new token at https://vercel.com/account/tokens
# 2. Update secret in GitHub:
gh secret set TURBO_TOKEN --body "new_token_value"
# 3. Test with: TURBO_TOKEN=... pnpm turbo build --remote-only
# 4. Delete old token from Vercel dashboard
```

### AWS Key Rotation (90 days)

```bash
# 1. Go to AWS IAM Console
# 2. User → Security credentials → Create access key
# 3. Update secrets in GitHub:
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY --body "..."
# 4. Test with: aws sts get-caller-identity
# 5. Deactivate old key in IAM console
```

### JWT Key Rotation (Annually)

```bash
# 1. Generate new key pair:
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in jwt-private.pem -out jwt-public.pem

# 2. Update secrets with new keys
# 3. Redeploy to all environments
# 4. Monitor for any auth errors
# 5. Burn old keys after successful deployment
```

---

## GitHub UI Navigation

1. **Repository Settings**
   - Go to: Settings (top-right) → Secrets and variables → Actions

2. **Add New Secret**
   - Click: "New repository secret"
   - Fill: Name, Value
   - Click: "Add secret"

3. **Edit Secret**
   - Click secret name
   - Update value
   - Click "Update secret"

4. **Delete Secret**
   - Click three dots
   - Select "Delete"
   - Confirm

---

## Notes

- **Secrets are write-only**: Cannot view after creation (GitHub design)
- **Case-sensitive**: `TURBO_TOKEN` ≠ `turbo_token`
- **No spaces**: Names cannot contain spaces
- **Newline handling**: GitHub UI handles `\n` escaping automatically for RSA keys
- **Environment-specific**: Can override by branch or environment in workflows
- **Audit trail**: GitHub logs who accessed which secrets (visible in audit log)
