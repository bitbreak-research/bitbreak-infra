import { get, post } from './client'

export type WorkerStatus = 'active' | 'revoked' | 'update_required'

export interface Worker {
  id: string
  name: string
  status: WorkerStatus
  token_expires_at: string
  last_connected_at: string | null
  is_connected: boolean
  created_at: string
  renewal_failure_reason?: string | null
  renewal_failure_at?: string | null
}

export interface WorkerDetail extends Worker {
  token_expires_at: string
  pending_token_expires_at: string | null
  pending_token_created_at: string | null
  renewal_retry_count: number
  last_disconnected_at: string | null
  last_ip: string | null
  created_by: string | null
  revoked_at: string | null
  revoked_by: string | null
  revoke_reason: string | null
}

export interface CreateWorkerRequest {
  name: string
}

export interface CreateWorkerResponse {
  worker_id: string
  name: string
  token: string // Only shown once at creation
  expires_at: string
  created_at: string
  websocket_url: string
}

export interface RegenerateTokenResponse {
  worker_id: string
  token: string // Only shown once
  expires_at: string
  websocket_url: string
}

export interface Metrics {
  worker_id: string
  memory: number
  cpu: number
  rate: number
  created_at: string
}

export interface MetricsHistory {
  worker_id: string
  from: string
  to: string
  metrics: Array<{
    memory: number
    cpu: number
    rate: number
    created_at: string
  }>
}

export interface WorkerStatusWithMetrics {
  worker_id: string
  name: string
  status: WorkerStatus
  connected: boolean
  memory: number | null
  cpu: number | null
  rate: number | null
  last_report: string | null
  last_report_age_seconds: number | null
}

export interface WorkersStatusResponse {
  workers: WorkerStatusWithMetrics[]
}

// Helper functions for authenticated requests
// Tokens are in httpOnly cookies, so we don't pass them explicitly
async function authPost<T>(url: string, body: unknown) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN', message: 'An error occurred' }
      }
    }

    return { success: true, data }
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Network error' }
    }
  }
}

async function authGet<T>(url: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include' // Include cookies
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN', message: 'An error occurred' }
      }
    }

    return { success: true, data }
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Network error' }
    }
  }
}

async function authDelete<T>(url: string) {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include' // Include cookies
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN', message: 'An error occurred' }
      }
    }

    return { success: true, data }
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Network error' }
    }
  }
}

/**
 * Create a new worker
 */
export async function createWorker(name: string) {
  return authPost<CreateWorkerResponse>('/api/workers', { name })
}

/**
 * List all workers
 */
export async function listWorkers() {
  return authGet<Worker[]>('/api/workers')
}

/**
 * Get worker details
 */
export async function getWorker(id: string) {
  return authGet<WorkerDetail>(`/api/workers/${id}`)
}

/**
 * Revoke a worker
 */
export async function revokeWorker(id: string) {
  return authDelete<{ success: boolean }>(`/api/workers/${id}`)
}

/**
 * Regenerate token for a worker
 */
export async function regenerateToken(id: string) {
  return authPost<RegenerateTokenResponse>(`/api/workers/${id}/token`, {})
}

/**
 * Get latest metrics for a worker
 */
export async function getWorkerMetricsLatest(id: string) {
  return authGet<Metrics>(`/api/workers/${id}/metrics/latest`)
}

/**
 * Get metrics history for a worker
 */
export async function getWorkerMetrics(id: string, params?: { from?: string; to?: string; limit?: number }) {
  const queryParams = new URLSearchParams()
  if (params?.from) queryParams.append('from', params.from)
  if (params?.to) queryParams.append('to', params.to)
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  
  const url = `/api/workers/${id}/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  return authGet<MetricsHistory>(url)
}

/**
 * Get all workers status with metrics
 */
export async function getWorkersStatus() {
  return authGet<WorkersStatusResponse>('/api/workers/status')
}

