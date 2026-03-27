import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Errors } from './errorHandler.js'
import type { JwtPayload } from '../types/auth.js'

// Extend Express Request to carry decoded JWT
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

const JWT_PUBLIC_KEY = process.env['JWT_PUBLIC_KEY'] ?? ''

// ── requireAuth ───────────────────────────────────────────────────
// Validates JWT access token. Attaches decoded payload to req.user.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next(Errors.unauthorized())
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as JwtPayload
    req.user = payload
    next()
  } catch {
    next(Errors.unauthorized())
  }
}

// ── requireKYC ────────────────────────────────────────────────────
// Blocks traders who haven't completed KYC. Must run after requireAuth.
export function requireKYC(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.kyc_status !== 'APPROVED') {
    next(Errors.kycRequired())
    return
  }
  next()
}

// ── requireRole ───────────────────────────────────────────────────
// Checks that the authenticated user has one of the required roles.
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(Errors.unauthorized())
      return
    }
    if (!roles.includes(req.user.role)) {
      next(Errors.forbidden())
      return
    }
    next()
  }
}

// ── requireSelf ───────────────────────────────────────────────────
// Ensures the authenticated user can only access their own resources.
export function requireSelf(
  getResourceUserId: (req: Request) => Promise<bigint | null>,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(Errors.unauthorized())
      return
    }
    const resourceUserId = await getResourceUserId(req)
    if (resourceUserId === null) {
      next(Errors.notFound('Resource'))
      return
    }
    if (BigInt(req.user.user_id) !== resourceUserId) {
      next(Errors.forbidden())
      return
    }
    next()
  }
}
