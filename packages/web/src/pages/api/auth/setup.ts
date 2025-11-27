import type { APIRoute } from 'astro'
import { setSessionCookies } from '../../../lib/auth/cookies'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

console.log('API_URL', API_URL);

/**
 * Decode JWT payload without verification (only used to extract sessionId from token we just received)
 */
function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json()

  const response = await fetch(`${API_URL}/api/auth/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const data = await response.json()

  // If setup successful, set cookies
  if (response.ok && data.accessToken && data.refreshToken && data.user) {
    // Extract sessionId from refresh token (decode without verification since we just received it)
    let sessionId = ''
    try {
      const payload = decodeJWTPayload(data.refreshToken)
      sessionId = payload?.sessionId || ''
    } catch {
      // If we can't extract sessionId, use a fallback (shouldn't happen)
      sessionId = crypto.randomUUID()
    }

    setSessionCookies(
      cookies,
      sessionId,
      data.accessToken,
      data.refreshToken,
      data.user.username || data.user.email || ''
    )
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  })
}

