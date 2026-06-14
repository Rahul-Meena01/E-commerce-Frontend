import api from "../../services/client";

let onUnauthorized = null;

export function setUnauthorizedCallback(callback) {
  onUnauthorized = callback;
  
  // Also attach it to the window event we dispatch from client.js
  window.addEventListener("auth:unauthorized", () => {
    if (onUnauthorized) onUnauthorized();
  });
}

export async function authFetch(path, options = {}) {
  const method = (options.method || "GET").toLowerCase();
  const url = path.startsWith("/api/") && api.defaults.baseURL?.endsWith("/api")
    ? path.replace(/^\/api/, "")
    : path;
  
  const axiosOptions = {
    method,
    url,
    headers: options.headers || {},
  };

  if (options.body) {
    axiosOptions.data = options.body;
  }
  
  // Set credentials to true since we might be relying on cookies or the interceptor
  axiosOptions.withCredentials = options.credentials !== 'omit';

  try {
    const res = await api(axiosOptions);
    
    // Simulate fetch response object for compatibility with existing code
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json: async () => res.data,
      text: async () => JSON.stringify(res.data),
      headers: {
        get: (name) => {
          if (!res.headers) return null;
          return res.headers[name.toLowerCase()] || null;
        }
      }
    };
  } catch (err) {
    if (err.response) {
      return {
        ok: false,
        status: err.response.status,
        json: async () => err.response.data,
        text: async () => JSON.stringify(err.response.data),
        headers: {
          get: (name) => {
            if (!err.response.headers) return null;
            return err.response.headers[name.toLowerCase()] || null;
          }
        }
      };
    }
    throw err;
  }
}

export default authFetch;
