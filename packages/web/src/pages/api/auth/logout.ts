import type { APIRoute } from 'astro'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  
  const data = await response.json()
  
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  })
}

