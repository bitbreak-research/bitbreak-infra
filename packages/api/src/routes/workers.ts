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

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
}

type Variables = {
  user: { sub: string; username: string }
}

const workers = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Schemas
const createWorkerSchema = z.object({
  name: z.string().min(3).max(100)
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

  return c.json({
    worker_id: workerId,
    name,
    token, // Only shown once at creation
    expires_at: expiresAt,
    created_at: createdAt
  }, 201)
})

/**
 * GET /api/workers
 * List all workers
 */
workers.get('/', async (c) => {
  const workersList = await c.env.bb.prepare(
    `SELECT 
      id, name, status, token_expires_at, last_connected_at, 
      is_connected, created_at, renewal_failure_reason, renewal_failure_at
     FROM workers
     ORDER BY created_at DESC`
  ).all<{
    id: string
    name: string
    status: string
    token_expires_at: string
    last_connected_at: string | null
    is_connected: number
    created_at: string
    renewal_failure_reason: string | null
    renewal_failure_at: string | null
  }>()

  return c.json(workersList.results.map(w => ({
    id: w.id,
    name: w.name,
    status: w.status,
    token_expires_at: w.token_expires_at,
    last_connected_at: w.last_connected_at,
    is_connected: w.is_connected === 1, // Convert INTEGER to boolean
    created_at: w.created_at,
    renewal_failure_reason: w.renewal_failure_reason,
    renewal_failure_at: w.renewal_failure_at
  })))
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
    last_connected_at: string | null
    last_disconnected_at: string | null
    last_ip: string | null
    is_connected: number
    created_at: string
    created_by: string | null
    revoked_at: string | null
    revoked_by: string | null
    revoke_reason: string | null
  }>()

  if (!worker) {
    return authError(c, AuthErrorCodes.WORKER_NOT_FOUND, 404)
  }

  // Exclude token_hash from response
  const { token_hash, pending_token_hash, ...workerData } = worker

  return c.json({
    ...workerData,
    is_connected: worker.is_connected === 1
  })
})

/**
 * DELETE /api/workers/:id
 * Revoke a worker
 */
workers.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')

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

  const revokedAt = new Date().toISOString()

  // Update worker status
  await c.env.bb.prepare(
    `UPDATE workers 
     SET status = 'revoked', revoked_at = ?, revoked_by = ?
     WHERE id = ?`
  ).bind(revokedAt, user.username, id).run()

  // Log revocation
  const logId = crypto.randomUUID()
  await c.env.bb.prepare(
    `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(logId, id, 'revoked', worker.token_hash, revokedAt).run()

  // Note: WebSocket connection closure will be handled in ws.ts
  // when it checks the worker status

  return c.json({ success: true })
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

  return c.json({
    worker_id: id,
    token: newToken, // Only shown once
    expires_at: expiresAt
  })
})

export default workers

