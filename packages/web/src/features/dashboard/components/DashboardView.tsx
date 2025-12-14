import { createSignal, onMount, Show, For, createMemo } from 'solid-js'
import { useStore } from '@nanostores/solid'
import { $authState } from '@/lib/stores/auth'
import { getDashboardStats, getDashboardMetrics, type DashboardStats, type DashboardMetrics } from '@/lib/api/dashboard'

export default function DashboardView() {
  const authState = useStore($authState)
  const [stats, setStats] = createSignal<DashboardStats | null>(null)
  const [metrics, setMetrics] = createSignal<DashboardMetrics | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal('')

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

    if (!authState().isAuthenticated) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const [statsResult, metricsResult] = await Promise.all([
      getDashboardStats(),
      getDashboardMetrics()
    ])

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    } else {
      setError(statsResult.error?.message || 'Failed to load dashboard')
    }

    if (metricsResult.success && metricsResult.data) {
      setMetrics(metricsResult.data)
    }

    if (showLoading) {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  onMount(() => {
    fetchData(true)
    const interval = setInterval(() => fetchData(false), 10000)
    return () => clearInterval(interval)
  })

  return (
    <div class="space-y-6">
      <Show when={loading()}>
        <div class="animate-pulse space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(() => (
              <div class="stat-card">
                <div class="h-8 bg-[var(--color-gray-200)] rounded w-1/2 mb-2"></div>
                <div class="h-4 bg-[var(--color-gray-100)] rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </Show>

      <Show when={error()}>
        <div class="card p-6 bg-red-50 border-red-200">
          <p class="text-red-600">{error()}</p>
        </div>
      </Show>

      <Show when={!loading() && stats()}>
        {/* Main Stats Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Wallets */}
          <div class="stat-card">
            <div class="stat-value" style="color: var(--color-primary)">
              {formatNumber(stats()!.estimates.total_wallets)}
            </div>
            <div class="stat-label">Total Wallets Generated</div>
          </div>

          {/* Hourly Rate */}
          <div class="stat-card">
            <div class="stat-value">
              {formatNumber(stats()!.estimates.hourly_rate)}
              <span class="text-lg font-normal text-[var(--color-gray-500)]">/hr</span>
            </div>
            <div class="stat-label">Generation Rate</div>
          </div>

          {/* Machines Online */}
          <div class="stat-card">
            <div class="stat-value">
              {stats()!.workers.online}
              <span class="text-lg font-normal text-[var(--color-gray-500)]">/{stats()!.workers.total}</span>
            </div>
            <div class="stat-label">Machines Online</div>
          </div>

          {/* Average CPU */}
          <div class="stat-card">
            <div class="stat-value">
              {stats()!.metrics.avg_cpu}
              <span class="text-lg font-normal text-[var(--color-gray-500)]">%</span>
            </div>
            <div class="stat-label">Average CPU Usage</div>
          </div>
        </div>

        {/* Machine Status Summary */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Machine Status</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]">
              <div class="text-2xl font-semibold text-[var(--color-gray-900)]">{stats()!.workers.total}</div>
              <div class="text-sm text-[var(--color-gray-500)]">Total Machines</div>
            </div>
            <div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]">
              <div class="text-2xl font-semibold" style="color: var(--color-primary)">{stats()!.workers.online}</div>
              <div class="text-sm" style="color: var(--color-primary)">Online</div>
            </div>
            <div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]">
              <div class="text-2xl font-semibold text-[var(--color-gray-600)]">{stats()!.workers.offline}</div>
              <div class="text-sm text-[var(--color-gray-500)]">Offline</div>
            </div>
            <div class="text-center p-4 rounded-lg bg-[var(--color-gray-50)]">
              <div class="text-2xl font-semibold text-[var(--color-gray-900)]">{stats()!.metrics.workers_reporting}</div>
              <div class="text-sm text-[var(--color-gray-500)]">Reporting</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generation Rate Chart */}
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Generation Rate (Last Hour)</h3>
            <Show when={metrics()?.metrics.length} fallback={
              <div class="h-64 flex items-center justify-center text-[var(--color-gray-500)]">
                No data available
              </div>
            }>
              <div class="h-64">
                <RateChart metrics={metrics()!.metrics} />
              </div>
            </Show>
          </div>

          {/* CPU Usage Chart */}
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">CPU Usage (Last Hour)</h3>
            <Show when={metrics()?.metrics.length} fallback={
              <div class="h-64 flex items-center justify-center text-[var(--color-gray-500)]">
                No data available
              </div>
            }>
              <div class="h-64">
                <CpuChart metrics={metrics()!.metrics} />
              </div>
            </Show>
          </div>
        </div>

        {/* Hourly History */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-[var(--color-gray-900)] mb-4">Last 24 Hours</h3>
          <Show when={stats()!.history.length > 0} fallback={
            <div class="h-48 flex items-center justify-center text-[var(--color-gray-500)]">
              No historical data available
            </div>
          }>
            <div class="h-48">
              <HistoryChart history={stats()!.history} />
            </div>
          </Show>
        </div>

      </Show>
    </div>
  )
}

// Rate Chart Component
interface RateChartProps {
  metrics: Array<{ minute: string; total_rate: number }>
}

function RateChart(props: RateChartProps) {
  const chartWidth = 500
  const chartHeight = 250
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const maxRate = createMemo(() => Math.max(...props.metrics.map(m => m.total_rate), 1))

  const bars = createMemo(() => {
    const data = props.metrics
    const barWidth = Math.max(2, innerWidth / data.length - 2)

    return data.map((m, i) => {
      const x = padding.left + (i * (innerWidth / data.length))
      const height = (m.total_rate / maxRate()) * innerHeight
      const y = padding.top + innerHeight - height

      return { x, y, width: barWidth, height, value: m.total_rate }
    })
  })

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="w-full h-full">
      {/* Y axis grid lines */}
      <For each={[0, 0.25, 0.5, 0.75, 1]}>
        {(ratio) => {
          const y = padding.top + innerHeight * (1 - ratio)
          const value = Math.round(maxRate() * ratio)
          return (
            <>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="var(--color-gray-200)"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                text-anchor="end"
                class="text-xs fill-[var(--color-gray-400)]"
              >
                {value}
              </text>
            </>
          )
        }}
      </For>

      {/* Bars */}
      <For each={bars()}>
        {(bar) => (
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill="var(--color-primary)"
            rx="2"
          />
        )}
      </For>

      {/* X axis label */}
      <text
        x={chartWidth / 2}
        y={chartHeight - 5}
        text-anchor="middle"
        class="text-xs fill-[var(--color-gray-500)]"
      >
        Time (Last Hour)
      </text>

      {/* Y axis label */}
      <text
        transform={`translate(15, ${chartHeight / 2}) rotate(-90)`}
        text-anchor="middle"
        class="text-xs fill-[var(--color-gray-500)]"
      >
        Keys/min
      </text>
    </svg>
  )
}

// CPU Chart Component
interface CpuChartProps {
  metrics: Array<{ minute: string; avg_cpu: number }>
}

function CpuChart(props: CpuChartProps) {
  const chartWidth = 500
  const chartHeight = 250
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const linePath = createMemo(() => {
    const data = props.metrics
    if (data.length < 2) return ''

    const xScale = innerWidth / (data.length - 1)
    const yScale = innerHeight / 100

    return data.map((d, i) => {
      const x = padding.left + i * xScale
      const y = padding.top + innerHeight - (d.avg_cpu * yScale)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  })

  const areaPath = createMemo(() => {
    const data = props.metrics
    if (data.length < 2) return ''

    const xScale = innerWidth / (data.length - 1)
    const yScale = innerHeight / 100

    const points = data.map((d, i) => {
      const x = padding.left + i * xScale
      const y = padding.top + innerHeight - (d.avg_cpu * yScale)
      return `${x} ${y}`
    })

    return `M ${padding.left} ${padding.top + innerHeight} L ${points.join(' L ')} L ${padding.left + innerWidth} ${padding.top + innerHeight} Z`
  })

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="w-full h-full">
      {/* Y axis grid lines */}
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

      {/* Area fill */}
      <path
        d={areaPath()}
        fill="var(--color-primary)"
        fill-opacity="0.1"
      />

      {/* Line */}
      <path
        d={linePath()}
        fill="none"
        stroke="var(--color-primary)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      {/* X axis label */}
      <text
        x={chartWidth / 2}
        y={chartHeight - 5}
        text-anchor="middle"
        class="text-xs fill-[var(--color-gray-500)]"
      >
        Time (Last Hour)
      </text>

      {/* Y axis label */}
      <text
        transform={`translate(15, ${chartHeight / 2}) rotate(-90)`}
        text-anchor="middle"
        class="text-xs fill-[var(--color-gray-500)]"
      >
        CPU Usage (%)
      </text>
    </svg>
  )
}

// History Chart Component
interface HistoryChartProps {
  history: Array<{ hour: string; total_rate: number; avg_cpu: number; worker_count: number }>
}

function HistoryChart(props: HistoryChartProps) {
  const chartWidth = 800
  const chartHeight = 180
  const padding = { top: 20, right: 60, bottom: 40, left: 60 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const maxRate = createMemo(() => Math.max(...props.history.map(h => h.total_rate), 1))

  const bars = createMemo(() => {
    const data = props.history
    const barWidth = Math.max(8, (innerWidth / data.length) - 4)

    return data.map((h, i) => {
      const x = padding.left + (i * (innerWidth / data.length)) + 2
      const height = (h.total_rate / maxRate()) * innerHeight
      const y = padding.top + innerHeight - height
      const hour = new Date(h.hour).getHours()

      return { x, y, width: barWidth, height, value: h.total_rate, hour }
    })
  })

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="w-full h-full">
      {/* Y axis grid lines */}
      <For each={[0, 0.5, 1]}>
        {(ratio) => {
          const y = padding.top + innerHeight * (1 - ratio)
          const value = Math.round(maxRate() * ratio)
          return (
            <>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="var(--color-gray-200)"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                text-anchor="end"
                class="text-xs fill-[var(--color-gray-400)]"
              >
                {value}
              </text>
            </>
          )
        }}
      </For>

      {/* Bars */}
      <For each={bars()}>
        {(bar) => (
          <g>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill="var(--color-gray-300)"
              rx="2"
            />
            <Show when={bars().indexOf(bar) % 4 === 0}>
              <text
                x={bar.x + bar.width / 2}
                y={chartHeight - 20}
                text-anchor="middle"
                class="text-xs fill-[var(--color-gray-400)]"
              >
                {bar.hour}h
              </text>
            </Show>
          </g>
        )}
      </For>
    </svg>
  )
}



