import type { WorkerStatus } from '../../../lib/api/workers'

interface WorkerStatusBadgeProps {
  status: WorkerStatus
  isConnected?: boolean
}

export default function WorkerStatusBadge({ status, isConnected }: WorkerStatusBadgeProps) {
  // If worker is connected, show ONLINE regardless of status
  if (isConnected && status === 'active') {
    return (
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ONLINE
      </span>
    )
  }

  const statusConfig = {
    active: {
      label: 'OFFLINE',
      className: 'bg-gray-100 text-gray-800'
    },
    revoked: {
      label: 'REVOKED',
      className: 'bg-red-100 text-red-800'
    },
    update_required: {
      label: 'UPDATE_REQUIRED',
      className: 'bg-yellow-100 text-yellow-800'
    }
  }

  const config = statusConfig[status] || statusConfig.active

  return (
    <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

