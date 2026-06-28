// ─── orderService.js ──────────────────────────────────────────────────────────
// Centralised API layer for all order-related calls.
// Every function returns { data, error } — callers never need try/catch.
//
// Base URL is read from Vite / CRA env vars. Set it in your .env:
//   VITE_API_BASE_URL=http://localhost:3000        (Vite)
//   REACT_APP_API_BASE_URL=http://localhost:3000   (CRA)
// ─────────────────────────────────────────────────────────────────────────────

// Vite exposes env vars via import.meta.env (never process.env — that's Node-only
// and throws a ReferenceError in the browser).
// Set VITE_API_BASE_URL in your .env file:  VITE_API_BASE_URL=http://localhost:3000
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// ── Auth token ────────────────────────────────────────────────────────────────
// Reads the JWT that your auth flow stored (adjust key name if needed)
const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("userToken") ||
  sessionStorage.getItem("token") ||
  "";

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    // Parse body — even error responses usually contain { message }
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        data: null,
        error: data?.message || `Request failed (${res.status})`,
        status: res.status,
      };
    }

    return { data, error: null, status: res.status };
  } catch (err) {
    // Network / CORS failure
    return {
      data: null,
      error: err?.message || "Network error — check your connection",
      status: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/orders  (admin)
 * Fetches paginated list of all orders.
 * Supports optional ?status=Shipped&pageNumber=2
 *
 * @param {{ pageNumber?: number, status?: string }} params
 * @returns {{ data: { orders, page, pages, totalOrders } | null, error: string | null }}
 */
export async function fetchAllOrders({ pageNumber = 1, status = "" } = {}) {
  const qs = new URLSearchParams({ pageNumber });
  if (status) qs.set("status", status);
  return apiFetch(`/api/orders?${qs}`);
}

/**
 * GET /api/orders/myorders  (logged-in user)
 * Fetches paginated orders for the current user.
 *
 * @param {{ pageNumber?: number }} params
 * @returns {{ data: { orders, page, pages, totalOrders } | null, error: string | null }}
 */
export async function fetchMyOrders({ pageNumber = 1 } = {}) {
  return apiFetch(`/api/orders/myorders?pageNumber=${pageNumber}`);
}

/**
 * GET /api/orders/:id
 * Fetches a single order by its MongoDB ObjectId.
 *
 * @param {string} id  — MongoDB ObjectId
 */
export async function fetchOrderById(id) {
  return apiFetch(`/api/orders/${id}`);
}

/**
 * POST /api/orders
 * Creates a new order.
 *
 * @param {{ orderItems, shippingAddress, paymentMethod }} payload
 */
export async function createOrder(payload) {
  return apiFetch("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * PUT /api/orders/:id/status  (admin)
 * Updates the fulfillment status of an order.
 * Valid statuses: Pending | Processing | Shipped | Delivered | Cancelled
 *
 * @param {string} id
 * @param {string} status
 * @param {string} [note]  — optional cancellation reason
 */
export async function updateOrderStatus(id, status, note = "") {
  return apiFetch(`/api/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, note }),
  });
}


/**
 * PUT /api/orders/:id/cancel
 * Lets the order owner cancel a Pending/Processing order.
 *
 * @param {string} id
 * @param {string} [note]  — cancellation reason
 */
export async function cancelOrder(id, note = "") {
  return apiFetch(`/api/orders/${id}/cancel`, {
    method: "PUT",
    body: JSON.stringify({ note }),
  });
}
