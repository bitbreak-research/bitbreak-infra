import { Show } from 'solid-js'
import type { WorkerStatusWithMetrics } from '@/lib/api/workers'

interface MachineCardProps {
  worker: WorkerStatusWithMetrics
  onClick?: () => void
}

export default function MachineCard(props: MachineCardProps) {
  const getStoragePercent = () => {
    // Simulated storage - in real app this would come from metrics
    return 60
  }

  const getMemoryPercent = () => {
    const memory = props.worker.memory
    if (memory === null) return 0
    // Assuming 8GB (8192MB) max for Mac Mini
    return Math.min(Math.round((memory / 8192) * 100), 100)
  }

  const getCpuPercent = () => {
    return props.worker.cpu ?? 0
  }

  const formatMemory = () => {
    const memory = props.worker.memory
    if (memory === null) return '--'
    if (memory >= 1024) {
      return `${(memory / 1024).toFixed(1)}GB`
    }
    return `${memory}MB`
  }

  return (
    <div 
      class="card card-interactive p-6 cursor-pointer"
      onClick={() => props.onClick?.()}
    >
      {/* Header */}
      <div class="flex items-start justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-[var(--color-gray-900)]">
            {props.worker.name}
          </h3>
          <div class="flex items-center gap-2 mt-1">
            <span class={`status-dot ${props.worker.connected ? 'online' : 'offline'}`}></span>
            <span class="text-sm text-[var(--color-gray-500)]">
              {props.worker.connected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <Show when={props.worker.engine_status === 'running'}>
          <span class="badge badge-success">
            Running
          </span>
        </Show>
        <Show when={props.worker.engine_status === 'stopped' || !props.worker.engine_status}>
          <span class="badge badge-neutral">
            Stopped
          </span>
        </Show>
      </div>

      {/* Machine Icon */}
      <div class="flex justify-center mb-6">
        <svg 
          class="machine-icon" 
          viewBox="0 0 100 100" 
          fill="none"
        >
          {/* Mac Mini style box */}
          <g transform="translate(15, 20)">
            {/* Top face */}
            <path 
              d="M35 0 L70 15 L70 45 L35 30 Z" 
              fill="#E8E8ED"
              stroke="#D2D2D7"
              stroke-width="1"
            />
            {/* Left face */}
            <path 
              d="M0 15 L35 0 L35 30 L0 45 Z" 
              fill="#F5F5F7"
              stroke="#D2D2D7"
              stroke-width="1"
            />
            {/* Front face */}
            <path 
              d="M0 45 L35 30 L70 45 L35 60 Z" 
              fill="#FAFAFA"
              stroke="#D2D2D7"
              stroke-width="1"
            />
            {/* Vent lines on top */}
            <line x1="38" y1="8" x2="62" y2="18" stroke="#D2D2D7" stroke-width="1"/>
            <line x1="38" y1="12" x2="62" y2="22" stroke="#D2D2D7" stroke-width="1"/>
            <line x1="38" y1="16" x2="62" y2="26" stroke="#D2D2D7" stroke-width="1"/>
            {/* Vent lines on left */}
            <line x1="8" y1="20" x2="30" y2="12" stroke="#E8E8ED" stroke-width="1"/>
            <line x1="8" y1="24" x2="30" y2="16" stroke="#E8E8ED" stroke-width="1"/>
            <line x1="8" y1="28" x2="30" y2="20" stroke="#E8E8ED" stroke-width="1"/>
          </g>
        </svg>
      </div>

      {/* Metrics */}
      <div class="space-y-3">
        {/* CPU */}
        <div class="metric-row">
          <span class="metric-label">CPU</span>
          <div class="metric-bar">
            <div 
              class="metric-bar-fill" 
              style={`width: ${getCpuPercent()}%`}
            ></div>
          </div>
          <span class="metric-value">{getCpuPercent()}%</span>
        </div>

        {/* Memory */}
        <div class="metric-row">
          <span class="metric-label">Memory</span>
          <div class="metric-bar">
            <div 
              class="metric-bar-fill" 
              style={`width: ${getMemoryPercent()}%`}
            ></div>
          </div>
          <span class="metric-value">{formatMemory()}</span>
        </div>

        {/* Storage */}
        <div class="metric-row">
          <span class="metric-label">Storage capacity</span>
          <div class="metric-bar">
            <div 
              class="metric-bar-fill" 
              style={`width: ${getStoragePercent()}%`}
            ></div>
          </div>
          <span class="metric-value">{getStoragePercent()}%</span>
        </div>
      </div>

      {/* Rate indicator */}
      <Show when={props.worker.rate !== null && props.worker.rate > 0}>
        <div class="mt-4 pt-4 border-t border-[var(--color-gray-200)]">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-gray-500)]">Generation Rate</span>
            <span class="text-sm font-medium text-[var(--color-gray-900)]">
              {props.worker.rate} keys/min
            </span>
          </div>
        </div>
      </Show>
    </div>
  )
}



