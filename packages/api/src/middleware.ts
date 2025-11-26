import { Hono } from 'hono'
import { verifyAccessToken } from './lib/jwt'
import { AuthErrorCodes, authError } from './lib/errors'

type Bindings = {
  bb: D1Database
  JWT_SECRET: string
}

type Variables = {
  user: { sub: string; username: string }
}

const middleware = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/status',
  '/api/auth/setup',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/user',
  '/ws' // WebSocket endpoint (handles its own auth)
]

middleware.use(async (c, next) => {
  const path = c.req.path

  // Skip auth for public routes
  if (PUBLIC_ROUTES.some(route => path === route || path.startsWith(route + '/'))) {
    return next()
  }

  // Check for Authorization header
  const authHeader = c.req.header('authorization')

  if (!authHeader) {
    return authError(c, AuthErrorCodes.TOKEN_INVALID, 401)
  }

  // Check for Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    return authError(c, AuthErrorCodes.TOKEN_INVALID, 401)
  }

  const token = authHeader.slice(7)

  try {
    // Verify the access token
    const payload = await verifyAccessToken(token, c.env.JWT_SECRET)

    // Attach user to context
    c.set('user', {
      sub: payload.sub,
      username: payload.username
    })

    return next()
  } catch (error) {
    // Check if token is expired
    if (error instanceof Error && error.message.includes('expired')) {
      return authError(c, AuthErrorCodes.TOKEN_EXPIRED, 401)
    }

    return authError(c, AuthErrorCodes.TOKEN_INVALID, 401)
  }
})

export default middleware
