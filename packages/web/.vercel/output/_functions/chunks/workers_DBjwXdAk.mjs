async function authPost(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      // Include cookies
      body: JSON.stringify(body)
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
async function authGet(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include"
      // Include cookies
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
async function createWorker(name) {
  return authPost("/api/workers", { name });
}
async function getWorker(id) {
  return authGet(`/api/workers/${id}`);
}
async function getWorkerMetrics(id, params) {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.append("from", params.from);
  if (params?.to) queryParams.append("to", params.to);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  const url = `/api/workers/${id}/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  return authGet(url);
}
async function getWorkersStatus() {
  return authGet("/api/workers/status");
}

export { getWorkerMetrics as a, getWorkersStatus as b, createWorker as c, getWorker as g };
