# JWT Access/Refresh Token Rotation Documentation

This document describes the architectural specifications, frontend integration plan, database session migration strategy, cookie security policies, and regression verification plan for the JWT access/refresh token rotation mechanism.

---

## 1. Frontend Integration Plan

We utilize a centralized Axios response interceptor on the React client side to transparently refresh access tokens without disrupting user activities.

### Axios Interceptor Implementation
```javascript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true, // Send httpOnly cookies (refreshToken) to the backend
});

// Attach current access token to outbound requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept expired tokens and trigger auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for HTTP 401 and specific expiration error code
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      // If a refresh is already in-flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Silent token rotation post request
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { token: newAccessToken } = refreshResponse.data;
        localStorage.setItem("token", newAccessToken);

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Logout fallback: clear local credentials and redirect to sign in
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 2. Session Migration Strategy

To handle existing logged-in users during transition:
- **Graceful Compatibility Period**: The backend verification continues validating standard JWT signatures. Legacy access tokens will pass authentication successfully.
- **Forced Re-login on Access Token Expiration**: Once a legacy client's access token expires, the client makes a request to `/refresh`. Because the legacy client lacks a `refreshToken` cookie, the backend will return `401 Unauthorized`.
- **Axios Interceptor Fallback**: The interceptor catches the `/refresh` failure, clears local credentials, and redirects the user to the login screen. No database migrations are required for pre-existing sessions.

---

## 3. Cookie Security Verification

The refresh tokens are secured using browser-enforced cookie policies:
- **`httpOnly: true`**: Never exposed to Javascript. Mitigates session hijacking via XSS.
- **`secure: true`**: Sent only over encrypted HTTPS connections in production.
- **`sameSite: "strict"`**: Prevents CSRF-based requests.
- **`path: "/api/auth"`**: Scope-limits cookie transmissions to authentication endpoints only.

---

## 4. Rollback Plan

We create snapshot backups of the active auth controllers and middlewares prior to writing any updates:
- [auth.service.js.pre-rotation.bak](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/backend/scratch/auth.service.js.pre-rotation.bak)
- [auth.controller.js.pre-rotation.bak](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/backend/scratch/auth.controller.js.pre-rotation.bak)
- [auth.routes.js.pre-rotation.bak](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/backend/scratch/auth.routes.js.pre-rotation.bak)
- [authMiddleware.js.pre-rotation.bak](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/backend/scratch/authMiddleware.js.pre-rotation.bak)

---

## 5. Full Regression Verification

We verify the changes using a automated test suite:
- Signup & registration token check
- User login cookie check
- Admin login redirection verification
- Refresh token rotation check
- Replay/reuse detection revocation check
- Logout and cart verification checks
