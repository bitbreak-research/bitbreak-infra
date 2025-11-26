import { createSignal, Show, onMount } from 'solid-js'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Alert from '../../../components/ui/Alert'
import { setup, getAuthStatus } from '../../../lib/api/auth'
import { setAuthenticated } from '../../../lib/stores/auth'
import { checkSession } from '../../../lib/auth/session'

export default function SetupForm() {
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [checking, setChecking] = createSignal(true)

  onMount(async () => {
    // Check if user already has a valid session
    const hasSession = await checkSession()
    if (hasSession) {
      window.location.href = '/'
      return
    }

    // Check if setup is still needed
    const result = await getAuthStatus()
    if (result.success && !result.data?.needsSetup) {
      window.location.href = '/login'
      return
    }
    setChecking(false)
  })

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (password() !== confirmPassword()) {
      setError('Passwords do not match')
      return
    }

    if (password().length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const result = await setup(username(), password(), confirmPassword())

    if (result.success && result.data) {
      setAuthenticated(
        result.data.user,
        result.data.accessToken,
        result.data.refreshToken
      )
      window.location.href = '/'
    } else {
      setError(result.error?.message || 'Setup failed')
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
            autocomplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword()}
            onInput={(e) => setConfirmPassword(e.currentTarget.value)}
            required
            autocomplete="new-password"
          />
        </div>

        <Show when={error()}>
          <Alert message={error()} type="error" />
        </Show>

        <Button type="submit" loading={loading()}>
          Create Account
        </Button>
      </form>
    </Show>
  )
}

