import type { APIRoute } from 'astro'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

export const GET: APIRoute = async ({ request }) => {
  const response = await fetch(`${API_URL}/api/auth/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  
  const data = await response.json()
  
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  })
}

