import { createSignal, Show } from 'solid-js'
import { useStore } from '@nanostores/solid'
import { $authState } from '@/lib/stores/auth'
import { createWorker, type CreateWorkerResponse } from '@/lib/api/workers'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

export default function CreateWorkerForm(props: { onWorkerCreated?: () => void }) {
  const authState = useStore($authState)
  const [name, setName] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')
  const [newWorkerData, setNewWorkerData] = createSignal<CreateWorkerResponse | null>(null)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!authState().isAuthenticated) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const result = await createWorker(name())

    if (result.success && result.data) {
      setNewWorkerData(result.data)
      const workerName = name() || result.data.name
      setName('')
      if (typeof window !== 'undefined' && (window as any).refreshWorkersList) {
        (window as any).refreshWorkersList()
      }
      downloadConfigFile(result.data, workerName)
      props.onWorkerCreated?.()
    } else {
      setError(result.error?.message || 'Failed to create worker')
    }

    setLoading(false)
  }

  const downloadConfigFile = (data: CreateWorkerResponse, workerName: string) => {
    const config = {
      id: data.worker_id,
      token: data.token,
      websocket_url: data.websocket_url
    }

    const sanitizedName = workerName
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `config-${sanitizedName}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadConfig = () => {
    const data = newWorkerData()
    if (!data) return
    const workerName = data.name || data.worker_id
    downloadConfigFile(data, workerName)
  }

  const handleCopyToken = async () => {
    const data = newWorkerData()
    if (data?.token) {
      await navigator.clipboard.writeText(data.token)
    }
  }

  if (newWorkerData()) {
    return (
      <div class="space-y-6">
        <div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
          <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-sm font-medium text-green-800">Machine created successfully</p>
            <p class="text-xs text-green-700 mt-0.5">Configuration file has been downloaded</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--color-gray-700)] mb-1.5">
              Connection Token
            </label>
            <p class="text-xs text-[var(--color-gray-500)] mb-2">
              Save this token securely. It will not be shown again.
            </p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2.5 bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-lg text-xs font-mono break-all text-[var(--color-gray-900)]">
                {newWorkerData()!.token}
              </code>
              <button
                onClick={handleCopyToken}
                class="btn btn-secondary !w-auto !py-2.5"
                title="Copy token"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={handleDownloadConfig}
            class="btn btn-secondary w-full"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Config Again
          </button>
        </div>

        <div class="flex gap-3">
          <Button
            onClick={() => {
              setNewWorkerData(null)
              props.onWorkerCreated?.()
            }}
            variant="secondary"
          >
            Create Another
          </Button>
          <a href="/workers" class="btn btn-primary flex-1 text-center">
            View All Machines
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      <Show when={error()}>
        <Alert type="error" message={error()} />
      </Show>

      <Input
        label="Machine Name"
        type="text"
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
        placeholder="e.g., MacMini-Office-01"
        required
        minLength={3}
        maxLength={100}
        disabled={loading()}
      />

      <p class="text-xs text-[var(--color-gray-500)]">
        After creation, you'll receive a configuration file to set up the worker on your Mac Mini.
      </p>

      <Button type="submit" loading={loading()} disabled={loading() || name().length < 3}>
        Create Machine
      </Button>
    </form>
  )
}
