import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, verifyPassword } from '../lib/password'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRY
} from '../lib/jwt'
import {
  AuthErrorCodes,
  authError,
  type AuthErrorCode
} from '../lib/errors'

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
}

type Variables = {
  user: { sub: string; username: string }
}

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Custom validator that transforms Zod errors to our format
function authValidator<T extends z.ZodTypeAny>(target: 'json' | 'query' | 'form', schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.issues[0]
      const errorCode = firstError.message as AuthErrorCode

      // Check if it's one of our auth error codes
      if (Object.values(AuthErrorCodes).includes(errorCode)) {
        return authError(c, errorCode, 400)
      }

      // Fallback: try to map common Zod errors to our codes
      const path = firstError.path.join('.')
      if (path.includes('username')) {
        return authError(c, AuthErrorCodes.USERNAME_INVALID, 400)
      }
      if (path.includes('password') && !path.includes('confirmPassword')) {
        return authError(c, AuthErrorCodes.PASSWORD_TOO_SHORT, 400)
      }
      if (path.includes('confirmPassword')) {
        return authError(c, AuthErrorCodes.PASSWORD_MISMATCH, 400)
      }

      // Default fallback
      return authError(c, AuthErrorCodes.USERNAME_INVALID, 400)
    }
  })
}


// Schemas
const setupSchema = z.object({
  username: z.string()
    .min(3, { message: AuthErrorCodes.USERNAME_INVALID })
    .max(50, { message: AuthErrorCodes.USERNAME_INVALID })
    .regex(/^[a-z0-9_-]+$/i, { message: AuthErrorCodes.USERNAME_INVALID }),
  password: z.string()
    .min(8, { message: AuthErrorCodes.PASSWORD_TOO_SHORT })
    .max(128, { message: AuthErrorCodes.PASSWORD_TOO_SHORT }),
  confirmPassword: z.string().min(1)
}).refine((data) => data.password === data.confirmPassword, {
  message: AuthErrorCodes.PASSWORD_MISMATCH,
  path: ['confirmPassword']
})

const loginSchema = z.object({
  username: z.string()
    .min(3, { message: AuthErrorCodes.USERNAME_INVALID })
    .max(50, { message: AuthErrorCodes.USERNAME_INVALID })
    .regex(/^[a-z0-9_-]+$/i, { message: AuthErrorCodes.USERNAME_INVALID }),
  password: z.string()
    .min(8, { message: AuthErrorCodes.PASSWORD_TOO_SHORT })
    .max(128, { message: AuthErrorCodes.PASSWORD_TOO_SHORT })
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
})

const logoutSchema = z.object({
  refreshToken: z.string().min(1)
})

/**
 * GET /api/auth/status
 * Check if initial setup is needed
 */
auth.get('/status', async (c) => {
  const result = await c.env.bb.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
  const needsSetup = !result || result.count === 0

  return c.json({
    needsSetup,
    version: '1.0.0'
  })
})

/**
 * POST /api/auth/setup
 * Create the first user (only works when no users exist)
 */
auth.post('/setup', authValidator('json', setupSchema), async (c) => {
  const { username, password, confirmPassword } = c.req.valid('json')

  // Check if users already exist
  const userCount = await c.env.bb.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
  if (userCount && userCount.count > 0) {
    return authError(c, AuthErrorCodes.SETUP_DISABLED, 400)
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password)
  const userId = crypto.randomUUID()
  const normalizedUsername = username.toLowerCase()

  await c.env.bb.prepare(
    'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)'
  ).bind(userId, normalizedUsername, passwordHash).run()

  // Create session
  const sessionId = crypto.randomUUID()
  const refreshToken = await generateRefreshToken(userId, sessionId, c.env.JWT_SECRET)
  const refreshTokenHash = await hashPassword(refreshToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await c.env.bb.prepare(
    'INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, userId, refreshTokenHash, expiresAt).run()

  // Generate access token
  const accessToken = await generateAccessToken(
    { id: userId, username: normalizedUsername },
    c.env.JWT_SECRET
  )

  return c.json({
    user: {
      id: userId,
      username: normalizedUsername
    },
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY
  }, 201)
})

/**
 * POST /api/auth/login
 * Authenticate an existing user
 */
auth.post('/login', authValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json')
  const normalizedUsername = username.toLowerCase()

  // Find user
  const user = await c.env.bb.prepare(
    'SELECT id, username, password_hash FROM users WHERE username = ?'
  ).bind(normalizedUsername).first<{ id: string; username: string; password_hash: string }>()

  if (!user) {
    return authError(c, AuthErrorCodes.INVALID_CREDENTIALS, 401)
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) {
    return authError(c, AuthErrorCodes.INVALID_CREDENTIALS, 401)
  }

  // Create session
  const sessionId = crypto.randomUUID()
  const refreshToken = await generateRefreshToken(user.id, sessionId, c.env.JWT_SECRET)
  const refreshTokenHash = await hashPassword(refreshToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const userAgent = c.req.header('user-agent') || null
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null

  await c.env.bb.prepare(
    'INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(sessionId, user.id, refreshTokenHash, expiresAt, userAgent, ipAddress).run()

  // Generate access token
  const accessToken = await generateAccessToken(
    { id: user.id, username: user.username },
    c.env.JWT_SECRET
  )

  return c.json({
    user: {
      id: user.id,
      username: user.username
    },
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY
  })
})

/**
 * POST /api/auth/refresh
 * Get a new access token using a refresh token
 */
auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')

  try {
    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken, c.env.JWT_SECRET)

    // Check if session exists and is not expired
    const session = await c.env.bb.prepare(
      'SELECT id, user_id, expires_at FROM sessions WHERE id = ?'
    ).bind(payload.sessionId).first<{ id: string; user_id: string; expires_at: string }>()

    if (!session) {
      return authError(c, AuthErrorCodes.SESSION_REVOKED, 401)
    }

    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await c.env.bb.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run()
      return authError(c, AuthErrorCodes.TOKEN_EXPIRED, 401)
    }

    // Get user
    const user = await c.env.bb.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(session.user_id).first<{ id: string; username: string }>()

    if (!user) {
      return authError(c, AuthErrorCodes.SESSION_REVOKED, 401)
    }

    // Update last_used_at
    await c.env.bb.prepare(
      "UPDATE sessions SET last_used_at = datetime('now') WHERE id = ?"
    ).bind(session.id).run()

    // Generate new access token
    const accessToken = await generateAccessToken(
      { id: user.id, username: user.username },
      c.env.JWT_SECRET
    )

    return c.json({
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRY
    })
  } catch {
    return authError(c, AuthErrorCodes.TOKEN_INVALID, 401)
  }
})

/**
 * POST /api/auth/logout
 * Invalidate the current session
 */
auth.post('/logout', zValidator('json', logoutSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')

  try {
    const payload = await verifyRefreshToken(refreshToken, c.env.JWT_SECRET)

    // Delete the session
    await c.env.bb.prepare('DELETE FROM sessions WHERE id = ?').bind(payload.sessionId).run()

    return c.json({ success: true })
  } catch {
    // Even if token is invalid, return success (idempotent)
    return c.json({ success: true })
  }
})

/**
 * GET /api/auth/me
 * Get the current authenticated user's info
 */
auth.get('/me', async (c) => {
  const user = c.get('user')

  if (!user) {
    return authError(c, AuthErrorCodes.TOKEN_INVALID, 401)
  }

  // Get full user info from database
  const dbUser = await c.env.bb.prepare(
    'SELECT id, username, created_at FROM users WHERE id = ?'
  ).bind(user.sub).first<{ id: string; username: string; created_at: string }>()

  if (!dbUser) {
    return authError(c, AuthErrorCodes.TOKEN_INVALID, 401)
  }

  return c.json({
    user: {
      id: dbUser.id,
      username: dbUser.username,
      createdAt: dbUser.created_at
    }
  })
})

export default auth

