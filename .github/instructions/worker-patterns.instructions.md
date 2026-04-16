---
name: worker-patterns
description: Rules for implementing background jobs with BullMQ
applyTo: 'apps/api/src/workers/**/*.ts, apps/api/src/lib/queues.ts, apps/api/src/routes/**/*.ts'
---

# Bull Worker Patterns

## Architecture

Workers are background jobs using Bull (Redis-backed job queue). All worker jobs run asynchronously and should not block API responses.

```
API Route (e.g., POST /deposits)
  ↓ enqueue job
Bull Queue (Redis)
  ↓ dequeue when ready
Worker Handler
  ↓ do work (send email, process payment, etc.)
Completion/Failure (retry logic)
```

## Worker Types in ProTraderSim

| Worker           | File                      | Trigger                                 | Frequency  | Retry Policy                   |
| ---------------- | ------------------------- | --------------------------------------- | ---------- | ------------------------------ |
| **rollover**     | `workers/rollover.ts`     | Scheduler (22:00 UTC daily)             | Once daily | 3 retries, exponential backoff |
| **email**        | `workers/email.ts`        | API routes (registration, alerts, etc.) | On-demand  | 5 retries (exponential)        |
| **notification** | `workers/notification.ts` | API routes (trade alerts, messages)     | On-demand  | 3 retries                      |
| **kyc-reminder** | `workers/kyc-reminder.ts` | Scheduler (daily 08:00 UTC)             | Once daily | 1 retry                        |

## Queue Setup

Configure all queues in a central location:

```typescript
// lib/queues.ts
import { Queue } from 'bull'
import { getRedis } from './redis'

// Define all queues with consistent naming
export const rolloverQueue = new Queue('rollover', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
})

export const emailQueue = new Queue('email', { redis: { ... } })
export const notificationQueue = new Queue('notification', { redis: { ... } })
export const kycReminderQueue = new Queue('kyc-reminder', { redis: { ... } })

// Export all for easy access
export const queues = [rolloverQueue, emailQueue, notificationQueue, kycReminderQueue]
```

## Worker Handler Structure

Every worker handler follows this pattern:

```typescript
// workers/email.ts
import Queue from 'bull'
import { emailQueue } from '../lib/queues'
import { sendEmailService } from '../services/send-email.service'

/**
 * Email worker: Sends transactional emails via Resend + React Email
 *
 * Handles job retries with exponential backoff.
 * Skips processing during tests to avoid sending real emails.
 */
export function setupEmailWorker() {
  // Skip worker setup during tests
  if (process.env.NODE_ENV === 'test') {
    console.log('[WORKER] Email worker disabled in test environment')
    return
  }

  emailQueue.process(5, async (job) => {
    const { type, email, data } = job.data

    console.log(`[WORKER] Processing email job: ${type} → ${email}`)

    try {
      // Delegate to service
      await sendEmailService.send({
        type,
        email,
        data,
      })

      console.log(`[WORKER] Email sent: ${type} → ${email}`)
      return { success: true }
    } catch (error) {
      console.error(`[WORKER] Email failed (attempt ${job.attemptsMade + 1}):`, error)

      // Rethrow to trigger BullMQ retry logic
      throw error
    }
  })

  // Event handlers for monitoring
  emailQueue.on('completed', (job) => {
    console.log(`[QUEUE] Job ${job.id} completed`)
  })

  emailQueue.on('failed', (job, error) => {
    console.error(`[QUEUE] Job ${job.id} failed permanently:`, error.message)
    // Send alert to monitoring system
  })

  emailQueue.on('error', (error) => {
    console.error('[QUEUE] Email queue error:', error)
  })
}
```

## Enqueueing Jobs from Routes

When you need to trigger a background job, enqueue it from the route:

```typescript
// routes/deposits.ts
import { emailQueue } from '../lib/queues'

XRouter.post('/deposits', async (req, res, next) => {
  try {
    const deposit = await prisma.deposit.create({...})

    // Enqueue email notification (fire-and-forget)
    await emailQueue.add(
      {
        type: 'DEPOSIT_CONFIRMED',
        email: user.email,
        data: {
          amount: formatMoney(deposit.amountCents),
          transactionId: deposit.id,
        },
      },
      {
        attempts: 5,                    // Retry up to 5 times
        backoff: {
          type: 'exponential',
          delay: 2000,                 // Start at 2s, double each time
        },
        removeOnComplete: true,         // Clean up after success
        removeOnFail: false,            // Keep failed jobs for debugging
      }
    )

    res.status(201).json({ data: serializeBigInt(deposit) })
  } catch (error) {
    next(error)
  }
})
```

## Scheduled Workers

For jobs that run on a schedule (rollover, KYC reminders), use node-schedule:

```typescript
// workers/rollover.ts
import schedule from 'node-schedule'
import { rolloverQueue } from '../lib/queues'

export function setupRolloverWorker() {
  if (process.env.NODE_ENV === 'test') {
    console.log('[WORKER] Rollover worker disabled in test environment')
    return
  }

  // Schedule job at 22:00 UTC every day
  schedule.scheduleJob('0 22 * * *', async () => {
    console.log('[SCHEDULER] Enqueuing daily rollover job')

    await rolloverQueue.add(
      { type: 'DAILY_ROLLOVER' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    )
  })

  // Process the rollover job
  rolloverQueue.process(async (job) => {
    console.log(`[WORKER] Starting rollover job at ${new Date().toISOString()}`)

    try {
      // Get all traders with open positions
      const tradersWithPositions = await prisma.trade.findMany({
        where: { status: 'OPEN' },
        distinct: ['userId'],
        select: { userId: true },
      })

      // Process swaps for each trader
      for (const { userId } of tradersWithPositions) {
        await processRolloverForUser(userId)
      }

      console.log('[WORKER] Rollover completed successfully')
      return { success: true, processedUsers: tradersWithPositions.length }
    } catch (error) {
      console.error('[WORKER] Rollover failed:', error)
      throw error // Trigger retry
    }
  })

  rolloverQueue.on('completed', (job) => {
    const returnValue = job.returnvalue ?? {}
    const { success, processedUsers } = returnValue
    console.log(`[QUEUE] Rollover complete: processed ${processedUsers} users`)
  })

  rolloverQueue.on('failed', (job, error) => {
    console.error(`[QUEUE] Rollover failed (attempt ${job.attemptsMade + 1}):`, error.message)
  })
}
```

## Job Data Patterns

### Email Jobs

```typescript
await emailQueue.add({
  type: 'REGISTRATION_CONFIRM', // or 'PASSWORD_RESET', 'TRADE_ALERT', 'DEPOSIT_CONFIRMED', etc.
  email: 'trader@example.com',
  data: {
    // Type-specific data
    verificationLink: '...', // for REGISTRATION_CONFIRM
    resetLink: '...', // for PASSWORD_RESET
    amount: '100.50', // for DEPOSIT_CONFIRMED (formatted string)
    tradeId: 'clXXXXXXX', // for TRADE_ALERT
  },
})
```

### Notification Jobs

```typescript
await notificationQueue.add({
  type: 'TRADE_OPENED', // or 'MARGIN_CALL', 'POSITION_CLOSED', etc.
  userId: 'clXXXXXXX',
  data: {
    tradeId: 'clXXXXXXX',
    instrument: 'EURUSD',
    direction: 'BUY',
    units: '1.5',
    entryRate: '1.08500',
  },
})
```

## Error Handling

Worker errors should retry automatically via BullMQ backoff policy. For permanent failures:

```typescript
emailQueue.on('failed', (job, error) => {
  // Log to monitoring service
  errorReporting.captureException(error, {
    tags: { worker: 'email', jobId: job.id },
    extra: { email: job.data.email, type: job.data.type },
  })

  // Send alert if critical
  if (job.data.type === 'DEPOSIT_CONFIRMED') {
    alertOnSlack(`Critical: Deposit confirmation email failed for ${job.data.email}`)
  }
})
```

## Testing

Workers should skip processing during tests to avoid side effects:

```typescript
// In worker file
if (process.env.NODE_ENV === 'test') {
  console.log('[WORKER] Disabled in test environment')
  return
}
```

In tests, verify jobs are enqueued but don't actually process:

```typescript
describe('POST /deposits', () => {
  it('should enqueue deposit confirmation email', async () => {
    // Stub emailQueue.add to verify it's called
    const addSpy = jest.spyOn(emailQueue, 'add')

    const res = await request(app).post('/deposits').send(...)

    expect(res.status).toBe(201)
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DEPOSIT_CONFIRMED',
        email: expect.any(String),
      }),
      expect.any(Object)
    )

    addSpy.mockRestore()
  })
})
```

## Worker Initialization

All workers must be initialized when the server starts:

```typescript
// index.ts (main server file)
import { setupEmailWorker } from './workers/email'
import { setupRolloverWorker } from './workers/rollover'
import { setupNotificationWorker } from './workers/notification'
import { setupKycReminderWorker } from './workers/kyc-reminder'

// After Express setup
setupEmailWorker()
setupRolloverWorker()
setupNotificationWorker()
setupKycReminderWorker()

server.listen(4000, () => {
  console.log('Server started with all workers initialized')
})
```

## Monitoring

Monitor queue health via Redis:

```bash
# View pending jobs
redis-cli LLEN bull:email:wait

# View active jobs
redis-cli ZRANGE bull:email:active 0 -1

# View failed jobs
redis-cli LLEN bull:email:failed

# Clear failed jobs (caution!)
redis-cli DEL bull:email:failed
```

## Common Patterns

### Deduplicate Email Jobs

Prevent duplicate emails by checking if a similar job already exists:

```typescript
const existingJobs = await emailQueue.getJobs(['waiting', 'active'])
const isDuplicate = existingJobs.some(
  (job) =>
    job.data.type === type &&
    job.data.email === email &&
    Date.now() - job.timestamp < 5000 // Within 5s
)

if (!isDuplicate) {
  await emailQueue.add(...)
}
```

### Batch Processing

For high-volume operations, batch process jobs:

```typescript
notificationQueue.process(async (job) => {
  const { userIds } = job.data

  // Process in batches of 100
  for (let i = 0; i < userIds.length; i += 100) {
    const batch = userIds.slice(i, i + 100)
    await Promise.all(batch.map((userId) => notifyUser(userId)))
  }
})
```

## Checklist

- [ ] All workers skip processing when `NODE_ENV === 'test'`
- [ ] Each worker has `setupXWorker()` function called in `index.ts`
- [ ] Queue configured with appropriate retry policy (3-5 attempts, exponential backoff)
- [ ] All job data uses string representations for money/prices
- [ ] Error events logged with worker name, job ID, and full error message
- [ ] Failed jobs retained in queue for debugging
- [ ] Scheduled workers use node-schedule with UTC times
- [ ] Route handlers enqueue jobs without blocking response
- [ ] Set worker concurrency based on job characteristics (CPU-bound workers: concurrency 1; I/O-bound workers may use higher concurrency like emailQueue.process(5, ...)) and document the chosen value
- [ ] No sensitive data logged in job data (passwords, API keys)
- [ ] Worker setup is idempotent (safe to call multiple times)
