import { atom } from 'nanostores'
import type { User } from '../api/auth'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  // Tokens are stored in httpOnly cookies, not in client state
  // These fields are kept for backward compatibility but may be null
  accessToken: string | null
  refreshToken: string | null
}

export const $authState = atom<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null
})

/**
 * Set authenticated state
 * Tokens are stored in httpOnly cookies, so we only store user info in client state
 */
export function setAuthenticated(user: User, accessToken: string | null, refreshToken: string | null) {
  $authState.set({
    isAuthenticated: true,
    isLoading: false,
    user,
    accessToken: accessToken || null, // May be null since tokens are in cookies
    refreshToken: refreshToken || null // May be null since tokens are in cookies
  })
}

export function setLoading(isLoading: boolean) {
  $authState.set({
    ...$authState.get(),
    isLoading
  })
}

export function clearAuth() {
  $authState.set({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    accessToken: null,
    refreshToken: null
  })
  
  // Note: Cookies are cleared server-side via /api/auth/logout
  // Client-side localStorage cleanup is not needed
}

export function updateAccessToken(accessToken: string) {
  $authState.set({
    ...$authState.get(),
    accessToken
  })
  // Note: The actual token in cookies is updated server-side on refresh
}
