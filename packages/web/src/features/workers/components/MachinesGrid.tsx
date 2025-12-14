import { createSignal, onMount, Show, For } from 'solid-js'
import { useStore } from '@nanostores/solid'
import { $authState } from '@/lib/stores/auth'
import { getWorkersStatus, type WorkerStatusWithMetrics } from '@/lib/api/workers'
import MachineCard from './MachineCard'

interface MachinesGridProps {
  onMachineClick?: (workerId: string) => void
}

export default function MachinesGrid(props: MachinesGridProps) {
  const authState = useStore($authState)
  const [workers, setWorkers] = createSignal<WorkerStatusWithMetrics[]>([])
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal('')

  const fetchWorkers = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    setError('')

    if (!authState().isAuthenticated) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const result = await getWorkersStatus()

    if (result.success && result.data) {
      setWorkers(result.data.workers)
    } else {
      setError(result.error?.message || 'Failed to load machines')
    }

    if (showLoading) {
      setLoading(false)
    }
  }

  const handleMachineClick = (workerId: string) => {
    if (props.onMachineClick) {
      props.onMachineClick(workerId)
    } else {
      window.location.href = `/workers/${workerId}`
    }
  }

  onMount(() => {
    fetchWorkers(true)

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchWorkers(false)
    }, 5000)

    return () => clearInterval(interval)
  })

  return (
    <div>
      <Show when={error()}>
        <div class="p-4 mb-6 rounded-lg bg-red-50 border border-red-200">
          <p class="text-sm text-red-600">{error()}</p>
        </div>
      </Show>

      <Show when={loading()}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(() => (
            <div class="card p-6 animate-pulse">
              <div class="h-6 bg-[var(--color-gray-200)] rounded w-2/3 mb-4"></div>
              <div class="h-20 bg-[var(--color-gray-100)] rounded mb-4"></div>
              <div class="space-y-3">
                <div class="h-4 bg-[var(--color-gray-200)] rounded"></div>
                <div class="h-4 bg-[var(--color-gray-200)] rounded"></div>
                <div class="h-4 bg-[var(--color-gray-200)] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </Show>

      <Show when={!loading() && workers().length === 0}>
        <div class="card p-12 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-gray-100)] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-[var(--color-gray-400)]">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-[var(--color-gray-900)] mb-2">
            No machines configured
          </h3>
          <p class="text-sm text-[var(--color-gray-500)] mb-6">
            Add your first Mac Mini to start monitoring and generating wallets.
          </p>
          <a href="/workers/new" class="btn btn-primary">
            Add Machine
          </a>
        </div>
      </Show>

      <Show when={!loading() && workers().length > 0}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <For each={workers()}>
            {(worker) => (
              <MachineCard 
                worker={worker} 
                onClick={() => handleMachineClick(worker.worker_id)}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}



