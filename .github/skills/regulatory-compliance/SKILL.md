---
name: 'regulatory-compliance'
description: 'Use when: implementing FSC Mauritius or FSA Seychelles compliance requirements, handling KYC/AML obligations, managing client fund segregation, implementing trading restrictions, or ensuring regulatory reporting. Ensures platform meets offshore CFD simulation trading regulations. Primary agents: @research, @security, @architecture.'
---

# Skill: Regulatory Compliance

**Scope**: FSC Mauritius and FSA Seychelles regulatory requirements for CFD simulation trading
**Primary Agents**: @research, @security, @architecture
**When to Use**: Implementing compliance features, KYC/AML flows, client fund handling, regulatory reporting

---

## Core Principles

### 1. Simulation Trading Has Specific Requirements

ProTraderSim operates as a **simulation trading platform** under offshore jurisdictions:

- FSC Mauritius (Financial Services Commission)
- FSA Seychelles (Financial Services Authority)

Key implications:

- No real market execution (simulated prices)
- Client funds held in segregated accounts
- KYC/AML still required despite simulation
- IB (Introducing Broker) model must be transparent

### 2. Compliance is Built-In, Not Bolted-On

Every feature must consider:

- User identification and verification
- Transaction audit trails
- Data protection and PII handling
- Regulatory reporting capabilities

---

## PII Handling Guidelines

### Email Privacy in Admin Reports

**Critical**: User email addresses are classified as PII and must be handled according to these guidelines:

#### 1. API Responses vs Logging

- **API responses** returning email may be appropriate for authorized admin operations where the admin has a legitimate need to contact users (e.g., KYC review, deposit processing)
- **Logging** of email addresses is generally prohibited - never log emails in server logs, audit trails, or console output
- **Risk**: Even when emails are returned in API responses, downstream systems may log them inadvertently - ensure proper sanitization at the API boundary

#### 2. Code Implementation Safeguards

- **Remove email from SELECT queries** unless explicitly required for a specific admin function
- **Use config flags** to enable/disable email exposure per endpoint
- **Implement audit logging** for any endpoint that returns PII - record who accessed it, when, and the purpose
- **RBAC checks**: Ensure only SUPER_ADMIN and ADMIN roles have access to user PII (enforced via `requireRole` middleware at line 13 in `apps/api/src/routes/admin/index.ts`)

#### 3. Example: Updated Admin Query

```typescript
// BEFORE (includes email - review if truly needed)
include: { user: { select: { id: true, fullName: true, email: true, accountNumber: true } } }

// AFTER (email removed unless specifically required)
include: { user: { select: { id: true, fullName: true, accountNumber: true } } }
```

#### 4. If Email is Required

If a legitimate business need exists for returning emails (e.g., KYC review requires contacting the applicant):

- Document the legal basis for FSC Mauritius / FSA Seychelles compliance
- Add a config flag to enable/disable this feature
- Implement audit logging for each access
- Consider masking (e.g., `j***@example.com`) as an intermediate step

---

## Regulatory Requirements

### FSC Mauritius Requirements

#### 1. Client Identification (KYC)

All users must complete KYC before trading:

- **Identity verification**: Passport or national ID
- **Proof of address**: Utility bill or bank statement (< 3 months)
- **Source of funds**: Declaration for deposits > $10,000

```typescript
// KYC status flow
type KycStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADDITIONAL_REQUIRED'

// Trading blocked until KYC approved
if (user.kyc_status !== 'APPROVED') {
  throw new ForbiddenError('KYC verification required before trading')
}
```

#### 2. Client Fund Segregation

Client funds must be segregated from operational funds:

- Separate bank accounts for client money
- Ledger tracking for all client balances
- Regular reconciliation reports

```typescript
// Ledger transaction types for audit
type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRADE_CLOSE'
  | 'COMMISSION'
  | 'FEE'
  | 'MANUAL_ADJUSTMENT'

// All client money movements tracked
await prisma.ledgerTransaction.create({
  data: {
    userId,
    type: 'DEPOSIT',
    amountCents,
    balanceAfterCents: newBalance,
    referenceId: depositId,
    description: 'Client deposit - segregated account',
  },
})
```

#### 3. Risk Disclosure

Users must acknowledge risk disclosure before trading:

- CFDs are complex instruments
- High risk of losing money rapidly
- Simulation does not guarantee real market results

```typescript
// Legal document tracking
interface LegalDocument {
  id: string
  userId: string
  type: 'RISK_DISCLOSURE' | 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY'
  version: string
  acceptedAt: Date
  ipAddress: string
}
```

#### 4. Transaction Reporting

All trades must be recorded with:

- Timestamp (UTC)
- Instrument details
- Price at execution
- User identification
- P&L calculation

```typescript
// Trade record for regulatory reporting
interface Trade {
  id: string
  userId: string
  instrumentId: string
  direction: TradeDirection
  units: bigint
  leverage: number
  openRate: bigint
  closeRate: bigint | null
  pnlCents: bigint | null
  openedAt: Date
  closedAt: Date | null
  closedBy: ClosedBy
}
```

### FSA Seychelles Requirements

#### 1. Anti-Money Laundering (AML)

Implement AML controls:

- Transaction monitoring for suspicious activity
- Large deposit reporting (> $10,000)
- Source of funds verification
- Sanctions screening

```typescript
// AML monitoring
interface AmlAlert {
  id: string
  userId: string
  type: 'LARGE_DEPOSIT' | 'RAPID_WITHDRAWAL' | 'UNUSUAL_PATTERN'
  amountCents: bigint
  description: string
  status: 'PENDING' | 'REVIEWED' | 'ESCALATED'
  createdAt: Date
}

// Flag large deposits
if (depositAmountCents > 1000000n) {
  // $10,000
  await prisma.amlAlert.create({
    data: {
      userId,
      type: 'LARGE_DEPOSIT',
      amountCents: depositAmountCents,
      description: `Large deposit: ${formatMoney(depositAmountCents)}`,
      status: 'PENDING',
    },
  })
}
```

#### 2. Data Protection

Protect user data according to FSA requirements:

- PII encryption at rest
- Access logging for sensitive data
- Data retention policies
- Right to deletion (with audit trail preservation)

```typescript
// PII handling rules
// NEVER log:
// - Passport numbers
// - Bank account details
// - Full address information
// - Phone numbers
// - Email addresses

// CORRECT: Masked logging
console.log(`User KYC submitted: ${user.id}, document type: ${docType}`)

// WRONG: Exposes PII
console.log(`User KYC: ${user.passportNumber}, email: ${user.email}, address: ${user.address}`)
```

#### 3. IB (Introducing Broker) Transparency

IB relationships must be disclosed:

- IB commission structure visible to users
- No hidden markups on spreads
- Clear separation between IB and client funds

```typescript
// IB commission tracking
interface IbCommission {
  id: string
  tradeId: string
  agentId: string
  rateBps: number // Commission rate in basis points
  amountCents: bigint
  status: CommissionStatus
  paidAt: Date | null
}
```

---

## Compliance Implementation Checklist

When implementing a new feature:

- [ ] KYC status checked before allowing financial operations
- [ ] All money movements recorded in ledger_transactions
- [ ] PII not logged or exposed in error messages
- [ ] Audit trail maintained for all financial events
- [ ] Risk disclosure accepted before trading
- [ ] AML monitoring for large transactions
- [ ] IB commissions tracked and transparent
- [ ] Data retention policy followed
- [ ] User consent recorded for legal documents

---

## Common Compliance Mistakes

### 1. Allowing Trading Without KYC

```typescript
// WRONG: No KYC check
router.post('/trades', authenticate, async (req, res) => {
  const trade = await tradingService.openPosition(req.user.id, input)
  res.json({ data: trade })
})

// CORRECT: KYC check required
router.post('/trades', authenticate, async (req, res, next) => {
  const user = await userService.findById(req.user.id)

  if (user.kyc_status !== 'APPROVED') {
    return res.status(403).json({
      error_code: 'KYC_REQUIRED',
      message: 'KYC verification required before trading',
    })
  }

  const trade = await tradingService.openPosition(req.user.id, input)
  res.json({ data: trade })
})
```

### 2. Missing Ledger Entry

3. **Quarterly Compliance Report**: KYC status, AML alerts, IB commissions
4. **Annual Audit Report**: Full platform audit trail

### Report Generation

```typescript
// Generate daily transaction report
router.get(
  '/admin/reports/daily-transactions',
  authenticate,
  requireRole('SUPER_ADMIN'),
  async (req, res) => {
    const dateParam = typeof req.query.date === 'string' ? req.query.date : ''
    if (!dateParam) {
      return res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        message: 'Query parameter date is required (ISO date string)',
      })
    }

    const parsedDate = new Date(dateParam)
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        message: 'date must be a valid ISO date string',
      })
    }

    const year = parsedDate.getUTCFullYear()
    const month = parsedDate.getUTCMonth()
    const day = parsedDate.getUTCDate()

    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))

    const pageNum = Number(req.query.page ?? 1)
    const pageSizeNum = Number(req.query.pageSize ?? 50)

    if (Number.isNaN(pageNum) || Number.isNaN(pageSizeNum)) {
      return res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        message: 'page and pageSize must be valid numbers',
      })
    }

    const page = Math.max(1, pageNum)
    const pageSize = Math.min(100, Math.max(1, pageSizeNum))
    const skip = (page - 1) * pageSize

    // Default to descending (newest first) for better UX, but allow ascending for compliance audit needs
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc'

    const where = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    }

    const [total, transactions] = await Promise.all([
      prisma.ledgerTransaction.count({ where }),
      prisma.ledgerTransaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              kyc_status: true,
            },
          },
        },
        orderBy: {
          createdAt: sortOrder,
        },
        skip,
        take: pageSize,
      }),
    ])

    res.json({
      data: transactions,
      page,
      pageSize,
      total,
    })
  },
)
```
