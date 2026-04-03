import request from 'supertest'
import app from '../index.js'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'

const agent = request.agent(app)

async function cleanupTestData() {
  // Clean up test data scoped to test users to avoid deleting production data.
  const testUsers = await prisma.user.findMany({ where: { email: { startsWith: 'test-' } } })
  const testUserIds = testUsers.map((u) => u.id)

  if (testUserIds.length > 0) {
    await prisma.trade.deleteMany({ where: { userId: { in: testUserIds } } })
    await prisma.session.deleteMany({ where: { userId: { in: testUserIds } } })
  }

  await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })

  try {
    const redis = getRedis()
    const stream = redis.scanStream({ match: 'test:*', count: 100 })
    for await (const keys of stream) {
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  } catch (error) {
    console.error('Redis cleanup failed in trades.test:', error)
    throw error
  }
}

describe('Trades API Integration Tests', () => {
  let accessToken: string
  let instrumentId: string

  beforeAll(async () => {
    await cleanupTestData()

    // Create test user and login
    const registerResponse = await agent.post('/v1/auth/register').send({
      email: 'test-trader@example.com',
      password: 'TestPassword123!',
      full_name: 'Test Trader',
      phone: '+1234567890',
      country: 'US',
      terms_accepted: true,
    })

    if (registerResponse.status !== 201 && registerResponse.status !== 200) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`)
    }

    const loginResponse = await agent.post('/v1/auth/login').send({
      email: 'test-trader@example.com',
      password: 'TestPassword123!',
    })

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`)
    }

    accessToken = loginResponse.body.data.access_token
    if (!accessToken) {
      throw new Error('Authentication failed during setup.')
    }

    const instruments = await prisma.instrument.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    if (instruments.length === 0) {
      throw new Error('No instruments found in database. Please run seed data.')
    }

    instrumentId = instruments[0]!.id.toString()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('POST /v1/trades (MARKET)', () => {
    it('should open a market trade successfully', async () => {
      const response = await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'MARKET',
        })
        .expect(201)

      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('status', 'OPEN')
      expect(response.body.data).toHaveProperty('direction', 'BUY')
      // `units` comes from BigInt-backed DB column and is serialized by serializeBigInt as a string.
      // Keep this assert in sync with API contract; adjust if contract changes to numeric units.
      expect(response.body.data).toHaveProperty('units', '1000')
    })

    it('should reject trade without authentication', async () => {
      await agent
        .post('/v1/trades')
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'MARKET',
        })
        .expect(401)
    })

    it('should reject invalid instrument', async () => {
      await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: 'invalid-id',
          direction: 'BUY',
          units: 1000,
          order_type: 'MARKET',
        })
        .expect(400)
    })

    it('should reject insufficient margin', async () => {
      await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000000, // Very large position
          order_type: 'MARKET',
        })
        .expect(400)
    })
  })

  describe('POST /v1/trades (ENTRY)', () => {
    it('should create an entry order successfully', async () => {
      const response = await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'ENTRY',
          entry_rate: 1.085,
        })
        .expect(201)

      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('status', 'PENDING')
      expect(response.body.data).toHaveProperty('order_type', 'ENTRY')
    })

    it('should reject entry order with invalid rate', async () => {
      await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'ENTRY',
          entry_rate: -1, // Invalid negative rate
        })
        .expect(400)
    })
  })

  describe('POST /v1/trades/:id/close', () => {
    let tradeId: string

    beforeAll(async () => {
      // Create a trade to close
      const response = await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'MARKET',
        })
        .expect(201)

      tradeId = response.body.data.id
      if (!tradeId) {
        throw new Error('Failed to create trade for close tests')
      }
    })

    it('should close a trade successfully', async () => {
      const response = await agent
        .post(`/v1/trades/${tradeId}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.data).toHaveProperty('status', 'CLOSED')
      expect(response.body.data).toHaveProperty('closed_by', 'USER')
    })

    it('should reject closing non-existent trade', async () => {
      await agent
        .post('/v1/trades/999999/close')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should reject closing already closed trade', async () => {
      const createResponse = await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'MARKET',
        })
        .expect(201)

      const localTradeId = createResponse.body.data.id
      await agent
        .post(`/v1/trades/${localTradeId}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      await agent
        .post(`/v1/trades/${localTradeId}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
    })
  })

  describe('PUT /v1/trades/:id/sl-tp', () => {
    let tradeId: string

    beforeAll(async () => {
      // Create a trade to modify
      const response = await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'MARKET',
        })
        .expect(201)

      tradeId = response.body.data.id
      if (!tradeId) {
        throw new Error('Failed to create trade for SL/TP tests')
      }
    })

    it('should update stop loss and take profit', async () => {
      const response = await agent
        .put(`/v1/trades/${tradeId}/sl-tp`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          stop_loss: 1.08,
          take_profit: 1.09,
        })
        .expect(200)

      expect(response.body.data).toHaveProperty('stop_loss')
      expect(response.body.data).toHaveProperty('take_profit')
      expect(response.body.data.stop_loss).toBe(1.08)
      expect(response.body.data.take_profit).toBe(1.09)
    })

    it('should reject invalid SL/TP values', async () => {
      await agent
        .put(`/v1/trades/${tradeId}/sl-tp`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          stop_loss: -10, // Invalid negative
        })
        .expect(400)
    })
  })

  describe('DELETE /v1/trades/:id (CANCEL)', () => {
    let entryOrderId: string

    beforeAll(async () => {
      // Create an entry order to cancel
      const response = await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'ENTRY',
          entry_rate: 1.085,
        })
        .expect(201)

      entryOrderId = response.body.data.id
      expect(entryOrderId).toBeTruthy()
    })

    it('should cancel a pending entry order', async () => {
      const response = await agent
        .delete(`/v1/trades/${entryOrderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
    })

    it('should return 404 when cancelling non-existent order', async () => {
      const response = await agent
        .delete('/v1/trades/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject cancelling an already closed order', async () => {
      const createResponse = await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'BUY',
          units: 1000,
          order_type: 'MARKET',
        })
        .expect(201)

      const executedOrderId = createResponse.body.data.id
      await agent
        .post(`/v1/trades/${executedOrderId}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const response = await agent
        .delete(`/v1/trades/${executedOrderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /v1/trades', () => {
    beforeAll(async () => {
      // Create some trades for listing
      await agent
        .post('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          instrument_id: instrumentId,
          direction: 'SELL',
          units: 500,
          order_type: 'MARKET',
        })
        .expect(201)
    })

    it('should list user trades', async () => {
      const response = await agent
        .get('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(typeof response.body.has_more).toBe('boolean')
    })

    it('should support pagination', async () => {
      const response = await agent
        .get('/v1/trades?limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.data.length).toBeLessThanOrEqual(1)
      if (response.body.next_cursor) {
        expect(response.body.has_more).toBe(true)
      } else {
        expect(response.body.has_more).toBe(false)
      }
    })
  })
})
