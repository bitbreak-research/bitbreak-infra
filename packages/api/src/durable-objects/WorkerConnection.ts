import { DurableObject } from 'cloudflare:workers'
import { hashToken, generateWorkerToken, isValidTokenFormat } from '../lib/token'

type Env = {
  bb: D1Database
  JWT_SECRET: string
}

interface AuthMessage {
  type: 'auth'
  worker_id: string
  token: string
}

interface MetricsMessage {
  type: 'metrics' | 'metrics_batch'
  memory?: number
  cpu?: number
  rate?: number
  mnemonicLanguage?: string
  threads?: number
  batchSize?: number
  gpuEnabled?: boolean
  gpuBatchSize?: number
  reportIntervalSeconds?: number
  keepAddress?: boolean
  powerLevel?: string
  engineStatus?: string
  metrics?: Array<{
    memory: number
    cpu: number
    rate: number
    mnemonicLanguage?: string
    threads?: number
    batchSize?: number
    gpuEnabled?: boolean
    gpuBatchSize?: number
    reportIntervalSeconds?: number
    keepAddress?: boolean
    powerLevel?: string
    engineStatus?: string
  }>
}

interface TokenRenewalAckMessage {
  type: 'token_renewal_ack'
  success: boolean
  error?: string
}

type WorkerMessage = AuthMessage | MetricsMessage | TokenRenewalAckMessage

/**
 * Durable Object for managing WebSocket connections per worker
 * Each worker gets its own instance for isolated state management
 */
export class WorkerConnection extends DurableObject<Env> {
  private sessions: Set<WebSocket>
  private workerId: string | null = null
  private authenticated: boolean = false
  private workerName: string | null = null
  private ipAddress: string | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sessions = new Set()

    // Load persisted state on initialization
    this.ctx.blockConcurrencyWhile(async () => {
      this.workerId = (await this.ctx.storage.get('workerId')) || null
      this.authenticated = (await this.ctx.storage.get('authenticated')) || false
      this.workerName = (await this.ctx.storage.get('workerName')) || null
    })
  }

  /**
   * Handle incoming HTTP requests
   * Endpoints: /websocket (upgrade), /status (check connection), /send (send message)
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // WebSocket upgrade endpoint
    if (path === '/websocket' || path === '/') {
      // Expect upgrade header
      const upgradeHeader = request.headers.get('Upgrade')
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 })
      }

      // Create WebSocket pair
      const webSocketPair = new WebSocketPair()
      const [client, server] = Object.values(webSocketPair)

      // Accept WebSocket connection with hibernation
      this.ctx.acceptWebSocket(server)
      this.sessions.add(server)

      // Extract IP address from headers
      this.ipAddress =
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-forwarded-for') ||
        null

      console.log('[DO] WebSocket connection opened, total sessions:', this.sessions.size)

      return new Response(null, {
        status: 101,
        webSocket: client
      })
    }

    // Check connection status
    if (path === '/status') {
      return Response.json({
        connected: this.authenticated && this.sessions.size > 0,
        workerId: this.workerId,
        workerName: this.workerName,
        sessionCount: this.sessions.size
      })
    }

    // Send message to connected worker
    if (path === '/send' && request.method === 'POST') {
      if (!this.authenticated || this.sessions.size === 0) {
        return Response.json(
          { success: false, error: 'Worker not connected' },
          { status: 400 }
        )
      }

      try {
        const message = await request.json()
        const messageStr = JSON.stringify(message)

        // Send to all active sessions
        for (const session of this.sessions) {
          try {
            session.send(messageStr)
          } catch (error) {
            console.error('[DO] Error sending to session:', error)
            this.sessions.delete(session)
          }
        }

        return Response.json({ success: true })
      } catch (error) {
        return Response.json(
          { success: false, error: 'Invalid message format' },
          { status: 400 }
        )
      }
    }

    return new Response('Not found', { status: 404 })
  }

  /**
   * Handle incoming WebSocket messages (hibernation API)
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const messageStr = typeof message === 'string' ? message : new TextDecoder().decode(message)
      const data = JSON.parse(messageStr) as WorkerMessage

      // Handle authentication
      if (data.type === 'auth') {
        await this.handleAuth(ws, data)
        return
      }

      // All other messages require authentication
      if (!this.authenticated || !this.workerId) {
        ws.send(
          JSON.stringify({
            type: 'error',
            code: 'NOT_AUTHENTICATED',
            message: 'Not authenticated'
          })
        )
        ws.close(1008, 'Not authenticated')
        return
      }

      // Check if worker has been revoked
      const workerStatus = await this.env.bb
        .prepare(`SELECT status FROM workers WHERE id = ?`)
        .bind(this.workerId)
        .first<{ status: string }>()

      if (workerStatus && workerStatus.status === 'revoked') {
        ws.send(
          JSON.stringify({
            type: 'revoked',
            reason: 'Worker has been revoked by administrator'
          })
        )
        ws.close(1008, 'Worker revoked')
        this.sessions.delete(ws)
        return
      }

      // Handle token renewal acknowledgment
      if (data.type === 'token_renewal_ack') {
        await this.handleTokenRenewalAck(data)
        return
      }

      // Handle metrics messages
      if (data.type === 'metrics' || data.type === 'metrics_batch') {
        await this.handleMetrics(ws, data)
        return
      }

      // Check for token renewal on any message
      await this.checkAndRenewToken(ws)
    } catch (error) {
      console.error('[DO] Error handling message:', error)
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Invalid message format'
        })
      )
    }
  }

  /**
   * Handle WebSocket close (hibernation API)
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    console.log('[DO] WebSocket closed:', code, reason)
    this.sessions.delete(ws)

    // If no more sessions, reset authentication
    if (this.sessions.size === 0) {
      this.authenticated = false
      await this.ctx.storage.put('authenticated', false)
    }

    console.log('[DO] Remaining sessions:', this.sessions.size)
  }

  /**
   * Handle WebSocket error (hibernation API)
   */
  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('[DO] WebSocket error:', error)
    this.sessions.delete(ws)

    // If no more sessions, reset authentication
    if (this.sessions.size === 0) {
      this.authenticated = false
      await this.ctx.storage.put('authenticated', false)
    }
  }

  /**
   * Handle authentication message
   */
  private async handleAuth(ws: WebSocket, message: AuthMessage): Promise<void> {
    const workerId = message.worker_id
    const token = message.token

    if (!workerId || !token) {
      ws.send(
        JSON.stringify({
          type: 'auth_error',
          code: 'INVALID_TOKEN',
          message: 'Missing worker_id or token'
        })
      )
      ws.close(1008, 'Invalid credentials')
      return
    }

    // Validate token format
    if (!isValidTokenFormat(token)) {
      ws.send(
        JSON.stringify({
          type: 'auth_error',
          code: 'INVALID_TOKEN',
          message: 'Token format is invalid'
        })
      )
      ws.close(1008, 'Invalid token format')
      return
    }

    // Get worker from database
    const worker = await this.env.bb
      .prepare(
        `SELECT id, name, token_hash, token_expires_at, status, pending_token_hash
         FROM workers WHERE id = ?`
      )
      .bind(workerId)
      .first<{
        id: string
        name: string
        token_hash: string
        token_expires_at: string
        status: string
        pending_token_hash: string | null
      }>()

    if (!worker) {
      ws.send(
        JSON.stringify({
          type: 'auth_error',
          code: 'WORKER_NOT_FOUND',
          message: 'Worker not found'
        })
      )
      ws.close(1008, 'Worker not found')
      return
    }

    // Check status
    if (worker.status === 'revoked') {
      ws.send(
        JSON.stringify({
          type: 'auth_error',
          code: 'WORKER_REVOKED',
          message: 'Worker has been revoked'
        })
      )
      ws.close(1008, 'Worker revoked')
      return
    }

    // Verify token (check both current and pending)
    const tokenHash = await hashToken(token)
    const isValidCurrent = tokenHash === worker.token_hash
    const isValidPending = worker.pending_token_hash
      ? tokenHash === worker.pending_token_hash
      : false

    if (!isValidCurrent && !isValidPending) {
      ws.send(
        JSON.stringify({
          type: 'auth_error',
          code: 'TOKEN_MISMATCH',
          message: 'Token does not match worker'
        })
      )
      ws.close(1008, 'Invalid token')
      return
    }

    // Check expiration
    const expiresAt = new Date(worker.token_expires_at)
    if (expiresAt < new Date()) {
      ws.send(
        JSON.stringify({
          type: 'auth_error',
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        })
      )
      ws.close(1008, 'Token expired')
      return
    }

    // Authentication successful
    this.workerId = workerId
    this.workerName = worker.name
    this.authenticated = true

    // Persist state
    await this.ctx.storage.put('workerId', workerId)
    await this.ctx.storage.put('workerName', worker.name)
    await this.ctx.storage.put('authenticated', true)

    // Log connection
    const now = new Date().toISOString()
    const logId = crypto.randomUUID()
    await this.env.bb
      .prepare(
        `INSERT INTO token_log (id, worker_id, event_type, token_hash, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(logId, workerId, 'connected', tokenHash, this.ipAddress, now)
      .run()

    // Send auth success
    ws.send(
      JSON.stringify({
        type: 'auth_ok',
        worker_id: workerId,
        name: worker.name,
        token_expires_at: worker.token_expires_at,
        server_time: now
      })
    )

    // Check for token renewal
    await this.checkAndRenewToken(ws)

    console.log('[DO] Worker authenticated:', workerId, worker.name)
  }

  /**
   * Check if token needs renewal (expires within 7 days)
   */
  private async checkAndRenewToken(ws: WebSocket): Promise<void> {
    if (!this.workerId) return

    const worker = await this.env.bb
      .prepare(
        `SELECT token_expires_at, pending_token_hash, pending_token_expires_at 
         FROM workers WHERE id = ? AND status = 'active'`
      )
      .bind(this.workerId)
      .first<{
        token_expires_at: string
        pending_token_hash: string | null
        pending_token_expires_at: string | null
      }>()

    if (!worker) return

    const expiresAt = new Date(worker.token_expires_at)
    const now = new Date()
    const daysUntilExpiry =
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    // If already has pending token, don't create another
    if (worker.pending_token_hash) {
      return
    }

    // If expires within 7 days, generate new token
    if (daysUntilExpiry < 7) {
      const newToken = generateWorkerToken()
      const newTokenHash = await hashToken(newToken)
      const newExpiresAt = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString()
      const pendingCreatedAt = new Date().toISOString()

      // Set pending token
      await this.env.bb
        .prepare(
          `UPDATE workers 
           SET pending_token_hash = ?, pending_token_expires_at = ?, pending_token_created_at = ?
           WHERE id = ?`
        )
        .bind(newTokenHash, newExpiresAt, pendingCreatedAt, this.workerId)
        .run()

      // Send renewal message
      ws.send(
        JSON.stringify({
          type: 'token_renewal',
          new_token: newToken,
          expires_at: newExpiresAt
        })
      )

      // Log renewal attempt
      const logId = crypto.randomUUID()
      await this.env.bb
        .prepare(
          `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(logId, this.workerId, 'renewal_attempt', newTokenHash, pendingCreatedAt)
        .run()
    }
  }

  /**
   * Handle metrics message
   */
  private async handleMetrics(ws: WebSocket, message: MetricsMessage): Promise<void> {
    if (!this.workerId) return

    // Handle single metrics message
    if (message.type === 'metrics') {
      const {
        memory,
        cpu,
        rate,
        mnemonicLanguage,
        threads,
        batchSize,
        gpuEnabled,
        gpuBatchSize,
        reportIntervalSeconds,
        keepAddress,
        powerLevel,
        engineStatus
      } = message

      // Insert metrics into database
      const now = new Date().toISOString()
      await this.env.bb
        .prepare(
          `INSERT INTO metrics (
            worker_id, memory, cpu, rate, mnemonic_language, threads, batch_size,
            gpu_enabled, gpu_batch_size, report_interval_seconds, keep_address, power_level, engine_status, created_at
          )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          this.workerId,
          memory ?? 0,
          cpu ?? 0,
          rate ?? 0,
          mnemonicLanguage ?? null,
          threads ?? null,
          batchSize ?? null,
          gpuEnabled ? 1 : 0,
          gpuBatchSize ?? null,
          reportIntervalSeconds ?? null,
          keepAddress ? 1 : 0,
          powerLevel ?? null,
          engineStatus ?? 'stopped',
          now
        )
        .run()

      ws.send(
        JSON.stringify({
          type: 'metrics_ack',
          received: true
        })
      )
    }
  }

  /**
   * Handle token renewal acknowledgment
   */
  private async handleTokenRenewalAck(message: TokenRenewalAckMessage): Promise<void> {
    if (!this.workerId) return

    if (message.success) {
      // Get pending token info
      const worker = await this.env.bb
        .prepare(
          `SELECT pending_token_hash, pending_token_expires_at, token_hash 
           FROM workers WHERE id = ?`
        )
        .bind(this.workerId)
        .first<{
          pending_token_hash: string | null
          pending_token_expires_at: string | null
          token_hash: string
        }>()

      if (worker && worker.pending_token_hash) {
        // Activate new token
        await this.env.bb
          .prepare(
            `UPDATE workers 
             SET token_hash = ?, token_expires_at = ?,
                 pending_token_hash = NULL, pending_token_expires_at = NULL,
                 pending_token_created_at = NULL,
                 renewal_failure_reason = NULL, renewal_failure_at = NULL,
                 renewal_retry_count = 0
             WHERE id = ?`
          )
          .bind(worker.pending_token_hash, worker.pending_token_expires_at, this.workerId)
          .run()

        // Log successful renewal
        const logId = crypto.randomUUID()
        await this.env.bb
          .prepare(
            `INSERT INTO token_log (id, worker_id, event_type, token_hash, created_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(
            logId,
            this.workerId,
            'renewed',
            worker.pending_token_hash,
            new Date().toISOString()
          )
          .run()
      }
    } else {
      // Mark renewal failure
      const now = new Date().toISOString()
      await this.env.bb
        .prepare(
          `UPDATE workers 
           SET status = 'update_required',
               renewal_failure_reason = ?,
               renewal_failure_at = ?,
               renewal_retry_count = renewal_retry_count + 1
           WHERE id = ?`
        )
        .bind(message.error || 'Unknown error', now, this.workerId)
        .run()

      // Log renewal failure
      const logId = crypto.randomUUID()
      await this.env.bb
        .prepare(
          `INSERT INTO token_log (id, worker_id, event_type, created_at, metadata)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          logId,
          this.workerId,
          'renewal_failed',
          now,
          JSON.stringify({ error: message.error })
        )
        .run()
    }
  }
}

