import { atom } from 'nanostores'
import type { User } from '../api/auth'
import { saveSession, clearSessionLocalStorage } from '../auth/session'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
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

export function setAuthenticated(user: User, accessToken: string, refreshToken: string) {
  $authState.set({
    isAuthenticated: true,
    isLoading: false,
    user,
    accessToken,
    refreshToken
  })

  // Save to localStorage
  saveSession(accessToken, refreshToken, user)
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

  // Clear localStorage
  clearSessionLocalStorage()
}

export function updateAccessToken(accessToken: string) {
  $authState.set({
    ...$authState.get(),
    accessToken
  })
}
