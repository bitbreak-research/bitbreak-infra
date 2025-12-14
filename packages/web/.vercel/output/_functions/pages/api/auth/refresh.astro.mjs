import { a as getRefreshTokenCookie, b as getSessionIdCookie, d as getUserEmailCookie, s as setSessionCookies } from '../../../chunks/cookies_DFXvx4rv.mjs';
export { renderers } from '../../../renderers.mjs';

const API_URL = "http://localhost:8787";
const POST = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const refreshToken = body.refreshToken || getRefreshTokenCookie(cookies);
  if (!refreshToken) {
    return new Response(JSON.stringify({ error: "No refresh token provided" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });
  const data = await response.json();
  if (response.ok && data.accessToken) {
    const sessionId = getSessionIdCookie(cookies) || "";
    const existingRefreshToken = refreshToken;
    const userEmail = getUserEmailCookie(cookies) || "";
    setSessionCookies(
      cookies,
      sessionId,
      data.accessToken,
      existingRefreshToken,
      userEmail
    );
  }
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
