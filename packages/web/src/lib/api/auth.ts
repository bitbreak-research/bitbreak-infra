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

export async function refresh() {
  // Refresh token is in cookies, no need to pass it
  return post<RefreshResponse>('/api/auth/refresh', {})
}

export async function logout() {
  // Refresh token is in cookies, no need to pass it
  return post<{ success: boolean }>('/api/auth/logout', {})
}

export async function getMe() {
  // Access token is in cookies, no need to pass it
  return get<MeResponse>('/api/auth/me')
}

