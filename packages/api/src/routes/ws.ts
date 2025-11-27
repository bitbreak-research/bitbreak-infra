import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/cloudflare-workers'
import { verifyToken, hashToken, generateWorkerToken, isValidTokenFormat } from '../lib/token'
import { AuthErrorCodes } from '../lib/errors'

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
}

// MVP: In-memory Map for connection tracking
// Note: This works for MVP but has limitations:
// - Lost on worker restart/cold start
// - Not shared across multiple worker instances
// Production recommendation: Use Durable Objects or KV for distributed state
const activeConnections = new Map<string, {
  ws: WebSocket
  workerId: string
  authenticated: boolean
  authTimeout?: number
}>()

const ws = new Hono<{ Bindings: Bindings }>()

/**
 * Check if token needs renewal (expires within 7 days)
 */
async function checkAndRenewToken(
  db: D1Database,
  workerId: string,
  ws: WebSocket
): Promise<void> {
  const worker = await db.prepare(
    `SELECT token_expires_at, pending_token_hash, pending_token_expires_at 
     FROM workers WHERE id = ? AND status = 'active'`
  ).bind(workerId).first<{
    token_expires_at: string
    pending_token_hash: string | null
    pending_token_expires_at: string | null
  }>()

  if (!worker) return

  const expiresAt = new Date(worker.token_expires_at)
  const now = new Date()
  const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  // If already has pending token, don't create another
  if (worker.pending_token_hash) {
    return
  }

  // If expires within 7 days, generate new token
  if (daysUntilExpiry < 7) {
    const newToken = generateWorkerToken()
    const newTokenHash = await hashToken(newToken)
    const newExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    const pendingCreatedAt = new Date().toISOString()

    // Set pending token
    await db.prepare(
      `UPDATE workers 
       SET pending_token_hash = ?, pending_token_expires_at = ?, pending_token_created_at = ?
       WHERE id = ?`
    ).bind(newTokenHash, newExpiresAt, pendingCreatedAt, workerId).run()

    // Send renewal message
    ws.send(JSON.stringify({
      type: 'token_renewal',
      new_token: newToken,
      expires_at: newExpiresAt
    }))

    // Log renewal attempt
    const logId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(logId, workerId, 'renewal_attempt', newTokenHash, pendingCreatedAt).run()
  }
}

/**
 * Handle authentication message
 */
async function handleAuth(
  db: D1Database,
  workerId: string,
  token: string,
  ws: WebSocket,
  ipAddress: string | null
): Promise<{ success: boolean; error?: string }> {
  // Validate token format
  if (!isValidTokenFormat(token)) {
    ws.send(JSON.stringify({
      type: 'auth_error',
      code: 'INVALID_TOKEN',
      message: 'Token format is invalid'
    }))
    return { success: false, error: 'INVALID_TOKEN' }
  }

  // Get worker from database first (source of truth)
  const worker = await db.prepare(
    `SELECT id, name, token_hash, token_expires_at, status, pending_token_hash, is_connected
     FROM workers WHERE id = ?`
  ).bind(workerId).first<{
    id: string
    name: string
    token_hash: string
    token_expires_at: string
    status: string
    pending_token_hash: string | null
    is_connected: number
  }>()

  if (!worker) {
    ws.send(JSON.stringify({
      type: 'auth_error',
      code: 'WORKER_NOT_FOUND',
      message: 'Worker not found'
    }))
    return { success: false, error: 'WORKER_NOT_FOUND' }
  }

  // Check if already connected - verify against database AND in-memory Map
  const existingConnection = activeConnections.get(workerId)
  if (existingConnection) {
    // Check if the existing WebSocket is still open
    if (existingConnection.ws.readyState === WebSocket.OPEN && worker.is_connected === 1) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        code: 'ALREADY_CONNECTED',
        message: 'This worker is already connected from another location'
      }))
      return { success: false, error: 'ALREADY_CONNECTED' }
    } else {
      // Stale connection (closed or database says disconnected), clean up
      activeConnections.delete(workerId)
      // If database says connected but Map has stale entry, update database
      if (worker.is_connected === 1) {
        await db.prepare(
          `UPDATE workers SET is_connected = 0, last_disconnected_at = ? WHERE id = ?`
        ).bind(new Date().toISOString(), workerId).run()
      }
    }
  } else if (worker.is_connected === 1) {
    // Database says connected but no entry in Map - clean up database state (worker restart scenario)
    await db.prepare(
      `UPDATE workers SET is_connected = 0, last_disconnected_at = ? WHERE id = ?`
    ).bind(new Date().toISOString(), workerId).run()
  }

  // Check status
  if (worker.status === 'revoked') {
    ws.send(JSON.stringify({
      type: 'auth_error',
      code: 'WORKER_REVOKED',
      message: 'Worker has been revoked'
    }))
    return { success: false, error: 'WORKER_REVOKED' }
  }

  // Verify token (check both current and pending)
  const tokenHash = await hashToken(token)
  const isValidCurrent = tokenHash === worker.token_hash
  const isValidPending = worker.pending_token_hash ? tokenHash === worker.pending_token_hash : false

  if (!isValidCurrent && !isValidPending) {
    ws.send(JSON.stringify({
      type: 'auth_error',
      code: 'TOKEN_MISMATCH',
      message: 'Token does not match worker'
    }))
    return { success: false, error: 'TOKEN_MISMATCH' }
  }

  // Check expiration
  const expiresAt = new Date(worker.token_expires_at)
  if (expiresAt < new Date()) {
    ws.send(JSON.stringify({
      type: 'auth_error',
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired'
    }))
    return { success: false, error: 'TOKEN_EXPIRED' }
  }

  // Update connection info
  const now = new Date().toISOString()
  await db.prepare(
    `UPDATE workers 
     SET is_connected = 1, last_connected_at = ?, last_ip = ?
     WHERE id = ?`
  ).bind(now, ipAddress, workerId).run()

  // Log connection
  const logId = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO token_log (id, worker_id, event_type, token_hash, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(logId, workerId, 'connected', tokenHash, ipAddress, now).run()

  // Send auth success
  ws.send(JSON.stringify({
    type: 'auth_ok',
    worker_id: workerId,
    name: worker.name,
    token_expires_at: worker.token_expires_at,
    server_time: now
  }))

  // Check for token renewal on successful auth
  await checkAndRenewToken(db, workerId, ws)

  return { success: true }
}

/**
 * Handle metrics message
 */
async function handleMetrics(
  db: D1Database,
  workerId: string,
  message: { type: string; memory?: number; cpu?: number; rate?: number; metrics?: Array<{ memory: number; cpu: number; rate: number }> },
  ws: WebSocket
): Promise<{ success: boolean; error?: string }> {
  // Handle batch metrics
  if (message.type === 'metrics_batch' && message.metrics) {
    const metrics = message.metrics
    if (!Array.isArray(metrics) || metrics.length === 0) {
      ws.send(JSON.stringify({
        type: 'metrics_error',
        code: 'INVALID_METRICS',
        message: 'Invalid metrics batch format'
      }))
      return { success: false, error: 'INVALID_METRICS' }
    }

    // Validate all metrics in batch
    for (const metric of metrics) {
      if (
        typeof metric.memory !== 'number' || metric.memory < 0 || metric.memory > 999999 ||
        typeof metric.cpu !== 'number' || metric.cpu < 0 || metric.cpu > 100 ||
        typeof metric.rate !== 'number' || metric.rate < 0 || metric.rate > 999999
      ) {
        ws.send(JSON.stringify({
          type: 'metrics_error',
          code: 'INVALID_METRICS',
          message: 'Invalid metric values in batch'
        }))
        return { success: false, error: 'INVALID_METRICS' }
      }
    }

    // Insert all metrics
    const now = new Date().toISOString()
    for (const metric of metrics) {
      await db.prepare(
        `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(workerId, metric.memory, metric.cpu, metric.rate, now).run()
    }

    ws.send(JSON.stringify({
      type: 'metrics_ack',
      received: true
    }))
    return { success: true }
  }

  // Handle single metrics message
  if (message.type === 'metrics') {
    const { memory, cpu, rate } = message

    // Validate required fields
    if (
      typeof memory !== 'number' || memory < 0 || memory > 999999 ||
      typeof cpu !== 'number' || cpu < 0 || cpu > 100 ||
      typeof rate !== 'number' || rate < 0 || rate > 999999
    ) {
      ws.send(JSON.stringify({
        type: 'metrics_error',
        code: 'INVALID_METRICS',
        message: 'Invalid metric values. memory: 0-999999, cpu: 0-100, rate: 0-999999'
      }))
      return { success: false, error: 'INVALID_METRICS' }
    }

    // Insert metrics into database
    const now = new Date().toISOString()
    await db.prepare(
      `INSERT INTO metrics (worker_id, memory, cpu, rate, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(workerId, memory, cpu, rate, now).run()

    ws.send(JSON.stringify({
      type: 'metrics_ack',
      received: true
    }))
    return { success: true }
  }

  return { success: false, error: 'INVALID_MESSAGE_TYPE' }
}

/**
 * Handle token renewal acknowledgment
 */
async function handleTokenRenewalAck(
  db: D1Database,
  workerId: string,
  success: boolean,
  error?: string
): Promise<void> {
  if (success) {
    // Get pending token info
    const worker = await db.prepare(
      `SELECT pending_token_hash, pending_token_expires_at, token_hash 
       FROM workers WHERE id = ?`
    ).bind(workerId).first<{
      pending_token_hash: string | null
      pending_token_expires_at: string | null
      token_hash: string
    }>()

    if (worker && worker.pending_token_hash) {
      // Activate new token
      await db.prepare(
        `UPDATE workers 
         SET token_hash = ?, token_expires_at = ?,
             pending_token_hash = NULL, pending_token_expires_at = NULL,
             pending_token_created_at = NULL,
             renewal_failure_reason = NULL, renewal_failure_at = NULL,
             renewal_retry_count = 0
         WHERE id = ?`
      ).bind(worker.pending_token_hash, worker.pending_token_expires_at, workerId).run()

      // Log successful renewal
      const logId = crypto.randomUUID()
      await db.prepare(
        `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(logId, workerId, 'renewed', worker.pending_token_hash, new Date().toISOString()).run()
    }
  } else {
    // Mark renewal failure
    const now = new Date().toISOString()
    await db.prepare(
      `UPDATE workers 
       SET status = 'update_required',
           renewal_failure_reason = ?,
           renewal_failure_at = ?,
           renewal_retry_count = renewal_retry_count + 1
       WHERE id = ?`
    ).bind(error || 'Unknown error', now, workerId).run()

    // Log renewal failure
    const logId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO token_log (id, worker_id, event_type, created_at, metadata)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(logId, workerId, 'renewal_failed', now, JSON.stringify({ error })).run()
  }
}

/**
 * WebSocket route handler
 */
ws.get('/ws', upgradeWebSocket((c) => {
  const db = c.env.bb
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null
  let workerId: string | null = null
  let authenticated = false
  let firstMessageTime: number | null = null

  return {
    async onMessage(event, ws) {
      try {
        // Track first message time for auth timeout
        if (firstMessageTime === null) {
          firstMessageTime = Date.now()
        } else {
          // Check if 10 seconds have passed without auth
          if (!authenticated && Date.now() - firstMessageTime > 10000) {
            ws.send(JSON.stringify({
              type: 'auth_error',
              code: 'AUTH_TIMEOUT',
              message: 'Authentication timeout'
            }))
            ws.close()
            return
          }
        }

        const message = JSON.parse(event.data as string)

        // Handle auth message
        if (message.type === 'auth') {
          workerId = message.worker_id
          const token = message.token

          if (!workerId || !token) {
            ws.send(JSON.stringify({
              type: 'auth_error',
              code: 'INVALID_TOKEN',
              message: 'Missing worker_id or token'
            }))
            return
          }

          // Store connection attempt
          activeConnections.set(workerId, { ws, workerId, authenticated: false })

          // Handle authentication
          handleAuth(db, workerId, token, ws, ipAddress).then((result) => {
            if (result.success) {
              authenticated = true
              const conn = activeConnections.get(workerId!)
              if (conn) {
                conn.authenticated = true
              }
            } else {
              // Remove failed connection
              activeConnections.delete(workerId!)
            }
          })
          return
        }

        // All other messages require authentication
        if (!authenticated || !workerId) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'NOT_AUTHENTICATED',
            message: 'Not authenticated'
          }))
          ws.close()
          return
        }

        // Check if worker has been revoked (on any message)
        const workerStatus = await db.prepare(
          `SELECT status FROM workers WHERE id = ?`
        ).bind(workerId).first<{ status: string }>()

        if (workerStatus && workerStatus.status === 'revoked') {
          ws.send(JSON.stringify({
            type: 'revoked',
            reason: 'Worker has been revoked by administrator'
          }))
          ws.close()

          // Clean up connection
          activeConnections.delete(workerId)
          await db.prepare(
            `UPDATE workers SET is_connected = 0, last_disconnected_at = ? WHERE id = ?`
          ).bind(new Date().toISOString(), workerId).run()

          return
        }

        // Handle token renewal acknowledgment
        if (message.type === 'token_renewal_ack') {
          await handleTokenRenewalAck(db, workerId, message.success, message.error)
          return
        }

        // Handle metrics messages
        if (message.type === 'metrics' || message.type === 'metrics_batch') {
          await handleMetrics(db, workerId, message, ws)
          return
        }

        // Check for token renewal on any message from authenticated worker
        await checkAndRenewToken(db, workerId, ws)

      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Invalid message format'
        }))
      }
    },

    // Note: Cloudflare Workers WebSocket doesn't support onOpen
    // Auth timeout is handled in onMessage when first message is received

    async onClose() {
      // Update worker status if authenticated
      if (authenticated && workerId) {
        const now = new Date().toISOString()
        try {
          await db.prepare(
            `UPDATE workers 
             SET is_connected = 0, last_disconnected_at = ?
             WHERE id = ?`
          ).bind(now, workerId).run()
        } catch (error) {
          console.error('Error updating worker on disconnect:', error)
        }

        activeConnections.delete(workerId)
      }
    },

    onError(event) {
      console.error('WebSocket error:', event)
      if (workerId) {
        activeConnections.delete(workerId)
      }
    }
  }
}))

export default ws

