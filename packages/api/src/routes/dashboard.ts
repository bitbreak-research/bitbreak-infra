import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getWorkerConnectionStatus } from './ws'

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
  WORKER_CONNECTIONS: DurableObjectNamespace
}

type Variables = {
  user: { sub: string; username: string }
}

const dashboard = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/**
 * GET /api/dashboard/stats
 * Get aggregate statistics for dashboard
 */
dashboard.get('/stats', async (c) => {
  // Get worker counts
  const workerStats = await c.env.bb.prepare(
    `SELECT 
      COUNT(*) as total_workers,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_workers,
      SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked_workers
    FROM workers`
  ).first<{
    total_workers: number
    active_workers: number
    revoked_workers: number
  }>()

  // Get active workers list to check connection status
  const activeWorkers = await c.env.bb.prepare(
    `SELECT id FROM workers WHERE status = 'active'`
  ).all<{ id: string }>()

  // Check connection status for each worker
  let onlineCount = 0
  for (const worker of activeWorkers.results) {
    const status = await getWorkerConnectionStatus(c.env, worker.id)
    if (status.connected) {
      onlineCount++
    }
  }

  // Get latest metrics aggregate (last 24 hours)
  const metricsStats = await c.env.bb.prepare(
    `SELECT 
      AVG(cpu) as avg_cpu,
      AVG(memory) as avg_memory,
      SUM(rate) as total_rate,
      COUNT(DISTINCT worker_id) as workers_reporting
    FROM metrics
    WHERE created_at >= datetime('now', '-1 hour')`
  ).first<{
    avg_cpu: number | null
    avg_memory: number | null
    total_rate: number | null
    workers_reporting: number
  }>()

  // Get hourly rate history (last 24 hours)
  const hourlyRates = await c.env.bb.prepare(
    `SELECT 
      strftime('%Y-%m-%d %H:00:00', created_at) as hour,
      SUM(rate) as total_rate,
      AVG(cpu) as avg_cpu,
      COUNT(DISTINCT worker_id) as worker_count
    FROM metrics
    WHERE created_at >= datetime('now', '-24 hours')
    GROUP BY strftime('%Y-%m-%d %H:00:00', created_at)
    ORDER BY hour DESC
    LIMIT 24`
  ).all<{
    hour: string
    total_rate: number
    avg_cpu: number
    worker_count: number
  }>()

  // Get total wallets generated (estimated from rate history)
  const totalEstimate = await c.env.bb.prepare(
    `SELECT SUM(rate) as total_rate_sum FROM metrics`
  ).first<{ total_rate_sum: number | null }>()

  // Estimate wallets: rate is per minute, we have ~10 second intervals
  const estimatedWallets = Math.floor((totalEstimate?.total_rate_sum || 0) / 6)

  return c.json({
    workers: {
      total: workerStats?.total_workers || 0,
      active: workerStats?.active_workers || 0,
      online: onlineCount,
      offline: (workerStats?.active_workers || 0) - onlineCount
    },
    metrics: {
      avg_cpu: Math.round(metricsStats?.avg_cpu || 0),
      avg_memory: Math.round(metricsStats?.avg_memory || 0),
      total_rate: Math.round(metricsStats?.total_rate || 0),
      workers_reporting: metricsStats?.workers_reporting || 0
    },
    estimates: {
      total_wallets: estimatedWallets,
      hourly_rate: Math.round((metricsStats?.total_rate || 0) * 60)
    },
    history: hourlyRates.results.reverse()
  })
})

/**
 * GET /api/dashboard/metrics
 * Get aggregated metrics history for all workers
 */
dashboard.get('/metrics', async (c) => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const metrics = await c.env.bb.prepare(
    `SELECT 
      strftime('%Y-%m-%d %H:%M:00', created_at) as minute,
      SUM(rate) as total_rate,
      AVG(cpu) as avg_cpu,
      AVG(memory) as avg_memory,
      COUNT(DISTINCT worker_id) as worker_count
    FROM metrics
    WHERE created_at >= ?
    GROUP BY strftime('%Y-%m-%d %H:%M:00', created_at)
    ORDER BY minute ASC`
  ).bind(oneHourAgo.toISOString()).all<{
    minute: string
    total_rate: number
    avg_cpu: number
    avg_memory: number
    worker_count: number
  }>()

  return c.json({
    from: oneHourAgo.toISOString(),
    to: now.toISOString(),
    metrics: metrics.results
  })
})

export default dashboard



