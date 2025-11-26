import type { APIRoute } from 'astro'
import { clearSessionCookies, getRefreshTokenCookie } from '../../../lib/auth/cookies'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

export const POST: APIRoute = async ({ request, cookies }) => {
  // Get refresh token from cookies if not in body
  const body = await request.json().catch(() => ({}))
  const refreshToken = body.refreshToken || getRefreshTokenCookie(cookies)
  
  if (refreshToken) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    })
  }
  
  // Always clear cookies, even if API call fails
  clearSessionCookies(cookies)
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

