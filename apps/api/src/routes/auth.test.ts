import request from 'supertest'
import app from '../index.js' // Import the Express app
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'

const agent = request.agent(app)

async function cleanupTestData() {
  // Delete test user sessions first
  await prisma.session.deleteMany({ where: { user: { email: { startsWith: 'test-' } } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })

  const redis = getRedis()

  // Clean up test-related Redis keys (only auth-specific patterns)
  const patterns = ['email_verify:*', 'pwd_reset:*']

  for (const pattern of patterns) {
    const stream = redis.scanStream({ match: pattern, count: 100 })
    for await (const keys of stream) {
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  }

  return redis
}

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await cleanupTestData()
  })

  afterAll(async () => {
    const redis = await cleanupTestData()

    await redis.quit()
    await prisma.$disconnect()
  })

  describe('POST /v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await agent
        .post('/v1/auth/register')
        .send({
          email: 'test-user@example.com',
          password: 'TestPassword123!',
          full_name: 'Test User',
          phone: '+1234567890',
          country: 'US',
          terms_accepted: true,
        })
        .expect(201)

      expect(response.body.data).toHaveProperty('user_id')
      expect(response.body.data).toHaveProperty('email', 'test-user@example.com')
      expect(response.body.data).toHaveProperty('access_token')
      expect(response.body.data).toHaveProperty('refresh_token')
    })

    it('should reject invalid email', async () => {
      const res = await agent
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          full_name: 'Test User',
          phone: '+1234567890',
          country: 'US',
          terms_accepted: true,
        })
        .expect(400)

      expect(res.body).toHaveProperty('error_code', 'VALIDATION_ERROR')
      expect(res.body).toHaveProperty('message')
    })

    it('should reject weak password', async () => {
      const res = await agent
        .post('/v1/auth/register')
        .send({
          email: 'test-weak@example.com',
          password: 'weak',
          full_name: 'Test User',
          phone: '+1234567890',
          country: 'US',
          terms_accepted: true,
        })
        .expect(400)

      expect(res.body).toHaveProperty('error_code', 'VALIDATION_ERROR')
      expect(res.body).toHaveProperty('message')
    })

    it('should reject duplicate email', async () => {
      // First registration
      await agent
        .post('/v1/auth/register')
        .send({
          email: 'test-duplicate@example.com',
          password: 'TestPassword123!',
          full_name: 'Test User',
          phone: '+1234567890',
          country: 'US',
          terms_accepted: true,
        })
        .expect(201)

      // Duplicate registration
      await agent
        .post('/v1/auth/register')
        .send({
          email: 'test-duplicate@example.com',
          password: 'TestPassword123!',
          full_name: 'Test User 2',
          phone: '+1234567891',
          country: 'US',
          terms_accepted: true,
        })
        .expect(400)
    })
  })

  describe('POST /v1/auth/login', () => {
    beforeAll(async () => {
      // Create a test user
      await agent.post('/v1/auth/register').send({
        email: 'test-login@example.com',
        password: 'TestPassword123!',
        full_name: 'Test Login',
        phone: '+1234567890',
        country: 'US',
        terms_accepted: true,
      })
    })

    it('should login successfully with correct credentials', async () => {
      const response = await agent
        .post('/v1/auth/login')
        .send({
          email: 'test-login@example.com',
          password: 'TestPassword123!',
        })
        .expect(200)

      expect(response.body.data).toHaveProperty('user_id')
      expect(response.body.data).toHaveProperty('access_token')
      expect(response.body.data).toHaveProperty('refresh_token')
    })

    it('should reject invalid credentials', async () => {
      const response = await agent
        .post('/v1/auth/login')
        .send({
          email: 'test-login@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401)

      expect(response.body.error).toBe('INVALID_CREDENTIALS')
    })

    it('should reject non-existent user', async () => {
      const response = await agent
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
        .expect(401)

      expect(response.body.error).toBe('INVALID_CREDENTIALS')
    })
  })

  describe('POST /v1/auth/refresh', () => {
    let refreshToken: string

    beforeAll(async () => {
      // Login to get refresh token
      const response = await agent.post('/v1/auth/login').send({
        email: 'test-login@example.com',
        password: 'TestPassword123!',
      })

      if (response.status !== 200 || !response.body?.data?.refresh_token) {
        throw new Error(
          `Failed to get refresh token during setup: status=${response.status} body=${JSON.stringify(response.body)}`,
        )
      }

      refreshToken = response.body.data.refresh_token
    })
    it('should refresh access token', async () => {
      const response = await agent
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200)

      expect(response.body.data).toHaveProperty('access_token')
      expect(response.body.data).toHaveProperty('refresh_token')

      refreshToken = response.body.data.refresh_token
    })

    it('should reject invalid refresh token', async () => {
      await agent.post('/v1/auth/refresh').send({ refresh_token: 'invalid-token' }).expect(401)
    })
  })

  describe('POST /v1/auth/logout', () => {
    let accessToken: string

    beforeAll(async () => {
      // Login to get access token
      const response = await agent.post('/v1/auth/login').send({
        email: 'test-login@example.com',
        password: 'TestPassword123!',
      })

      if (response.status !== 200 || !response.body?.data?.access_token) {
        throw new Error(
          `Failed to get access token during setup: status=${response.status} body=${JSON.stringify(response.body)}`,
        )
      }

      accessToken = response.body.data.access_token
    })

    it('should logout successfully', async () => {
      await agent.post('/v1/auth/logout').set('Authorization', `Bearer ${accessToken}`).expect(200)
    })

    it('should reject logout without auth', async () => {
      await agent.post('/v1/auth/logout').expect(401)
    })
  })

  describe('POST /v1/auth/forgot-password', () => {
    it('should accept forgot password request for registered email (anti-enumeration)', async () => {
      const response = await agent
        .post('/v1/auth/forgot-password')
        .send({ email: 'test-login@example.com' })
        .expect(200)

      // Should always return success to prevent email enumeration
      expect(response.body.data).toHaveProperty('message')
    })

    it('should accept non-existent email (anti-enumeration)', async () => {
      const response = await agent
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)

      expect(response.body.data).toHaveProperty('message')
    })
  })

  describe('POST /v1/auth/reset-password', () => {
    it('should reject invalid token', async () => {
      await agent
        .post('/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
        })
        .expect(400)
    })
  })

  describe('POST /v1/auth/verify-email', () => {
    it('should reject invalid token', async () => {
      await agent.post('/v1/auth/verify-email').query({ token: 'invalid-token' }).expect(400)
    })
  })
})
