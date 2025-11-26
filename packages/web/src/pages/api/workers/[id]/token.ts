import type { APIRoute } from 'astro'
import { getSessionTokenCookie } from '../../../../lib/auth/cookies'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

export const POST: APIRoute = async ({ params, request, cookies }) => {
  // Get token from Authorization header or cookies
  const authHeader = request.headers.get('authorization')
  const sessionToken = getSessionTokenCookie(cookies)
  const token = authHeader?.replace('Bearer ', '') || sessionToken

  if (!token) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const id = params.id

  const response = await fetch(`${API_URL}/api/workers/${id}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  })
}

