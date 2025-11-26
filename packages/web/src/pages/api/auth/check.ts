import type { APIRoute } from 'astro'
import { getSessionTokenCookie } from '../../../lib/auth/cookies'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

/**
 * GET /api/auth/check
 * Check if user is authenticated by validating session token
 */
export const GET: APIRoute = async ({ cookies }) => {
  const sessionToken = getSessionTokenCookie(cookies)
  
  if (!sessionToken) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Validate token with backend
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    }
  })
  
  if (response.ok) {
    const data = await response.json()
    return new Response(JSON.stringify({ authenticated: true, user: data.user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({ authenticated: false }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}

