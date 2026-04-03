import request from 'supertest'
import app from '../index.js'
import { prisma } from '../lib/prisma.js'
import { getRedis } from '../lib/redis.js'

const agent = request.agent(app)

describe('Trades API Integration Tests', () => {
  let accessToken: string
  let instrumentId: string

  beforeAll(async () => {
    // Clean up test data
    await prisma.trade.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })
    await getRedis().flushall()

    // Create test user and login
    await agent.post('/v1/auth/register').send({
      email: 'test-trader@example.com',
      password: 'TestPassword123!',
      full_name: 'Test Trader',
      phone: '+1234567890',
      country: 'US',
      terms_accepted: true,
    })

    const loginResponse = await agent.post('/v1/auth/login').send({
      email: 'test-trader@example.com',
      password: 'TestPassword123!',
    })

    accessToken = loginResponse.body.data.access_token

    // Get first instrument
    const instruments = await prisma.instrument.findMany({ take: 1 })
    if (!instruments.length) {
      throw new Error('No instruments found in database. Please run seed data.')
    }
    instrumentId = instruments[0]!.id.toString()
  })

  afterAll(async () => {
    // Clean up
    await prisma.trade.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })
    await getRedis().flushall()
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

      expect(response.body.data).toHaveProperty('trade_id')
      expect(response.body.data).toHaveProperty('status', 'OPEN')
      expect(response.body.data).toHaveProperty('direction', 'BUY')
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

      expect(response.body.data).toHaveProperty('trade_id')
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

      tradeId = response.body.data.trade_id
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
      await agent
        .post(`/v1/trades/${tradeId}/close`)
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

      tradeId = response.body.data.trade_id
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

      entryOrderId = response.body.data.trade_id
    })

    it('should cancel a pending entry order', async () => {
      const response = await agent
        .delete(`/v1/trades/${entryOrderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
    })
  })

  describe('GET /v1/trades', () => {
    beforeAll(async () => {
      // Create some trades for listing
      await agent.post('/v1/trades').set('Authorization', `Bearer ${accessToken}`).send({
        instrument_id: instrumentId,
        direction: 'SELL',
        units: 500,
        order_type: 'MARKET',
      })
    })

    it('should list user trades', async () => {
      const response = await agent
        .get('/v1/trades')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(response.body.data.items)).toBe(true)
      expect(response.body.data.items.length).toBeGreaterThan(0)
      expect(response.body.data).toHaveProperty('has_more', false)
    })

    it('should support pagination', async () => {
      const response = await agent
        .get('/v1/trades?limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.data.items.length).toBe(1)
      expect(response.body.data).toHaveProperty('has_more', true)
      expect(response.body.data).toHaveProperty('next_cursor')
    })
  })
})
