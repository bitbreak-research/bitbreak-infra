import { get, post, authGet } from './client'

export interface AuthStatus {
  needsSetup: boolean
  version: string
}

export interface User {
  id: string
  username: string
  createdAt?: string
}

export interface AuthTokens {
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface RefreshResponse {
  accessToken: string
  expiresIn: number
}

export interface MeResponse {
  user: User
}

export async function getAuthStatus() {
  return get<AuthStatus>('/api/auth/status')
}

export async function setup(username: string, password: string, confirmPassword: string) {
  return post<AuthTokens>('/api/auth/setup', {
    username,
    password,
    confirmPassword
  })
}

export async function login(username: string, password: string) {
  return post<AuthTokens>('/api/auth/login', {
    username,
    password
  })
}

export async function refresh(refreshToken: string) {
  return post<RefreshResponse>('/api/auth/refresh', {
    refreshToken
  })
}

export async function logout(refreshToken: string) {
  return post<{ success: boolean }>('/api/auth/logout', {
    refreshToken
  })
}

export async function getMe(accessToken: string) {
  return authGet<MeResponse>('/api/auth/me', accessToken)
}

