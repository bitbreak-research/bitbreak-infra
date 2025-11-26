import { $authState, setAuthenticated, clearAuth } from '../stores/auth'
import { getMe } from '../api/auth'

const ACCESS_TOKEN_KEY = 'auth_access_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const USER_KEY = 'auth_user'

/**
 * Save auth tokens and user to localStorage
 */
export function saveSession(accessToken: string, refreshToken: string, user: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * Load session from localStorage
 */
export function loadSession() {
  if (typeof window === 'undefined') return null
  
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  const userStr = localStorage.getItem(USER_KEY)
  
  if (accessToken && refreshToken && userStr) {
    try {
      const user = JSON.parse(userStr)
      return { accessToken, refreshToken, user }
    } catch {
      return null
    }
  }
  
  return null
}

/**
 * Clear session from localStorage only (doesn't update store)
 */
export function clearSessionLocalStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * Check if user has a valid session by validating token with backend
 */
export async function checkSession(): Promise<boolean> {
  const session = loadSession()
  
  if (!session) {
    clearAuth()
    return false
  }
  
  // Validate token with backend
  const result = await getMe(session.accessToken)
  
  if (result.success && result.data) {
    // Session is valid, restore auth state
    setAuthenticated(
      result.data.user,
      session.accessToken,
      session.refreshToken
    )
    return true
  } else {
    // Session is invalid, clear it
    clearSessionLocalStorage()
    clearAuth()
    return false
  }
}

/**
 * Check if user is currently authenticated (synchronous check from store)
 */
export function isAuthenticated(): boolean {
  return $authState.get().isAuthenticated && $authState.get().accessToken !== null
}
