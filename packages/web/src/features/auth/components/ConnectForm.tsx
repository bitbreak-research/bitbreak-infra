import { createSignal, Show, onMount } from 'solid-js'
import Button from '../../../components/ui/Button'
import Alert from '../../../components/ui/Alert'
import { createWorker } from '../../../lib/api/workers'

interface ConnectFormProps {
  callback: string
  token: string
  source: string
}

export default function ConnectForm(props: ConnectFormProps) {
  const [error, setError] = createSignal('')
  const [success, setSuccess] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [status, setStatus] = createSignal('')

  onMount(() => {
    // Validate query params
    if (!props.callback || !props.token) {
      setError('Missing required parameters (callback or token)')
    }
  })

  const handleConnect = async () => {
    setError('')
    setSuccess(false)
    setLoading(true)
    setStatus('Creating worker...')

    try {
      // Step 1: Create a new worker
      const workerName = `CLI Worker - ${new Date().toISOString()}`
      const workerResult = await createWorker(workerName)

      if (!workerResult.success || !workerResult.data) {
        setError(workerResult.error?.message || 'Failed to create worker')
        setLoading(false)
        setStatus('')
        return
      }

      const { worker_id, token: workerToken, websocket_url } = workerResult.data

      // Step 2: Prepare config data
      const config = {
        id: worker_id,
        token: workerToken,
        websocket_url: websocket_url
      }

      setStatus('Connecting to CLI...')

      // Step 3: Construct callback URL with token as query parameter
      const callbackUrl = new URL(props.callback)
      callbackUrl.searchParams.set('token', props.token)

      // Step 4: Send POST request to CLI callback server
      const response = await fetch(callbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        // Success! The CLI received the config
        setSuccess(true)
        setStatus('Successfully connected! You can close this window.')
      } else {
        const errorText = await response.text()
        setError(`CLI rejected the connection: ${errorText || 'Unknown error'}`)
      }
    } catch (err) {
      // Network error - likely the CLI was closed
      setError('Connection error. Make sure the CLI is still running.')
      console.error('Connection error:', err)
    } finally {
      setLoading(false)
      if (!success()) {
        setStatus('')
      }
    }
  }

  return (
    <div class="space-y-6">
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-semibold">Connect CLI</h1>
        <p class="text-gray-600">
          Click the button below to connect your CLI to this account.
        </p>
        <p class="text-sm text-gray-500">
          A new worker will be created and configured for your CLI.
        </p>
      </div>

      <Show when={error()}>
        <Alert message={error()} type="error" />
      </Show>

      <Show when={success()}>
        <Alert 
          message="Successfully connected! You can close this window and return to your CLI." 
          type="success" 
        />
        <Button 
          onClick={() => window.location.href = '/workers'}
        >
          Go Back to Workers
        </Button>
      </Show>

      <Show when={status()}>
        <div class="text-center text-sm text-gray-600 py-2">
          {status()}
        </div>
      </Show>

      <Show when={!props.callback || !props.token}>
        <Alert 
          message="Invalid connection request. Missing required parameters." 
          type="error" 
        />
      </Show>

      <Show when={props.callback && props.token}>
        <Button 
          onClick={handleConnect} 
          loading={loading()}
          disabled={success()}
        >
          {success() ? 'Connected' : loading() ? 'Connecting...' : 'Connect'}
        </Button>
      </Show>

      <div class="text-xs text-gray-400 text-center space-y-1">
        <p>Source: {props.source || 'unknown'}</p>
        <p class="break-all">Callback: {props.callback}</p>
      </div>
    </div>
  )
}

