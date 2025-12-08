import { createSignal, onMount, Show } from 'solid-js'
import { useStore } from '@nanostores/solid'
import { $authState } from '../../../lib/stores/auth'
import { listWorkers, deleteWorker, regenerateToken, getWorkersStatus, startWorker, stopWorker, type Worker, type WorkerStatusWithMetrics } from '../../../lib/api/workers'
import WorkerStatusBadge from './WorkerStatusBadge'
import Button from '../../../components/ui/Button'
import Alert from '../../../components/ui/Alert'

interface WorkersListProps {
  onRefresh?: () => void
}

export default function WorkersList(props: WorkersListProps) {
  const authState = useStore($authState)
  const [workers, setWorkers] = createSignal<Worker[]>([])
  const [workersStatus, setWorkersStatus] = createSignal<WorkerStatusWithMetrics[]>([])
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal('')
  const [actionLoading, setActionLoading] = createSignal<string | null>(null)

  const fetchWorkers = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    setError('')

    // Check if authenticated (tokens are in cookies)
    if (!authState().isAuthenticated) {
      setError('Not authenticated')
      if (showLoading) {
        setLoading(false)
      }
      return
    }

    const [workersResult, statusResult] = await Promise.all([
      listWorkers(),
      getWorkersStatus()
    ])

    if (workersResult.success && workersResult.data) {
      setWorkers(workersResult.data)
    } else {
      setError(workersResult.error?.message || 'Failed to load workers')
    }

    if (statusResult.success && statusResult.data) {
      setWorkersStatus(statusResult.data.workers)
    }

    props.onRefresh?.()

    if (showLoading) {
      setLoading(false)
    }
  }

  // Expose refresh function via window for parent components
  if (typeof window !== 'undefined') {
    (window as any).refreshWorkersList = fetchWorkers
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this worker? This will permanently remove the worker and all its data.')) {
      return
    }

    setActionLoading(id)
    if (!authState().isAuthenticated) return

    const result = await deleteWorker(id)

    if (result.success) {
      await fetchWorkers(true) // Show loading when manually refreshing after action
    } else {
      alert(result.error?.message || 'Failed to delete worker')
    }

    setActionLoading(null)
  }

  const handleRegenerateToken = async (id: string) => {
    if (!confirm('This will generate a new token. The old token will be invalidated. Continue?')) {
      return
    }

    setActionLoading(id)
    if (!authState().isAuthenticated) return

    const result = await regenerateToken(id)

    if (result.success && result.data) {
      alert(`New token: ${result.data.token}\n\nSave this token securely. It will not be shown again.`)
      await fetchWorkers(true) // Show loading when manually refreshing after action
    } else {
      alert(result.error?.message || 'Failed to regenerate token')
    }

    setActionLoading(null)
  }

  const handleStart = async (id: string) => {
    setActionLoading(id)
    if (!authState().isAuthenticated) return

    const result = await startWorker(id)

    if (result.success) {
      await fetchWorkers(false) // Silent refresh
    } else {
      alert(result.error?.message || 'Failed to start worker')
    }

    setActionLoading(null)
  }

  const handleStop = async (id: string) => {
    setActionLoading(id)
    if (!authState().isAuthenticated) return

    const result = await stopWorker(id)

    if (result.success) {
      await fetchWorkers(false) // Silent refresh
    } else {
      alert(result.error?.message || 'Failed to stop worker')
    }

    setActionLoading(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return 'Expired'
    } else if (daysUntilExpiry < 7) {
      return `${daysUntilExpiry} days (renewal zone)`
    } else {
      return `${daysUntilExpiry} days`
    }
  }

  const formatLastReportAge = (ageSeconds: number | null) => {
    if (ageSeconds === null) return 'Never'
    if (ageSeconds < 60) return `${ageSeconds} seconds ago`
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)} minutes ago`
    return `${Math.floor(ageSeconds / 3600)} hours ago`
  }

  const getWorkerStatus = (workerId: string): WorkerStatusWithMetrics | undefined => {
    return workersStatus().find(w => w.worker_id === workerId)
  }

  onMount(() => {
    // Initial load with loading indicator
    fetchWorkers(true)

    // Auto-refresh only the workers list every 5 seconds to show real-time connection status
    // This silently updates the workers data without showing loading state or refreshing the entire UI
    const interval = setInterval(() => {
      fetchWorkers(false) // Silent refresh - no loading indicator
    }, 5000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  })

  return (
    <div class="space-y-4">
      <Show when={error()}>
        <Alert type="error">{error()}</Alert>
      </Show>

      <Show when={loading()}>
        <div class="text-center py-8 text-gray-500">Loading workers...</div>
      </Show>

      <Show when={!loading() && workers().length === 0}>
        <div class="text-center py-8 text-gray-500">No workers found. Create one to get started.</div>
      </Show>

      <Show when={!loading() && workers().length > 0}>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engine
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Connected
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires In
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {workers().map((worker) => {
                const status = getWorkerStatus(worker.id)
                const connectionIndicator = status?.connected ? '●' : '○'
                const connectionText = status?.connected ? 'Connected' : 'Disconnected'
                
                return (
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">{worker.name}</div>
                      <div class="text-xs text-gray-500">{worker.id}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <WorkerStatusBadge status={worker.status} isConnected={worker.is_connected} />
                      <Show when={worker.renewal_failure_reason}>
                        <div class="text-xs text-yellow-600 mt-1">
                          {worker.renewal_failure_reason}
                        </div>
                      </Show>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Show when={status?.memory !== null && status?.cpu !== null && status?.rate !== null} fallback={
                        <div class="text-xs text-gray-400">No metrics</div>
                      }>
                        <div class="space-y-1">
                          <div class="flex items-center gap-2">
                            <span class="font-medium">{connectionIndicator}</span>
                            <span class="text-xs">{connectionText}</span>
                          </div>
                          <div class="text-xs">
                            Memory: {status?.memory?.toLocaleString()} MB | CPU: {status?.cpu}% | Rate: {status?.rate} tasks/min
                          </div>
                          <Show when={status?.last_report_age_seconds !== null}>
                            <div class="text-xs text-gray-400">
                              Last report: {formatLastReportAge(status?.last_report_age_seconds ?? null)}
                            </div>
                          </Show>
                        </div>
                      </Show>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Show when={status?.engine_status} fallback={
                        <div class="text-xs text-gray-400">Unknown</div>
                      }>
                        <div class="space-y-1">
                          <div class="flex items-center gap-2">
                            <span class={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              status?.engine_status === 'running' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {status?.engine_status === 'running' ? '▶ Running' : '⏸ Stopped'}
                            </span>
                          </div>
                          <Show when={status?.power_level || status?.mnemonic_language || status?.gpu_enabled !== null}>
                            <div class="text-xs text-gray-600">
                              <Show when={status?.power_level}>
                                Power: {status?.power_level}
                              </Show>
                              <Show when={status?.mnemonic_language}>
                                {' | '}Lang: {status?.mnemonic_language}
                              </Show>
                              <Show when={status?.gpu_enabled !== null}>
                                {' | '}GPU: {status?.gpu_enabled ? 'On' : 'Off'}
                              </Show>
                            </div>
                          </Show>
                        </div>
                      </Show>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(worker.last_connected_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatExpiresAt(worker.token_expires_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex flex-col space-y-2">
                        <div class="flex items-center space-x-2">
                          <Show when={worker.status === 'active' && worker.is_connected}>
                            <Show 
                              when={!status?.engine_status || status?.engine_status === 'stopped'}
                              fallback={
                                <button
                                  onClick={() => handleStop(worker.id)}
                                  disabled={actionLoading() === worker.id}
                                  class="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Stop engine"
                                >
                                  {actionLoading() === worker.id ? 'Loading...' : 'Stop'}
                                </button>
                              }
                            >
                              <button
                                onClick={() => handleStart(worker.id)}
                                disabled={actionLoading() === worker.id}
                                class="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Start engine"
                              >
                                {actionLoading() === worker.id ? 'Loading...' : 'Start'}
                              </button>
                            </Show>
                          </Show>
                          <Show when={worker.status === 'active'}>
                            <button
                              onClick={() => handleRegenerateToken(worker.id)}
                              disabled={actionLoading() === worker.id}
                              class="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            >
                              {actionLoading() === worker.id ? 'Loading...' : 'Regen Token'}
                            </button>
                          </Show>
                          <button
                            onClick={() => handleDelete(worker.id)}
                            disabled={actionLoading() === worker.id}
                            class="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {actionLoading() === worker.id ? 'Loading...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  )
}

