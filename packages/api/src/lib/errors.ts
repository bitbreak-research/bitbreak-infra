/**
 * Authentication error codes and response helpers
 */

import type { Context } from 'hono'

export const AuthErrorCodes = {
  SETUP_REQUIRED: 'AUTH_001',
  SETUP_DISABLED: 'AUTH_002',
  INVALID_CREDENTIALS: 'AUTH_003',
  TOKEN_EXPIRED: 'AUTH_004',
  TOKEN_INVALID: 'AUTH_005',
  TOKEN_TYPE_INVALID: 'AUTH_006',
  SESSION_REVOKED: 'AUTH_007',
  PASSWORD_MISMATCH: 'AUTH_008',
  PASSWORD_TOO_SHORT: 'AUTH_009',
  USERNAME_INVALID: 'AUTH_010',
  RATE_LIMITED: 'AUTH_011',
  // Worker-specific error codes
  WORKER_NOT_FOUND: 'WORKER_001',
  WORKER_ALREADY_EXISTS: 'WORKER_002',
  WORKER_REVOKED: 'WORKER_003',
  INVALID_WORKER_TOKEN: 'WORKER_004',
  WORKER_TOKEN_EXPIRED: 'WORKER_005',
  TOKEN_MISMATCH: 'WORKER_006',
  ALREADY_CONNECTED: 'WORKER_007',
} as const

export type AuthErrorCode = typeof AuthErrorCodes[keyof typeof AuthErrorCodes]

const ErrorMessages: Record<AuthErrorCode, string> = {
  [AuthErrorCodes.SETUP_REQUIRED]: 'Setup is required, no users exist',
  [AuthErrorCodes.SETUP_DISABLED]: 'Setup is disabled, a user already exists',
  [AuthErrorCodes.INVALID_CREDENTIALS]: 'Invalid credentials',
  [AuthErrorCodes.TOKEN_EXPIRED]: 'Token has expired',
  [AuthErrorCodes.TOKEN_INVALID]: 'Token is invalid',
  [AuthErrorCodes.TOKEN_TYPE_INVALID]: 'Invalid token type for this operation',
  [AuthErrorCodes.SESSION_REVOKED]: 'Session has been revoked',
  [AuthErrorCodes.PASSWORD_MISMATCH]: 'Passwords do not match',
  [AuthErrorCodes.PASSWORD_TOO_SHORT]: 'Password must be at least 8 characters',
  [AuthErrorCodes.USERNAME_INVALID]: 'Username must be 3-50 characters, only a-z, 0-9, _, -',
  [AuthErrorCodes.RATE_LIMITED]: 'Too many attempts, please try again later',
  [AuthErrorCodes.WORKER_NOT_FOUND]: 'Worker not found',
  [AuthErrorCodes.WORKER_ALREADY_EXISTS]: 'Worker with this name already exists',
  [AuthErrorCodes.WORKER_REVOKED]: 'Worker has been revoked',
  [AuthErrorCodes.INVALID_WORKER_TOKEN]: 'Invalid worker token',
  [AuthErrorCodes.WORKER_TOKEN_EXPIRED]: 'Worker token has expired',
  [AuthErrorCodes.TOKEN_MISMATCH]: 'Token does not match worker',
  [AuthErrorCodes.ALREADY_CONNECTED]: 'Worker is already connected from another location',
}

export interface AuthError {
  error: {
    code: AuthErrorCode
    message: string
  }
}

/**
 * Create an error response
 */
export function authError(c: Context, code: AuthErrorCode, status: number = 400) {
  const response: AuthError = {
    error: {
      code,
      message: ErrorMessages[code]
    }
  }
  return c.json(response, status as 400 | 401 | 403 | 404 | 500)
}


