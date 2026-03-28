---
name: rbac-implementation
description: "Use when: implementing role-based access control, configuring staff hierarchies, enforcing authorization in routes, or managing user permissions. Ensures proper role cascades, permission checks, and regulatory compliance with FSC/FSA staff structures. Primary agents: Security, Coding, Architecture."
---

# RBAC Implementation — ProTraderSim

Master role-based access control for ProTraderSim's regulated financial platform. Enforce a **4-tier staff hierarchy** with proper cascading permissions and audit trails.

---

## 🏢 Role Hierarchy

ProTraderSim uses a **4-tier staff pyramid**:

```
                    SUPER_ADMIN
                         |
                       ADMIN
                         |
                 IB_TEAM_LEADER
                         |
                   IB_AGENT (AGENT)
                         |
                    TRADER (user role)
```

**Key Rules**:
- Higher tiers can manage lower tiers
- SUPER_ADMIN can do anything
- ADMIN manages day-to-day operations
- IB_TEAM_LEADER manages affiliate teams
- IB_AGENT recruits traders
- TRADER cannot be staff (separate table)

---

## 👥 Role Definitions

### TRADER
```typescript
// apps/db/prisma/schema.prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password_hash     String
  roles             String[]  @default(["TRADER"])  // Array
  kyc_status        String    @default("PENDING")
  created_at        DateTime  @default(now())
  
  // TRADER can:
  // - View own positions
  // - Open/close trades
  // - View own balance
  // - Request deposits/withdrawals
  // - View own ledger
}
```

**TRADER Permissions**:
```typescript
// Route: GET /api/positions
// Trader can only view own positions
const positions = await prisma.trade.findMany({
  where: {
    user_id: req.user.id  // Only self
  }
})

// Route: POST /api/withdrawals
// Trader can request withdrawal
// Admin approves/rejects
```

### IB_AGENT
```typescript
model Staff {
  id              String   @id @default(cuid())
  email           String   @unique
  role            String   // "AGENT"
  users_managed   String[] // Array of trader IDs recruited
  team_leader_id  String?  // Who manages this agent
  status          String   @default("ACTIVE")
  commission_rate Int      // Basis points (e.g., 50 = 0.5%)
  created_at      DateTime @default(now())
}

// IB_AGENT (alias AGENT) can:
// - Recruit new traders (add to users_managed)
// - View own traders' stats
// - Receive commissions on trader trades
// - NOT manage other agents
// - NOT access Admin panel
```

**AGENT Permissions**:
```typescript
// Route: GET /api/agents/my-traders
// Agent can view stats of traders they recruited
const agent = await prisma.staff.findUnique({
  where: { id: req.user.id },
  include: { users_managed: true }
})

if (agent?.role !== 'AGENT') {
  throw new ApiError('UNAUTHORIZED', 403, 'Not an agent')
}

// Only view own traders
const trades = await prisma.trade.findMany({
  where: { user_id: { in: agent.users_managed } }
})
```

### IB_TEAM_LEADER
```typescript
// Staff with role: "IB_TEAM_LEADER"
// Manages multiple agents

// IB_TEAM_LEADER can:
// - Manage agents (hire, activate/deactivate)
// - Set agent commissions
// - View team stats
// - Approve agent disputes
// - Cannot execute admin functions
```

### ADMIN
```typescript
// Staff with role: "ADMIN"

// ADMIN can:
// - View all traders (not positions)
// - Approve/reject withdrawals
// - Review KYC documents
// - Manage IB agents
// - Set trading limits
// - View audit logs
// - Cannot create new admins
```

### SUPER_ADMIN
```typescript
// Staff with role: "SUPER_ADMIN"

// SUPER_ADMIN can:
// - Do everything (unrestricted)
// - Create new admins
// - Change platform settings
// - Access all data
// - Emergency operations
```

---

## 🔐 Authorization Middleware

### Role Check Middleware

```typescript
// middleware/role.ts
import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../lib/errors'

/**
 * Check if user has required role
 * @param allowedRoles Array of roles that can access
 * @param isUserRole If true, checks User.roles; else checks Staff.role
 */
export function authorize(allowedRoles: string[], isUserRole = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // req.user set by authenticate() middleware
    if (!req.user) {
      throw new ApiError('UNAUTHORIZED', 401, 'Not authenticated')
    }

    let userRoles: string[] = []
    
    if (isUserRole) {
      // Check User.roles (TRADER)
      userRoles = req.user.roles || []
    } else {
      // Check Staff.role
      const staff = await prisma.staff.findUnique({
        where: { id: req.user.id }
      })
      
      if (!staff) {
        throw new ApiError('FORBIDDEN', 403, 'Not a staff member')
      }
      
      userRoles = [staff.role]
    }

    // Check if any user role matches allowed roles
    const hasRole = allowedRoles.some(role => userRoles.includes(role))
    
    if (!hasRole) {
      throw new ApiError(
        'FORBIDDEN',
        403,
        `Requires role: ${allowedRoles.join(' or ')}`
      )
    }

    next()
  }
}
```

### Usage in Routes

```typescript
// Trader routes
router.get(
  '/me',
  authenticate(),
  authorize(['TRADER']),  // TRADER only
  async (req, res) => {
    const trader = await prisma.user.findUnique({
      where: { id: req.user.id }
    })
    res.json(apiResponse.success(trader))
  }
)

// Admin routes
router.post(
  '/approval/withdrawal/:id',
  authenticate(),
  authorize(['ADMIN', 'SUPER_ADMIN'], false),  // Staff roles
  async (req, res) => {
    const withdrawal = await prisma.withdrawal_request.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approved_by: req.user.id }
    })
    res.json(apiResponse.success(withdrawal))
  }
)

// IB Agent routes
router.get(
  '/agents/my-traders',
  authenticate(),
  authorize(['AGENT'], false),  // Agent role
  async (req, res) => {
    const agent = await prisma.staff.findUnique({
      where: { id: req.user.id },
      include: { users_managed: true }
    })
    res.json(apiResponse.success(agent.users_managed))
  }
)
```

---

## 🔗 Permission Hierarchy Rules

### Self-Access (Always Allowed)

```typescript
// Trader can view own balance
router.get('/balance', authenticate(), async (req, res) => {
  const balance = await getBalance(req.user.id)
  res.json({ balance })
})

// Agent can view own stats
router.get('/my-stats', authenticate(), async (req, res) => {
  const agent = await prisma.staff.findUnique({
    where: { id: req.user.id }
  })
  res.json(agent)
})
```

### Team-Level Access (Team-Scoped)

```typescript
// Team leader can view team's stats (not all traders)
router.get(
  '/team/stats',
  authenticate(),
  authorize(['IB_TEAM_LEADER'], false),
  async (req, res) => {
    // Get agents managed by this team leader
    const agents = await prisma.staff.findMany({
      where: { team_leader_id: req.user.id }
    })
    
    const agentIds = agents.map(a => a.id)
    
    // Get trades from these agents' traders
    const trades = await prisma.trade.findMany({
      where: {
        user: { staff_manager_id: { in: agentIds } }
      }
    })
    
    res.json(apiResponse.success(trades))
  }
)
```

### Admin-Level Access (Platform-Wide)

```typescript
// Admin can view all withdrawals
router.get(
  '/admin/withdrawals',
  authenticate(),
  authorize(['ADMIN', 'SUPER_ADMIN'], false),
  async (req, res) => {
    const withdrawals = await prisma.withdrawal_request.findMany()
    res.json(apiResponse.success(withdrawals))
  }
)
```

---

## 🚨 Permission Check in Services

**Never trust the route to enforce permissions.** Always re-check in the service:

```typescript
// services/withdrawal.service.ts
export async function approveWithdrawal(
  approverStaffId: string,
  withdrawalId: string
) {
  // 1. Verify approver is ADMIN or SUPER_ADMIN
  const approver = await prisma.staff.findUnique({
    where: { id: approverStaffId }
  })
  
  if (!['ADMIN', 'SUPER_ADMIN'].includes(approver?.role)) {
    throw new ApiError('FORBIDDEN', 403, 'Only admins can approve')
  }

  // 2. Update withdrawal
  const withdrawal = await prisma.withdrawal_request.update({
    where: { id: withdrawalId },
    data: { status: 'APPROVED', approved_by: approverStaffId }
  })

  // 3. Log audit trail
  await prisma.audit_log.create({
    data: {
      action: 'WITHDRAWAL_APPROVED',
      actor_id: approverStaffId,
      target_id: withdrawalId,
      timestamp: new Date()
    }
  })

  return withdrawal
}
```

---

## 📋 Common RBAC Patterns

### Pattern: "User Can Only Access Own Data"

```typescript
// GET /api/trades/:id
// User can view trade detail only if it's theirs
async (req, res) => {
  const trade = await prisma.trade.findUnique({
    where: { id: req.params.id }
  })

  // Check ownership
  if (trade.user_id !== req.user.id) {
    throw new ApiError('FORBIDDEN', 403, 'Cannot access other user trades')
  }

  res.json(apiResponse.success(trade))
}
```

### Pattern: "Admin Can Bulk-Modify"

```typescript
// POST /api/admin/users/:id/kyc-approve
// Admin approves KYC for user
async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { kyc_status: 'APPROVED' }
  })

  // Audit log
  await logAudit('KYC_APPROVED', req.user.id, req.params.id)

  res.json(apiResponse.success(user))
}
```

### Pattern: "Agent Can View Recruited Traders"

```typescript
// GET /api/agents/traders
// Agent only sees traders they recruited
async (req, res) => {
  const agent = await prisma.staff.findUnique({
    where: { id: req.user.id }
  })

  if (agent.role !== 'AGENT') {
    throw new ApiError('FORBIDDEN', 403, 'Not an agent')
  }

  const traders = await prisma.user.findMany({
    where: { id: { in: agent.users_managed } }
  })

  res.json(apiResponse.success(traders))
}
```

---

## 🗝️ Authorization Checklist

- [ ] **Role Check**: Route has `authorize([roles])`
- [ ] **Ownership Check**: Service verifies user can access resource
- [ ] **Staff Permissions**: Staff role checked with second parameter
- [ ] **Hierarchy Respected**: Team leads can't create admins
- [ ] **Audit Trail**: Sensitive actions logged
- [ ] **Error Messages**: Generic (don't leak role info)
- [ ] **Database Constraints**: Foreign keys enforce hierarchy
- [ ] **Tests**: Test both allowed and rejected cases

---

## 🚨 Common RBAC Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Only check in route | Re-check in service |
| Generic error: "Access denied" | Log specific role needed |
| Trust user.roles from token | Fetch from database each time |
| No audit for permission checks | Log failed attempts |
| Hard-code roles in route | Pass to authorize() middleware |
| Allow self-privilege escalation | Never allow user to set own roles |

---

## 📚 Related Skills

- `api-route-creation` — Using `authorize()` in routes
- `security-and-compliance` — Permission best practices
- `api-integration-testing` — Testing RBAC scenarios
