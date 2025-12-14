import { a as setAuthenticated, c as clearAuth } from './auth_Bu6R9w5K.mjs';

async function checkSession() {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/auth/check", {
      method: "GET",
      credentials: "include"
      // Include cookies
    });
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated && data.user) {
        setAuthenticated(
          data.user,
          null,
          // Access token is in cookies, not in client state
          null
          // Refresh token is in cookies, not in client state
        );
        return true;
      }
    }
    clearAuth();
    return false;
  } catch (error) {
    console.error("Session check error:", error);
    clearAuth();
    return false;
  }
}

export { checkSession as c };
