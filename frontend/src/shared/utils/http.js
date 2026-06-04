import { buildApiUrl } from "./api";
import { getAuthToken, clearAuthSession } from "./authStorage";

let onUnauthorized = null;

export function setUnauthorizedCallback(callback) {
  onUnauthorized = callback;
}

export async function authFetch(path, options = {}) {
  const url = buildApiUrl(path);
  const token = getAuthToken();

  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fetchOptions = {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
    credentials: options.credentials || "include",
  };

  const res = await fetch(url, fetchOptions);

  if (res.status === 401) {
    try {
      clearAuthSession();
      if (onUnauthorized) {
        onUnauthorized();
      }
    } catch (err) {
      void err;
    }
  }

  return res;
}

export default authFetch;
