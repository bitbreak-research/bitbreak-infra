import { a as getRefreshTokenCookie, c as clearSessionCookies } from '../../../chunks/cookies_DFXvx4rv.mjs';
export { renderers } from '../../../renderers.mjs';

const API_URL = "http://localhost:8787";
const POST = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const refreshToken = body.refreshToken || getRefreshTokenCookie(cookies);
  if (refreshToken) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });
  }
  clearSessionCookies(cookies);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
