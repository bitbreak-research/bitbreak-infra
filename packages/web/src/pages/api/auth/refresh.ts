import type { APIRoute } from 'astro'
import { getRefreshTokenCookie, getSessionIdCookie, getUserEmailCookie, setSessionCookies } from '../../../lib/auth/cookies'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

export const POST: APIRoute = async ({ request, cookies }) => {
  // Get refresh token from cookies if not in body
  const body = await request.json().catch(() => ({}))
  const refreshToken = body.refreshToken || getRefreshTokenCookie(cookies)
  
  if (!refreshToken) {
    return new Response(JSON.stringify({ error: 'No refresh token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  })
  
  const data = await response.json()
  
  // If refresh successful, update sessionToken cookie
  if (response.ok && data.accessToken) {
    const sessionId = getSessionIdCookie(cookies) || ''
    const existingRefreshToken = refreshToken
    const userEmail = getUserEmailCookie(cookies) || ''
    
    // Update sessionToken cookie with new access token
    setSessionCookies(
      cookies,
      sessionId,
      data.accessToken,
      existingRefreshToken,
      userEmail
    )
  }
  
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  })
}

