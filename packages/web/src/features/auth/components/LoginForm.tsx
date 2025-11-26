import { createSignal, Show, onMount } from 'solid-js'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Alert from '../../../components/ui/Alert'
import { login, getAuthStatus } from '../../../lib/api/auth'
import { setAuthenticated } from '../../../lib/stores/auth'
import { checkSession } from '../../../lib/auth/session'

export default function LoginForm() {
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [checking, setChecking] = createSignal(true)

  onMount(async () => {
    // Check if user already has a valid session
    const hasSession = await checkSession()
    if (hasSession) {
      window.location.href = '/workers'
      return
    }

    // Check if setup is needed
    const result = await getAuthStatus()
    if (result.success && result.data?.needsSetup) {
      window.location.href = '/setup'
      return
    }
    setChecking(false)
  })

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(username(), password())

    if (result.success && result.data) {
      // Cookies are set server-side by the API proxy route
      // Update client state and redirect
      setAuthenticated(
        result.data.user,
        null, // Tokens are in httpOnly cookies
        null
      )
      window.location.href = '/workers'
    } else {
      setError(result.error?.message || 'Login failed')
    }

    setLoading(false)
  }

  return (
    <Show when={!checking()} fallback={<div class="text-center text-gray-500">Loading...</div>}>
      <form onSubmit={handleSubmit} class="space-y-6">
        <div class="space-y-4">
          <Input
            label="Username"
            type="text"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            required
            autocomplete="username"
          />

          <Input
            label="Password"
            type="password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
            autocomplete="current-password"
          />
        </div>

        <Show when={error()}>
          <Alert message={error()} type="error" />
        </Show>

        <Button type="submit" loading={loading()}>
          Sign In
        </Button>
      </form>
    </Show>
  )
}

