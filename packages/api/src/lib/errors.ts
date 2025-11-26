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


