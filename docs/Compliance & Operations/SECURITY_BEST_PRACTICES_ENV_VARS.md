# Security Best Practices — Environment Variables

**Quick Reference for ProTraderSim Developers**

---

## ✅ DO: Safe Practices

```bash
# ✅ Copy template and populate locally
cp packages/db/.env.example packages/db/.env
# Then edit .env with YOUR credentials

# ✅ Check .gitignore before committing
git status  # Should NOT show any .env files

# ✅ Use environment variables for secrets
const dbUrl = process.env.DATABASE_URL

# ✅ Document placeholders in .env.example
# packages/db/.env.example
DATABASE_URL="postgresql://user:password@host:5432/database"
#            ^ Change 'user' to actual username
#                      ^ Change 'password' to actual password
```

---

## ❌ DON'T: Unsafe Practices

```bash
# ❌ NEVER commit .env files
git add packages/db/.env      # WRONG!
git add apps/api/.env.local   # WRONG!

# ❌ NEVER hardcode secrets in code
const dbUrl = "postgresql://protrader:secret123@localhost:5432/db"

# ❌ NEVER use the same password across environments
# Local password ≠ Staging password ≠ Production password

# ❌ NEVER commit backup files with secrets
packages/db/.env.bak      # WRONG!
apps/api/.env.backup      # WRONG!
.env.production.old        # WRONG!

# ❌ NEVER share credentials in chat, email, or documents
"Hey, database password is: mydb_password123"
```

---

## Incident Response

**If you accidentally commit secrets:**

1. **Stop and warn immediately** ⚠️
2. **Remove the file from git**:
   ```bash
   git rm --cached packages/db/.env.secret
   git commit -m "security: removed accidentally committed secrets"
   ```
3. **Rotate all exposed credentials** 🔄
4. **Purge from history** (requires git-filter-repo and force-push):
   ```bash
   git filter-repo --invert-paths --path packages/db/.env.secret
   git push origin --force-all
   ```
5. **Notify the security team** 📢

---

## Local Development Setup (Correct Way)

```bash
# 1. Clone repository
git clone https://github.com/org/protrader-sim.git
cd protrader-sim

# 2. Install dependencies
pnpm install

# 3. Copy templates for EACH environment file
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example apps/api/.env.local
cp apps/platform/.env.example apps/platform/.env.local
# ... (copy all .env.example files)

# 4. Edit YOUR local copies (NEVER commit these)
vi packages/db/.env  # Add YOUR database credentials
vi apps/api/.env.local  # Add YOUR API keys

# 5. These files are automatically in .gitignore
git status  # Should show no .env files!

# 6. Run the application
pnpm dev
```

---

## .gitignore Structure (Already Configured)

```gitignore
# Environment files — ALL variants ignored
.env                 # Root .env
.env.local          # Local overrides
.env.*.local        # App-specific local
.env.*.bak          # Backup files (NEVER commit)

# Safe to commit (for templates only)
!.env.example       # Template with placeholders
```

---

## Common Mistakes & Fixes

### Mistake 1: Adding .env.local to git

```bash
# WRONG: Accidentally staged
git add apps/api/.env.local
git status
#   new file:   apps/api/.env.local

# FIX: Remove from staging
git rm --cached apps/api/.env.local
git commit --amend  # Include in previous commit
```

### Mistake 2: Committing with git add .

```bash
# WRONG: Added everything
git add .

# BEFORE PUSHING:
git reset HEAD apps/api/.env.local packages/db/.env
git commit -m "reverted: removed accidental secret files"
git push
```

### Mistake 3: New .env file not in .gitignore

```bash
# Check if file should be ignored
git check-ignore -v packages/db/.env
# Output: packages/db/.env (from .gitignore line 15)
#         OR: no output (NOT ignored!)

# FIX: Add to .gitignore if missing
echo "packages/db/.env" >> .gitignore
```

---

## Template Examples

### ✅ CORRECT: .env.example (Safe to Commit)

```bash
# packages/db/.env.example
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"

# apps/api/.env.example
DATABASE_URL="postgresql://user:password@localhost:5432/database"
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
TWELVE_DATA_API_KEY="your_api_key_here"
```

### ❌ WRONG: .env (Never Commit)

```bash
# packages/db/.env
DATABASE_URL="postgresql://krishan:mySecretPassword123@db.example.com:5432/prod_database"
DIRECT_URL="postgresql://krishan:mySecretPassword123@db.example.com:5432/prod_database"

# apps/api/.env
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...REAL_PRIVATE_KEY...-----END PRIVATE KEY-----"
TWELVE_DATA_API_KEY="d8f2c9e1b4a7e3f5d2c8"
```

---

## Reference

- **Incident Details**: See `SECURITY_INCIDENT_REMEDIATION.md`
- **Setup Instructions**: See `PTS-ENV-001_Environment_Setup.md`
- **Team Policy**: Ask your tech lead for credential rotation schedule
