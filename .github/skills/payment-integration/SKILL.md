---
name: payment-integration
description: "Use when: building deposit/withdrawal flows, integrating third-party payment processors (NowPayments), handling IPN webhooks, processing crypto payments, or implementing payment state machines. Ensures webhook security, idempotency, and correct ledger tracking. Primary agents: Coding, Security, Architecture."
---

# Payment Integration — ProTraderSim

Complete **NowPayments cryptocurrency deposit and withdrawal flow** with secure IPN webhook handling, idempotency, and ledger integrity.

---

## 💳 Deposit Flow (Trader Perspective)

### 1. Trader Initiates Deposit

```typescript
// POST /api/deposits
// Body: { amount_cents: 10050, currency: "USDT", network: "TRC20" }

export async function createDepositRequest(userId: string, data: {
  amount_cents: bigint
  currency: "USDT" | "ETH" | "BTC"
  network: "TRC20" | "ERC20" | "Bitcoin"
}) {
  // Validate
  if (data.amount_cents < 1000n) {  // $10 min
    throw new ApiError('MINIMUM_DEPOSIT', 400, 'Minimum deposit is $10')
  }
  
  if (data.amount_cents > 10000000n) {  // $100,000 max
    throw new ApiError('MAXIMUM_DEPOSIT', 400, 'Maximum deposit is $100,000')
  }

  // Create DB record first in PENDING state with temporary invoice ID
  const depositRequest = await db.depositRequest.create({
    data: {
      user_id: userId,
      amount_cents: data.amount_cents,         // Original USD amount
      currency: data.currency,
      network: data.network,
      status: 'PENDING',
      nowpayments_invoice_id: null,  // Will update after invoice creation succeeds
      nowpayments_payment_id: null,
      transaction_hash: null,
      created_at: new Date(),
      updated_at: new Date()
    }
  })
  
  // Create NowPayments invoice and update deposit atomically
  // Separate short DB transaction for invoice assignment (avoids long-running transaction block)
  let nowPaymentInvoice
  try {
    nowPaymentInvoice = await nowPayments.createInvoice({
      price_amount: centsToDollars(data.amount_cents),
      price_currency: "USD",
      order_id: `deposit_${userId}_${Date.now()}`,
      ipn_callback_url: `${API_URL}/webhooks/nowpayments`,
      success_url: `${PLATFORM_URL}/deposits/success`,
      cancel_url: `${PLATFORM_URL}/deposits/cancel`
    })
  } catch (err) {
    // NowPayments creation failed — enqueue background cleanup job instead of synchronous delete
    // This ensures we don't lose the audit record and can retry reconciliation after recovery
    await queue.add('cleanup-orphaned-deposit', {
      deposit_id: depositRequest.id,
      reason: 'nowpayments_creation_failed',
      error: err.message
    })
    throw err
  }
  
  // Update with invoice ID in a short transaction (retriable on failure)
  try {
    await db.$transaction(async (tx) => {
      await tx.depositRequest.update({
        where: { id: depositRequest.id },
        data: { nowpayments_invoice_id: nowPaymentInvoice.id }
      })
    })
  } catch (err) {
    // Update failed — enqueue job to retry assignment (or manual reconciliation)
    // The invoice is created in NowPayments; we just need to link it in our DB
    await queue.add('reconcile-deposit-invoice', {
      deposit_id: depositRequest.id,
      nowpayments_invoice_id: nowPaymentInvoice.id,
      reason: 'invoice_assignment_failed'
    })
    throw err
  }

  // Return payment URL to frontend
  return {
    data: {
      deposit_id: depositRequest.id,
      payment_url: nowPaymentInvoice.invoice_url,
      status: 'PENDING'
    }
  }
}
```

### 2. Trader Pays on NowPayments

- Frontend opens `payment_url` in new window
- Trader sends crypto to NowPayments address
- NowPayments confirms payment (1-3 blockchain confirmations)

### 3. Webhook: Payment Confirmed

```typescript
// POST /webhooks/nowpayments
// NowPayments → Our server with IPN callback

export async function handleNowPaymentsIPN(req: Request) {
  // 1. Verify webhook signature
  const signature = req.headers['x-nowpayments-signature'] as string
  const payload = JSON.stringify(req.body)
  
  const expectedSignature = crypto
    .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    .update(payload)
    .digest('hex')
  
  if (signature !== expectedSignature) {
    throw new ApiError('INVALID_SIGNATURE', 401, 'Webhook signature mismatch')
  }

  const event = req.body as NowPaymentsEvent
  
  // 2. Handle payment confirmation
  if (event.payment_status === 'finished') {
    // Idempotency: Check via deposit status (works for all confirmation levels)
    // Deposit moves from PENDING → CONFIRMED (confirmations < 3) → COMPLETED (confirmations >= 3)
    if (depositRequest.status === 'COMPLETED') {
      // Already at final state, return 200 to acknowledge
      return { success: true }
    }
    
    if (depositRequest.status === 'CONFIRMED' && event.confirmations < 3) {
      // Already reported as CONFIRMED; ignore duplicate webhook
      return { success: true }
    }

    // 3. Update deposit status to CONFIRMED (1-3 confirmations)
    // Transition PENDING → CONFIRMED when confirmations < 3
    let updatedStatus = 'CONFIRMED'
    if (event.confirmations >= 3) {
      updatedStatus = 'COMPLETED'
    }
    
    await db.depositRequest.update({
      where: { id: depositRequest.id },
      data: {
        status: updatedStatus,
        nowpayments_payment_id: event.payment_id,
        // NowPayments webhook sends payin_hash; we store it as transaction_hash for canonical naming
        transaction_hash: event.payin_hash || event.transaction_hash,
        updated_at: new Date()
      }
    })
    
    // Only add credit to balance and ledger when COMPLETED (>=3 confirmations)
    if (updatedStatus !== 'COMPLETED') {
      // Emit intermediate state update
      emitToUser(depositRequest.user_id, 'deposit:confirmed', {
        deposit_id: depositRequest.id,
        status: 'CONFIRMED',
        confirmations: event.confirmations
      })
      return { success: true }
    }
    
    // 4. Add credit to balance via ledger (only at COMPLETED)
    const ledgerTx = await db.ledgerTransaction.create({
      data: {
        user_id: depositRequest.user_id,
        type: 'DEPOSIT',
        amount_cents: depositRequest.amount_cents,
        balance_after_cents: (await getBalance(depositRequest.user_id)) + depositRequest.amount_cents,
        reference_id: depositRequest.id,
        reference_type: 'DEPOSIT_REQUEST',
        created_at: new Date()
      }
    })

    // 4. Mark deposit as completed
    await db.depositRequest.update({
      where: { id: depositRequest.id },
      data: {
        status: 'COMPLETED',
        nowpayments_payment_id: event.payment_id,
        transaction_hash: event.transaction_hash,
        updated_at: new Date()
      }
    })

    // Compute new balance (already includes the deposit we just added to ledger)
    const newBalance = centsToDollars(await getBalance(depositRequest.user_id))
    
    // 5. Send email notification
    const user = await db.user.findUnique({
      where: { id: depositRequest.user_id },
      select: { email: true }
    })
    
    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 404, 'User not found for deposit confirmation')
    }
    
    await resend.emails.send({
      from: 'noreply@protrader.com',
      to: user.email,
    
    await resend.emails.send({
      from: 'noreply@protrader.com',
      to: user.email,
      subject: 'Deposit Confirmed',
      react: <DepositConfirmEmail 
        amount={centsToDollars(depositRequest.amount_cents)}
        balance={newBalance}
      />
    })

    // 6. Emit real-time update
    emitToUser(depositRequest.user_id, 'account:metrics', {
      balance: newBalance.toString(),
      // ... other metrics
    })

    return { success: true }
  }

  // Handle failed/canceled payments
  if (event.payment_status === 'failed') {
    // Fetch depositRequest for the failed payment (may not exist yet)
    const failedDeposit = await db.depositRequest.findUnique({
      where: { nowpayments_invoice_id: event.invoice_id }
    })
    
    if (failedDeposit) {
      await db.depositRequest.update({
        where: { id: failedDeposit.id },
        data: { status: 'FAILED', updated_at: new Date() }
      })
      
      emitToUser(failedDeposit.user_id, 'deposit:failed', {
        deposit_id: failedDeposit.id,
        status: 'FAILED'
      })
    }
  }

  return { success: true }
}
```

---

## 💸 Withdrawal Flow (Trader Perspective)

### 1. Trader Requests Withdrawal

```typescript
// POST /api/withdrawals
// Body: { amount_cents: 50000, currency: "USDT", wallet_address: "0x..." }

export async function createWithdrawalRequest(userId: string, data: {
  amount_cents: bigint
  currency: "USDT" | "ETH" | "BTC"
  wallet_address: string
}) {
  // ATOMIC TRANSACTION with FOR UPDATE lock to prevent TOCTOU race
  // Lock user row to prevent concurrent balance depletion across API instances
  const withdrawalRequest = await db.$transaction(async (tx) => {
    // Lock user ledger row to serialize balance checks
    await tx.$queryRaw`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`
    
    // Get user balance (computed from ledger within this transaction)
    const balance = await getBalance(userId)
    
    // Get total pending withdrawals (within transaction for consistency)
    const pendingWithdrawals = await tx.withdrawalRequest.aggregate({
      where: {
        user_id: userId,
        status: { in: ['PENDING_APPROVAL', 'PROCESSING'] }
      },
      _sum: { amount_cents: true }
    })
    
    const pendingAmount = pendingWithdrawals._sum.amount_cents ?? 0n
    const availableBalance = balance - pendingAmount
    
    // Validate INSIDE transaction (after lock acquired)
    if (data.amount_cents > availableBalance) {
      throw new ApiError('INSUFFICIENT_BALANCE', 400, 'Balance insufficient (including pending withdrawals)')
    }
    
    if (data.amount_cents < 2000n) {  // $20 minimum
      throw new ApiError('MINIMUM_WITHDRAWAL', 400, 'Minimum withdrawal is $20')
    }

    // Create withdrawal request atomically within transaction (admin approval required)
    return await tx.withdrawalRequest.create({
      data: {
        user_id: userId,
        amount_cents: data.amount_cents,
        currency: data.currency,
        wallet_address: data.wallet_address,
        status: 'PENDING_APPROVAL',  // Admin must approve
        created_at: new Date(),
        updated_at: new Date()
      }
    })
  })

  // Notify admins
  io.to('admin:panel').emit('withdrawal:pending', {
    withdrawal_id: withdrawalRequest.id,
    user_id: userId,
    amount: centsToDollars(data.amount_cents),
    currency: data.currency
  })

  return {
    data: {
      withdrawal_id: withdrawalRequest.id,
      amount: centsToDollars(data.amount_cents),
      status: 'PENDING_APPROVAL'
    }
  }
}
```

### 2. Admin Approves Withdrawal

```typescript
// POST /api/admin/withdrawals/:id/approve
// Only ADMIN role

export async function adminApproveWithdrawal(withdrawalId: string, adminId: string) {
  // Verify admin
  const admin = await db.staff.findUnique({
    where: { id: adminId },
  // Atomic compare-and-swap: only update if status is PENDING_APPROVAL
  const updateResult = await db.withdrawalRequest.updateMany({
    where: { 
      id: withdrawalId,
      status: 'PENDING_APPROVAL'  // Only update if still pending
    },
    data: {
      status: 'PROCESSING',
      approved_by: adminId,
      approved_at: new Date(),
      updated_at: new Date()
    }
  })
  
  if (updateResult.count === 0) {
    throw new ApiError('INVALID_STATE', 400, 'Withdrawal already processed or not found')
  }
  
  // Fetch the updated record
  const updatedWithdrawal = await db.withdrawalRequest.findUnique({
    where: { id: withdrawalId }
  })
  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { id: withdrawalId }
  })
  
  if (updatedWithdrawal.status !== 'PROCESSING') {
    throw new ApiError('INVALID_STATE', 400, 'Already processed')
  }
  } catch (err) {
    // NowPayments failed — revert status only if we own this approval
    const current = await db.withdrawalRequest.findUnique({
      where: { id: withdrawalId }
    })
    
    // Only revert if we're the ones who set it to PROCESSING and no payout ID exists
    if (current?.status === 'PROCESSING' && !current.nowpayments_payout_id) {
      await db.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: 'PENDING_APPROVAL', updated_at: new Date() }
      })
    }
    throw err
  }
      order_id: `withdrawal_${withdrawalId}`
    })
  } catch (err) {
  // Deduct from balance (ledger entry) with transaction lock to prevent race
  const ledgerTx = await db.$transaction(async (tx) => {
    // Lock user record to prevent concurrent balance modifications
    await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${updatedWithdrawal.user_id} FOR UPDATE`
    
    // Get current balance
    const currentBalance = await tx.ledgerTransaction.aggregate({
      where: { user_id: updatedWithdrawal.user_id },
      _sum: { amount_cents: true }
    })
    const balanceBefore = currentBalance._sum.amount_cents ?? 0n
    const newBalance = balanceBefore - updatedWithdrawal.amount_cents
    
    // Create ledger entry
    return await tx.ledgerTransaction.create({
      data: {
        user_id: updatedWithdrawal.user_id,
        type: 'WITHDRAWAL',
        amount_cents: -updatedWithdrawal.amount_cents,  // Negative (debit)
        balance_after_cents: newBalance,
        idempotency_key: `withdrawal_${withdrawalId}`,
        reference_id: withdrawalId,
        reference_type: 'WITHDRAWAL_REQUEST',
        created_at: new Date()
      }
    })
  })
    const balanceBefore = currentBalance._sum.amount_cents ?? 0n
    const newBalance = balanceBefore - updatedWithdrawal.amount_cents
    
    // Create ledger entry
    return await tx.ledgerTransaction.create({
      data: {
        user_id: updatedWithdrawal.user_id,
        type: 'WITHDRAWAL',
        amount_cents: -updatedWithdrawal.amount_cents,  // Negative (debit)
        balance_after_cents: newBalance,
        idempotency_key: `withdrawal_${withdrawalId}`,
        reference_id: withdrawalId,
        reference_type: 'WITHDRAWAL_REQUEST',
        created_at: new Date()
      }
    })
  })

  // Emit update to trader
  emitToUser(updatedWithdrawal.user_id, 'withdrawal:approved', {
    withdrawal_id: withdrawalId,
    status: 'PROCESSING'
  })

  return { success: true }
}
```

### 3. Webhook: Payout Confirmed

```typescript
// POST /webhooks/nowpayments (same endpoint)
// NowPayments confirms crypto sent

if (event.type === 'payout_finished') {
  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { nowpayments_payout_id: event.payout_id }
  })

  if (!withdrawal) {
    // Withdrawal not found — log but don't error (idempotency)
    console.warn(`Payout finished but no withdrawal found: ${event.payout_id}`)
    return { success: true }
  }

  if (withdrawal.status === 'COMPLETED') {
    return { success: true }  // Already processed
  }

  await db.withdrawalRequest.update({
    where: { id: withdrawal.id },
    data: {
      status: 'COMPLETED',
      transaction_hash: event.transaction_hash,
      updated_at: new Date()
    }
  })

  // Email trader
  await resend.emails.send({
    from: 'noreply@protrader.com',
    to: withdrawal.user.email,
    subject: 'Withdrawal Completed',
    react: <WithdrawalCompletedEmail 
      amount={centsToDollars(withdrawal.amount_cents)}
      txHash={event.transaction_hash}
    />
  })

  emitToUser(withdrawal.user_id, 'withdrawal:completed', {
    withdrawal_id: withdrawal.id,
    tx_hash: event.transaction_hash
  })

  return { success: true }
}
```

---

## 🔐 Security Implementation

### Webhook Verification

```typescript
// Always verify signature
export function verifyNowPaymentsSignature(
  payload: string,
  signature: string
): boolean {
  const expected = crypto
    .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    .update(payload)
    .digest('hex')
  
  // Use constant-time comparison to prevent timing attacks
  if (signature.length !== expected.length) {
    return false
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
```

### Idempotency Keys

```typescript
// Prevent double-crediting if webhook is retried
const idempotencyKey = `nowpay_${event.payment_id}`

const existingTx = await db.ledgerTransaction.findUnique({
  where: { idempotency_key: idempotencyKey }
})

if (existingTx) {
  // Already processed, return 200
  return { success: true }
}

// First time: create ledger entry WITH idempotency key
await db.ledgerTransaction.create({
  data: {
    user_id,
    type: 'DEPOSIT',
    amount_cents,
    idempotency_key: idempotencyKey,
    // ...
  }
})
```

### Rate Limiting

```typescript
// Limit deposit/withdrawal requests per user
const DEPOSITS_PER_HOUR = 10
const WITHDRAWALS_PER_HOUR = 5

app.post('/api/deposits', async (req, res) => {
  // Check rate limit
  const recentDeposits = await db.depositRequest.count({
    where: {
      user_id: req.user.id,
      created_at: {
        gte: new Date(Date.now() - 3600000)  // Last 1 hour
      }
    }
  })
  
  if (recentDeposits >= DEPOSITS_PER_HOUR) {
    throw new ApiError('RATE_LIMIT', 429, 'Too many deposits')
  }

  // ... create deposit
})
```

---

## 💾 Ledger Impact

### Balance Calculation (Always from Ledger)

```typescript
export async function getBalance(userId: string): Promise<bigint> {
  const result = await db.ledgerTransaction.aggregate({
    where: { user_id: userId },
    _sum: { amount_cents: true }
  })
  
  return result._sum.amount_cents ?? 0n
}

// Deposit: +10050 cents
// Withdrawal: -50000 cents
// Open trade: 0 (held as margin, not deducted)
// Close trade: +5000 cents (if profit)
```

### Margin Reserve (Not in Balance)

```typescript
// Free balance = Balance - UsedMargin
export async function getFreeBalance(userId: string): Promise<bigint> {
  const balance = await getBalance(userId)
  const usedMargin = await getTotalMarginUsed(userId)
  
  return balance - usedMargin
}

// Can only withdraw free balance
if (withdrawalAmount > freeBalance) {
  throw new ApiError('INSUFFICIENT_FREE_BALANCE')
}
```

---

## 🔄 Payment State Machine

```
DEPOSIT:
PENDING → CONFIRMED (1-3 confirmations) → COMPLETED (>=3 confirmations)
         → FAILED

WITHDRAWAL:
PENDING_APPROVAL → PROCESSING → COMPLETED
                 → REJECTED
```

```typescript
enum DepositStatus {
  PENDING = 'PENDING',           // Awaiting payment
  CONFIRMED = 'CONFIRMED',       // Payment seen, 1+ confirmations
  COMPLETED = 'COMPLETED',       // 3+ confirmations (immutable)
  FAILED = 'FAILED'              // Blockchain rejected
}

enum WithdrawalStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',  // Awaiting admin
  PROCESSING = 'PROCESSING',              // Admin approved, crypto sent
  COMPLETED = 'COMPLETED',                // On blockchain
  REJECTED = 'REJECTED'                   // Admin rejected
}
```

---

## ✅ Payment Integration Checklist

- [ ] **NowPayments IPN Signature Verified**: Always check HMAC-SHA512
- [ ] **Webhooks Idempotent**: Duplicate events don't double-credit
- [ ] **Balance from Ledger**: Never cached balance
- [ ] **Withdrawal Balance Check**: Verify free balance < withdrawal
- [ ] **Admin Approval**: Withdrawals require manual approval
- [ ] **Email Confirmations**: Send on deposit + withdrawal completion
- [ ] **Real-time Updates**: Socket.io notifications to trader
- [ ] **Audit Log**: Track all payment changes with timestamps
- [ ] **Rate Limits**: Max deposits/withdrawals per hour per user
- [ ] **Error Handling**: Graceful handling of NowPayments API errors

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Trust NowPayments directly | Verify status in NowPayments API |
| No idempotency key | Include payment_id as unique key |
| Process webhook without signature check | Always verify HMAC |
| No balance re-check in withdrawal | Must verify balance at approval time |
| Trust Stripe directly | Verify status in NowPayments API |
| Cache balance | Calculate from ledger aggregate |
| Auto-approve all withdrawals | Require manual admin approval |

---

## 📚 Related Skills

- `bigint-money-handling` — Cents conversion and ledger math
- `api-route-creation` — Endpoint validation and error handling
- `socket-io-real-time` — Real-time payment notifications
- `database-schema-design` — Deposit/withdrawal tables
- `rbac-implementation` — Admin-only withdrawal approval
