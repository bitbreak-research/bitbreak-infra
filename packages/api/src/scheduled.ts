/**
 * Scheduled handler for cron triggers
 * Runs every 2 minutes to clean up stale worker connections
 */


type Bindings = {
  bb: D1Database
  JWT_SECRET: string
}

export async function scheduled(
  event: ScheduledEvent,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  console.log('[CRON] Running stale connection cleanup at', new Date().toISOString())

  try {
    // Find workers marked as connected but haven't sent messages in 5+ minutes
    const staleWorkers = await env.bb.prepare(
      `SELECT id, name, last_connected_at 
       FROM workers 
       WHERE is_connected = 1 
       AND last_connected_at < datetime('now', '-5 minutes')`
    ).all()

    if (staleWorkers.results.length > 0) {
      console.log(`[CRON] Found ${staleWorkers.results.length} stale connections`)

      // Mark them as disconnected
      const now = new Date().toISOString()
      for (const worker of staleWorkers.results) {
        await env.bb.prepare(
          `UPDATE workers 
           SET is_connected = 0, last_disconnected_at = ?
           WHERE id = ?`
        ).bind(now, worker.id).run()

        console.log(`[CRON] Disconnected stale worker: ${worker.name} (${worker.id})`)
      }
    } else {
      console.log('[CRON] No stale connections found')
    }
  } catch (error) {
    console.error('[CRON] Error cleaning up stale connections:', error)
  }
}