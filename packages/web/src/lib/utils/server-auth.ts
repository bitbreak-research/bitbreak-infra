import type { AstroCookies } from 'astro'
import { getSessionTokenCookie } from '../../lib/auth/cookies'

const API_URL = import.meta.env.API_URL || 'http://localhost:8787'

export interface AuthCheckResult {
  isAuthenticated: boolean
  user?: {
    id: string
    username: string
    createdAt?: string
  }
}

/**
 * Check authentication status server-side
 * Use this in Astro pages to verify authentication
 */
export async function checkAuth(cookies: AstroCookies): Promise<AuthCheckResult> {
  const sessionToken = getSessionTokenCookie(cookies)
  
  if (!sessionToken) {
    return { isAuthenticated: false }
  }
  
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return {
        isAuthenticated: true,
        user: data.user
      }
    }
  } catch (error) {
    console.error('Auth check error:', error)
  }
  
  return { isAuthenticated: false }
}

