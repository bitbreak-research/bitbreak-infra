import { g as getSessionTokenCookie } from '../../../../chunks/cookies_DFXvx4rv.mjs';
export { renderers } from '../../../../renderers.mjs';

const API_URL = "http://localhost:8787";
const GET = async ({ params, request, cookies, url }) => {
  const authHeader = request.headers.get("authorization");
  const sessionToken = getSessionTokenCookie(cookies);
  const token = authHeader?.replace("Bearer ", "") || sessionToken;
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const id = params.id;
  const searchParams = url.searchParams;
  const queryParams = new URLSearchParams();
  if (searchParams.get("from")) queryParams.append("from", searchParams.get("from"));
  if (searchParams.get("to")) queryParams.append("to", searchParams.get("to"));
  if (searchParams.get("limit")) queryParams.append("limit", searchParams.get("limit"));
  const queryString = queryParams.toString();
  const urlPath = `${API_URL}/api/workers/${id}/metrics${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(urlPath, {
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
