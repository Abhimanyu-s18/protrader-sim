# ProTraderSim Leverage Limits - Quick Start Guide

## Prerequisites

Before using the leverage limit system, ensure you have the following:

### Redis (v6.0+ required)

- **Purpose**:
  - Storing temporary admin leverage overrides (with auto-expiry via TTL)
  - Caching price data for real-time margin calculations and margin watch lists
- **Connection**: Configure via `REDIS_URL` environment variable (default: `redis://localhost:6379`)
- **Redis v6.0+ Requirements**:
  - **ACLs (Access Control Lists)**: Used for per-client authentication and authorization
  - **Improved TTL semantics**: Enhanced key expiry behavior and lazy/active eviction policies
  - **Streams (optional)**: Leveraged for event sourcing in audit log streaming
  - **Commands used**: `SET` with `EX` (TTL), `GET`, `DEL`, `SMEMBERS`, `SADD`, `SREM`, `EXPIRE`
- **Usage in leverage system**: Admin overrides stored as `leverage_override:{userId}:{assetClass}` with configurable TTL (default: 24h, set via `expires_in_hours` parameter)
- **Additional usage**: Prices cached with TTL (`PRICE_TTL_SECONDS`), margin watch sets for monitoring open positions
- **Minimum client**: redis-js v4.0+, redis-py v4.0+, or equivalent with v6 command support

### Node.js (v18+)

Required to run the API server.

### PostgreSQL

Stores user jurisdiction data and trade records. Ensure your database is set up and the `User` table includes the `jurisdiction` field.

---

## What Was Implemented

A **jurisdiction-aware leverage validation system** that enforces regulatory compliance across 7 regulatory frameworks:

- **EU/UK (ESMA)**: 30:1 Forex, 20:1 stocks/indices, 2:1 crypto
- **US (CFTC)**: 50:1 Forex, 4:1 stocks, 1:1 crypto
- **ASIC (Australia)**: 30:1 Forex, 20:1 stocks/indices, 10:1 crypto
- **DFSA (UAE)**: 30:1 Forex, 20:1 stocks/indices, 5:1 crypto
- **FSA Seychelles**: 50:1 Forex, 100:1 indices/commodities, 10:1 crypto
- **FSC Mauritius**: 50:1 Forex
- **OTHER**: 20:1 for all asset classes (Forex, Stocks, Indices, Commodities, Crypto) — conservative default for unregulated jurisdictions

## How It Works

### 1. User Opens Trade Form

Trader navigates to trading platform and sees their jurisdiction-specific max leverage:

```
EUR/USD · Leverage up to 30:1 (EU)
```

### 2. Trader Places Order

When submitting `POST /v1/trades`, the backend:

1. Fetches trader's jurisdiction from database
2. Maps instrument asset class to leverage type
3. Validates leverage against jurisdiction limits
4. Returns 403 error if violated

```
Error: "Leverage Compliance Violation: Your jurisdiction (US) does not allow leverage above 4:1 for Stocks. Max allowed leverage for your jurisdiction is 4:1."
```

### 3. Admin Can Override (Optional)

Admins can grant temporary leverage override via:

```bash
POST /v1/admin/leverage-overrides/:userId
{
  "max_leverage": 100,
  "asset_class": "FOREX",
  "reason": "Emergency trading permission for VIP client",
  "expires_in_hours": 24
}
```

## Key Files

| File                                                                                                                               | Purpose                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [apps/api/src/lib/leverage-limits.ts](../../apps/api/src/lib/leverage-limits.ts)                                                   | Core validation logic (36 test cases)                         |
| [apps/api/src/routes/trades.ts](../../apps/api/src/routes/trades.ts)                                                               | Integration: validates leverage before creating trades        |
| [apps/api/src/routes/admin/index.ts](../../apps/api/src/routes/admin/index.ts)                                                     | Admin override endpoints (GET/POST/DELETE)                    |
| [apps/platform/src/app/(protected)/symbols/[symbol]/page.tsx](<../../apps/platform/src/app/(protected)/symbols/[symbol]/page.tsx>) | UI: shows jurisdiction & max leverage                         |
| [packages/types/src/index.ts](../../packages/types/src/index.ts)                                                                   | Type definitions: Jurisdiction enum + User.jurisdiction field |

## Testing

### Run All Tests

```bash
cd apps/api
npx vitest run src/lib/leverage-limits.test.ts
```

Expected output:

```
✓ src/lib/leverage-limits.test.ts (36 tests) 6ms
```

### Run TypeScript Check

```bash
pnpm typecheck
```

Expected: ✅ Pass (all packages)

## API Reference

### Platform (Frontend)

**User gets jurisdiction info:**

```typescript
GET /v1/users/me
Response: { id, jurisdiction: "EU", ... }
```

**Trade placement (with automatic leverage validation):**

```typescript
POST /v1/trades
{
  "symbol": "EURUSD",
  "direction": "BUY",
  "units": 1.0,
  // leverage is NOT in request body — determined by server
}
// Returns 403 if leverage exceeds user's jurisdiction limit
```

**How leverage is determined on the server:**

1. Backend fetches the instrument's leverage from the database (e.g., EUR/USD has 50:1 leverage configured)
2. If no instrument leverage exists, apply the jurisdiction's default maximum leverage (from jurisdiction-specific settings)
3. Backend resolves any active user overrides from Redis (`leverage_override:{userId}:{assetClass}`)
4. Backend maps instrument's asset class (Forex/Stock/Crypto/etc) to the user's jurisdiction
5. Compares resolved leverage against jurisdiction limit (e.g., US/Stocks = 4:1 max)
6. If leverage exceeds jurisdiction limit AND no active override, returns 403 with compliance error
7. Otherwise, trade proceeds with the instrument's configured leverage

### Admin Panel

**Authentication Required**: All admin leverage override endpoints require authentication and RBAC authorization.

- **Authorization**: Caller must have `SUPER_ADMIN` or `ADMIN` role
- **Headers**: Include `Authorization: Bearer <token>` in requests
- **Responses**: Unauthorized requests return 401 (missing token) or 403 (insufficient permissions)

**Note on asset_class parameter**: The three endpoints handle `asset_class` differently by design:

- **POST** (create): Accepts `asset_class` in the request body — the override is created for a specific asset class
- **GET** (check): Accepts `asset_class` as a query parameter to look up an override for a specific asset class
- **DELETE** (revoke): Accepts `asset_class` as a query parameter to revoke an override for a specific asset class

This pattern allows clients to explicitly target overrides per asset class when checking or revoking, while creation embeds the asset class in the request payload.

**Create override:**

```typescript
POST /v1/admin/leverage-overrides/123456
// Headers: Authorization: Bearer <token>
// Required role: SUPER_ADMIN or ADMIN

{
  "max_leverage": 100,
  "asset_class": "FOREX",
  "reason": "VIP client exception",
  "expires_in_hours": 24
}
// Returns: { success: true, override_expires_at: "2026-04-15T..." }
```

**Check override:**

```typescript
GET /v1/admin/leverage-overrides/123456?asset_class=FOREX
// Headers: Authorization: Bearer <token>
// Required role: SUPER_ADMIN or ADMIN
// Returns: { data: {...}, has_override: true }
```

**Revoke override:**

```typescript
DELETE /v1/admin/leverage-overrides/123456?asset_class=FOREX
// Headers: Authorization: Bearer <token>
// Required role: SUPER_ADMIN or ADMIN
// Returns: { success: true }
```

## Error Messages

**Canonical error template** (single format, used everywhere — API responses, UI toasts, logs):

```
Leverage Compliance Violation: Your jurisdiction ({jurisdiction}) does not allow
leverage above {max_leverage}:1 for {instrument_type}. Max allowed leverage
for your jurisdiction is {max_leverage}:1.
```

**Example variables:**

- `{jurisdiction}`: "US", "EU", "AU", etc. (from `User.jurisdiction`)
- `{instrument_type}`: "Forex", "Stocks", "Crypto", "Commodities", "Indices"
- `{max_leverage}`: "4", "30", "50", etc. (limit from jurisdiction rules)

**Context mapping:**

- **API endpoints** (POST /v1/trades): Return full template as error message in 403 response
- **UI toast/alerts**: Display same template for consistency
- **Logs**: Include template + admin override check result ("override not found" or "override expired")
- **Short format deprecated**: The phrase "Contact support if you need an override" is informational; always include the full context string above.

## Compliance Features

✅ **Regulatory compliance** across 7 frameworks  
✅ **Auto-expiring overrides** in Redis with TTL  
✅ **RBAC enforcement** (SUPER_ADMIN/ADMIN only)  
✅ **Clear error messages** for traders  
✅ **Type-safe** with TypeScript strict mode  
✅ **Fully tested** (36 test cases, 100% coverage of validation logic)  
⚠️ **Audit trail (Required for production)** — Currently console logs only; **persistent audit table MUST be implemented before production deployment** (see Pre-Production Checklist below)

## What Still Has Leverage Overrides UI

The admin panel now has **full leverage override management**:

### Admin UI Features ✅

**1. Active Overrides Display**

- Shows all active leverage overrides for a user
- Displays: asset class, max leverage, expiry time, granted by
- "Revoke" button to immediately cancel override
- Green visual styling to indicate active status

**2. Create Override Form**

- Asset class selector (FOREX, STOCK, INDEX, COMMODITY, CRYPTO)
- Max leverage input (1-500, with validation)
- Duration selector (1h, 6h, 12h, 24h, 72h, 168h, 720h)
- Reason textarea (min 10 chars for audit trail)
- Submit button with loading state

**3. How to Use**

1. Navigate to Admin Panel → Users
2. Click on a user's detail page
3. Scroll to "Leverage Overrides" section
4. To create: Fill form and click "Create Override"
5. To revoke: Click "Revoke" button next to active override

### Admin Panel Location

`apps/admin/src/app/(protected)/users/[id]/page.tsx`

## Troubleshooting

### User can't trade due to leverage compliance error

1. Check user's jurisdiction: `GET /v1/users/:id` (admin endpoint)
2. Check instrument leverage in database
3. Verify jurisdiction rules in [leverage-limits.ts](../../apps/api/src/lib/leverage-limits.ts)
4. If needed, create override: `POST /v1/admin/leverage-overrides/:userId`

### "Cannot read properties of null (reading 'jurisdiction')"

Make sure the User type in `packages/types/src/index.ts` includes:

```typescript
jurisdiction: Jurisdiction
```

### Null/Missing Jurisdiction Handling

When a trader's `user.jurisdiction` field is `null`, `undefined`, or not set:

- **Current behavior**: Trades are rejected with a `400` error response
- **Error message**: `"User jurisdiction not set. Contact support to complete your profile setup."`
- **Root cause**: The `jurisdiction` field is required in the `User` type and validation occurs before `validateLeverage()` is called
- **Resolution**: Ensure all user accounts have a valid jurisdiction assigned during registration or KYC approval
- **For admins**: If a trader's jurisdiction is missing, navigate to their user profile in the admin panel and select a jurisdiction before they can trade

If a trader receives this error, they should:

1. Verify they completed the registration/KYC process
2. Check that their account status shows "APPROVED"
3. Contact support if the issue persists

### Override not working

**Troubleshooting checklist**:

- Verify Redis connection: `redis-cli ping` (should return "PONG")
- Check admin API endpoints: `GET /admin/overrides` and `GET /admin/overrides/stats`
- Example: `curl -H "Authorization: Bearer $JWT" http://localhost:4000/api/admin/overrides`
- Verify override key format: `leverage_override:{userId}:{assetClass}`
- Check TTL hasn't expired (look for `expires_at` in API response)
- Ensure admin has SUPER_ADMIN or ADMIN role
- Confirm asset class matching (FOREX vs STOCK vs CRYPTO)

**Redis connectivity behavior**:

- When Redis is unavailable:
  - **Leverage validation**: Fails closed — trades are rejected with 503 if overrides cannot be verified
  - **Price caching**: Fails open — fallback to database prices occurs
  - **Rationale**: Overrides may be compliance-critical; price cache is performance optimization
- Check Redis connection status via logs in `apps/api/src/lib/redis.ts`
- For production, ensure Redis has appropriate timeouts and retry logic configured

### Listing all active overrides

To query active overrides directly:

- **Redis keys**: Look for pattern `leverage_override:{userId}:{assetClass}` using `KEYS` command or Redis GUI
- **TTL inspection**: Each override key has a TTL set based on `expires_in_hours` (default 24h) — use `TTL` command to check remaining time

Example Redis queries:

```bash
# List all override keys
KEYS leverage_override:*

# Check TTL for specific override
TTL leverage_override:123456:FOREX
```

### Rate limiting on POST /v1/admin/leverage-overrides

The POST endpoint inherits global rate limiting (100 req/min global). For abuse protection:

- The endpoint requires `SUPER_ADMIN` or `ADMIN` role (enforced by middleware)
- Consider adding specific per-IP rate limiting for the admin override endpoint if abuse is detected
- Audit logging is handled via console logs (see Architecture Notes for persistent audit trail TODO)

### Where to check jurisdiction logic

Jurisdiction rules are defined in [leverage-limits.ts](../../apps/api/src/lib/leverage-limits.ts):

- `JURISDICTION_LIMITS` object contains all regulatory frameworks
- `validateLeverage()` function checks user jurisdiction against asset class limits
- Override is resolved in `trades.ts` before calling `validateLeverage()`

### Checking Redis TTLs for override expiry

When troubleshooting override expiry issues:

1. Use Redis client to check key existence and TTL
2. Default TTL is set via `expires_in_hours` parameter (24h default)
3. If override expired, the key is automatically deleted by Redis
4. Trade validation will then enforce default jurisdiction limits

To verify in code, check the override creation logic in the admin routes.

## Architecture Notes

- **Service layer**: `leverage-limits.ts` contains pure validation logic (no DB/network)
- **Route layer**: `trades.ts` calls service, handles HTTP concerns
- **Frontend**: Displays jurisdiction hint, Backend enforces limits
- **Storage**: Overrides stored in Redis with auto-expiry (no DB migration needed)
- **Audit**: ⚠️ **TODO** — Replace console logs with persistent audit trail:
  - Add `override_audit` table with: `id`, `timestamp`, `admin_id`, `user_id`, `action` ("GrantOverride"|"RevokeOverride"), `asset_class`, `old_leverage`, `new_leverage`, `reason`, `request_id`
  - Update `/admin/leverage-overrides` POST/DELETE routes to insert immutable audit row
  - Add composite indexes: `(user_id, timestamp)`, `(admin_id, timestamp)`, `(timestamp DESC)`
  - Add TTL policy: retain for 3 years (regulatory compliance)
  - Add tests: verify GrantOverride and RevokeOverride insert audit records

## Implemented Features

✅ **Admin override UI** — See "Admin UI Features" section above (location: `apps/admin/src/app/(protected)/users/[id]/page.tsx`)
✅ **Override check integration** — `validateLeverage()` in `trades.ts` checks Redis for active overrides before trade creation
✅ **Jurisdiction display** — Platform shows jurisdiction-specific max leverage in UI

## Pre-Production Checklist

🔴 **REQUIRED** before production deployment:

1. **Persistent audit trail** — See Architecture Notes → Audit section for complete schema and implementation requirements
   - Implement immutable `override_audit` table with audit record insertion on all override operations
   - Routes: `/admin/leverage-overrides` POST/DELETE must insert audit rows with admin_id, user_id, action ("GrantOverride"|"RevokeOverride"), asset_class, old_leverage, new_leverage, reason, request_id
   - TTL: Retain **3 years** for ESMA, CFTC, ASIC, DFSA, FSA Seychelles, FSC Mauritius, and OTHER regulatory compliance
   - Tests: Verify `GrantOverride` and `RevokeOverride` operations insert corresponding audit records
   - All override operations must call `insertAuditRecord()` (remove `console.log()` calls)
2. **Regulatory compliance review** — Ensure all 7 frameworks (EU/UK (ESMA), US (CFTC), ASIC, DFSA, FSA Seychelles, FSC Mauritius, OTHER) are documented
3. **Security audit** — Verify RBAC enforcement and no privilege escalation vectors

## Next Steps (Optional Enhancements)
