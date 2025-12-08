/**
 * Scheduled handler for cron triggers
 * Runs every 2 minutes for maintenance tasks
 */

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
  WORKER_CONNECTIONS: DurableObjectNamespace
}

export async function scheduled(
  event: ScheduledEvent,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  console.log('[CRON] Running scheduled maintenance at', new Date().toISOString())

  // Connection state is now managed entirely by Durable Objects
  // No need for stale connection cleanup

  // Add other scheduled tasks here as needed
  // For example: token expiration checks, cleanup old metrics, etc.

  console.log('[CRON] Scheduled maintenance complete')
}
