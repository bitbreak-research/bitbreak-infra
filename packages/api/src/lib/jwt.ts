/**
 * JWT utilities using Hono's built-in JWT helper
 * https://hono.dev/docs/helpers/jwt
 */

import { sign, verify } from 'hono/jwt'
import type { JWTPayload } from 'hono/utils/jwt/types'

export interface AccessTokenPayload extends JWTPayload {
  sub: string
  username: string
  type: 'access'
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string
  sessionId: string
  type: 'refresh'
}

const ACCESS_TOKEN_EXPIRY = 900 // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 604800 // 7 days in seconds

/**
 * Generate an access token for a user
 */
export async function generateAccessToken(
  user: { id: string; username: string },
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  const payload: AccessTokenPayload = {
    sub: user.id,
    username: user.username,
    type: 'access',
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY
  }
  
  return sign(payload, secret)
}

/**
 * Generate a refresh token for a session
 */
export async function generateRefreshToken(
  userId: string,
  sessionId: string,
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  const payload: RefreshTokenPayload = {
    sub: userId,
    sessionId: sessionId,
    type: 'refresh',
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY
  }
  
  return sign(payload, secret)
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<AccessTokenPayload> {
  const payload = await verify(token, secret) as AccessTokenPayload
  
  if (payload.type !== 'access') {
    throw new Error('Invalid token type')
  }
  
  return payload
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<RefreshTokenPayload> {
  const payload = await verify(token, secret) as RefreshTokenPayload
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type')
  }
  
  return payload
}

export { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY }

