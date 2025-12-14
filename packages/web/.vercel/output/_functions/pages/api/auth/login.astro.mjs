import { s as setSessionCookies } from '../../../chunks/cookies_DFXvx4rv.mjs';
export { renderers } from '../../../renderers.mjs';

const API_URL = "http://localhost:8787";
function decodeJWTPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
const POST = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("AUTH_LOGIN_PROXY_NON_JSON_RESPONSE", {
        API_URL,
        status: response.status,
        bodySnippet: text.slice(0, 200)
      });
      data = {
        error: {
          code: "UPSTREAM_NON_JSON",
          message: "Upstream auth service returned non-JSON response",
          status: response.status,
          raw: text
        }
      };
    }
    if (response.ok && data.accessToken && data.refreshToken && data.user) {
      let sessionId = "";
      try {
        const payload = decodeJWTPayload(data.refreshToken);
        sessionId = payload?.sessionId || "";
      } catch {
        sessionId = crypto.randomUUID();
      }
      setSessionCookies(
        cookies,
        sessionId,
        data.accessToken,
        data.refreshToken,
        data.user.username || data.user.email || ""
      );
    }
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("AUTH_LOGIN_PROXY_ERROR", {
      API_URL,
      error: error instanceof Error ? error.message : String(error)
    });
    return new Response(
      JSON.stringify({
        error: {
          code: "PROXY_AUTH_LOGIN_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          apiUrl: API_URL
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
