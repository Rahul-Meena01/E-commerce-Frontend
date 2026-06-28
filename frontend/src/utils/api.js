/*
 * utils/api.js
 *
 * Central HTTP fetch wrapper for the entire frontend.
 *
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * Every API call in the app goes through this one function so that:
 *   1. Auth token is attached automatically — no copy-paste in every component
 *   2. HTTP errors (4xx / 5xx) are thrown as real JS errors — callers can catch
 *      them instead of silently receiving a JSON error body with status 200
 *   3. Token expiry / invalid token (401) triggers an automatic logout and
 *      redirects the user to /login — no manual handling needed in pages
 *   4. multipart/form-data uploads (Multer — Phase 7) work correctly because
 *      Content-Type is omitted when a FormData body is passed, letting the
 *      browser set the correct boundary automatically
 *   5. All errors expose a clean .message string so UI error states are simple
 *
 * USAGE EXAMPLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   // GET
 *   const data = await API("/api/vendor/my-shop/products");
 *
 *   // POST with JSON body
 *   const data = await API("/api/vendor/my-shop/categories", {
 *     method: "POST",
 *     body: JSON.stringify({ name: "Shirts" }),
 *   });
 *
 *   // PUT
 *   const data = await API(`/api/vendor/my-shop/orders/${id}/status`, {
 *     method: "PUT",
 *     body: JSON.stringify({ status: "shipped" }),
 *   });
 *
 *   // DELETE
 *   await API(`/api/vendor/my-shop/coupons/${id}`, { method: "DELETE" });
 *
 *   // File upload (Multer — Phase 7)
 *   const form = new FormData();
 *   form.append("image", fileInputRef.current.files[0]);
 *   const data = await API("/api/vendor/my-shop/upload", {
 *     method: "POST",
 *     body: form,           // ← FormData: Content-Type is NOT set by this wrapper
 *   });
 *
 *   // Error handling in a component
 *   try {
 *     const data = await API("/api/vendor/my-shop/products");
 *   } catch (err) {
 *     console.error(err.message);   // e.g. "404 — Not Found"
 *     setError(err.message);
 *   }
 *
 * ENVIRONMENT VARIABLE
 * ─────────────────────────────────────────────────────────────────────────────
 *   VITE_API_BASE_URL   — set in .env.local for local dev, .env.production for
 *                         deployment. Falls back to http://localhost:3000 so
 *                         the app works out of the box without any .env setup.
 *
 *   .env.local example:
 *     VITE_API_BASE_URL=http://localhost:3000
 *
 *   .env.production example:
 *     VITE_API_BASE_URL=https://your-backend.onrender.com
 *
 * LOCALSTORAGE KEYS USED
 * ─────────────────────────────────────────────────────────────────────────────
 *   token        — JWT access token, set on login
 *   role         — user role string ("admin" | "vendor" | "user"), set on login
 *   vendorSlug   — vendor slug string, set on vendor login
 *
 * All three are cleared together on 401 so the auth state is never half-cleared.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base URL
// ─────────────────────────────────────────────────────────────────────────────

/*
 * VITE_API_BASE_URL must NOT have a trailing slash.
 * All endpoint paths passed to API() must start with a leading slash, e.g.
 * "/api/vendor/:slug/products", so the concatenation is always correct.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

/*
 * clearAuthAndRedirect
 *
 * Called automatically when the server returns 401 (token expired or invalid).
 * Wipes all auth-related localStorage keys then hard-navigates to /login.
 *
 * Why window.location.href instead of React Router's navigate()?
 * Because this function is called outside of any React component, so the
 * Router context is not available here. A full page reload is fine for a
 * logout — it also clears any in-memory state that may hold stale user data.
 */
function clearAuthAndRedirect() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("vendorSlug");
  window.location.href = "/login";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main API wrapper
// ─────────────────────────────────────────────────────────────────────────────

let refreshPromise = null;

async function getRefreshedToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        
        const refreshData = await refreshRes.json();
        
        if (refreshRes.ok && refreshData.success && refreshData.token) {
          localStorage.setItem("token", refreshData.token);
          return refreshData.token;
        }
        
        throw new Error("Refresh failed");
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/*
 * API(path, options)
 *
 * @param {string} path     — API path starting with "/", e.g. "/api/vendor/:slug/products"
 *                            A full URL (starting with "http") is also accepted and used as-is,
 *                            which keeps the VendorDashboard pattern of passing a full URL working.
 * @param {object} options  — Standard fetch options (method, body, headers, signal, ...)
 *                            Merged on top of the defaults set here.
 * @returns {Promise<any>}  — Parsed JSON response body
 * @throws  {Error}         — Thrown for network failures AND HTTP error status codes (4xx / 5xx)
 *                            The error object always has a .message string safe to show in UI.
 */
const API = async (path, options = {}) => {

  // ── 1. Build the full URL ──────────────────────────────────────────────────
  /*
   * If path is already a full URL (e.g. "http://localhost:3000/api/...") use it
   * as-is. Otherwise, prepend BASE_URL. This keeps both call styles working:
   *
   *   API("/api/vendor/:slug/products")              ← preferred going forward
   *   API(`${BASE}/api/vendor/:slug/products`)       ← existing style in VendorDashboard
   */
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  // ── 2. Read token from localStorage ───────────────────────────────────────
  const token = localStorage.getItem("token");

  // ── 3. Build headers ──────────────────────────────────────────────────────
  /*
   * Content-Type logic:
   *   - If the body is a FormData instance → do NOT set Content-Type.
   *     The browser must set it automatically with the correct multipart boundary.
   *     Setting it manually breaks Multer file uploads (Phase 7).
   *   - For everything else (JSON, no body) → set "application/json".
   *
   * Authorization:
   *   - Only added when a token exists in localStorage.
   *   - Spread after defaultHeaders so caller-provided headers can override if needed.
   */
  const isFormData = options.body instanceof FormData;

  const defaultHeaders = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // ── 4. Fire the request (with retry logic for 401) ────────────────────────
  let res;
  let isRetry = false;
  
  const performRequest = async (overrideToken) => {
    const activeToken = overrideToken || token;
    const reqHeaders = {
      ...defaultHeaders,
      ...options.headers,
    };
    if (overrideToken) {
      reqHeaders.Authorization = `Bearer ${overrideToken}`;
    }
    
    return fetch(url, {
      ...options,
      headers: reqHeaders,
    });
  };

  try {
    res = await performRequest();
  } catch (networkError) {
    /*
     * fetch() itself only throws on true network failures:
     *   - No internet connection
     *   - CORS preflight blocked
     *   - DNS resolution failure
     *   - Server completely unreachable
     *
     * HTTP error codes (404, 500, etc.) do NOT land here — they come through
     * as a resolved Response with res.ok === false. Those are handled below.
     */
    throw new Error(
      "Network error — could not reach the server. Check your connection."
    );
  }

  // ── 5. Handle 401 Unauthorized — auto-logout ──────────────────────────────
  /*
   * 401 means the JWT is missing, expired, or tampered with.
   * The backend's protect middleware returns 401 in all three cases.
   * We clear auth state and redirect to login immediately.
   * No point trying to parse the response body — the session is over.
   */
  if (res.status === 401 && !url.includes("/api/auth/login") && !url.includes("/api/auth/refresh")) {
    if (isRetry) {
      clearAuthAndRedirect();
      throw new Error("Session expired. Please log in again.");
    }
    
    try {
      const newToken = await getRefreshedToken();
      isRetry = true;
      res = await performRequest(newToken);
      
      // If the retry ALSO fails with 401, we fail out
      if (res.status === 401) {
        clearAuthAndRedirect();
        throw new Error("Session expired. Please log in again.");
      }
    } catch (e) {
      clearAuthAndRedirect();
      throw new Error("Session expired. Please log in again.");
    }
  }

  // ── 5b. Handle 429 Rate Limiting ──────────────────────────────────────────
  if (res.status === 429) {
    const err = new Error("429 — Too many requests. Please try again later.");
    err.status = 429;
    throw err;
  }

  // ── 6. Parse response body ────────────────────────────────────────────────
  /*
   * Attempt JSON parse for all responses (including errors).
   * The backend always returns JSON, even for errors:
   *   { message: "Not found" }  or  { error: "Validation failed", details: [...] }
   *
   * If the body is empty (e.g. 204 No Content on DELETE) JSON.parse will throw.
   * We catch that and fall back to null so DELETE calls don't crash.
   */
  let data = null;
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      /*
       * Malformed JSON in the response — treat as a server error.
       * This should never happen with a well-behaved Express backend but
       * can occur if a proxy or CDN injects an HTML error page.
       */
      throw new Error(`${res.status} — Malformed response from server`);
    }
  }
  // Non-JSON responses (plain text, empty 204) → data stays null

  // ── 7. Throw on HTTP error status codes ───────────────────────────────────
  /*
   * fetch() considers ANY completed HTTP response a "success" at the network
   * level — res.ok is false for 4xx and 5xx but fetch does not throw.
   * We throw here so every caller can use try/catch uniformly instead of
   * having to check res.ok manually after every API call.
   *
   * Error message priority:
   *   1. data.message — backend's explicit error string (most useful for UI)
   *   2. data.error   — some controllers use this key instead
   *   3. res.statusText — HTTP standard reason phrase (e.g. "Not Found")
   *   4. Generic fallback
   */
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      res.statusText ||
      `Request failed with status ${res.status}`;

    const err = new Error(`${res.status} — ${message}`);
    /*
     * Attach the status code and full response data to the error object
     * so components that need to branch on specific codes (e.g. 403 vs 404)
     * can do so without parsing the message string:
     *
     *   catch (err) {
     *     if (err.status === 403) showPendingApprovalMessage();
     *   }
     */
    err.status = res.status;
    err.data   = data;
    throw err;
  }

  // ── 8. Return parsed data ─────────────────────────────────────────────────
  return data;
};

export default API;

// /*
  // * Handover note: Small fetch wrapper.
  // * Adds JSON headers by default and centralizes response parsing/errors for screens that choose to use it.
  // */
  // const API = async (url, options = {}) => {
  //   const token = localStorage.getItem("token");

  //   const defaultHeaders = {
  //     "Content-Type": "application/json",
  //     ...(token && { Authorization: `Bearer ${token}` }),
  //   };

  //   const res = await fetch(url, {
  //     ...options,
  //     headers: {
  //       ...defaultHeaders,
  //       ...options.headers,
  //     },
  //   });

  //   return res.json();
  // };

  // export default API;
