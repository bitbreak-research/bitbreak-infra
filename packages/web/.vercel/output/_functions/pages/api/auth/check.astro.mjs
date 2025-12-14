import { g as getSessionTokenCookie } from '../../../chunks/cookies_DFXvx4rv.mjs';
export { renderers } from '../../../renderers.mjs';

const API_URL = "http://localhost:8787";
const GET = async ({ cookies }) => {
  const sessionToken = getSessionTokenCookie(cookies);
  if (!sessionToken) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sessionToken}`
    }
  });
  if (response.ok) {
    const data = await response.json();
    return new Response(JSON.stringify({ authenticated: true, user: data.user }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ authenticated: false }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
