# PDP_IMPLEMENTATION_PLAN.md
**LOFT Product Detail Page — Full Redesign Plan**  
Date: June 2026 | Classification: Frontend-Only | Backend: Untouched

---

## SECTION 1 — UX AUDIT SCORES

| Area | Current Score | Target Score | Gap |
|------|--------------|--------------|-----|
| Visual Hierarchy | 5/10 | 9/10 | −4 |
| Whitespace | 6/10 | 9/10 | −3 |
| Typography | 6/10 | 9/10 | −3 |
| CTA Hierarchy | 4/10 | 9/10 | −5 |
| Variant Selection | 7/10 | 9/10 | −2 |
| Trust Signals | 5/10 | 8/10 | −3 |
| Stock Indicators | 5/10 | 9/10 | −4 |
| Delivery Messaging | 5/10 | 8/10 | −3 |
| Similar Products | 6/10 | 8/10 | −2 |
| Image Gallery | 7/10 | 9/10 | −2 |
| Mobile Usability | 5/10 | 9/10 | −4 |
| Accessibility | 7/10 | 9/10 | −2 |
| Conversion Optimization | 4/10 | 9/10 | −5 |
| Loading States | 8/10 | 9/10 | −1 |
| Performance | 5/10 | 8/10 | −3 |
| Luxury Perception | 5/10 | 9/10 | −4 |

**Overall Current: 5.5/10 → Target: 8.9/10**

---

## SECTION 2 — DATA FLOW AUDIT

### 2.1 Product Fetch Flow
```
URL: /product/:productId
→ ProductDetail.jsx: useParams() → productId
→ cleanProductId = productId.split("_")[1] || productId.split("_")[0]
→ isValidObjectId check via /^[0-9a-fA-F]{24}$/
→ IF valid ObjectId → useProductQuery(productId) → GET /api/product/public/:id
→ IF slug → GET /api/product/public/all → client-side find (EXPENSIVE)
→ product = { _id, name, brand, price, discountPrice, stock, image, image1-4,
               sizes[], colors[], variants[], subCategory, description, ... }
```

### 2.2 Image Flow
```
product.image     → resolveProductImage() → /uploads/... → API_BASE_URL + path
product.image1-4  → same treatment
→ galleryImages[] (unique, max 5, deduplicated)
→ galleryItems[] = [ { src, thumb:src, alt, sources:[] } ]
→ ProductGallery deduplicates AGAIN internally (redundant)
→ Desktop: 90px sidebar thumbs + 4:5 hero preview with hover zoom
→ Mobile: CSS snap slider with dot navigation
→ Lightbox: uses galleryItems[], navigates with arrow keys/swipe/wheel
```

### 2.3 Price Flow
```
product.price → activeProduct.price (or variant.price)
product.discountPrice → activeProduct.discountPrice
isDiscounted = discountPrice && discountPrice < price
payPrice = isDiscounted ? discountPrice : price
oldPrice = isDiscounted ? price : null
discountPercent = Math.round((price - discountPrice) / price * 100)
→ formatPrice(payPrice) → en-IN locale, INR currency, smart decimals
```

**KNOWN BUG:** `ProductInfo.jsx` uses `{CURRENCY.symbol}{payPrice}.00` raw — broken.  
ProductDetail.jsx inline rendering uses `formatPrice()` correctly.

### 2.4 Variant Flow
```
product.variants[] → productVariants
selectedVariant (null | variant object)
activeProduct = selectedVariant || product
availableSizes = activeProduct.sizes || product.sizes || []
availableColors = activeProduct.colors || product.colors || []
```

### 2.5 Cart Flow
```
handleAddToCart():
  addToCart({
    product: { productId: product._id, id: product._id, name, price: payPrice, image, brand },
    size: selectedSize,    ← "" if no size selected (NO VALIDATION)
    color: selectedColor,
    quantity
  })
→ POST /api/cart/add (authenticated) or localStorage (guest)
```

**KNOWN BUG:** No size validation before submitting. User can add with empty `selectedSize`.

### 2.6 Wishlist Flow
```
toggleWishlist({ id: product._id, name, price, image, brand, category })
→ POST /api/wishlist (add) or DELETE /api/wishlist/:id (remove)
→ wishlisted = isInWishlist(product._id)
```

### 2.7 Similar Products Flow
```
product.subCategory?._id → subCategoryId
GET /api/product/public/all?subCategory=${subCategoryId}
→ client-side filter: p._id !== product._id
→ slice(0, 4)
→ rendered in horizontal scroll grid with ProductCard
```

### 2.8 Delivery Flow
```
expectedDeliveryDate = computed from new Date() + 3/5 days
→ Hardcoded: always 3-5 business days, no pincode check
→ Rendered inline, not from backend
```

---

## SECTION 3 — IMAGE AUDIT

### Supported Image Fields
| Field | Used in gallery? | Fallback? |
|-------|-----------------|-----------|
| `product.image` | ✅ Yes (first) | IMAGE_FALLBACK SVG |
| `product.image1` | ✅ Yes | IMAGE_FALLBACK SVG |
| `product.image2` | ✅ Yes | IMAGE_FALLBACK SVG |
| `product.image3` | ✅ Yes | IMAGE_FALLBACK SVG |
| `product.image4` | ✅ Yes | IMAGE_FALLBACK SVG |
| `product.images[]` | ✅ Yes (array) | — |
| `variant.image` | ✅ Yes (when variant selected) | — |
| `variant.image1-4` | ✅ Yes | — |

### Image Resolution Path
```
raw path: "/uploads/products/item.jpg"
resolveProductImage("/uploads/products/item.jpg")
→ API_BASE_URL + "/uploads/products/item.jpg"
→ "http://localhost:3000/uploads/products/item.jpg"
```

### Weaknesses
1. No `srcSet` or `sizes` attributes — no responsive image optimization
2. `loading="eager"` on ALL gallery images — LCP hit on images not visible
3. Lightbox uses `ResponsiveImage` (accepts `sources[]`) but all `sources` arrays are empty `[]`
4. Gallery thumbnails and hero use plain `<img>` — no lazy loading on thumbs
5. Double deduplication: `ProductDetail` deduplicates + `ProductGallery` deduplicates again
6. No WebP alternative provided

---

## SECTION 4 — ORPHANED COMPONENTS (CRITICAL)

These components exist in the codebase but are **NOT imported or used** in `ProductDetail.jsx`:

| Component | File | What it does | Why it matters |
|-----------|------|--------------|----------------|
| `StickyPurchaseBar` | `StickyPurchaseBar.jsx` | Fixed bottom bar with thumbnail, price, add-to-cart | **Critical** — mobile conversion essential |
| `StockIndicator` | `StockIndicator.jsx` | Accessible stock status with dot indicator | Better than current inline badge |
| `StyleInspiration` | `StyleInspiration.jsx` | Editorial section with lifestyle imagery | Luxury perception, editorial storytelling |
| `ProductInfo` | `ProductInfo.jsx` | Price/variant info sub-component | Has known price formatting bug |

---

## SECTION 5 — IMPROVEMENT REPORT

### P0 CRITICAL ISSUES (Must fix before launch)

---

**P0-01: StickyPurchaseBar not connected**

- **Root Cause:** `StickyPurchaseBar.jsx` imported nowhere in `ProductDetail.jsx`. No `IntersectionObserver` to trigger visibility.
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`, `src/features/products/components/StickyPurchaseBar.jsx`
- **Recommended Fix:**
  1. Import `StickyPurchaseBar` in `ProductDetail.jsx`
  2. Add `ctaRef` to the main actions section
  3. Add `useEffect` with `IntersectionObserver` watching `ctaRef`
  4. When CTA scrolls out of view → set `stickyBarVisible = true`
  5. Pass `visible`, `title`, `price`, `thumbnail`, `onAddToCart`, `disabled` props
- **Risk:** Low — additive change, no existing code modified
- **UX Impact:** +3 points on mobile usability
- **Conversion Impact:** +15-25% mobile add-to-cart rate (industry benchmark)

---

**P0-02: No size validation before Add to Cart**

- **Root Cause:** `handleAddToCart` and "Buy Now" handler have no guard for `selectedSize === ""` when `availableSizes.length > 0`
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`
- **Recommended Fix:**
  ```
  In handleAddToCart, add:
  if (availableSizes.length > 0 && !selectedSize) {
    setSizeError("Please select a size");
    // scroll VariantSelector into view
    sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  setSizeError("");
  ```
  Pass `sizeError` to the size `VariantSelector`'s `error` prop.  
  Add `const [sizeError, setSizeError] = useState("")` to component state.
- **Risk:** Low — additive validation, no existing logic changed
- **UX Impact:** Prevents silent cart errors
- **Conversion Impact:** Reduces cart abandonment from wrong-size purchases

---

**P0-03: Mobile gallery breakpoint too high (1200px)**

- **Root Cause:** `isMobileView` set at `window.innerWidth <= 1200`. This means tablets (768-1200px) see the mobile snap slider instead of the premium desktop sidebar gallery.
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`
- **Recommended Fix:** Change `<= 1200` to `<= 900` in both `useState` initializer and `onResize` handler
- **Risk:** Very low — CSS change only
- **UX Impact:** Tablets now see the premium sidebar gallery
- **Conversion Impact:** Better product photography presentation on iPad/tablet

---

**P0-04: ProductInfo.jsx has broken price formatting**

- **Root Cause:** `{CURRENCY.symbol}{payPrice}.00` — raw integer concatenation. If price is 1499.5, renders "₹1499.5.00"
- **Affected Files:** `src/features/products/components/ProductInfo.jsx`
- **Recommended Fix:** Import and use `formatPrice` instead:
  ```jsx
  import { formatPrice } from "@/utils/pricing";
  // ...
  <span className="pd-price">{formatPrice(payPrice)}</span>
  <span className="pd-old-price">{formatPrice(oldPrice)}</span>
  ```
- **Risk:** Very low — ProductInfo.jsx is not currently used in ProductDetail
- **Conversion Impact:** Prevents wrong price display

---

**P0-05: StockIndicator not used (accessibility regression)**

- **Root Cause:** `StockIndicator.jsx` has `role="status"` and `aria-live="polite"` for accessibility. Current inline badge lacks these ARIA attributes.
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`
- **Recommended Fix:** Replace inline `<div className="ds-badge...">` with `<StockIndicator inStock={...} stockCount={activeProduct.stock} />`
- **Risk:** Very low — visual change only, logic identical
- **UX Impact:** Correct screen reader announcement of stock changes

---

### P1 UX IMPROVEMENTS

---

**P1-01: CTA hierarchy is flat (Add to Cart = Buy Now = Wishlist visually)**

- **Root Cause:** All three CTAs rendered with same height/width/visual weight
- **Affected Files:** `ProductDetail.jsx`, `ProductDetail.css`
- **Recommended Fix:**
  - "Buy Now" → primary (solid dark background, full width, prominent)
  - "Add to Cart" → secondary (outline border, full width)
  - Wishlist → tertiary (icon-only, smaller, floated right or appended)
  - Maintain button row: `[Add to Cart button (flex:1)] [Wishlist icon (44px)]` with Buy Now full-width above
- **Expected UX Impact:** Clear visual purchase hierarchy
- **Conversion Impact:** +8-12% on Buy Now conversions

---

**P1-02: StyleInspiration not connected**

- **Root Cause:** Component exists and works but is never imported in ProductDetail
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`
- **Recommended Fix:** Import `StyleInspiration` and render below `pd-main`, passing `galleryImages` and `activeProduct.name`
  ```jsx
  {galleryImages.length >= 2 && (
    <StyleInspiration images={galleryImages} productName={activeProduct.name} />
  )}
  ```
- **Expected UX Impact:** Editorial luxury storytelling section visible
- **Conversion Impact:** +5-8% engagement, +3% add-to-cart from editorial section

---

**P1-03: Brand label is misleading**

- **Root Cause:** `<span className="pd-category">{activeProduct.brand}</span>` — class name says "category" but content is brand
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`, `ProductDetail.css`
- **Recommended Fix:** Rename CSS class to `pd-brand-label` or keep class but fix the content to show `product.brand` as brand label and route breadcrumb for category
- **Expected UX Impact:** Clearer brand attribution, premium feel

---

**P1-04: Similar products empty state missing**

- **Root Cause:** When `similarProducts.length === 0`, section header renders but grid is empty
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`
- **Recommended Fix:** Conditionally render the entire `pd-similar` section:
  ```jsx
  {similarProducts.length > 0 && (
    <section className="pd-similar">...</section>
  )}
  ```

---

**P1-05: Size guide button has no action**

- **Root Cause:** `VariantSelector` renders a "Size Guide" button (`vs-size-guide-btn`) that does nothing — no handler, no modal, no link
- **Affected Files:** `src/features/products/components/VariantSelector.jsx`
- **Recommended Fix (frontend-only):** Render a simple inline size chart modal (hardcoded size guide table in `siteContent.js`). Or pass an `onSizeGuide` prop from ProductDetail and open a modal.

---

**P1-06: Slug resolution fetches ALL products (performance)**

- **Root Cause:** When `productId` is not a MongoDB ObjectId, ProductDetail fetches the entire product catalog to find the product by slug
- **Affected Files:** `src/pages/shop/ProductDetail.jsx`
- **Recommended Fix:** The existing route structure uses `/product/:productId` where productId should always be a MongoDB ObjectId. Verify that all navigation (ProductCard, search, wishlist) generates links as `/product/${product._id}`. If all links use `_id`, the slug fallback is dead code that can be cleaned up.

---

### P2 LUXURY DESIGN IMPROVEMENTS

---

**P2-01: Add micro-interactions to CTAs**

- Add subtle scale transform on hover: `transform: scale(1.02)` + `transition: transform 160ms ease`
- Add active press state: `transform: scale(0.98)` on `:active`
- These signals reinforce premium feel

---

**P2-02: Delivery info needs pincode/zip check UI**

- Add an expandable "Check delivery to [pin]" inline element below the delivery date
- Frontend only — just UI, no actual pincode check (state display only)
- Signals: "Enter your PIN code → [input] [Check]" → on submit → display "Delivers by [date]"
- Can use hardcoded logic (any 6-digit PIN = 3-5 days) — no API needed

---

**P2-03: Gallery hover zoom is too aggressive (scale 1.5)**

- Current: `transform: scale(1.5)` on mouse move
- Recommended: `scale(1.35)` with `transition: transform 0.4s ease`
- Smoother, more editorial feel

---

**P2-04: StickyPurchaseBar CSS is not luxury-grade**

- Current: uses `font-weight: 700`, `background: #111`, raw `padding: 10px 14px`
- Recommended: align with design tokens — use `var(--ds-font-sans)`, `var(--ds-color-brand)`, proper `var(--ds-radius-*)`, `var(--ds-duration-*)`
- Match visual language of the main page

---

**P2-05: "Added ✓" confirmation is too brief**

- 2000ms timeout for "Added ✓" feedback
- Recommend: animate with a small green checkmark scale animation, extend to 2500ms

---

**P2-06: Trust badge icons are not luxury-grade**

- Lucide icons (Shield, RotateCcw, Truck) are generic
- Consider replacing with clean minimal line-art SVGs
- Or keep icons but improve spacing and layout — horizontal tight row with dividers

---

### P3 PERFORMANCE IMPROVEMENTS

---

**P3-01: Preload hero product image as LCP optimization**

- Add `<link rel="preload" as="image" href={galleryImages[0]}>` to document head via React Portal or useEffect
- Reduces LCP by 400-800ms on product pages

---

**P3-02: Only eager-load first gallery image**

- Current: `loading="eager"` on ALL images in gallery
- Recommended: First image `loading="eager"`, rest `loading="lazy"`
- Saves ~2-4 unnecessary network requests on page load

---

**P3-03: Similar products fetch is unbounded**

- `GET /api/product/public/all?subCategory=${subCategoryId}` — fetches entire subcategory
- Add client-side early-exit once 4+ products found
- Or add `&limit=8` to the URL (if backend supports) to reduce payload

---

**P3-04: Lightbox loads eagerly before user opens it**

- Current: `LightboxModal` is mounted only when `lightboxOpen === true` — correct
- Verify: `{lightboxOpen && <LightboxModal ...>}` — already conditionally rendered ✓

---

**P3-05: Double image deduplication is wasteful**

- `ProductDetail` deduplicates `galleryImages` via `Array.from(new Set(...))`  
- `ProductGallery` deduplicates again internally via `seen` Set
- Remove the internal deduplication from `ProductGallery` and trust the parent input
- Or remove ProductDetail deduplication and let Gallery own it

---

## SECTION 6 — ASCII WIREFRAME MOCKUPS

### Desktop Layout (≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                          │
├─────────────────────────────────────────────────────────────────┤
│ ← Back   Home / Category / Product Name                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────┐  ┌─────────────────────────────┐  ┌───────────────┐  │
│  │Thumb1│  │                             │  │  BRAND NAME   │  │
│  ├──────┤  │                             │  │               │  │
│  │Thumb2│  │     HERO IMAGE (4:5)        │  │ Product Title │  │
│  ├──────┤  │                             │  │               │  │
│  │Thumb3│  │     [Zoom cursor]           │  │ ₹ 1,499       │  │
│  ├──────┤  │                             │  │ ₹ 1,999 -25%  │  │
│  │Thumb4│  │                             │  ├───────────────┤  │
│  └──────┘  │                             │  │ 🚚 Delivery   │  │
│            │                             │  │ [pincode ui]  │  │
│            └─────────────────────────────┘  ├───────────────┤  │
│                                             │ Qty:[-][1][+] │  │
│                                             │ ● In Stock    │  │
│                                             ├───────────────┤  │
│                                             │ COLOR: •••    │  │
│                                             │ SIZE: S M L XL│  │
│                                             ├───────────────┤  │
│                                             │[Add to Cart ♡]│  │
│                                             │[   Buy Now   ]│  │
│                                             ├───────────────┤  │
│                                             │ 🔒 Secure     │  │
│                                             │ ↩  Returns    │  │
│                                             │ 🚚 Free Ship  │  │
│                                             ├───────────────┤  │
│                                             │ ▸ Details     │  │
│                                             │ ▸ Specs       │  │
│                                             │ ▸ Shipping    │  │
│                                             └───────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  STYLE INSPIRATION (editorial section — 3 editorial images)     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │  Campaign  │  │   Detail   │  │   Styled   │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
├─────────────────────────────────────────────────────────────────┤
│  YOU MAY ALSO LIKE       View All   [←] [→]                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │ Card │ │ Card │ │ Card │ │ Card │                           │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px–1023px)

```
┌─────────────────────────────────────────┐
│ NAVBAR                                  │
├─────────────────────────────────────────┤
│ ← Back   Home / Category / Product     │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     HERO IMAGE (full width)     │    │
│  │     CSS snap slider             │    │
│  │              1 / 4              │    │
│  └─────────────────────────────────┘    │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐               │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │  thumb strip  │
│  └───┘ └───┘ └───┘ └───┘               │
├─────────────────────────────────────────┤
│  BRAND NAME                             │
│  Product Title                          │
│  ₹ 1,499  ₹1,999 -25%                  │
│  ─────────────────────────────────────  │
│  🚚 Delivery: Mon, Jun 15 – Wed Jun 17  │
│  ─────────────────────────────────────  │
│  [-] 1 [+]   ● In Stock                │
│  COLOR: • • •                           │
│  SIZE: [S] [M] [L] [XL]               │
│  ─────────────────────────────────────  │
│  [   Add to Cart   ] [♡]               │
│  [       Buy Now       ]               │
│  ─────────────────────────────────────  │
│  🔒 Secure  ↩ Returns  🚚 Free Ship    │
│  ─────────────────────────────────────  │
│  ▸ Product Details                      │
│  ▸ Specifications                       │
│  ▸ Shipping & Returns                   │
├─────────────────────────────────────────┤
│  STYLE INSPIRATION                      │
│  ┌──────────────┐ ┌──────────────┐     │
│  │   Campaign   │ │    Detail    │     │
│  └──────────────┘ └──────────────┘     │
├─────────────────────────────────────────┤
│  YOU MAY ALSO LIKE    View All [←][→]  │
│  ┌──────────┐ ┌──────────┐            │
│  │  Card    │ │  Card    │            │
│  └──────────┘ └──────────┘            │
└─────────────────────────────────────────┘
```

### Mobile Layout (≤767px)

```
┌─────────────────────────────┐
│ NAVBAR (compressed)         │
├─────────────────────────────┤
│ ← Back                      │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │   HERO IMAGE (4:5)    │  │
│  │   CSS snap slider     │  │
│  │          1 / 4        │  │
│  └───────────────────────┘  │
│  ○ ● ○ ○  (dot indicators) │
├─────────────────────────────┤
│  BRAND NAME (caps)          │
│  Product Title              │
│                             │
│  ₹ 1,499                   │
│  ₹ 1,999  -25%             │
│  ─────────────────────────  │
│  🚚 Mon, Jun 15–Wed Jun 17 │
│  ─────────────────────────  │
│  [-] 1 [+]  ● In Stock     │
│  ─────────────────────────  │
│  COLOR: • • •               │
│  SIZE: [S] [M] [L] [XL]   │
│  ─────────────────────────  │
│  [   Add to Cart  ] [♡]    │
│  [      Buy Now      ]     │
│  ─────────────────────────  │
│  🔒 Secure                 │
│  ↩  Easy Returns           │
│  🚚 Free Shipping          │
│  ─────────────────────────  │
│  ▸ Product Details          │
│  ▸ Specifications           │
│  ▸ Shipping & Returns       │
│                             │
│  STYLE INSPIRATION          │
│  ┌──────────────────────┐  │
│  │     Campaign         │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │       Detail         │  │
│  └──────────────────────┘  │
│                             │
│  YOU MAY ALSO LIKE          │
│  ┌──────────────────────┐  │
│  │       Card           │  │
│  └──────────────────────┘  │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │ [product thumb]       │  │
│  │ Title    ₹1,499      │  │
│  │ [   ADD TO CART   ]   │  │  ← STICKY PURCHASE BAR (pinned)
│  └───────────────────────┘  │
└─────────────────────────────┘
```

---

## SECTION 7 — FILES TO MODIFY

| File | Reason | Scope |
|------|---------|-------|
| `src/pages/shop/ProductDetail.jsx` | Connect orphaned components, add validation, fix breakpoint | High |
| `src/styles/ProductDetail.css` | CTA hierarchy, trust badge layout, luxury polish | Medium |
| `src/features/products/components/StickyPurchaseBar.jsx` | CSS token alignment (luxury polish) | Low |
| `src/features/products/components/StickyPurchaseBar.css` | Full luxury CSS rewrite | Medium |
| `src/features/products/components/ProductInfo.jsx` | Fix price formatting bug | Low |
| `src/features/products/components/ProductGallery.jsx` | Remove redundant deduplication, fix loading attrs | Low |

---

## SECTION 8 — FILES TO CREATE

| File | Reason |
|------|---------|
| `src/features/products/components/SizeGuideModal.jsx` | Inline size guide (frontend-only, hardcoded table from siteContent) |
| `src/config/siteContent.js` *(extend, not create)* | Add `sizeGuide` tables and `heroImage` URL |

---

## SECTION 9 — FILES TO REMOVE / DEPRECATE

| File | Reason |
|------|---------|
| No files to remove | All orphaned components are RECONNECTED in redesign |

---

## SECTION 10 — COMPONENT RESPONSIBILITIES (POST-REDESIGN)

| Component | Single Responsibility |
|-----------|----------------------|
| `ProductDetail.jsx` | Orchestration only: fetch data, manage state, wire components |
| `ProductGallery.jsx` | Gallery display: desktop sidebar + mobile slider. Owns lightbox trigger. |
| `LightboxModal.jsx` | Full-screen image overlay. Keyboard + swipe + wheel nav. |
| `VariantSelector.jsx` | Accessible option selector for size/color/style with validation state |
| `StickyPurchaseBar.jsx` | Floating bar: shows when CTAs scroll off screen. Mobile-first. |
| `StockIndicator.jsx` | Accessible stock status display with ARIA live region |
| `StyleInspiration.jsx` | Editorial section below main content. Scroll-reveal animation. |
| `ProductInfo.jsx` | Price + variant sub-section (can replace inline code in ProductDetail) |

---

## SECTION 11 — STATE CHANGES

### New state to add to ProductDetail.jsx
```
const [sizeError, setSizeError] = useState("");          // size validation
const [stickyVisible, setStickyVisible] = useState(false); // sticky bar trigger
const ctaRef = useRef(null);                             // ref for CTA section
const sizeRef = useRef(null);                            // ref for size selector
```

### Updated handlers
```
handleAddToCart: add size validation gate
handleBuyNow: same size validation gate
IntersectionObserver on ctaRef: updates stickyVisible
```

---

## SECTION 12 — CSS CHANGES

### ProductDetail.css
- CTA section: `.pd-actions` — differentiate primary/secondary visually
- Buy Now: solid dark background (full width)
- Add to Cart: outline border (full width)
- Wishlist: icon-only button (44px square)
- Trust badges: refine spacing for mobile
- Brand label: rename from `.pd-category` to `.pd-brand-label` semantics

### StickyPurchaseBar.css
- Replace raw `background: #111` with `var(--ds-color-text)`
- Replace raw `padding: 10px 14px` with design token equivalents
- Add luxury typography treatment

---

## SECTION 13 — RESPONSIVE CHANGES

| Breakpoint | Change |
|-----------|--------|
| `<= 1200` → `<= 900` | Gallery switches to mobile mode |
| `<= 767px` | Sticky purchase bar becomes visible at bottom |
| `<= 480px` | Trust badges column layout |

---

## SECTION 14 — ANIMATION CHANGES

| Element | Current | Target |
|---------|---------|--------|
| CTA buttons | No hover animation | `transform: scale(1.02)` on hover |
| CTA press | No | `transform: scale(0.97)` on `:active` |
| StickyBar entrance | slideY 110% → 0 | Keep existing, smooth |
| StyleInspiration | Fade-in on scroll | Keep existing IntersectionObserver fade |
| Gallery image change | Instant | Keep existing key-forced re-mount fade |
| "Added to Cart" | Text change 2000ms | Green checkmark scale + 2500ms |

---

## SECTION 15 — VERIFICATION STEPS

After implementation, verify each item:

1. ☐ Navbar renders correctly at all viewport widths
2. ☐ Gallery shows sidebar on desktop (≥901px), snap slider on mobile (≤900px)
3. ☐ All 5 product images show in gallery when provided by backend
4. ☐ Lightbox opens on gallery click, navigates correctly, closes on ESC/backdrop
5. ☐ Variant selectors render only when backend provides data
6. ☐ Selecting size clears sizeError validation state
7. ☐ "Add to Cart" without size shows error and scrolls to size selector
8. ☐ "Add to Cart" with size → item added to cart with correct price
9. ☐ "Buy Now" triggers cart add + navigation to /checkout
10. ☐ Wishlist toggle works (filled heart on active)
11. ☐ StickyPurchaseBar appears when CTA section scrolls out of viewport
12. ☐ StickyPurchaseBar "Add to Cart" uses same validation and handler
13. ☐ StockIndicator renders with correct state (in/low/out)
14. ☐ StyleInspiration renders when ≥ 2 gallery images available
15. ☐ Similar products render in horizontal scroll; arrows disabled at boundaries
16. ☐ Breadcrumb links navigate correctly
17. ☐ Product not found state renders correctly
18. ☐ Loading skeleton renders during fetch
19. ☐ formatPrice used everywhere (no raw symbol + number)
20. ☐ All existing cart/wishlist/checkout integrations unchanged
