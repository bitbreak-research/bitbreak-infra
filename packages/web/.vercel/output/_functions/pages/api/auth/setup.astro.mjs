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
  const body = await request.json();
  const response = await fetch(`${API_URL}/api/auth/setup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
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
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
