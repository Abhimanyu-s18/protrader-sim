# GitHub Secrets Setup - Complete Documentation Index

## 📋 Start Here

This document suite provides complete instructions for setting up **18 GitHub repository secrets and 2 variables** (20 total config items) required by ProTraderSim's CI/CD pipeline.

**Estimated Time**: 75-105 minutes (including external service setup and Vercel project linking)  
**Difficulty**: Medium (requires external service access)  
**Prerequisites**: GitHub admin access, external service accounts (Vercel, Railway, AWS, Supabase)

---

## 📚 Documentation Map

### 1. **COMPREHENSIVE SETUP GUIDE** (Main Document)

📄 **File**: `.github/GITHUB_SECRETS_SETUP.md` (500+ lines)

**Use this when**: You need detailed explanations of what each secret does, how to obtain it, and why it matters.

**Contains**:

- Overview of all 18 secrets and 2 variables with context
- Deep dive into each secret:
  - What it does
  - Where to get it
  - Format and validation
  - Security considerations
- External service sources and URLs
- Phase-by-phase setup instructions with estimated times
- Troubleshooting section
- Secret rotation schedule

**Read time**: 30-45 minutes

---

### 2. **QUICK REFERENCE SHEET**

📄 **File**: `.github/GITHUB_SECRETS_QUICK_REF.md`

**Use this when**: You want a fast lookup reference while implementing, or need to quickly find a command.

**Contains**:

- All 18 secrets and 2 variables in table format
- External service URLs quick lookup
- Secret generation commands (copy-paste ready)
- 7-phase setup sequence with time estimates
- Secret format examples
- Verification commands
- Rotation procedures for each secret

**Read time**: 5-10 minutes

---

### 3. **INTERACTIVE CHECKLIST**

📄 **File**: `.github/GITHUB_SECRETS_CHECKLIST.md`

**Use this when**: You're actively implementing and need to track progress.

**Contains**:

- Phase-by-phase checklist (7 phases)
- Per-secret checkbox list with notes sections
- Local validation test commands
- Health endpoint verification steps
- Sign-off section for audit trail
- Progress tracking across all 18 secrets and 2 variables

**Instructions**: Print or open in split-pane and track as you go

---

### 4. **ENVIRONMENT TEMPLATE**

📄 **File**: `apps/api/.env.example` (Updated template)

**Use this when**: Setting up local development or understanding which variables are needed.

**Contains**:

- All environment variables organized by category
- Comments explaining each variable
- Example values for local development
- Local vs staging vs production differences
- Instructions for JWT key generation (inline)

---

### 5. **CI WORKFLOW REFERENCE**

📄 **File**: `.github/workflows/ci.yml` (Existing)

**Use this when**: You need to see where each secret is actually used in CI/CD.

**Reference**: The CI workflow reads these secrets across 7 jobs:

- `typecheck`: Uses `DATABASE_URL`, `DIRECT_URL`, `TURBO_*`
- `lint`: Uses `TURBO_*`
- `test`: Uses `JWT_*_TEST` keys, `DATABASE_URL`
- `build`: Uses `TURBO_*`, `NEXT_PUBLIC_*`
- `deploy-staging`: Uses `RAILWAY_TOKEN`, `STAGING_API_URL`
- `deploy-production`: Uses `AWS_*`, `PROD_API_URL`
- `deploy-frontend` _(matrix — runs once per app)_: Uses `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_WEB`, `VERCEL_PROJECT_ID_AUTH`, `VERCEL_PROJECT_ID_PLATFORM`, `VERCEL_PROJECT_ID_ADMIN`, `VERCEL_PROJECT_ID_IB_PORTAL`

---

## 🎯 Implementation Paths

### Path A: Quick Implementation (60 minutes)

For experienced DevOps engineers who understand the infrastructure:

1. Read: GITHUB_SECRETS_QUICK_REF.md (5 min)
2. Generate: 7-phase setup sequence (40 min)
3. Track: GITHUB_SECRETS_CHECKLIST.md (10 min)
4. Validate: Trigger CI pipeline (5 min)

### Path B: Comprehensive Implementation (90 minutes)

For engineers new to the project:

1. Read: GITHUB_SECRETS_SETUP.md (30 min)
2. Reference: GITHUB_SECRETS_QUICK_REF.md (5 min)
3. Implement: GITHUB_SECRETS_CHECKLIST.md (40 min)
4. Troubleshoot: Refer to setup guide section (10 min)
5. Validate: Trigger CI pipeline (5 min)

### Path C: Urgent/Emergency Setup

For deploying a fix immediately:

1. Check: Do we have all 18 secrets and 2 variables already? (GitHub Actions page)
2. Missing Some?: Use QUICK_REF.md to quickly add them (10-15 min per secret)
3. CI Failing on `deploy-frontend`?: The 5 `VERCEL_PROJECT_ID_*` secrets are the most common cause — run `vercel link` in each app and add them
4. CI Failing elsewhere?: Jump to troubleshooting in SETUP_GUIDE.md

---

## 🔑 The 18 Secrets + 2 Variables at a Glance

### Build/Cache System

**Secrets (1)**:

- `TURBO_TOKEN` - Vercel remote cache token

**Variables (1)**:

- `TURBO_TEAM` - Vercel team identifier (non-sensitive, use GitHub Variables)

### Database (2)

- `DATABASE_URL` - Connection pooler URL
- `DIRECT_URL` - Direct connection for migrations

### Authentication (2)

- `JWT_PRIVATE_KEY_TEST` - Test JWT signing key (2048-bit RSA private)
- `JWT_PUBLIC_KEY_TEST` - Test JWT verification key (2048-bit RSA public)

### Deployment Infrastructure

**Secrets (4)**:

- `RAILWAY_TOKEN` - Railway (staging) authentication
- `AWS_ACCESS_KEY_ID` - AWS credentials (production)
- `AWS_SECRET_ACCESS_KEY` - AWS credentials (production)
- `VERCEL_TOKEN` - Vercel frontend deployment (all 5 apps)

**Variables (1)**:

- `VERCEL_ORG_ID` - Vercel organization identifier (non-sensitive, use GitHub Variables)

### Vercel Project IDs (5) ⚠️ Previously Undocumented

These are required by the `deploy-frontend` matrix job. Each of the 5 Next.js apps deploys to its own Vercel project and needs its own project ID secret.

- `VERCEL_PROJECT_ID_WEB` - Vercel project ID for the `web` marketing site
- `VERCEL_PROJECT_ID_AUTH` - Vercel project ID for the `auth` app
- `VERCEL_PROJECT_ID_PLATFORM` - Vercel project ID for the `platform` trading dashboard
- `VERCEL_PROJECT_ID_ADMIN` - Vercel project ID for the `admin` back-office panel
- `VERCEL_PROJECT_ID_IB_PORTAL` - Vercel project ID for the `ib-portal` app

Obtain each by running `vercel link` inside the app directory, then reading `cat .vercel/project.json`.

### Application Configuration (4)

- `NEXT_PUBLIC_API_URL` - Frontend API endpoint
- `NEXT_PUBLIC_WS_URL` - Frontend WebSocket endpoint
- `STAGING_API_URL` - Staging health check URL
- `PROD_API_URL` - Production health check URL

---

## ⚡ Quick Command Reference

### Generate JWT Keys (Use in Test Environment)

### Get Turbo Token

```bash
# 1. Go to: https://vercel.com/account/tokens
# 2. Create new token (Full Account scope)
# 3. Copy token value
# 4. Set in GitHub as: gh secret set TURBO_TOKEN --body "vercel_..."
```

### Get Turbo Team

```bash
# 1. Go to: https://vercel.com/teams
# 2. Copy Team Slug
# 3. Set in GitHub as: gh secret set TURBO_TEAM --body "team-name"
```

### Get Database URLs

```bash
# Supabase:
# 1. https://supabase.com/dashboard/projects
# 2. Settings → Database → Copy connection string

# AWS RDS:
# 1. https://console.aws.amazon.com/rds
# 2. Connections & security → Copy Endpoint
# 3. Construct: postgresql://user:pass@endpoint:5432/dbname
```

### Setup AWS IAM Access Key

```bash
# 1. https://console.aws.amazon.com/iam/home
# 2. Users → protrader-ci → Security credentials
# 3. Create access key
# 4. Set both in GitHub:
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY --body "..."
```

### Get Railway Token

```bash
# 1. https://railway.app/account/tokens
# 2. Copy token
# 3. gh secret set RAILWAY_TOKEN --body "..."
```

### Get Vercel Token & Org ID

```bash
# Token:
# 1. https://vercel.com/account/tokens
# 2. Create new token (Full Account)
# 3. gh secret set VERCEL_TOKEN --body "vercel_..."

# Org ID:
# 1. https://vercel.com/account/settings
# 2. Copy "Organization/Team ID"
# 3. gh secret set VERCEL_ORG_ID --body "team_..."
```

---

## 🔐 Security Guidelines

### What NOT to Do

- ❌ Never commit `.env.local` with real secrets to git
- ❌ Never echo secrets in CI logs: `echo $JWT_PRIVATE_KEY` (use `echo ***`)
- ❌ Never hardcode secrets in code
- ❌ Never share secrets in Slack/email (use password manager)
- ❌ Never leave private keys in terminal history

### What to Do

- ✅ Use GitHub Secrets (write-only, encrypted)
- ✅ Use GitHub Variables for non-sensitive config (TURBO_TEAM, ORG_ID)
- ✅ Rotate secrets quarterly
- ✅ Audit secret access in GitHub logs
- ✅ Use 2048-bit RSA minimum for JWT keys
- ✅ Use different keys per environment (test vs prod)

---

## 📋 Verification Checklist

After adding all 18 secrets and 2 variables, verify:

### GitHub UI Verification

- [ ] Navigate to Settings → Secrets and variables → Actions
- [ ] All 18 secrets visible in list
- [ ] All 2 variables visible in list (TURBO_TEAM, VERCEL_ORG_ID)
- [ ] No typos in secret names

### Local Validation

- [ ] `pnpm turbo build` works with TURBO\_\* tokens
- [ ] `pnpm db:generate` works with DATABASE_URL
- [ ] Tests pass with JWT\_\*\_TEST keys
- [ ] `aws sts get-caller-identity` works with AWS keys
- [ ] `railway whoami` works with RAILWAY_TOKEN

### CI Pipeline Validation

```bash
# Trigger test deployment to staging
git push -f origin develop

# Monitor at: https://github.com/YOUR/protrader-sim/actions
# All jobs should PASS:
✓ typecheck
✓ lint
✓ test
✓ build
✓ deploy-staging (if on develop)
✓ deploy-production (if on main)
```

### Health Endpoint Validation

```bash
# Test endpoints are responding
curl https://api-staging.railway.app/health
curl https://api.protrader-sim.com/health
# Both should respond with 200 OK
```

---

## 🆘 Troubleshooting Quick Links

### Problem: CI fails with "secret not found"

→ Check spelling (secrets are case-sensitive)  
→ See SETUP_GUIDE.md section on "Secret not found in CI"

### Problem: "JWT key not found" in tests

→ Ensure JWT\_\*\_TEST keys are set  
→ Check newline escaping (`\n` characters present)  
→ See SETUP_GUIDE.md section on JWT key troubleshooting

### Problem: Database connection fails

→ Test URL locally: `psql $DATABASE_URL`  
→ Check IP whitelist in Supabase/RDS  
→ See SETUP_GUIDE.md Database Secrets section

### Problem: AWS deployment fails

→ Verify IAM permissions on user  
→ Test credentials: `aws sts get-caller-identity`  
→ See SETUP_GUIDE.md AWS section

### Problem: Railway deployment fails

→ Use Railway's built-in authentication: `railway login` (follows CLI auth flow securely)
→ Verify token access (stored in Railway CLI config, not visible in history): `railway whoami`

---

## 🔄 Rotation Schedule

Keep this calendar handy:

| Secret       | Frequency          | Next Rotation    |
| ------------ | ------------------ | ---------------- |
| TURBO_TOKEN  | Quarterly          | \***\*\_\_\*\*** |
| AWS Keys     | 90 days            | \***\*\_\_\*\*** |
| JWT Keys     | Annually           | \***\*\_\_\*\*** |
| DATABASE_URL | On password change | \***\*\_\_\*\*** |
| All others   | Quarterly          | \***\*\_\_\*\*** |

---

## 📞 Support & Questions

If you run into issues:

1. **Check docs**: Search relevant document for your error
2. **Check GitHub Actions**: Look at job logs for specific error
3. **Test locally**: Does the same command work locally?
4. **Validate secrets**: Are they set in GitHub? Are values correct?
5. **Check IAM/permissions**: Do service accounts have needed permissions?

---

## 📝 Files Created/Updated

```
.github/
├── GITHUB_SECRETS_SETUP.md              ← Comprehensive guide
├── GITHUB_SECRETS_QUICK_REF.md          ← Quick reference
├── GITHUB_SECRETS_CHECKLIST.md          ← Interactive checklist
├── GITHUB_SECRETS_INDEX.md              ← This file
└── workflows/
    └── ci.yml                           ← Uses all 18 secrets and 2 variables

apps/api/
└── .env.example                         ← Updated template
```

---

## 🎓 Learning Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Vercel API Tokens](https://vercel.com/account/tokens)
- [Railway Documentation](https://docs.railway.app)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [JWT RS256 Standards](https://tools.ietf.org/html/rfc7518#section-3.3)
- [OpenSSL RSA Key Generation](https://www.openssl.org/docs/man1.1.1/man1/openssl-genpkey.html)

---

**Created**: April 2026  
**Last Updated**: April 2026  
**Maintained By**: DevOps Team  
**Status**: ✅ Complete & Ready for Implementation
