import authFetch from '@/shared/utils/http';

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message || "Request failed", res.status, data);
  }
  return data;
}

export async function apiGet(path) {
  const res = await authFetch(path);
  return parseResponse(res);
}

export async function apiSend(path, options = {}) {
  const res = await authFetch(path, options);
  return parseResponse(res);
}

export { ApiError };
