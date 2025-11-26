import { $authState, setAuthenticated, clearAuth } from '../stores/auth'

/**
 * Check if user has a valid session by checking cookies via API
 * Cookies are httpOnly, so we validate via /api/auth/check endpoint
 */
export async function checkSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include' // Include cookies
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.authenticated && data.user) {
        // Session is valid, update auth state
        // Note: We don't have access to tokens (they're in httpOnly cookies)
        // The store will be updated when we make authenticated API calls
        setAuthenticated(
          data.user,
          null, // Access token is in cookies, not in client state
          null  // Refresh token is in cookies, not in client state
        )
        return true
      }
    }
    
    // Session is invalid
    clearAuth()
    return false
  } catch (error) {
    console.error('Session check error:', error)
    clearAuth()
    return false
  }
}

/**
 * Check if user is currently authenticated (synchronous check from store)
 */
export function isAuthenticated(): boolean {
  return $authState.get().isAuthenticated
}
