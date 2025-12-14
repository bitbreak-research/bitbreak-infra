import { createSignal, onMount, Show, For, createMemo } from 'solid-js'
import { useStore } from '@nanostores/solid'
import { $authState } from '@/lib/stores/auth'
import { 
  getWorker, 
  getWorkerMetrics, 
  startWorker, 
  stopWorker, 
  regenerateToken, 
  deleteWorker,
  type WorkerDetail as WorkerDetailType,
  type MetricsHistory 
} from '@/lib/api/workers'

interface WorkerDetailProps {
  workerId: string
}

export default function WorkerDetail(props: WorkerDetailProps) {
  const authState = useStore($authState)
  const [worker, setWorker] = createSignal<WorkerDetailType | null>(null)
  const [metrics, setMetrics] = createSignal<MetricsHistory | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [actionLoading, setActionLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const fetchData = async () => {
    if (!authState().isAuthenticated) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const [workerResult, metricsResult] = await Promise.all([
      getWorker(props.workerId),
      getWorkerMetrics(props.workerId, { limit: 60 })
    ])

    if (workerResult.success && workerResult.data) {
      setWorker(workerResult.data)
    } else {
      setError(workerResult.error?.message || 'Failed to load worker')
    }

    if (metricsResult.success && metricsResult.data) {
      setMetrics(metricsResult.data)
    }

    setLoading(false)
  }

  const handleStart = async () => {
    setActionLoading(true)
    const result = await startWorker(props.workerId)
    if (!result.success) {
      alert(result.error?.message || 'Failed to start engine')
    }
    await fetchData()
    setActionLoading(false)
  }

  const handleStop = async () => {
    setActionLoading(true)
    const result = await stopWorker(props.workerId)
    if (!result.success) {
      alert(result.error?.message || 'Failed to stop engine')
    }
    await fetchData()
    setActionLoading(false)
  }

  const handleRegenerateToken = async () => {
    if (!confirm('This will generate a new token. The old token will be invalidated. Continue?')) {
      return
    }
    setActionLoading(true)
    const result = await regenerateToken(props.workerId)
    if (result.success && result.data) {
      alert(`New token: ${result.data.token}\n\nSave this token securely. It will not be shown again.`)
    } else {
      alert(result.error?.message || 'Failed to regenerate token')
    }
    await fetchData()
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this worker? This action cannot be undone.')) {
      return
    }
    setActionLoading(true)
    const result = await deleteWorker(props.workerId)
    if (result.success) {
      window.location.href = '/workers'
    } else {
      alert(result.error?.message || 'Failed to delete worker')
      setActionLoading(false)
    }
  }

  const latestMetric = createMemo(() => {
    const m = metrics()
    return m?.metrics[0] || null
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleString()
  }

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) return 'Expired'
    if (daysUntilExpiry < 7) return `${daysUntilExpiry} days`
    return `${daysUntilExpiry} days`
  }

  onMount(() => {
    fetchData()
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  })

  return (
    <div>
      <Show when={loading()}>
        <div class="animate-pulse space-y-6">
          <div class="h-8 bg-[var(--color-gray-200)] rounded w-1/3"></div>
          <div class="card p-6">
            <div class="h-32 bg-[var(--color-gray-100)] rounded"></div>
          </div>
        </div>
      </Show>

      <Show when={error()}>
        <div class="card p-6 bg-red-50 border-red-200">
          <p class="text-red-600">{error()}</p>
        </div>
      </Show>

      <Show when={!loading() && worker()}>
        <div class="space-y-6">
          {/* Header */}
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-semibold text-[var(--color-gray-900)]">{worker()!.name}</h1>
              <div class="flex items-center gap-3 mt-2">
                <span class={`status-dot ${worker()!.is_connected ? 'online' : 'offline'}`}></span>
                <span class="text-sm text-[var(--color-gray-500)]">
                  {worker()!.is_connected ? 'Connected' : 'Disconnected'}
                </span>
                <span class="text-sm text-[var(--color-gray-400)]">|</span>
                <span class="text-xs font-mono text-[var(--color-gray-400)]">{props.workerId}</span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Show when={worker()!.is_connected}>
                <button 
                  class="btn btn-primary"
                  onClick={handleStart}
                  disabled={actionLoading()}
                >
                  Start Engine
                </button>
                <button 
                  class="btn btn-secondary"
                  onClick={handleStop}
                  disabled={actionLoading()}
                >
                  Stop Engine
                </button>
              </Show>
            </div>
          </div>

          {/* Stats Grid */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="stat-card">
              <div class="stat-value">{latestMetric()?.cpu ?? '--'}%</div>
              <div class="stat-label">CPU Usage</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">
                {latestMetric()?.memory ? `${(latestMetric()!.memory / 1024).toFixed(1)}` : '--'}
                <span class="text-lg font-normal text-[var(--color-gray-500)]">GB</span>
              </div>
              <div class="stat-label">Memory Usage</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{latestMetric()?.rate ?? '--'}</div>
              <div class="stat-label">Keys/min</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{formatExpiresAt(worker()!.token_expires_at)}</div>
              <div class="stat-label">Token Expires</div>
            </div>
          </div>

          {/* Metrics Chart */}
          <div class="card p-6">
            <h2 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Performance History</h2>
            <Show when={metrics()?.metrics.length} fallback={
              <div class="h-48 flex items-center justify-center text-[var(--color-gray-500)]">
                No metrics data available
              </div>
            }>
              <div class="h-48 relative">
                <MetricsChart metrics={metrics()!.metrics} />
              </div>
            </Show>
          </div>

          {/* Info Cards */}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Worker Info */}
            <div class="card p-6">
              <h2 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Machine Details</h2>
              <dl class="space-y-4">
                <div class="flex justify-between">
                  <dt class="text-sm text-[var(--color-gray-500)]">Status</dt>
                  <dd class="text-sm font-medium text-[var(--color-gray-900)]">
                    <span class={`badge ${worker()!.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                      {worker()!.status}
                    </span>
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-[var(--color-gray-500)]">Created</dt>
                  <dd class="text-sm font-medium text-[var(--color-gray-900)]">{formatDate(worker()!.created_at)}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-[var(--color-gray-500)]">Last IP</dt>
                  <dd class="text-sm font-mono text-[var(--color-gray-900)]">{worker()!.last_ip || '--'}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-[var(--color-gray-500)]">Token Expires</dt>
                  <dd class="text-sm font-medium text-[var(--color-gray-900)]">{formatDate(worker()!.token_expires_at)}</dd>
                </div>
              </dl>
            </div>

            {/* Actions */}
            <div class="card p-6">
              <h2 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Actions</h2>
              <div class="space-y-3">
                <button 
                  class="btn btn-secondary w-full justify-start"
                  onClick={handleRegenerateToken}
                  disabled={actionLoading()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Regenerate Token
                </button>
                <button 
                  class="btn btn-danger w-full justify-start"
                  onClick={handleDelete}
                  disabled={actionLoading()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete Machine
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

// Simple SVG chart component
interface MetricsChartProps {
  metrics: Array<{ memory: number; cpu: number; rate: number; created_at: string }>
}

function MetricsChart(props: MetricsChartProps) {
  const chartWidth = 800
  const chartHeight = 180
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const sortedMetrics = () => [...props.metrics].reverse()

  const cpuPath = createMemo(() => {
    const data = sortedMetrics()
    if (data.length < 2) return ''
    
    const xScale = innerWidth / (data.length - 1)
    const yScale = innerHeight / 100
    
    return data.map((d, i) => {
      const x = padding.left + i * xScale
      const y = padding.top + innerHeight - (d.cpu * yScale)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  })

  const ratePath = createMemo(() => {
    const data = sortedMetrics()
    if (data.length < 2) return ''
    
    const maxRate = Math.max(...data.map(d => d.rate), 100)
    const xScale = innerWidth / (data.length - 1)
    const yScale = innerHeight / maxRate
    
    return data.map((d, i) => {
      const x = padding.left + i * xScale
      const y = padding.top + innerHeight - (d.rate * yScale)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  })

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="w-full h-full">
      {/* Grid lines */}
      <For each={[0, 25, 50, 75, 100]}>
        {(tick) => {
          const y = padding.top + innerHeight - (tick / 100) * innerHeight
          return (
            <>
              <line 
                x1={padding.left} 
                y1={y} 
                x2={chartWidth - padding.right} 
                y2={y} 
                stroke="var(--color-gray-200)" 
                stroke-dasharray="4"
              />
              <text 
                x={padding.left - 10} 
                y={y + 4} 
                text-anchor="end" 
                class="text-xs fill-[var(--color-gray-400)]"
              >
                {tick}%
              </text>
            </>
          )
        }}
      </For>

      {/* CPU Line */}
      <path 
        d={cpuPath()} 
        fill="none" 
        stroke="var(--color-primary)" 
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      {/* Rate Line */}
      <path 
        d={ratePath()} 
        fill="none" 
        stroke="var(--color-gray-400)" 
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="4"
      />

      {/* Legend */}
      <g transform={`translate(${padding.left}, ${chartHeight - 8})`}>
        <circle cx="0" cy="0" r="4" fill="var(--color-primary)"/>
        <text x="10" y="4" class="text-xs fill-[var(--color-gray-600)]">CPU</text>
        <circle cx="60" cy="0" r="4" fill="var(--color-gray-400)"/>
        <text x="70" y="4" class="text-xs fill-[var(--color-gray-600)]">Rate</text>
      </g>
    </svg>
  )
}



