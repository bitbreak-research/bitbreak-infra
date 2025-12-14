import { g as getSessionTokenCookie } from '../../../chunks/cookies_DFXvx4rv.mjs';
export { renderers } from '../../../renderers.mjs';

const API_URL = "http://localhost:8787";
const GET = async ({ request, cookies }) => {
  const authHeader = request.headers.get("authorization");
  const sessionToken = getSessionTokenCookie(cookies);
  const token = authHeader?.replace("Bearer ", "") || sessionToken;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const response = await fetch(`${API_URL}/api/dashboard/stats`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
