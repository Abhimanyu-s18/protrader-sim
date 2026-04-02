---
name: 'authentication-jwt-flow'
description: 'Use when: implementing JWT authentication, configuring RS256 key pairs, verifying tokens, handling token refresh, or securing API endpoints. Ensures proper JWT implementation with RS256 asymmetric encryption across all services. Primary agents: @security, @coding.'
---

# Skill: Authentication JWT Flow

**Scope**: JWT RS256 authentication, token verification, key management, session handling
**Primary Agents**: @security, @coding
**When to Use**: Implementing auth endpoints, securing routes, handling login/logout, token verification

---

## Core Principles

### 1. RS256 Asymmetric Encryption

- **Private key**: Signs tokens (API only)
- **Public key**: Verifies tokens (API + all frontend apps)
- **Never share private key** with frontend apps
- **Key rotation** requires coordinated deployment

### 2. Token Structure

```typescript
// JWT Payload
{
  "sub": "user-id",           // User ID (required)
  "role": "TRADER",           // User role (required)
  "iat": 1712000000,          // Issued at (required)
  "exp": 1712086400,          // Expiration (required, 24h)
  "jti": "unique-token-id"    // JWT ID for revocation (optional)
}
```

### 3. Stateless Authentication

- No server-side session storage
- Token contains all necessary claims
- Revocation via blocklist (Redis) when needed

---

## Key Generation

### Generate RSA Key Pair

```bash
### Key Format


-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
...base64 encoded key...
-----END PUBLIC KEY-----
```

---

## Implementation

### JWT Middleware

```typescript
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { redis } from '@/lib/redis'
import { AppError } from '@/types/errors'

export interface AuthRequest extends Request {
  user: {
    id: string
    role: string
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing authentication token', 401, 'UNAUTHORIZED')
    }

    const token = authHeader.split(' ')[1]

    // Check if token is revoked
    const isRevoked = await redis.get(`token:revoked:${token}`)
    if (isRevoked) {
      throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED')
    }

    // Verify token
    const publicKey = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n')
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as { sub: string; role: string }

    // Attach user to request
    ;(req as AuthRequest).user = {
      id: decoded.sub,
      role: decoded.role,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token has expired', 401, 'TOKEN_EXPIRED'))
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'))
    }
    next(error)
  }
}

// Role-based authorization
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user
    if (!user || !roles.includes(user.role)) {
      return next(
        new AppError(
          `Insufficient permissions. Required: ${roles.join(' or ')}`,
          403,
          'INSUFFICIENT_PERMISSIONS',
        ),
      )
    }
    next()
  }
}
```

### Login Endpoint

```typescript
// apps/api/src/routes/auth.ts
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authMiddleware, AuthRequest } from '@/middleware/auth'
import { AppError } from '@/types/errors'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }

    // Generate JWT
    const privateKey = process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n')
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role || 'TRADER',
        iat: Math.floor(Date.now() / 1000),
      },
      privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '24h',
      },
    )

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          kycStatus: user.kycStatus,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get current user
router.get('/auth/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        kycStatus: true,
        accountType: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND')
    }

    res.json({ data: user })
  } catch (error) {
    next(error)
  }
})

// Logout (revoke token)
router.post('/auth/logout', authMiddleware, async (req: AuthRequest, res) => {
  const token = req.headers.authorization!.split(' ')[1]

  // Add token to revocation list (TTL = token expiration)
  await redis.setex(`token:revoked:${token}`, 86400, '1')

  res.json({ message: 'Logged out successfully' })
})

export default router
```

### Socket.io Authentication

```typescript
// apps/api/src/lib/socket.ts
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

export function setupSocketAuth(io: Server) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const publicKey = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n')
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
      }) as { sub: string; role: string }

      socket.data.user = decoded
      next()
    } catch (error) {
      next(new Error('Invalid token'))
    }
  })

import { redis } from '@/lib/redis'

export function setupSocketAuth(io: Server) {
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      // Check if token is revoked
      const isRevoked = await redis.get(`token:revoked:${token}`)
      if (isRevoked) {
        return next(new Error('Token has been revoked'))
      }

      const publicKey = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n')
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
      }) as { sub: string; role: string }

      socket.data.user = decoded
      next()
    } catch (error) {
      next(new Error('Invalid token'))
    }
  })
      symbols.forEach((symbol) => {
        socket.leave(`prices:${symbol}`)
      })
    })
  })
}
```

---

## Frontend Integration

### API Client with Auth

```typescript
// apps/platform/lib/api-client.ts
import { createApiClient } from '@protrader/utils'

const apiClient = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  getToken: () => localStorage.getItem('auth_token'),
  credentials: 'include',
  onUnauthorized: () => {
    window.location.href = '/login'
  },
})

export { apiClient }
```

### Auth Hook

```typescript
// apps/platform/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoading(false)
      return
    }

    apiClient
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password })
    localStorage.setItem('auth_token', res.data.token)
    setUser(res.data.user)
  }

  const logout = async () => {
    await apiClient.post('/auth/logout')
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  return { user, loading, login, logout }
}
```

---

## Security Best Practices

### 1. Token Expiration

- Access tokens: 24 hours maximum
- Refresh tokens: Not used (stateless design)
- Re-authentication required after expiration

### 2. Token Revocation

```typescript
// Revoke on logout
await redis.setex(`token:revoked:${token}`, 86400, '1')

// Revoke all user tokens (password change, security incident)
await redis.setex(`user:${userId}:tokens:revoked`, 86400, Date.now().toString())

// Check in middleware
const revokeTimestamp = await redis.get(`user:${userId}:tokens:revoked`)
if (revokeTimestamp && decoded.iat < parseInt(revokeTimestamp)) {
  throw new AppError('Token revoked', 401, 'TOKEN_REVOKED')
}
```

### 3. Rate Limiting Auth Endpoints

```typescript
// 10 login attempts per 15 minutes per IP
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many attempts' } },
})

router.post('/auth/login', authLimiter, loginHandler)
```

---

## Troubleshooting

### Token Verification Failed

```bash
# Verify public key matches private key
openssl rsa -in jwt-private.pem -pubout -out temp-public.pem
diff jwt-public.pem temp-public.pem
rm temp-public.pem
```

### Token Expired

```typescript
// Check token expiration (decode only - doesn't verify signature)
// Use jwt.verify() for production verification
const decoded = jwt.decode(token, { complete: true })
console.log('Expires at:', new Date(decoded.payload.exp * 1000))
```

---

## References

- [RBAC Implementation Skill](../rbac-implementation/SKILL.md)
- [Error Handling Patterns Skill](../error-handling-patterns/SKILL.md)
- [Socket.io Real-Time Skill](../socket-io-real-time/SKILL.md)
- [Secrets and Env Vars Skill](../secrets-and-env-vars/SKILL.md)
