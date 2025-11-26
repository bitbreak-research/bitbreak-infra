import { onMount } from 'solid-js'
import { checkSession } from '../lib/auth/session'

/**
 * Component that checks session on mount and redirects to login if not authenticated
 * Use this on protected pages
 */
export default function SessionChecker() {
  onMount(async () => {
    const hasSession = await checkSession()
    if (!hasSession) {
      window.location.href = '/login'
    }
  })

  return null
}

