import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  generateWorkerId,
  generateWorkerToken,
  hashToken,
  verifyToken,
  isValidTokenFormat
} from '../lib/token'
import {
  AuthErrorCodes,
  authError,
  type AuthErrorCode
} from '../lib/errors'
import { sendMessageToWorker, getWorkerConnectionStatus } from './ws'

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
  WORKER_CONNECTIONS: DurableObjectNamespace
}

type Variables = {
  user: { sub: string; username: string }
}

const workers = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Schemas
const createWorkerSchema = z.object({
  name: z.string().min(3).max(100)
})

const metricsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100).optional()
})

/**
 * POST /api/workers
 * Create a new worker
 */
workers.post('/', zValidator('json', createWorkerSchema), async (c) => {
  const { name } = c.req.valid('json')
  const user = c.get('user')

  // Generate worker credentials
  const workerId = generateWorkerId()
  const token = generateWorkerToken()
  const tokenHash = await hashToken(token)
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const createdAt = new Date().toISOString()

  // Insert worker
  await c.env.bb.prepare(
    `INSERT INTO workers (
      id, name, token_hash, token_expires_at, status, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(workerId, name, tokenHash, expiresAt, 'active', createdAt, user.username).run()

  // Log token creation
  const logId = crypto.randomUUID()
  await c.env.bb.prepare(
    `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(logId, workerId, 'created', tokenHash, createdAt).run()

  // Generate WebSocket URL from request URL
  const requestUrl = new URL(c.req.url)
  const protocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const websocketUrl = `${protocol}//${requestUrl.host}/ws?worker_id=${workerId}`

  return c.json({
    worker_id: workerId,
    name,
    token, // Only shown once at creation
    expires_at: expiresAt,
    created_at: createdAt,
    websocket_url: websocketUrl
  }, 201)
})

/**
 * GET /api/workers
 * List all workers
 */
workers.get('/', async (c) => {
  const workersList = await c.env.bb.prepare(
    `SELECT 
      id, name, status, token_expires_at, 
      created_at, renewal_failure_reason, renewal_failure_at
     FROM workers
     ORDER BY created_at DESC`
  ).all<{
    id: string
    name: string
    status: string
    token_expires_at: string
    created_at: string
    renewal_failure_reason: string | null
    renewal_failure_at: string | null
  }>()

  // Get connection status from Durable Objects for each worker
  const workersWithStatus = await Promise.all(
    workersList.results.map(async (w) => {
      const connectionStatus = await getWorkerConnectionStatus(c.env, w.id)
      return {
        id: w.id,
        name: w.name,
        status: w.status,
        token_expires_at: w.token_expires_at,
        is_connected: connectionStatus.connected,
        created_at: w.created_at,
        renewal_failure_reason: w.renewal_failure_reason,
        renewal_failure_at: w.renewal_failure_at
      }
    })
  )

  return c.json(workersWithStatus)
})

/**
 * GET /api/workers/status
 * Get all workers with connection status based on metrics
 */
workers.get('/status', async (c) => {
  const workersList = await c.env.bb.prepare(
    `SELECT 
      w.id,
      w.name,
      w.status,
      m.created_at as last_report,
      m.memory,
      m.cpu,
      m.rate,
      m.engine_status,
      m.power_level,
      m.mnemonic_language,
      m.gpu_enabled,
      CASE
        WHEN m.created_at IS NULL THEN NULL
        ELSE CAST((julianday('now') - julianday(m.created_at)) * 86400 AS INTEGER)
      END as last_report_age_seconds
    FROM workers w
    LEFT JOIN (
      SELECT 
        m1.worker_id,
        m1.created_at,
        m1.memory,
        m1.cpu,
        m1.rate,
        m1.engine_status,
        m1.power_level,
        m1.mnemonic_language,
        m1.gpu_enabled
      FROM metrics m1
      WHERE m1.id = (
        SELECT m2.id
        FROM metrics m2
        WHERE m2.worker_id = m1.worker_id
        ORDER BY m2.created_at DESC
        LIMIT 1
      )
    ) m ON w.id = m.worker_id
    WHERE w.status = 'active'
    ORDER BY w.created_at DESC`
  ).all<{
    id: string
    name: string
    status: string
    last_report: string | null
    memory: number | null
    cpu: number | null
    rate: number | null
    engine_status: string | null
    power_level: string | null
    mnemonic_language: string | null
    gpu_enabled: number | null
    last_report_age_seconds: number | null
  }>()

  // Get real-time connection status from Durable Objects
  const workersWithConnection = await Promise.all(
    workersList.results.map(async (w) => {
      const connectionStatus = await getWorkerConnectionStatus(c.env, w.id)
      return {
        worker_id: w.id,
        name: w.name,
        status: w.status,
        connected: connectionStatus.connected,
        memory: w.memory,
        cpu: w.cpu,
        rate: w.rate,
        engine_status: w.engine_status,
        power_level: w.power_level,
        mnemonic_language: w.mnemonic_language,
        gpu_enabled: w.gpu_enabled === 1,
        last_report: w.last_report,
        last_report_age_seconds: w.last_report_age_seconds
      }
    })
  )

  return c.json({
    workers: workersWithConnection
  })
})

/**
 * GET /api/workers/:id
 * Get worker details
 */
workers.get('/:id', async (c) => {
  const id = c.req.param('id')

  const worker = await c.env.bb.prepare(
    `SELECT * FROM workers WHERE id = ?`
  ).bind(id).first<{
    id: string
    name: string
    token_hash: string
    token_expires_at: string
    pending_token_hash: string | null
    pending_token_expires_at: string | null
    pending_token_created_at: string | null
    status: string
    renewal_failure_reason: string | null
    renewal_failure_at: string | null
    renewal_retry_count: number
    last_ip: string | null
    created_at: string
    created_by: string | null
    revoked_at: string | null
    revoked_by: string | null
    revoke_reason: string | null
  }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  // Get connection status from Durable Object
  const connectionStatus = await getWorkerConnectionStatus(c.env, id)

  // Exclude token_hash from response
  const { token_hash, pending_token_hash, ...workerData } = worker

  return c.json({
    ...workerData,
    is_connected: connectionStatus.connected
  })
})

/**
 * DELETE /api/workers/:id
 * Delete a worker
 */
workers.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')

  // Get worker
  const worker = await c.env.bb.prepare(
    `SELECT id, token_hash FROM workers WHERE id = ?`
  ).bind(id).first<{
    id: string
    token_hash: string
  }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  const deletedAt = new Date().toISOString()

  // Log deletion event before deletion (token_log will cascade delete after)
  const logId = crypto.randomUUID()
  await c.env.bb.prepare(
    `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(logId, id, 'deleted', worker.token_hash, deletedAt).run()

  // Delete worker record (cascades to token_log and metrics)
  await c.env.bb.prepare(
    `DELETE FROM workers WHERE id = ?`
  ).bind(id).run()

  // Note: Durable Object will handle WebSocket closure when worker no longer exists

  return c.json({ success: true })
})

/**
 * POST /api/workers/:id/start
 * Start a worker engine
 */
workers.post('/:id/start', async (c) => {
  const id = c.req.param('id')

  // Get worker
  const worker = await c.env.bb.prepare(
    `SELECT id, status FROM workers WHERE id = ?`
  ).bind(id).first<{
    id: string
    status: string
  }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  if (worker.status === 'revoked') {
    return authError(c, AuthErrorCodes.WORKER_REVOKED, 400)
  }

  // Check if worker is connected via Durable Object
  const connectionStatus = await getWorkerConnectionStatus(c.env, id)
  if (!connectionStatus.connected) {
    return c.json({
      success: false,
      error: { message: 'Worker is not connected via WebSocket. Please wait for the worker to establish connection.' }
    }, 400)
  }

  // Get latest metrics to check current engine status
  const latestMetrics = await c.env.bb.prepare(
    `SELECT engine_status FROM metrics 
     WHERE worker_id = ? 
     ORDER BY created_at DESC 
     LIMIT 1`
  ).bind(id).first<{ engine_status: string | null }>()

  // Check if engine is already running
  if (latestMetrics && latestMetrics.engine_status === 'running') {
    return c.json({
      success: false,
      error: { message: 'Engine is already running' }
    }, 400)
  }

  // Send WebSocket message to start the engine via Durable Object
  const result = await sendMessageToWorker(c.env, id, {
    type: 'engine_start',
    power_level: 'medium',
    mnemonic_language: 'en',
    gpu_enabled: true
  })

  if (!result.success) {
    return c.json({
      success: false,
      error: { message: result.error || 'Failed to send start command' }
    }, 500)
  }

  return c.json({
    success: true,
    message: 'Start command sent to worker'
  })
})

/**
 * POST /api/workers/:id/stop
 * Stop a worker engine
 */
workers.post('/:id/stop', async (c) => {
  const id = c.req.param('id')

  // Get worker
  const worker = await c.env.bb.prepare(
    `SELECT id, status FROM workers WHERE id = ?`
  ).bind(id).first<{
    id: string
    status: string
  }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  if (worker.status === 'revoked') {
    return authError(c, AuthErrorCodes.WORKER_REVOKED, 400)
  }

  // Check if worker is connected via Durable Object
  const connectionStatus = await getWorkerConnectionStatus(c.env, id)
  if (!connectionStatus.connected) {
    return c.json({
      success: false,
      error: { message: 'Worker is not connected via WebSocket. Please wait for the worker to establish connection.' }
    }, 400)
  }

  // Get latest metrics to check current engine status
  const latestMetrics = await c.env.bb.prepare(
    `SELECT engine_status FROM metrics 
     WHERE worker_id = ? 
     ORDER BY created_at DESC 
     LIMIT 1`
  ).bind(id).first<{ engine_status: string | null }>()

  // Check if engine is already stopped
  if (!latestMetrics || latestMetrics.engine_status === 'stopped') {
    return c.json({
      success: false,
      error: { message: 'Engine is already stopped' }
    }, 400)
  }

  // Send WebSocket message to stop the engine via Durable Object
  const result = await sendMessageToWorker(c.env, id, {
    type: 'engine_stop'
  })

  if (!result.success) {
    return c.json({
      success: false,
      error: { message: result.error || 'Failed to send stop command' }
    }, 500)
  }

  return c.json({
    success: true,
    message: 'Stop command sent to worker'
  })
})

/**
 * POST /api/workers/:id/token
 * Regenerate token for a worker (admin action)
 */
workers.post('/:id/token', async (c) => {
  const id = c.req.param('id')

  // Get worker
  const worker = await c.env.bb.prepare(
    `SELECT id, status, token_hash FROM workers WHERE id = ?`
  ).bind(id).first<{
    id: string
    status: string
    token_hash: string
  }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  if (worker.status === 'revoked') {
    return authError(c, AuthErrorCodes.WORKER_REVOKED, 400)
  }

  // Generate new token
  const newToken = generateWorkerToken()
  const newTokenHash = await hashToken(newToken)
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  // Update worker with new token
  await c.env.bb.prepare(
    `UPDATE workers 
     SET token_hash = ?, token_expires_at = ?, 
         pending_token_hash = NULL, pending_token_expires_at = NULL,
         pending_token_created_at = NULL,
         renewal_failure_reason = NULL, renewal_failure_at = NULL,
         renewal_retry_count = 0
     WHERE id = ?`
  ).bind(newTokenHash, expiresAt, id).run()

  // Log token renewal
  const logId = crypto.randomUUID()
  await c.env.bb.prepare(
    `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(logId, id, 'renewed', newTokenHash, new Date().toISOString()).run()

  // Generate WebSocket URL from request URL
  const requestUrl = new URL(c.req.url)
  const protocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const websocketUrl = `${protocol}//${requestUrl.host}/ws?worker_id=${id}`

  return c.json({
    worker_id: id,
    token: newToken, // Only shown once
    expires_at: expiresAt,
    websocket_url: websocketUrl
  })
})

/**
 * GET /api/workers/:id/metrics/latest
 * Get latest metrics for a worker
 */
workers.get('/:id/metrics/latest', async (c) => {
  const id = c.req.param('id')

  // Verify worker exists
  const worker = await c.env.bb.prepare(
    `SELECT id FROM workers WHERE id = ?`
  ).bind(id).first<{ id: string }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  // Get latest metrics
  const latest = await c.env.bb.prepare(
    `SELECT worker_id, memory, cpu, rate, engine_status, power_level, 
            mnemonic_language, gpu_enabled, created_at
     FROM metrics
     WHERE worker_id = ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(id).first<{
    worker_id: string
    memory: number
    cpu: number
    rate: number
    engine_status: string | null
    power_level: string | null
    mnemonic_language: string | null
    gpu_enabled: number | null
    created_at: string
  }>()

  if (!latest) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  return c.json({
    worker_id: latest.worker_id,
    memory: latest.memory,
    cpu: latest.cpu,
    rate: latest.rate,
    engine_status: latest.engine_status,
    power_level: latest.power_level,
    mnemonic_language: latest.mnemonic_language,
    gpu_enabled: latest.gpu_enabled === 1,
    created_at: latest.created_at
  })
})

/**
 * GET /api/workers/:id/metrics
 * Get metrics history for a worker
 */
workers.get('/:id/metrics', zValidator('query', metricsQuerySchema), async (c) => {
  const id = c.req.param('id')
  const { from, to, limit = 100 } = c.req.valid('query')

  // Verify worker exists
  const worker = await c.env.bb.prepare(
    `SELECT id FROM workers WHERE id = ?`
  ).bind(id).first<{ id: string }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  // Calculate default date range (1 hour ago to now)
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const fromDate = from || oneHourAgo.toISOString()
  const toDate = to || now.toISOString()

  // Get metrics in date range
  const metrics = await c.env.bb.prepare(
    `SELECT memory, cpu, rate, created_at
     FROM metrics
     WHERE worker_id = ? AND created_at >= ? AND created_at <= ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(id, fromDate, toDate, limit).all<{
    memory: number
    cpu: number
    rate: number
    created_at: string
  }>()

  return c.json({
    worker_id: id,
    from: fromDate,
    to: toDate,
    metrics: metrics.results
  })
})

export default workers
