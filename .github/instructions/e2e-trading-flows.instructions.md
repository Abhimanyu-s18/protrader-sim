---
name: e2e-trading-flows
description: End-to-end workflows for complete trading user journeys
applyTo: 'apps/auth/src/routes, apps/platform/src/app, apps/api/src/routes/trades.ts, apps/api/src/routes/deposits.ts'
---

# End-to-End Trading Flows

## Complete User Journey

A trader's complete journey from registration to withdrawal:

```
1. Registration & Login
   ├─ Register with email/password (auth app)
   ├─ Verify email (check inbox)
   └─ Login → redirected to auth app

2. KYC Document Upload
   ├─ Upload ID and address proof
   ├─ Admin reviews documents
   └─ Status updated to APPROVED

3. Deposit Crypto
   ├─ Request deposit (platform)
   ├─ Send crypto to wallet
   ├─ Webhook processes deposit
   └─ Balance updated in real-time (Socket.io)

4. Open Trading Position
   ├─ Select instrument (EURUSD, BTCUSD, etc.)
   ├─ Choose direction (BUY/SELL)
   ├─ Set lot size and leverage
   ├─ Margin calculated and reserved
   ├─ Position opens at live price
   └─ Position updates broadcast via Socket.io

5. Monitor Position
   ├─ Real-time price updates (Socket.io)
   ├─ P&L calculated on client (not stored until closed)
   ├─ Can update Stop Loss / Take Profit
   └─ Account metrics updated (Socket.io)

6. Close Position & Realize P&L
   ├─ Close at market price
   ├─ P&L calculated and ledger recorded
   ├─ Margin released + P&L added to balance
   ├─ Balance updated in real-time
   └─ Trade history shows closed position

7. Withdraw Funds
   ├─ Request withdrawal
   ├─ Admin reviews and approves
   ├─ Crypto transferred from platform wallet
   └─ Status updated when received (IPN webhook)
```

## 1. Registration to KYC Approval Flow

### Frontend: Registration Page

```typescript
// apps/auth/src/app/register/page.tsx
'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { RegisterForm } from '@/components/RegisterForm'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) =>
      apiClient.post('/auth/register', data),
const registerMutation = useMutation({
  mutationFn: async (data: { email: string; password: string }) =>
    apiClient.post('/auth/register', data),
  onSuccess: (_, variables) => {
    setEmail(variables.email)
    // Redirect to email verification page
    router.push(`/verify-email?email=${encodeURIComponent(variables.email)}`)
  },
    },
    onError: (error) => {
      // Show error notification
      showNotification({
        type: 'error',
        title: 'Registration Failed',
        message: error.message,
      })
    },
  })

  return (
    <div>
      <RegisterForm
        onSubmit={(data) => registerMutation.mutate(data)}
        isLoading={registerMutation.isPending}
      />
    </div>
  )
}
```

### Backend: Registration Endpoint

```typescript
// apps/api/src/routes/auth.ts
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { emailQueue } from '../lib/queues'
import { hashPassword } from '../lib/password'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed' })
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // Create user
    const hashedPassword = await hashPassword(parsed.data.password)
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: hashedPassword,
        kycStatus: 'PENDING',
      },
    })

    // Enqueue welcome email + KYC reminder
    await emailQueue.add(
      {
        type: 'WELCOME_EMAIL',
        email: user.email,
        data: { userId: user.id },
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
    )

    // Enqueue KYC reminder (after 24 hours)
    await emailQueue.add(
      {
        type: 'KYC_REMINDER',
        email: user.email,
        data: { userId: user.id },
      },
      {
        delay: 86400000, // 24 hours
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      },
    )

    res.status(201).json({
      data: {
        userId: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    next(error)
  }
})
```

### KYC Upload & Admin Review

```typescript
// apps/platform/src/app/kyc/page.tsx
'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { FileUpload } from '@/components/FileUpload'

export default function KYCPage() {
  const [files, setFiles] = useState<File[]>([])

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((file) => formData.append('documents', file))

      // Get JWT token from secure storage (HttpOnly cookie preferred in production)
      // Token is retrieved from localStorage/sessionStorage by the fetch layer in @protrader/utils
      // For client-side code, use the apiClient helper instead:
      // return apiClient.post('/kyc/upload', formData)
      // This demonstrates raw fetch for educational purposes; in production, use apiClient.
      const token =
        typeof window !== 'undefined'
          ? (localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token'))
          : null

      if (!token) {
        throw new Error('No authentication token found')
      }

      return fetch(`${process.env.NEXT_PUBLIC_API_URL}/kyc/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        title: 'Documents Uploaded',
        message: 'Your KYC documents are under review',
      })
      setFiles([])
    },
  })

  return (
    <div>
      <FileUpload
        onSelect={(newFiles) => setFiles(newFiles)}
        accept="image/*,.pdf"
      />
      <button
        onClick={() => uploadMutation.mutate(files)}
        disabled={files.length === 0 || uploadMutation.isPending}
      >
        Upload KYC Documents
      </button>
    </div>
  )
}
```

## 2. Deposit Flow

### Frontend: Request Deposit

```typescript
// apps/platform/src/components/DepositForm.tsx
'use client'

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { dollarsToCents } from '@protrader/utils'

export function DepositForm() {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USDT_TRC20')
  const [depositAddress, setDepositAddress] = useState('')

  const requestDeposit = useMutation({
    mutationFn: async () =>
      apiClient.post('/deposits', {
        amountCents: dollarsToCents(amount).toString(),
        cryptoCurrency: currency,
      }),
    onSuccess: (deposit) => {
      // Show crypto wallet address to send to
      setDepositAddress(deposit.data.walletAddress)

      showNotification({
        type: 'info',
        title: 'Send Crypto',
        message: `Send ${amount} ${currency} to ${deposit.data.walletAddress}`,
      })
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); requestDeposit.mutate() }}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in USD"
      />
      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        <option>USDT_TRC20</option>
        <option>USDT_ERC20</option>
        <option>ETH</option>
      </select>
      <button type="submit" disabled={requestDeposit.isPending}>
        Request Deposit
      </button>

      {depositAddress && (
        <div className="bg-blue-50 p-4">
          <p>Send to: {depositAddress}</p>
          <p className="text-sm text-gray-600">
            Deposit will be confirmed after {currency === 'ETH' ? '12' : '6'} confirmations
          </p>
        </div>
      )}
    </form>
  )
}
```

### Backend: Create Deposit & NowPayments Webhook

```typescript
// apps/api/src/routes/deposits.ts
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { apiClient } from '../lib/calculations'

depositsRouter.post('/deposits', requireAuth, requireKYC, async (req, res, next) => {
  try {
    const schema = z.object({
      amountCents: z.string(),
      cryptoCurrency: z.enum(['USDT_TRC20', 'USDT_ERC20', 'ETH']),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })

    const amountCents = BigInt(parsed.data.amountCents)

    // Create deposit record
    const deposit = await prisma.deposit.create({
      data: {
        userId: req.user.id,
        amountCents,
        cryptoCurrency: parsed.data.cryptoCurrency,
        status: 'PENDING',
      },
    })

    // Call NowPayments API to generate payment
    const nowPaymentsResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
      },
      body: JSON.stringify({
        price_amount: Number(amountCents) / 100,
        price_currency: 'USD',
        order_id: deposit.id,
        order_description: `Deposit to ProTrader account`,
        success_url: `${process.env.APP_URL}/deposit-success`,
        cancel_url: `${process.env.APP_URL}/deposit-cancelled`,
        ipn_callback_url: `${process.env.API_URL}/webhooks/nowpayments`,
      }),
    })

    const nowPaymentsData = await nowPaymentsResponse.json()

    // Store wallet address
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { walletAddress: nowPaymentsData.pay_address },
    })

    res.status(201).json({
      data: {
        id: deposit.id,
        walletAddress: nowPaymentsData.pay_address,
        amountCents: amountCents.toString(),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Webhook: NowPayments IPN callback
webhooksRouter.post('/nowpayments', async (req, res) => {
  // Verify IPN signature
  const signature = req.headers['x-nowpayments-sig']
  if (!verifyNowPaymentsSignature(req.body, signature as string)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { order_id, status, pay_amount, pay_currency } = req.body

  // Update deposit status
  const deposit = await prisma.deposit.update({
    where: { id: order_id },
    data: {
      status: status === 'finished' ? 'CONFIRMED' : status.toUpperCase(),
      receivedAmount: pay_amount,
      receivedCurrency: pay_currency,
    },
  })

  // If confirmed, credit user balance
  if (status === 'finished') {
    await prisma.$transaction(async (tx) => {
      // Get current balance
      const balanceResult = await tx.$queryRaw<[{ balance: bigint }]>`
        SELECT get_user_balance(${deposit.userId}) as balance
      `
      const currentBalance = balanceResult[0].balance

      // Create ledger entry
      await tx.ledgerTransaction.create({
        data: {
          userId: deposit.userId,
          type: 'DEPOSIT',
          description: `Deposit confirmed: ${deposit.amountCents} cents`,
          amountCents: deposit.amountCents,
          balanceAfterCents: currentBalance + deposit.amountCents,
          referenceId: deposit.id,
          referenceType: 'DEPOSIT',
        },
      })
    })

    // Emit Socket.io update to trader
    emitToUser(io, deposit.userId, 'account_metrics', {
      balance_cents: (currentBalance + deposit.amountCents).toString(),
      // ... other metrics
    })

    // Enqueue confirmation email
    await emailQueue.add({
      type: 'DEPOSIT_CONFIRMED',
      email: deposit.user.email,
      data: {
        amount: centsToDollars(deposit.amountCents),
        transactionId: deposit.id,
      },
    })
  }

  res.json({ success: true })
})
```

## 3. Open Trade Flow

### Frontend: Trade Form

```typescript
// apps/platform/src/components/TradeForm.tsx
'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useAccountStore } from '@/stores/accountStore'
import { usePriceStore } from '@/stores/priceStore'
import { apiClient } from '@/lib/api-client'
import { calcMarginForUI } from '@/lib/calculations'

export function TradeForm() {
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [units, setUnits] = useState(1)
  const [leverage, setLeverage] = useState(100)
  const [selectedInstrument, setSelectedInstrument] = useState('EURUSD')

  // Get live prices from Zustand (populated by Socket.io)
  const prices = usePriceStore((state) => state.prices)
  const currentPrice = prices[selectedInstrument]

  // Get account metrics
  const accountMetrics = useAccountStore((state) => state.metrics)

  // Calculate required margin on client (for preview)
  const requiredMargin = currentPrice
    ? calcMarginForUI({
        units: BigInt(units),
        contractSize: 100000n, // EURUSD
        priceScaled: BigInt(currentPrice.mid_scaled),
        leverage: BigInt(leverage),
      })
    : 0n

  const openTradeMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/trades/open', data),
    onSuccess: () => {
      showNotification({
        type: 'success',
        title: 'Position Opened',
        message: `${direction} ${units} ${selectedInstrument} @ ${currentPrice.mid_scaled}`,
      })
      setUnits(1) // Reset form
    },
    onError: (error) => {
      showNotification({
        type: 'error',
        title: 'Failed to Open Trade',
        message: error.message,
      })
    },
  })

  const canOpen =
    accountMetrics &&
    BigInt(accountMetrics.available_cents) >= requiredMargin

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        openTradeMutation.mutate({
          instrumentId: selectedInstrument,
          direction,
          units,
          leverage,
        })
      }}
    >
      <select value={selectedInstrument} onChange={(e) => setSelectedInstrument(e.target.value)}>
        <option>EURUSD</option>
        <option>GBPUSD</option>
        <option>BTCUSD</option>
      </select>

      <div>
        <button type="button" onClick={() => setDirection('BUY')}>
          BUY
        </button>
        <button type="button" onClick={() => setDirection('SELL')}>
          SELL
        </button>
      </div>

      <input
        type="number"
        value={units}
        onChange={(e) => setUnits(parseInt(e.target.value))}
        min="0.01"
        step="0.01"
      />

      <input
        type="range"
        value={leverage}
        onChange={(e) => setLeverage(parseInt(e.target.value))}
        min="1"
        max="500"
      />

      <div className="text-sm text-gray-600">
        Required Margin: ${(Number(requiredMargin) / 100).toFixed(2)}
        {!canOpen && <p className="text-red-600">Insufficient balance</p>}
      </div>

      <button
        type="submit"
        disabled={!canOpen || openTradeMutation.isPending}
      >
        Open Trade
      </button>
    </form>
  )
}
```

### Backend: Open Trade

```typescript
// apps/api/src/routes/trades.ts (simplified)
tradesRouter.post('/trades/open', requireAuth, requireKYC, async (req, res, next) => {
  try {
    const trade = await tradingService.openPosition(req.user.id, {
      instrumentId: req.body.instrumentId,
      direction: req.body.direction,
      units: BigInt(req.body.units),
      leverage: req.body.leverage,
      currentBid: await getCachedPrice(req.body.instrumentId, 'bid'),
      currentAsk: await getCachedPrice(req.body.instrumentId, 'ask'),
    })

    // Emit Socket.io update
    emitToUser(io, req.user.id, 'trade_update', {
      tradeId: trade.id,
      status: 'OPEN',
      instrument: trade.instrument.symbol,
    })

    // Get updated account metrics
    const metrics = await getAccountMetrics(req.user.id)
    emitToUser(io, req.user.id, 'account_metrics', metrics)

    res.status(201).json({ data: serializeBigInt(trade) })
  } catch (error) {
    next(error)
  }
})
```

## 4. Real-Time Position Updates

```typescript
// apps/platform/src/hooks/usePositions.ts
'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSocket } from './useSocket'
import { apiClient } from '@/lib/api-client'

export function usePositions() {
  const socket = useSocket()

  // Fetch positions from server
  const { data: positions = [], refetch } = useQuery({
    queryKey: ['positions'],
    queryFn: () => apiClient.get('/positions'),
  })

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return

    const handleTradeUpdate = (data: any) => {
      // Update local state when trade status changes
      refetch()
    }

    socket.on('trade_update', handleTradeUpdate)

    return () => {
      socket.off('trade_update', handleTradeUpdate)
    }
  }, [socket, refetch])

  return positions
}
```

## 5. Close Trade Flow

```typescript
// User clicks "Close" button in positions table
closeTradeMutation.mutate({
  tradeId: trade.id,
  closingRate: currentPrice.bid, // For SELL trades
})

// Backend processes close
tradesRouter.post('/trades/:id/close', requireAuth, async (req, res, next) => {
  const trade = await tradingService.closePosition(
    req.params.id,
    BigInt(req.body.closingRate),
    'USER',
  )

  // Emit updates
  emitToUser(io, req.user.id, 'trade_update', {
    tradeId: trade.id,
    status: 'CLOSED',
    pnlCents: trade.pnlCents.toString(),
  })

  const metrics = await getAccountMetrics(req.user.id)
  emitToUser(io, req.user.id, 'account_metrics', metrics)

  res.json({ data: serializeBigInt(trade) })
})
```

## Checklist

- [ ] User can register with email verification
- [ ] KYC status gates all trading/deposit/withdrawal operations
- [ ] Deposits processed via NowPayments IPN webhook
- [ ] Balance updated in real-time via Socket.io
- [ ] Margin calculated on both client (preview) and server (validation)
- [ ] Trade opens with live bid/ask prices
- [ ] Position metrics broadcast via Socket.io
- [ ] Closing a trade releases margin + credits P&L atomically
- [ ] All BigInt values serialized as strings in API responses
- [ ] Comprehensive error handling at each step
- [ ] Email confirmations sent for key actions
- [ ] Ledger entries recorded for all balance changes
