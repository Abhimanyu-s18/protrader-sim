import type { Request, Response, NextFunction } from 'express'
import { createLogger } from '../lib/logger.js'

const log = createLogger('error-handler')

export class AppError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Pre-built common errors
export const Errors = {
  unauthorized: () => new AppError('UNAUTHORIZED', 'Authentication required.', 401),
  forbidden: () =>
    new AppError('FORBIDDEN', 'You do not have permission to perform this action.', 403),
  kycRequired: () =>
    new AppError('KYC_REQUIRED', 'KYC verification must be approved before trading.', 403),
  notFound: (resource: string) => new AppError('NOT_FOUND', `${resource} not found.`, 404),
  insufficientFunds: () =>
    new AppError('INSUFFICIENT_FUNDS', 'Insufficient available balance.', 409),
  insufficientMargin: () =>
    new AppError('INSUFFICIENT_MARGIN', 'Insufficient available margin for this trade.', 409),
  marketClosed: (symbol: string) =>
    new AppError('MARKET_CLOSED', `${symbol} is not available for trading at this time.`, 409),
  invalidRate: (hint: string) => new AppError('INVALID_RATE', hint, 422),
  duplicate: (field: string) => new AppError('DUPLICATE', `${field} already exists.`, 409),
  conflict: (message?: string) =>
    new AppError('CONFLICT', message ?? 'This resource is in a conflicting state.', 409),
  validation: (details: Record<string, unknown>) =>
    new AppError('VALIDATION_ERROR', 'Request validation failed.', 400, details),
  badRequest: (message: string) => new AppError('BAD_REQUEST', message, 400),
  internal: () => new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500),
} as const

// Global error handler middleware
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error_code: err.errorCode,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  // Prisma unique constraint
  if (err.message.includes('Unique constraint')) {
    res.status(409).json({ error_code: 'DUPLICATE', message: 'Resource already exists.' })
    return
  }

  // Unexpected errors — log and return generic
  log.error({ err }, 'Unhandled error')
  res.status(500).json({ error_code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' })
}
