import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { hash, compare } from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'
import { AppError, Errors } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeBigInt } from '../lib/calculations.js'
import crypto from 'crypto'

export const authRouter: ExpressRouter = Router()

const JWT_PRIVATE_KEY = process.env['JWT_PRIVATE_KEY'] ?? ''
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_DEFAULT = 7 * 24 * 60 * 60 // 7 days in seconds
const REFRESH_TOKEN_EXPIRY_REMEMBER = 30 * 24 * 60 * 60 // 30 days

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/
const PASSWORD_ERROR_MSG =
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'

// ── Schemas ───────────────────────────────────────────────────────
const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).regex(PASSWORD_REGEX, PASSWORD_ERROR_MSG),
  full_name: z.string().min(2).max(255),
  phone: z.string().min(6).max(30),
  country: z.string().min(2).max(100),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions.' }),
  }),
  ref_code: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_me: z.boolean().default(false),
})

const PasswordSchema = z.object({
  password: z.string().min(12).regex(PASSWORD_REGEX, PASSWORD_ERROR_MSG),
})

// ── Helpers ───────────────────────────────────────────────────────
function generateAccessToken(payload: {
  user_id: string
  email: string
  role: string
  kyc_status: string
}): string {
  return jwt.sign(payload, JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

// ── POST /v1/auth/register ────────────────────────────────────────
authRouter.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const { email, password, full_name, phone, country, ref_code } = body.data

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      next(Errors.duplicate('Email'))
      return
    }

    // Find agent by ref_code if provided
    let agentId: bigint | null = null
    if (ref_code) {
      const agent = await prisma.staff.findUnique({ where: { refCode: ref_code } })
      agentId = agent?.id ?? null
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Generate account_number and lead_id via DB functions
    const [{ generate_account_number: accountNumber }] = await prisma.$queryRaw<
      [{ generate_account_number: string }]
    >`
      SELECT generate_account_number()
    `
    const [{ generate_lead_id: leadId }] = await prisma.$queryRaw<[{ generate_lead_id: string }]>`
      SELECT generate_lead_id()
    `

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: full_name,
        phone,
        country,
        accountNumber,
        leadId,
        agentId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountNumber: true,
        leadId: true,
        kycStatus: true,
        accountStatus: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    // Generate email verification token (24h TTL in Redis)
    const verifyToken = crypto.randomBytes(32).toString('hex')
    await getRedis().setex(`email_verify:${verifyToken}`, 86400, user.id.toString())

    // TODO: Queue welcome email via emailQueue
    // await emailQueue.add('welcome', { userId: user.id.toString(), email, verifyToken })

    // Issue tokens
    const accessToken = generateAccessToken({
      user_id: user.id.toString(),
      email: user.email,
      role: 'TRADER',
      kyc_status: user.kycStatus,
    })
    const refreshToken = generateRefreshToken()

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DEFAULT * 1000),
      },
    })

    res.status(201).json(
      serializeBigInt({
        user,
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    )
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/auth/login ───────────────────────────────────────────
authRouter.post('/login', async (req, res, next) => {
  try {
    const body = LoginSchema.safeParse(req.body)
    if (!body.success) {
      next(Errors.validation(body.error.flatten().fieldErrors as Record<string, unknown>))
      return
    }

    const { email, password, remember_me } = body.data

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        accountNumber: true,
        kycStatus: true,
        accountStatus: true,
        emailVerified: true,
        agentId: true,
      },
    })

    if (!user || !(await compare(password, user.passwordHash))) {
      next(new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401))
      return
    }

    if (user.accountStatus === 'SUSPENDED') {
      next(
        new AppError(
          'ACCOUNT_SUSPENDED',
          'Your account has been suspended. Please contact support.',
          403,
        ),
      )
      return
    }

    const ttl = remember_me ? REFRESH_TOKEN_EXPIRY_REMEMBER : REFRESH_TOKEN_EXPIRY_DEFAULT
    const accessToken = generateAccessToken({
      user_id: user.id.toString(),
      email: user.email,
      role: 'TRADER',
      kyc_status: user.kycStatus,
    })
    const refreshToken = generateRefreshToken()

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...safeUser } = user

    res.json(
      serializeBigInt({
        user: safeUser,
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    )
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/auth/refresh ─────────────────────────────────────────
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string }
    if (!refresh_token) {
      next(Errors.unauthorized())
      return
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken: refresh_token },
      include: {
        user: { select: { id: true, email: true, kycStatus: true, accountStatus: true } },
      },
    })

    if (!session || !session.user || session.expiresAt < new Date()) {
      next(Errors.unauthorized())
      return
    }

    if (session.user.accountStatus === 'SUSPENDED') {
      try {
        // Invalidate ALL sessions for the suspended user, not just the current one
        await prisma.session.deleteMany({ where: { userId: session.user.id } })
      } catch (deleteErr) {
        logger.error(
          {
            userId: session?.user?.id ? String(session.user.id) : undefined,
            err: deleteErr,
          },
          'Failed to delete suspended user sessions',
        )
      }
      next(
        new AppError(
          'ACCOUNT_SUSPENDED',
          'Your account has been suspended. Please contact support.',
          403,
        ),
      )
      return
    }

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken()
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DEFAULT * 1000),
      },
    })

    const accessToken = generateAccessToken({
      user_id: session.user.id.toString(),
      email: session.user.email,
      role: 'TRADER',
      kyc_status: session.user.kycStatus,
    })

    res.json({ access_token: accessToken, refresh_token: newRefreshToken })
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/auth/logout ──────────────────────────────────────────
authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string }
    if (refresh_token) {
      await prisma.session.deleteMany({ where: { refreshToken: refresh_token } })
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/auth/verify-email ────────────────────────────────────
authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body as { token?: string }
    if (!token) {
      next(Errors.notFound('Verification token'))
      return
    }

    const userId = await getRedis().get(`email_verify:${token}`)
    if (!userId) {
      next(Errors.notFound('Verification token'))
      return
    }

    await prisma.user.update({ where: { id: BigInt(userId) }, data: { emailVerified: true } })
    await getRedis().del(`email_verify:${token}`)

    res.json({ success: true, message: 'Email verified successfully.' })
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/auth/forgot-password ────────────────────────────────
authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string }
    if (!email) {
      res.json({ success: true })
      return
    } // Always succeed to prevent enumeration

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex')
      await getRedis().setex(`pwd_reset:${resetToken}`, 3600, user.id.toString()) // 1h TTL
      // TODO: Queue password reset email
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/auth/reset-password ─────────────────────────────────
authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string }
    if (!token || !password) {
      next(Errors.validation({ token: ['Required'], password: ['Required'] }))
      return
    }

    const passwordValidation = PasswordSchema.safeParse({ password })
    if (!passwordValidation.success) {
      next(
        Errors.validation(
          passwordValidation.error.flatten().fieldErrors as Record<string, unknown>,
        ),
      )
      return
    }

    const userId = await getRedis().get(`pwd_reset:${token}`)
    if (!userId) {
      next(Errors.notFound('Reset token'))
      return
    }

    const passwordHash = await hash(password, 12)
    await prisma.user.update({ where: { id: BigInt(userId) }, data: { passwordHash } })

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: BigInt(userId) } })
    await getRedis().del(`pwd_reset:${token}`)

    res.json({ success: true, message: 'Password reset successfully. Please log in again.' })
  } catch (err) {
    next(err)
  }
})

// ── POST /v1/auth/change-password ────────────────────────────────
authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body as {
      current_password?: string
      new_password?: string
    }
    if (!current_password || !new_password) {
      next(Errors.validation({ current_password: ['Required'], new_password: ['Required'] }))
      return
    }

    const passwordValidation = PasswordSchema.safeParse({ password: new_password })
    if (!passwordValidation.success) {
      const fieldErrors = passwordValidation.error.flatten().fieldErrors
      next(
        Errors.validation({ new_password: (fieldErrors.password || []).map(String) } as Record<
          string,
          unknown
        >),
      )
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user!.user_id) },
      select: { id: true, passwordHash: true },
    })
    if (!user) {
      next(Errors.unauthorized())
      return
    }

    const valid = await compare(current_password, user.passwordHash)
    if (!valid) {
      next(Errors.validation({ current_password: ['Current password is incorrect.'] }))
      return
    }

    const newHash = await hash(new_password, 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })
    // Invalidate all sessions on password change
    await prisma.session.deleteMany({ where: { userId: user.id } })

    res.json({ success: true, message: 'Password changed successfully.' })
  } catch (err) {
    next(err)
  }
})
