export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export async function get<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN', message: 'An error occurred' }
      }
    }
    
    return { success: true, data }
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Network error' }
    }
  }
}

export async function post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN', message: 'An error occurred' }
      }
    }
    
    return { success: true, data }
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Network error' }
    }
  }
}

export async function authGet<T>(url: string, token: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'UNKNOWN', message: 'An error occurred' }
      }
    }
    
    return { success: true, data }
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Network error' }
    }
  }
}

