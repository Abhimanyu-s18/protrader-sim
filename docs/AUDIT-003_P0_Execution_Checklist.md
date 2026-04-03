# ProTraderSim — P0 Critical Tasks Execution Checklist

**Status:** 6 of 6 tasks completed — 0 remaining
**Created:** 2026-04-03
**Last Updated:** 2026-04-03 (v4.0)
**Owner:** Development Team
**Expected Remaining Effort:** 0 hours

---

## Pre-Execution Setup

- [x] Review AUDIT-001 section 4.5 (P0 Critical Tasks) in full
- [x] Review AUDIT-001 section 8 (Development Standards) for relevant standards
- [x] Ensure you have access to the codebase and can run `pnpm` commands
- [x] Verify local Docker Compose is running (`docker compose up -d` from repo root)
- [x] Create a feature branch: `git checkout -b fix/p0-critical-blockers`

---

## Completed Tasks (6 of 6)

### ✅ Task B-01: Fix Login Route `.constructor()` Bug — COMPLETED

**Verified:** `apps/api/src/routes/auth.ts` uses `new AppError()` directly at lines 192 and 197-204. No `.constructor()` pattern remains.

### ✅ Task B-02: Fix Trade Close Race Condition — COMPLETED

**Verified:** `apps/api/src/routes/trades.ts` uses `withSerializableRetry()` + `prisma.$transaction()` with `FOR UPDATE` locking, SSI isolation, and `updateMany` with status check. Same pattern applied to partial-close endpoint.

### ✅ Task B-03: Create `apps/api/Dockerfile` — COMPLETED

**Verified:** `apps/api/Dockerfile` exists with multi-stage build (builder + runner), health check, non-root user.

### ✅ Task B-04: Integrate Tests into CI Pipeline — COMPLETED

**Verified:** `apps/api/package.json` test script includes `--coverage` and coverage collection. `apps/api/jest.config.cjs` includes coverage thresholds (100% for calculations.ts). `apps/api/src/routes/trades.test.ts` uses correct API endpoints (POST /v1/trades with order_type field). `.github/workflows/ci.yml` runs tests without `--passWithNoTests`.

### ✅ Task B-05: Fix Withdrawal Balance Calculation — COMPLETED

**Verified:** `apps/api/src/routes/withdrawals.ts` uses `withSerializableRetry()` + transaction with `FOR UPDATE`, balance computed before ledger entry.

### ✅ Task B-06: Add Auth App to CORS Origins — COMPLETED

**Verified:** `http://localhost:3005` included via `AUTH_APP_URL` env var in both Socket.io and HTTP CORS configs in `apps/api/src/index.ts`.

---

---

## Final Verification (All Tasks Complete)

- [x] **B-01:** Login error bug fixed ✅
- [x] **B-02:** Trade close race condition fixed ✅
- [x] **B-03:** Dockerfile created ✅
- [x] **B-04:** Tests integrated to CI ✅
- [x] **B-05:** Withdrawal balance calc fixed ✅
- [x] **B-06:** Auth app CORS added ✅

### Pre-Commit Checklist

```bash
# Type check all projects
pnpm typecheck

# Lint all code
pnpm lint

# Run all tests
pnpm test

# Build all apps
pnpm build
```

✅ All should pass

### Commit All Changes

```bash
# Create consolidated commit for B-04
git add apps/api/package.json apps/api/jest.config.cjs .github/workflows/ci.yml
git commit -m "fix: integrate tests into CI pipeline with coverage thresholds"

# Push branch
git push -u origin fix/p0-critical-blockers
```

### Create Pull Request

```bash
# Create PR on GitHub
# Title: "fix: complete P0 critical blockers (5/6 done, B-04 remaining)"
# Body should reference:
# - 5 P0 tasks already completed (B-01, B-02, B-03, B-05, B-06)
# - B-04: test CI integration (this PR)
# - No breaking changes
# - Tests passing
# - Ready for merge
```

---

## Updated Timeline

| Task                      | Status   | Effort         | Completed            |
| ------------------------- | -------- | -------------- | -------------------- |
| B-01                      | ✅ DONE  | 1h             | Previously completed |
| B-02                      | ✅ DONE  | 2h             | Previously completed |
| B-03                      | ✅ DONE  | 1h             | Previously completed |
| B-04                      | ✅ DONE  | 2h             | 2026-04-03           |
| B-05                      | ✅ DONE  | 1h             | Previously completed |
| B-06                      | ✅ DONE  | 0.5h           | Previously completed |
| **Verification & Commit** | **0.5h** | **After B-04** |                      |
| **Total Remaining**       | **0.5h** |                |                      |

---

## Questions?

Refer to:

- **Task details & code examples:** `/docs/AUDIT-001_Comprehensive_Project_Audit.md` Section 4.5
- **Development standards:** `/docs/AUDIT-001_Comprehensive_Project_Audit.md` Section 8
- **API architecture:** `/docs/Core Technical Specifications/PTS-API-001_API_Specification.md`
- **Database schema:** `/docs/Core Technical Specifications/PTS-DB-001_Database_Schema.md`
- **Audit update summary:** `/docs/AUDIT-002_Update_Summary.md`

---

**Created by:** Audit Review Process
**Last Updated:** 2026-04-03 (v3.0)
**Owner:** Development Lead
