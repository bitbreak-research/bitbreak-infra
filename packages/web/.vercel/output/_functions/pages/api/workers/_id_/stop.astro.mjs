export { renderers } from '../../../../renderers.mjs';

const POST = async ({ params, request, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: "Worker ID is required" }
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const apiUrl = "http://localhost:8787";
  const sessionToken = cookies.get("sessionToken")?.value;
  if (!sessionToken) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: "Not authenticated" }
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const response = await fetch(`${apiUrl}/api/workers/${id}/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
        "cf-connecting-ip": request.headers.get("cf-connecting-ip") || "",
        "x-forwarded-for": request.headers.get("x-forwarded-for") || ""
      }
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: { message: "Failed to connect to API" }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
