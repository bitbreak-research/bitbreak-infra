import type { APIRoute } from 'astro'
import { getSessionTokenCookie } from '@/lib/auth/cookies'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

export const GET: APIRoute = async ({ params, request, cookies, url }) => {
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
  const searchParams = url.searchParams

  // Build query string
  const queryParams = new URLSearchParams()
  if (searchParams.get('from')) queryParams.append('from', searchParams.get('from')!)
  if (searchParams.get('to')) queryParams.append('to', searchParams.get('to')!)
  if (searchParams.get('limit')) queryParams.append('limit', searchParams.get('limit')!)

  const queryString = queryParams.toString()
  const urlPath = `${API_URL}/api/workers/${id}/metrics${queryString ? `?${queryString}` : ''}`

  const response = await fetch(urlPath, {
    method: 'GET',
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

