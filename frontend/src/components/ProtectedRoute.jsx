/*
 * components/ProtectedRoute.jsx
 *
 * Route guard for all protected pages.
 * Reads token + user from localStorage (set by Login.jsx on successful auth).
 *
 * Usage:
 *   <ProtectedRoute role="admin">   → only admins
 *   <ProtectedRoute role="vendor">  → only vendors
 *   <ProtectedRoute role="user">    → only users
 *   <ProtectedRoute>                → any authenticated user (no role check)
 *
 * Redirect logic when role doesn't match:
 *   admin  → /admin/dashboard
 *   vendor → /vendor/:slug/dashboard  (slug read from stored user object)
 *   user   → /user/home
 *   unknown / no role → /login
 *
 * Changes from original:
 *   - Added vendor role redirect → /vendor/:slug/dashboard
 *   - Fallback redirect for unknown roles goes to /login instead of /user/home
 */

import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    // Corrupt data in localStorage — clear it and force re-login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // ── No token → go to login ─────────────────────────────────────────────────
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ── Role mismatch → redirect to the user's correct home ───────────────────
  if (role && user?.role !== role) {
    return <Navigate to={getHomeByRole(user)} replace />;
  }

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// Returns the correct home path for a given user object.
// Used both in the redirect above and can be imported elsewhere if needed.
// ─────────────────────────────────────────────────────────────────────────────
export function getHomeByRole(user) {
  if (user?.role === "admin") return "/admin/dashboard";
  if (user?.role === "vendor") return `/vendor/${user.vendorSlug}/dashboard`;
  if (user?.role === "user") return "/user/home";
  return "/login";
}

export default ProtectedRoute;
