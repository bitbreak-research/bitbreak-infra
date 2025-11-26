import { env } from 'cloudflare:test'
import app from '../src/index'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'

describe('Workers API', () => {
  let accessToken: string
  let userId: string

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

    // Create workers table
    await env.bb.prepare(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        token_expires_at TEXT NOT NULL,
        pending_token_hash TEXT,
        pending_token_expires_at TEXT,
        pending_token_created_at TEXT,
        status TEXT DEFAULT 'active',
        renewal_failure_reason TEXT,
        renewal_failure_at TEXT,
        renewal_retry_count INTEGER DEFAULT 0,
        last_connected_at TEXT,
        last_disconnected_at TEXT,
        last_ip TEXT,
        is_connected INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        created_by TEXT,
        revoked_at TEXT,
        revoked_by TEXT,
        revoke_reason TEXT
      )
    `).run()

    // Create token_log table
    await env.bb.prepare(`
      CREATE TABLE IF NOT EXISTS token_log (
        id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        token_hash TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        metadata TEXT,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      )
    `).run()

    // Create a user for authentication
    const setupRes = await app.request('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123',
        confirmPassword: 'password123'
      })
    }, env)
    
    const setupData = await setupRes.json()
    accessToken = setupData.accessToken
    userId = setupData.user.id
  })
  
  beforeEach(async () => {
    // Clean up tables before each test
    await env.bb.prepare('DELETE FROM token_log').run()
    await env.bb.prepare('DELETE FROM workers').run()
  })

  describe('POST /api/workers', () => {
    it('should create a worker successfully', async () => {
      const res = await app.request('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'MacMini-Office-01'
        })
      }, env)
      
      expect(res.status).toBe(201)
      
      const data = await res.json()
      expect(data.worker_id).toMatch(/^wrk_/)
      expect(data.name).toBe('MacMini-Office-01')
      expect(data.token).toMatch(/^tk_/)
      expect(data.token.length).toBeGreaterThan(64) // tk_ + 64 chars
      expect(data.expires_at).toBeDefined()
      expect(data.created_at).toBeDefined()
    })

    it('should fail without authentication', async () => {
      const res = await app.request('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'MacMini-Office-01'
        })
      }, env)
      
      expect(res.status).toBe(401)
    })

    it('should fail with invalid name (too short)', async () => {
      const res = await app.request('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'AB'
        })
      }, env)
      
      expect(res.status).toBe(400)
    })

    it('should fail with invalid name (too long)', async () => {
      const res = await app.request('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'A'.repeat(101)
        })
      }, env)
      
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/workers', () => {
    it('should list all workers', async () => {
      // Create a worker first
      const createRes = await app.request('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'MacMini-Office-01'
        })
      }, env)

      const res = await app.request('/api/workers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].name).toBe('MacMini-Office-01')
      expect(data[0].id).toBeDefined()
      expect(data[0].status).toBe('active')
    })

    it('should fail without authentication', async () => {
      const res = await app.request('/api/workers', {}, env)
      
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/workers/:id', () => {
    it('should get worker details', async () => {
      // Create a worker first
      const createRes = await app.request('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'MacMini-Office-01'
        })
      }, env)

      const createData = await createRes.json()
      const workerId = createData.worker_id

      const res = await app.request(`/api/workers/${workerId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.id).toBe(workerId)
      expect(data.name).toBe('MacMini-Office-01')
      expect(data.status).toBe('active')
      expect(data.token_hash).toBeUndefined() // Should not expose hash
    })

    it('should return 404 for non-existent worker', async () => {
      const res = await app.request('/api/workers/wrk_nonexistent', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(404)
      
      const data = await res.json()
      expect(data.error.code).toBe('WORKER_001')
    })

    it('should fail without authentication', async () => {
      const res = await app.request('/api/workers/wrk_test', {}, env)
      
      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /api/workers/:id', () => {
    it('should revoke a worker', async () => {
      // Create a worker first
      const createRes = await app.request('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'MacMini-Office-01'
        })
      }, env)

      const createData = await createRes.json()
      const workerId = createData.worker_id

      const res = await app.request(`/api/workers/${workerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify worker is revoked
      const getRes = await app.request(`/api/workers/${workerId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      const workerData = await getRes.json()
      expect(workerData.status).toBe('revoked')
      expect(workerData.revoked_at).toBeDefined()
    })

    it('should return 404 for non-existent worker', async () => {
      const res = await app.request('/api/workers/wrk_nonexistent', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(404)
    })

    it('should fail without authentication', async () => {
      const res = await app.request('/api/workers/wrk_test', {
        method: 'DELETE'
      }, env)
      
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/workers/:id/token', () => {
    it('should regenerate token', async () => {
      // Create a worker first
      const createRes = await app.request('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'MacMini-Office-01'
        })
      }, env)

      const createData = await createRes.json()
      const workerId = createData.worker_id
      const oldToken = createData.token

      const res = await app.request(`/api/workers/${workerId}/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.worker_id).toBe(workerId)
      expect(data.token).toMatch(/^tk_/)
      expect(data.token).not.toBe(oldToken) // New token should be different
      expect(data.expires_at).toBeDefined()
    })

    it('should return 404 for non-existent worker', async () => {
      const res = await app.request('/api/workers/wrk_nonexistent/token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)
      
      expect(res.status).toBe(404)
    })

    it('should fail without authentication', async () => {
      const res = await app.request('/api/workers/wrk_test/token', {
        method: 'POST'
      }, env)
      
      expect(res.status).toBe(401)
    })
  })
})

