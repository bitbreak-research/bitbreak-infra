/**
 * Worker token utilities
 * Handles generation, hashing, and verification of worker tokens
 */

/**
 * Generate a new worker token
 * Format: tk_<64 random base64url characters>
 * Entropy: 384 bits
 */
export function generateWorkerToken(): string {
  // Generate 48 random bytes (384 bits)
  const randomBytes = new Uint8Array(48)
  crypto.getRandomValues(randomBytes)
  
  // Convert to base64url (URL-safe base64)
  const base64url = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  // Take first 64 characters and prefix with tk_
  const token = base64url.substring(0, 64)
  return `tk_${token}`
}

/**
 * Hash a token using SHA-256
 * @param token - Plain text token
 * @returns Promise resolving to hex-encoded hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Verify a token against a stored hash
 * @param token - Plain text token to verify
 * @param hash - Stored hash to compare against
 * @returns Promise resolving to true if token matches hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  const tokenHash = await hashToken(token)
  return tokenHash === hash
}

/**
 * Validate token format
 * @param token - Token to validate
 * @returns True if token has correct format
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token.startsWith('tk_')) {
    return false
  }
  
  const tokenPart = token.substring(3)
  if (tokenPart.length !== 64) {
    return false
  }
  
  // Check if it's valid base64url characters
  const base64urlRegex = /^[A-Za-z0-9_-]+$/
  return base64urlRegex.test(tokenPart)
}

/**
 * Generate a worker ID
 * Format: wrk_<UUID>
 */
export function generateWorkerId(): string {
  return `wrk_${crypto.randomUUID()}`
}

