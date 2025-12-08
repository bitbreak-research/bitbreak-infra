import { Hono } from 'hono'

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
  WORKER_CONNECTIONS: DurableObjectNamespace
}

const ws = new Hono<{ Bindings: Bindings }>()

/**
 * WebSocket route handler
 * Forwards WebSocket connections to Durable Objects for stateful management
 */
ws.get('/ws', async (c) => {
  // WebSocket upgrade should include worker_id as query parameter
  const url = new URL(c.req.url)
  const workerId = url.searchParams.get('worker_id')

  if (!workerId) {
    return c.json(
      { error: 'Missing worker_id query parameter' },
      { status: 400 }
    )
  }

  // Get or create Durable Object for this worker
  const id = c.env.WORKER_CONNECTIONS.idFromName(workerId)
  const stub = c.env.WORKER_CONNECTIONS.get(id)

  // Forward the request to the Durable Object
  // The DO will handle WebSocket upgrade and connection management
  return stub.fetch(new Request(c.req.raw.url.replace('/ws', '/websocket'), {
    headers: c.req.raw.headers
  }))
})

/**
 * Send a message to a connected worker via Durable Object
 */
export async function sendMessageToWorker(
  env: Bindings,
  workerId: string,
  message: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = env.WORKER_CONNECTIONS.idFromName(workerId)
    const stub = env.WORKER_CONNECTIONS.get(id)
    
    const response = await stub.fetch(
      new Request('http://do/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
    )

    const result = await response.json<{ success: boolean; error?: string }>()
    return result
  } catch (error) {
    return { success: false, error: 'Failed to send message to worker' }
  }
}

/**
 * Check if a worker is connected via Durable Object
 */
export async function isWorkerConnected(
  env: Bindings,
  workerId: string
): Promise<boolean> {
  try {
    const id = env.WORKER_CONNECTIONS.idFromName(workerId)
    const stub = env.WORKER_CONNECTIONS.get(id)
    
    const response = await stub.fetch(new Request('http://do/status'))
    const result = await response.json<{ connected: boolean }>()
    return result.connected
  } catch (error) {
    return false
  }
}

/**
 * Get connection status for a worker
 */
export async function getWorkerConnectionStatus(
  env: Bindings,
  workerId: string
): Promise<{ connected: boolean; sessionCount?: number }> {
  try {
    const id = env.WORKER_CONNECTIONS.idFromName(workerId)
    const stub = env.WORKER_CONNECTIONS.get(id)
    
    const response = await stub.fetch(new Request('http://do/status'))
    const result = await response.json<{ 
      connected: boolean
      sessionCount: number
    }>()
    return result
  } catch (error) {
    return { connected: false }
  }
}

export default ws
