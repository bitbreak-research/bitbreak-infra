import { createSignal } from 'solid-js'
import { useStore } from '@nanostores/solid'
import { $authState } from '../../../lib/stores/auth'
import { createWorker, type CreateWorkerResponse } from '../../../lib/api/workers'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Alert from '../../../components/ui/Alert'

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

    // Check if authenticated (tokens are in cookies)
    if (!authState().isAuthenticated) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const result = await createWorker(name())

    if (result.success && result.data) {
      setNewWorkerData(result.data)
      const workerName = name() || result.data.name // Save name before clearing (use response as fallback)
      setName('')
      // Refresh workers list
      if (typeof window !== 'undefined' && (window as any).refreshWorkersList) {
        (window as any).refreshWorkersList()
      }
      // Automatically download config file
      downloadConfigFile(result.data, workerName)
      props.onWorkerCreated?.()
    } else {
      setError(result.error?.message || 'Failed to create worker')
    }

    setLoading(false)
  }

  const downloadConfigFile = (data: CreateWorkerResponse, workerName: string) => {
    // Create config with id, token, and websocket_url
    const config = {
      id: data.worker_id,
      token: data.token,
      websocket_url: data.websocket_url
    }

    // Sanitize worker name for filename (remove special characters, replace spaces with hyphens)
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

    // Get worker name from the response data
    const workerName = data.name || data.worker_id
    downloadConfigFile(data, workerName)
  }

  const handleCopyToken = () => {
    const data = newWorkerData()
    if (data?.token) {
      navigator.clipboard.writeText(data.token)
    }
  }

  if (newWorkerData()) {
    return (
      <div class="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div>
          <h3 class="text-sm font-medium text-gray-900 mb-2">Worker Created Successfully</h3>
          <p class="text-xs text-gray-600 mb-4">
            Save this token securely. It will not be shown again.
          </p>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-xs font-mono break-all">
                {newWorkerData()!.token}
              </code>
              <button
                onClick={handleCopyToken}
                class="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Copy Token
              </button>
            </div>
            <button
              onClick={handleDownloadConfig}
              class="w-full px-3 py-2 text-xs font-medium text-white bg-black border border-gray-300 rounded hover:bg-gray-800"
            >
              Download Config JSON
            </button>
          </div>
        </div>
        <Button
          onClick={() => {
            setNewWorkerData(null)
            props.onWorkerCreated?.()
          }}
          variant="secondary"
        >
          Create Another Worker
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      {error() && <Alert type="error">{error()}</Alert>}

      <div>
        <Input
          id="worker-name"
          label="Worker Name"
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="e.g., MacMini-Office-01"
          required
          minLength={3}
          maxLength={100}
          disabled={loading()}
        />
      </div>

      <Button type="submit" loading={loading()} disabled={loading() || name().length < 3}>
        Create Worker
      </Button>
    </form>
  )
}

