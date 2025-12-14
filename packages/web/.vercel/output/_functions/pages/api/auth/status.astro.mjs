export { renderers } from '../../../renderers.mjs';

const API_URL = "http://localhost:8787";
const GET = async ({ request }) => {
  const response = await fetch(`${API_URL}/api/auth/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
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
