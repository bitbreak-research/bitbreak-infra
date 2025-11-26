import { env } from 'cloudflare:test'
import app from '../src/index'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'

describe('Auth API', () => {
  beforeAll(async () => {
    // Create users table
    await env.bb.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run()
    
    // Create sessions table
    await env.bb.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        last_used_at TEXT DEFAULT (datetime('now')),
        user_agent TEXT,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run()
  })
  
  beforeEach(async () => {
    // Clean up tables before each test
    await env.bb.prepare('DELETE FROM sessions').run()
    await env.bb.prepare('DELETE FROM users').run()
  })

  describe('GET /api/auth/status', () => {
    it('should return needsSetup: true when no users exist', async () => {
      const res = await app.request('/api/auth/status', {}, env)
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.needsSetup).toBe(true)
      expect(data.version).toBe('1.0.0')
    })
  })

  describe('POST /api/auth/setup', () => {
    it('should create first user successfully', async () => {
      const res = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      expect(res.status).toBe(201)
      
      const data = await res.json()
      expect(data.user.username).toBe('admin')
      expect(data.accessToken).toBeDefined()
      expect(data.refreshToken).toBeDefined()
      expect(data.expiresIn).toBe(900)
    })

    it('should fail if user already exists', async () => {
      // First setup
      await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      // Second setup attempt
      const res = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin2',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      expect(res.status).toBe(400)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_002')
    })

    it('should fail with password mismatch', async () => {
      const res = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'password123',
          confirmPassword: 'differentpassword'
        })
      }, env)
      
      expect(res.status).toBe(400)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_008')
    })

    it('should fail with short password', async () => {
      const res = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'short',
          confirmPassword: 'short'
        })
      }, env)
      
      expect(res.status).toBe(400)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_009')
    })

    it('should fail with invalid username', async () => {
      const res = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ab', // too short
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      expect(res.status).toBe(400)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_010')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
    })

    it('should login successfully with valid credentials', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123'
        })
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.user.username).toBe('testuser')
      expect(data.accessToken).toBeDefined()
      expect(data.refreshToken).toBeDefined()
    })

    it('should fail with invalid username', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'password123'
        })
      }, env)
      
      expect(res.status).toBe(401)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_003')
    })

    it('should fail with invalid password', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'wrongpassword'
        })
      }, env)
      
      expect(res.status).toBe(401)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_003')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should return new access token with valid refresh token', async () => {
      // Setup user and get tokens
      const setupRes = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      const setupData = await setupRes.json()
      
      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: setupData.refreshToken
        })
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.accessToken).toBeDefined()
      expect(data.expiresIn).toBe(900)
    })

    it('should fail with invalid refresh token', async () => {
      const res = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'invalid-token'
        })
      }, env)
      
      expect(res.status).toBe(401)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_005')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Setup user and get tokens
      const setupRes = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      const setupData = await setupRes.json()
      
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${setupData.accessToken}`
        },
        body: JSON.stringify({
          refreshToken: setupData.refreshToken
        })
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      // Setup user and get tokens
      const setupRes = await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      const setupData = await setupRes.json()
      
      const res = await app.request('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${setupData.accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.user.username).toBe('testuser')
      expect(data.user.id).toBeDefined()
      expect(data.user.createdAt).toBeDefined()
    })

    it('should fail without token', async () => {
      const res = await app.request('/api/auth/me', {}, env)
      
      expect(res.status).toBe(401)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_005')
    })

    it('should fail with invalid token', async () => {
      const res = await app.request('/api/auth/me', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      }, env)
      
      expect(res.status).toBe(401)
      
      const data = await res.json()
      expect(data.error.code).toBe('AUTH_005')
    })
  })

  describe('Status after setup', () => {
    it('should return needsSetup: false after user created', async () => {
      // Create user
      await app.request('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'password123',
          confirmPassword: 'password123'
        })
      }, env)
      
      const res = await app.request('/api/auth/status', {}, env)
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.needsSetup).toBe(false)
    })
  })
})
