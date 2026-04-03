import request from 'supertest'
import app from '../index.js' // Import the Express app
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'

const agent = request.agent(app)

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.session.deleteMany()
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })
    await getRedis().flushall()
  })

  afterAll(async () => {
    // Clean up
    await prisma.session.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })
    await getRedis().flushall()
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
      await agent
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
    })

    it('should reject weak password', async () => {
      await agent
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

      refreshToken = response.body.data.refresh_token
    })

    it('should refresh access token', async () => {
      const response = await agent
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200)

      expect(response.body.data).toHaveProperty('access_token')
      expect(response.body.data).toHaveProperty('refresh_token')
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
    it('should accept forgot password request (anti-enumeration)', async () => {
      const response = await agent
        .post('/v1/auth/forgot-password')
        .send({ email: 'test-forgot@example.com' })
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
