# White Box Audit Report — LOFT User Frontend

**Date:** 2026-06-30  
**Scope:** `User frontend/src/`  
**Total files analyzed:** ~80  
**Severity scale:** P0 (blocker) → P1 (high) → P2 (medium) → P3 (low)

---

## P0 — Critical (Blocking Production)

### P0-1: Newsletter subscription is a mock — no backend integration

| Field | Value |
|---|---|
| **File** | `src/shared/components/layout/Newsletter.jsx` |
| **Line** | 40–56 |
| **What** | Subscribe handler calls `setTimeout(resolve, 800)` instead of an actual API call. Success is always simulated. |
| **Impact** | All 100% of email subscriptions are silently discarded. Users see a success toast ("You've been subscribed!") but no data reaches any backend. Zero email capture. |
| **Fix** | Add a real API call to a newsletter/subscription endpoint. Replace the mock timer with `fetch` or an axios post to `POST /api/newsletter/subscribe`. |
| **Root cause** | MVP placeholder never replaced with production integration. |

### P0-2: Guest cart deleted on login without server-side migration

| Field | Value |
|---|---|
| **File** | `src/features/cart/hooks/useCart.js` |
| **Line** | 15–25 |
| **What** | When `isAuthenticated` transitions to `true`, the hook calls `clearCart()` (which deletes `localStorage` cart) then fetches server cart. Guest items are permanently lost. |
| **Impact** | Users who add items as guests then log in or sign up lose their entire cart. Direct revenue loss and UX trust damage. |
| **Fix** | On login, read localStorage cart, merge items into the server cart via a `POST /api/cart/merge` endpoint (or iterate and add each), then clear local. |
| **Root cause** | Auth-driven cart reset without merge/sync logic. |

---

## P1 — High

### P1-1: Duplicate order API definitions — conflicting endpoints

| Field | Value |
|---|---|
| **File** | `src/services/orders.api.js` vs `src/features/orders/api/orders.api.js` |
| **Line** | Both files, all exports |
| **What** | Two files define order API calls. `services/orders.api.js` uses `/orders`; `features/orders/api/orders.api.js` uses `/orders/myorders`. The checkout service (`checkout.service.js`) imports `getOrders` from the features variant and calls `getOrderById` against `/orders/{id}`. Also `profile.service.js` calls `/api/orders/myorders` directly. |
| **Impact** | Inconsistency across the app. If one endpoint 404s or returns different shapes, parts of the app silently break. Dead code risk. |
| **Fix** | Consolidate to one order API module (pick the feature-level one). Make all consumers import from the same source. |
| **Root cause** | Organic growth without API layer consolidation. |

### P1-2: Stale closure in SubCategoryPage useEffect

| Field | Value |
|---|---|
| **File** | `src/pages/shop/SubCategoryPage.jsx` |
| **Line** | ∼1–60 (eslint-disable comment) |
| **What** | A `useEffect` has `// eslint-disable-next-line` suppressing the exhaustive-deps rule. The closure captures stale variables. |
| **Impact** | The effect may run with stale data, causing incorrect subcategory display or missing products. |
| **Fix** | Refactor the effect to include all dependencies, or use `useCallback`/`useRef` to stabilize references. Remove the eslint-disable. |
| **Root cause** | Dependency hygiene deferred during development. |

### P1-3: checkout.service.js wraps axios with fetch-like adapter pattern

| Field | Value |
|---|---|
| **File** | `src/features/checkout/services/checkout.service.js` |
| **Line** | 1–20 (domain logic) |
| **What** | `wrapAxios` converts axios response into `{ ok: boolean, status: number, json(): Promise<any> }`. Every service function then must call `.json()`. This adds unnecessary indirection. |
| **Impact** | Harder to debug, harder to type (all return `any` via `json()`), duplicates error-handling logic in every consumer. |
| **Fix** | Remove the wrapper. Use axios interceptors or direct try/catch with typed responses. |
| **Root cause** | Developer preference for fetch-like syntax over axios patterns. |

### P1-4: Category component uses non-uniform shuffle

| Field | Value |
|---|---|
| **File** | `src/features/products/components/Category.jsx` |
| **Line** | ∼30 |
| **What** | `[...items].sort(() => 0.5 - Math.random())` — known anti-pattern. Results in non-uniform distribution; some items have near-zero chance of appearing at certain positions. |
| **Impact** | Category discovery showcase is biased. Some subcategories rarely appear. |
| **Fix** | Replace with Fisher-Yates shuffle: `for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }` |
| **Root cause** | Common but incorrect shuffle pattern. |

---

## P2 — Medium

### P2-1: Client-side subcategory filtering instead of server query

| Field | Value |
|---|---|
| **File** | `src/features/products/hooks/useSubCategoriesQuery.js` |
| **Line** | ∼8 |
| **What** | Fetches ALL subcategories from `GET /api/subcategories` then filters in JS by `parentCategoryId`. |
| **Impact** | Unnecessary data transfer. As subcategory catalog grows, this becomes a scaling bottleneck. |
| **Fix** | Add `?parentCategoryId=X` query param to the API endpoint. Pass it from the hook. |
| **Root cause** | Backend lacked filtering; frontend worked around it. |

### P2-2: Filters.jsx window.scrollTo missing SSR guard

| Field | Value |
|---|---|
| **File** | `src/features/products/components/Filters.jsx` |
| **Line** | ∼25 |
| **What** | Direct `window.scrollTo(...)` call without checking `typeof window !== "undefined"`. Will crash in SSR contexts. |
| **Impact** | If SSR/SSG is ever added, this throws on the server. Currently client-only, so lower urgency. |
| **Fix** | Wrap in guard: `if (typeof window !== "undefined") window.scrollTo(...)` |
| **Root cause** | Client-only assumption. |

### P2-3: Module-level mutable unauthorized callback in http.js

| Field | Value |
|---|---|
| **File** | `src/shared/utils/http.js` |
| **Line** | ∼1–15 |
| **What** | `let onUnauthorized = null;` is module-level mutable state. Any consumer can overwrite it for all consumers. |
| **Impact** | If two modules register different handlers, one silently clobbers the other. Stale closure risk. |
| **Fix** | Use an event emitter pattern, or pass handlers via context/constructor. |
| **Root cause** | Simple global pattern that doesn't scale. |

### P2-4: main.jsx uses array index as React key

| Field | Value |
|---|---|
| **File** | `src/main.jsx` |
| **Line** | 18 |
| **What** | `routes.map((route, index) => <Route key={index} ...>` |
| **Impact** | Prevents React from optimally reusing lazy-loaded route components during re-renders. Can cause unmount/remount on route reorder. |
| **Fix** | Use `route.path` as key: `key={route.path}` |
| **Root cause** | Common oversight with route arrays. |

---

## P3 — Low / Informational

### P3-1: BrandLoader has no CSS file — inconsistent with component pattern

| Field | Value |
|---|---|
| **File** | `src/shared/components/ui/BrandLoader.jsx` |
| **What** | Uses framer-motion `motion.div` for all animations. No `BrandLoader.css` file exists. This is inconsistent with every other component that has a corresponding CSS module. |
| **Recommendation** | Not a bug — framer-motion inline styles are valid. But for consistency, consider adding a CSS file for static styles (z-index, positioning) and keep only motion props in JSX. |

### P3-2: ProductPresentationContext complexity

| File | `src/features/products/context/ProductPresentationContext.jsx` |
|---|---|
| **What** | Manages active image index, zoom state, and thumbnail selection via context. The component is well-implemented but the context-based approach for per-product UI state may cause unnecessary re-renders across unrelated product cards. |
| **Recommendation** | Consider local state or a lighter alternative if performance profiling reveals issues. |

### P3-3: queryKeys factory used inconsistently

| File | `src/shared/constants/queryKeys.js` |
|---|---|
| **What** | Some hooks use the query key factory; others inline string literals. Inconsistent cache invalidation patterns. |
| **Recommendation** | Audit all `useQuery`/`useMutation` calls and migrate to factory keys for consistent cache management. |

---

## Quick Stats

- **P0:** 2 (both directly impact revenue / user trust)
- **P1:** 4 (architecture & correctness risks)
- **P2:** 4 (scalability & SSR readiness)
- **P3:** 3 (consistency & best practices)
- **Total:** 13 findings

**Next phases (blocked — require running app):**
- Black-box browser QA (Phase 2)
- Exploratory testing (Phase 3)
- Accessibility audit (Phase 4)
- Performance profiling (Phase 5)
- Security scan (Phase 6)
- Visual regression (Phase 7)
- API contract validation (Phase 8)
- Regression (Phase 9)
- Production readiness score (Phase 10)
