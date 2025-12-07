import { env } from 'cloudflare:test'
import { app } from '../src/index'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { hashToken } from '../src/lib/token'
import { handleMetrics } from '../src/routes/ws'
import type { WSContext } from 'hono/ws'

describe('Metrics API', () => {
  let accessToken: string
  let workerId: string
  let workerToken: string

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

    // Create metrics table
    await env.bb.prepare(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT NOT NULL,
        memory INTEGER NOT NULL,
        cpu INTEGER NOT NULL,
        rate INTEGER NOT NULL,
        mnemonic_language TEXT,
        threads INTEGER,
        batch_size INTEGER,
        gpu_enabled INTEGER DEFAULT 0,
        gpu_batch_size INTEGER,
        report_interval_seconds INTEGER,
        keep_address INTEGER DEFAULT 0,
        power_level TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      )
    `).run()

    // Create indexes
    await env.bb.prepare(`CREATE INDEX IF NOT EXISTS idx_metrics_worker ON metrics(worker_id)`).run()
    await env.bb.prepare(`CREATE INDEX IF NOT EXISTS idx_metrics_created ON metrics(created_at)`).run()
    await env.bb.prepare(`CREATE INDEX IF NOT EXISTS idx_metrics_worker_created ON metrics(worker_id, created_at)`).run()

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

    // Create a worker for testing
    const workerRes = await app.request('/api/workers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: 'Test Worker'
      })
    }, env)

    const workerData = await workerRes.json()
    workerId = workerData.worker_id
    workerToken = workerData.token
  })

  beforeEach(async () => {
    // Clean up tables before each test
    await env.bb.prepare('DELETE FROM metrics').run()
    await env.bb.prepare('DELETE FROM token_log').run()
  })

  describe('GET /api/workers/:id/metrics/latest', () => {
    it('should return 404 when worker has no metrics', async () => {
      const res = await app.request(`/api/workers/${workerId}/metrics/latest`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(404)
    })

    it('should return latest metrics for a worker', async () => {
      // Insert test metrics
      await env.bb.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, 4096, 45, 12, new Date().toISOString()).run()

      const res = await app.request(`/api/workers/${workerId}/metrics/latest`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.worker_id).toBe(workerId)
      expect(data.memory).toBe(4096)
      expect(data.cpu).toBe(45)
      expect(data.rate).toBe(12)
      expect(data.created_at).toBeDefined()
    })

    it('should return 404 for non-existent worker', async () => {
      const res = await app.request('/api/workers/wrk_nonexistent/metrics/latest', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(404)
    })

    it('should fail without authentication', async () => {
      const res = await app.request(`/api/workers/${workerId}/metrics/latest`, {}, env)

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/workers/:id/metrics', () => {
    it('should return metrics history with default date range', async () => {
      const now = new Date()
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

      // Insert test metrics within the default 1-hour range
      await env.bb.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, 4000, 42, 10, thirtyMinutesAgo.toISOString()).run()

      await env.bb.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, 4100, 45, 12, fifteenMinutesAgo.toISOString()).run()

      const res = await app.request(`/api/workers/${workerId}/metrics`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.worker_id).toBe(workerId)
      expect(data.metrics).toBeDefined()
      expect(Array.isArray(data.metrics)).toBe(true)
      expect(data.metrics.length).toBeGreaterThanOrEqual(2)
      expect(data.from).toBeDefined()
      expect(data.to).toBeDefined()
    })

    it('should return metrics with custom date range', async () => {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      // Insert test metrics
      await env.bb.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, 4000, 42, 10, twoHoursAgo.toISOString()).run()

      await env.bb.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, 4100, 45, 12, oneHourAgo.toISOString()).run()

      const from = new Date(now.getTime() - 90 * 60 * 1000).toISOString()
      const to = now.toISOString()

      const res = await app.request(`/api/workers/${workerId}/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.from).toBe(from)
      expect(data.to).toBe(to)
      expect(data.metrics.length).toBe(1) // Only the one within range
    })

    it('should respect limit parameter', async () => {
      // Insert multiple metrics
      for (let i = 0; i < 5; i++) {
        await env.bb.prepare(
          `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(workerId, 4000 + i, 40 + i, 10 + i, new Date().toISOString()).run()
      }

      const res = await app.request(`/api/workers/${workerId}/metrics?limit=2`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.metrics.length).toBe(2)
    })

    it('should return 404 for non-existent worker', async () => {
      const res = await app.request('/api/workers/wrk_nonexistent/metrics', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(404)
    })

    it('should fail without authentication', async () => {
      const res = await app.request(`/api/workers/${workerId}/metrics`, {}, env)

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/workers/status', () => {
    it('should return workers with connection status', async () => {
      // Insert recent metrics (within 2 minutes)
      const recentTime = new Date().toISOString()
      await env.bb.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, 4096, 45, 12, recentTime).run()

      const res = await app.request('/api/workers/status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.workers).toBeDefined()
      expect(Array.isArray(data.workers)).toBe(true)

      const worker = data.workers.find((w: any) => w.worker_id === workerId)
      expect(worker).toBeDefined()
      expect(worker.connected).toBe(true)
      expect(worker.memory).toBe(4096)
      expect(worker.cpu).toBe(45)
      expect(worker.rate).toBe(12)
      expect(worker.last_report).toBeDefined()
      expect(worker.last_report_age_seconds).toBeDefined()
    })

    it('should mark worker as disconnected when last report is old', async () => {
      // Insert old metrics (more than 2 minutes ago)
      const oldTime = new Date(Date.now() - 3 * 60 * 1000).toISOString()
      await env.bb.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, 4096, 45, 12, oldTime).run()

      const res = await app.request('/api/workers/status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(200)
      const data = await res.json()
      const worker = data.workers.find((w: any) => w.worker_id === workerId)
      expect(worker.connected).toBe(false)
      expect(worker.last_report_age_seconds).toBeGreaterThan(120)
    })

    it('should mark worker as disconnected when no metrics exist', async () => {
      const res = await app.request('/api/workers/status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, env)

      expect(res.status).toBe(200)
      const data = await res.json()
      const worker = data.workers.find((w: any) => w.worker_id === workerId)
      expect(worker.connected).toBe(false)
      expect(worker.last_report).toBeNull()
      expect(worker.memory).toBeNull()
      expect(worker.cpu).toBeNull()
      expect(worker.rate).toBeNull()
    })

    it('should fail without authentication', async () => {
      const res = await app.request('/api/workers/status', {}, env)

      expect(res.status).toBe(401)
    })
  })

  describe('WebSocket metrics insertion', () => {
    it('should insert metrics with all new fields via WebSocket', async () => {
      // Create a mock WebSocket context
      const mockMessages: string[] = []
      const mockWs = {
        send: (data: string) => {
          mockMessages.push(data)
        },
        close: () => { },
        raw: {} as WebSocket
      } as unknown as WSContext<WebSocket>

      // Payload with all new metrics fields
      const metricsPayload = {
        type: 'metrics',
        mnemonicLanguage: 'en',
        memory: 1000,
        cpu: 1000,
        rate: 1000,
        threads: 1000,
        batchSize: 1000,
        gpuEnabled: true,
        gpuBatchSize: 1000,
        reportIntervalSeconds: 1000,
        keepAddress: true,
        powerLevel: 'medium'
      }

      // Call handleMetrics function
      const result = await handleMetrics(env.bb, workerId, metricsPayload, mockWs)

      expect(result.success).toBe(true)

      // Verify metrics were inserted correctly
      const inserted = await env.bb.prepare(
        `SELECT 
          worker_id, memory, cpu, rate, mnemonic_language, threads, batch_size,
          gpu_enabled, gpu_batch_size, report_interval_seconds, keep_address, power_level, created_at
         FROM metrics
         WHERE worker_id = ?
         ORDER BY created_at DESC
         LIMIT 1`
      ).bind(workerId).first<{
        worker_id: string
        memory: number
        cpu: number
        rate: number
        mnemonic_language: string | null
        threads: number | null
        batch_size: number | null
        gpu_enabled: number
        gpu_batch_size: number | null
        report_interval_seconds: number | null
        keep_address: number
        power_level: string | null
        created_at: string
      }>()

      expect(inserted).toBeDefined()
      expect(inserted!.worker_id).toBe(workerId)
      expect(inserted!.memory).toBe(1000)
      expect(inserted!.cpu).toBe(1000)
      expect(inserted!.rate).toBe(1000)
      expect(inserted!.mnemonic_language).toBe('en')
      expect(inserted!.threads).toBe(1000)
      expect(inserted!.batch_size).toBe(1000)
      expect(inserted!.gpu_enabled).toBe(1) // boolean converted to 1
      expect(inserted!.gpu_batch_size).toBe(1000)
      expect(inserted!.report_interval_seconds).toBe(1000)
      expect(inserted!.keep_address).toBe(1) // boolean converted to 1
      expect(inserted!.power_level).toBe('medium')
      expect(inserted!.created_at).toBeDefined()

      // Verify WebSocket acknowledgment was sent
      expect(mockMessages.length).toBeGreaterThan(0)
      const ackMessage = JSON.parse(mockMessages[mockMessages.length - 1])
      expect(ackMessage.type).toBe('metrics_ack')
      expect(ackMessage.received).toBe(true)
    })

    it('should insert batch metrics with all new fields via WebSocket', async () => {
      // Create a mock WebSocket context
      const mockMessages: string[] = []
      const mockWs = {
        send: (data: string) => {
          mockMessages.push(data)
        },
        close: () => { },
        raw: {} as WebSocket
      } as unknown as WSContext<WebSocket>

      // Batch payload with all new metrics fields
      const batchPayload = {
        type: 'metrics_batch',
        metrics: [
          {
            mnemonicLanguage: 'en',
            memory: 1000,
            cpu: 1000,
            rate: 1000,
            threads: 1000,
            batchSize: 1000,
            gpuEnabled: true,
            gpuBatchSize: 1000,
            reportIntervalSeconds: 1000,
            keepAddress: true,
            powerLevel: 'medium'
          },
          {
            mnemonicLanguage: 'es',
            memory: 2000,
            cpu: 2000,
            rate: 2000,
            threads: 2000,
            batchSize: 2000,
            gpuEnabled: false,
            gpuBatchSize: 2000,
            reportIntervalSeconds: 2000,
            keepAddress: false,
            powerLevel: 'high'
          }
        ]
      }

      // Call handleMetrics function
      const result = await handleMetrics(env.bb, workerId, batchPayload, mockWs)

      expect(result.success).toBe(true)

      // Verify both metrics were inserted correctly
      const inserted = await env.bb.prepare(
        `SELECT 
          worker_id, memory, cpu, rate, mnemonic_language, threads, batch_size,
          gpu_enabled, gpu_batch_size, report_interval_seconds, keep_address, power_level, created_at
         FROM metrics
         WHERE worker_id = ?
         ORDER BY created_at DESC
         LIMIT 2`
      ).bind(workerId).all<{
        worker_id: string
        memory: number
        cpu: number
        rate: number
        mnemonic_language: string | null
        threads: number | null
        batch_size: number | null
        gpu_enabled: number
        gpu_batch_size: number | null
        report_interval_seconds: number | null
        keep_address: number
        power_level: string | null
        created_at: string
      }>()

      expect(inserted.results.length).toBe(2)

      // Check first metric (most recent)
      const first = inserted.results[0]
      expect(first.memory).toBe(2000)
      expect(first.mnemonic_language).toBe('es')
      expect(first.gpu_enabled).toBe(0) // false converted to 0
      expect(first.keep_address).toBe(0) // false converted to 0
      expect(first.power_level).toBe('high')

      // Check second metric
      const second = inserted.results[1]
      expect(second.memory).toBe(1000)
      expect(second.mnemonic_language).toBe('en')
      expect(second.gpu_enabled).toBe(1) // true converted to 1
      expect(second.keep_address).toBe(1) // true converted to 1
      expect(second.power_level).toBe('medium')

      // Verify WebSocket acknowledgment was sent
      expect(mockMessages.length).toBeGreaterThan(0)
      const ackMessage = JSON.parse(mockMessages[mockMessages.length - 1])
      expect(ackMessage.type).toBe('metrics_ack')
      expect(ackMessage.received).toBe(true)
    })
  })
})

