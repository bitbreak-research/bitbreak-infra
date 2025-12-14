export interface DashboardStats {
  workers: {
    total: number
    active: number
    online: number
    offline: number
  }
  metrics: {
    avg_cpu: number
    avg_memory: number
    total_rate: number
    workers_reporting: number
  }
  estimates: {
    total_wallets: number
    hourly_rate: number
  }
  history: Array<{
    hour: string
    total_rate: number
    avg_cpu: number
    worker_count: number
  }>
}

export interface DashboardMetrics {
  from: string
  to: string
  metrics: Array<{
    minute: string
    total_rate: number
    avg_cpu: number
    avg_memory: number
    worker_count: number
  }>
}

async function authGet<T>(url: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN', message: 'An error occurred' }
      }
    }

    return { success: true, data: data as T }
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Network error' }
    }
  }
}

export async function getDashboardStats() {
  return authGet<DashboardStats>('/api/dashboard/stats')
}

export async function getDashboardMetrics() {
  return authGet<DashboardMetrics>('/api/dashboard/metrics')
}



