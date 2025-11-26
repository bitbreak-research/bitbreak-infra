import { onMount, Show, type JSX } from 'solid-js'
import { useStore } from '@nanostores/solid'
import { $authState, setLoading } from '../../../lib/stores/auth'
import { checkSession } from '../../../lib/auth/session'

interface AuthGuardProps {
  children: JSX.Element
  fallback?: JSX.Element
}

export default function AuthGuard(props: AuthGuardProps) {
  const authState = useStore($authState)

  onMount(async () => {
    // Check if user has a valid session
    const hasSession = await checkSession()

    if (!hasSession) {
      // No valid session, redirect to login
      window.location.href = '/login'
      return
    }

    setLoading(false)
  })

  return (
    <Show
      when={!authState().isLoading && authState().isAuthenticated}
      fallback={props.fallback || <div class="text-center text-gray-500">Loading...</div>}
    >
      {props.children}
    </Show>
  )
}

