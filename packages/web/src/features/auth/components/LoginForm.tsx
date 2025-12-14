import { createSignal, Show, onMount } from 'solid-js'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import { login, getAuthStatus } from '@/lib/api/auth'
import { setAuthenticated } from '@/lib/stores/auth'
import { checkSession } from '@/lib/auth/session'

interface LoginFormProps {
  redirectUrl?: string
}

export default function LoginForm(props: LoginFormProps) {
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [checking, setChecking] = createSignal(true)

  onMount(async () => {
    // Check if user already has a valid session
    const hasSession = await checkSession()
    if (hasSession) {
      window.location.href = props.redirectUrl || '/workers'
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
      window.location.href = props.redirectUrl || '/workers'
    } else {
      setError(result.error?.message || 'Login failed')
    }

    setLoading(false)
  }

  return (
    <Show when={!checking()} fallback={
      <div class="flex items-center justify-center py-8">
        <svg class="animate-spin h-6 w-6 text-[var(--color-gray-400)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    }>
      <form onSubmit={handleSubmit} class="space-y-6">
        <div class="text-center mb-6">
          <h2 class="text-lg font-semibold text-[var(--color-gray-900)]">Sign In</h2>
          <p class="text-sm text-[var(--color-gray-500)] mt-1">Enter your credentials to continue</p>
        </div>

        <div class="space-y-4">
          <Input
            label="Username"
            type="text"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            required
            autocomplete="username"
            placeholder="admin"
          />

          <Input
            label="Password"
            type="password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
            autocomplete="current-password"
            placeholder="Enter your password"
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
