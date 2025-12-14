import { g as getSessionTokenCookie } from './cookies_DFXvx4rv.mjs';

const API_URL = "http://localhost:8787";
async function checkAuth(cookies) {
  const sessionToken = getSessionTokenCookie(cookies);
  if (!sessionToken) {
    return { isAuthenticated: false };
  }
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      return {
        isAuthenticated: true,
        user: data.user
      };
    }
  } catch (error) {
    console.error("Auth check error:", error);
  }
  return { isAuthenticated: false };
}

export { checkAuth as c };
