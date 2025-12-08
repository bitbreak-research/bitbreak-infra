import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params

  if (!id) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Worker ID is required' }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get API URL from environment
  const apiUrl = import.meta.env.API_URL

  // Get session token from cookies for authentication
  const sessionToken = cookies.get('sessionToken')?.value

  if (!sessionToken) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Not authenticated' }
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const response = await fetch(`${apiUrl}/api/workers/${id}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        'cf-connecting-ip': request.headers.get('cf-connecting-ip') || '',
        'x-forwarded-for': request.headers.get('x-forwarded-for') || ''
      }
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to connect to API' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

