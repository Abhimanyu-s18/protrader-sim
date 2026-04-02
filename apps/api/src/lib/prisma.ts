import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// In development, reuse the same PrismaClient instance across hot reloads
export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = prisma
}

/**
 * Wrapper to retry Serializable transaction failures due to SSI conflicts.
 * PostgreSQL Serializable Snapshot Isolation can abort transactions with:
 * - Prisma error code: P2034
 * - PostgreSQL error code: 40001
 * This function retries the transaction with exponential backoff up to maxRetries times.
 */
export async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const error = err as Record<string, unknown> & Error
      const isSerializableConflict =
        error?.code === 'P2034' || (error?.meta as Record<string, unknown>)?.code === '40001'

      if (!isSerializableConflict || attempt === maxRetries - 1) {
        // Not a serialization conflict or we're out of retries - throw original error
        throw err
      }

      // Exponential backoff: 50ms, 100ms, 200ms
      lastError = error
      const delayMs = 50 * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError ?? new Error('withSerializableRetry: unexpected error')
}
