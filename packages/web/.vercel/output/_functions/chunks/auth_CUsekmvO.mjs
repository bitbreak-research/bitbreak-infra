async function get(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: "UNKNOWN", message: "An error occurred" }
      };
    }
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: { code: "NETWORK", message: "Network error" }
    };
  }
}

async function getAuthStatus() {
  return get("/api/auth/status");
}

export { getAuthStatus as g };
