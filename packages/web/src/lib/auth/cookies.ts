/**
 * Cookie helper functions for authentication
 * All auth cookies are httpOnly (server-only)
 */

const SESSION_ID_COOKIE = 'sessionId'
const SESSION_TOKEN_COOKIE = 'sessionToken'
const REFRESH_TOKEN_COOKIE = 'refreshToken'
const USER_EMAIL_COOKIE = 'userEmail' // Actually stores username, but keeping name consistent with conventions

/**
 * Set session cookies
 * @param cookies - Astro Cookies object
 * @param sessionId - Session identifier
 * @param sessionToken - JWT access token (2h expiry)
 * @param refreshToken - Refresh token (5 days expiry)
 * @param userEmail - User email/username (2h expiry)
 */
export function setSessionCookies(
  cookies: any,
  sessionId: string,
  sessionToken: string,
  refreshToken: string,
  userEmail: string
) {
  const twoHours = 2 * 60 * 60 * 1000
  const fiveDays = 5 * 24 * 60 * 60 * 1000

  // sessionId: 2h
  cookies.set(SESSION_ID_COOKIE, sessionId, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(twoHours / 1000)
  })

  // sessionToken: 2h
  cookies.set(SESSION_TOKEN_COOKIE, sessionToken, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(twoHours / 1000)
  })

  // refreshToken: 5 days
  cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(fiveDays / 1000)
  })

  // userEmail: 2h (stores username)
  cookies.set(USER_EMAIL_COOKIE, userEmail, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(twoHours / 1000)
  })
}

/**
 * Get session token from cookies
 */
export function getSessionTokenCookie(cookies: any): string | null {
  return cookies.get(SESSION_TOKEN_COOKIE)?.value || null
}

/**
 * Get refresh token from cookies
 */
export function getRefreshTokenCookie(cookies: any): string | null {
  return cookies.get(REFRESH_TOKEN_COOKIE)?.value || null
}

/**
 * Get session ID from cookies
 */
export function getSessionIdCookie(cookies: any): string | null {
  return cookies.get(SESSION_ID_COOKIE)?.value || null
}

/**
 * Get user email/username from cookies
 */
export function getUserEmailCookie(cookies: any): string | null {
  return cookies.get(USER_EMAIL_COOKIE)?.value || null
}

/**
 * Clear all session cookies
 */
export function clearSessionCookies(cookies: any) {
  cookies.delete(SESSION_ID_COOKIE, { path: '/' })
  cookies.delete(SESSION_TOKEN_COOKIE, { path: '/' })
  cookies.delete(REFRESH_TOKEN_COOKIE, { path: '/' })
  cookies.delete(USER_EMAIL_COOKIE, { path: '/' })
}

