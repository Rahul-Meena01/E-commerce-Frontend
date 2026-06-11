# PDP_CODE_GENERATION_PLAN.md
**LOFT PDP — Code Generation Execution Plan**  
Date: June 2026 | Status: Awaiting Approval Before Execution

---

## EXECUTIVE SUMMARY

The PDP redesign requires changes to **6 existing files** and creation of **1 new component**.  
All changes are purely frontend. Zero backend modifications.  
All existing API contracts, endpoints, and routes are preserved exactly.

---

## FILE 1: `src/pages/shop/ProductDetail.jsx`

**Reason for Modification:** Main orchestrator needs four surgical changes.  
**Estimated LOC change:** +80 lines added, ~20 lines modified  
**Integration risk:** Medium — central file, high coupling. Requires careful testing.  
**Dependencies:** StickyPurchaseBar, StockIndicator, StyleInspiration (import-only)

### Change 1.A — Add missing imports
```
+ import StickyPurchaseBar from "@/features/products/components/StickyPurchaseBar";
+ import StockIndicator from "@/features/products/components/StockIndicator";
+ import StyleInspiration from "@/features/products/components/StyleInspiration";
```

### Change 1.B — Add new state and refs
```
+ const [sizeError, setSizeError] = useState("");
+ const [stickyVisible, setStickyVisible] = useState(false);
+ const ctaRef = useRef(null);
+ const sizeRef = useRef(null);
```

### Change 1.C — Add IntersectionObserver for StickyPurchaseBar
```
+ useEffect(() => {
+   if (!ctaRef.current) return;
+   const observer = new IntersectionObserver(
+     ([entry]) => setStickyVisible(!entry.isIntersecting),
+     { threshold: 0.1 }
+   );
+   observer.observe(ctaRef.current);
+   return () => observer.disconnect();
+ }, []);
```

### Change 1.D — Add size validation to handleAddToCart
```javascript
// BEFORE:
const handleAddToCart = () => {
  const qtyToSubmit = Math.max(1, parseInt(quantity, 10) || 1);
  addToCart({ ... });
  toast.success(`${activeProduct.name} added to cart!`);
  setAddedToCart(true);
  setQuantity(1);
  setTimeout(() => setAddedToCart(false), 2000);
};

// AFTER:
const handleAddToCart = () => {
  // Size validation gate
  if (availableSizes.length > 0 && !selectedSize) {
    setSizeError("Please select a size to continue");
    sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  setSizeError("");
  const qtyToSubmit = Math.max(1, parseInt(quantity, 10) || 1);
  addToCart({ ... });
  toast.success(`${activeProduct.name} added to cart!`);
  setAddedToCart(true);
  setQuantity(1);
  setTimeout(() => setAddedToCart(false), 2500); // +500ms for animation
};
```

### Change 1.E — Apply size validation to Buy Now handler
Same gate added at top of Buy Now handler before addToCart call.

### Change 1.F — Fix mobile gallery breakpoint
```
// CHANGE TWO OCCURRENCES:
window.innerWidth <= 1200  →  window.innerWidth <= 900
```

### Change 1.G — Replace inline stock badge with StockIndicator
```jsx
// REMOVE:
<div className={`ds-badge ds-badge--${stockStatus.class === "in" ? "success" : ...}`}>
  <span>{stockStatus.label}</span>
</div>

// ADD:
<StockIndicator
  inStock={isProductInStock}
  stockCount={typeof activeProduct.stock === "number" ? activeProduct.stock : undefined}
/>
```

### Change 1.H — Add ref to CTA section
```jsx
// Add ref prop to the actions div:
<div className="pd-actions" ref={ctaRef}>
```

### Change 1.I — Add ref to size selector
```jsx
// Add wrapper div with ref around size VariantSelector:
{availableSizes.length > 0 && (
  <div ref={sizeRef}>
    <VariantSelector
      name="size"
      label="Select Size"
      type="size"
      options={sizeOptions}
      selectedValue={selectedSize}
      onChange={(val) => { setSelectedSize(val); setSizeError(""); }}
      error={sizeError}
    />
  </div>
)}
```

### Change 1.J — Render StyleInspiration below pd-main
```jsx
// After </section> of pd-main and before pd-similar:
{galleryImages.length >= 2 && (
  <StyleInspiration
    images={galleryImages}
    productName={activeProduct?.name || "Product"}
  />
)}
```

### Change 1.K — Render StickyPurchaseBar at component bottom
```jsx
// After lightbox section, before closing </div>:
<StickyPurchaseBar
  product={product}
  thumbnail={galleryImages[0] || ""}
  title={activeProduct?.name || ""}
  selectedVariantSummary={[selectedColor, selectedSize].filter(Boolean).join(" · ")}
  price={payPrice}
  disabled={!isProductInStock}
  onAddToCart={handleAddToCart}
  visible={stickyVisible}
/>
```

---

## FILE 2: `src/styles/ProductDetail.css`

**Reason for Modification:** CTA hierarchy, luxury polish, responsive fixes  
**Estimated LOC change:** +40 lines modified/added, ~15 removed  
**Integration risk:** Low — CSS only, no logic  
**Dependencies:** None

### Change 2.A — Differentiate Buy Now vs Add to Cart
```css
/* CURRENT .pd-add-to-cart and .pd-buy-now are siblings, visually equal */
/* NEW — clear primary/secondary hierarchy */

/* Add to Cart → Secondary (outline) */
.pd-add-to-cart {
  flex: 1;
  background: transparent;
  color: var(--ds-color-text, #111827);
  border: 1.5px solid var(--ds-color-text, #111827);
  /* keep height, padding, font same */
  transition: all var(--ds-duration-normal) ease;
}
.pd-add-to-cart:hover {
  background: var(--ds-color-text, #111827);
  color: #ffffff;
}

/* Buy Now → Primary (solid, full-width above) */
.pd-buy-now {
  width: 100%;                    /* full width */
  background: var(--ds-color-text, #111827);
  color: #ffffff;
  border: 1.5px solid var(--ds-color-text, #111827);
  /* move to own row ABOVE the add-to-cart row */
  transition: all var(--ds-duration-normal) ease;
}
.pd-buy-now:hover {
  background: #2d3748;
}
```

### Change 2.B — Reorder actions layout
```css
.pd-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Inner row: Add to Cart + Wishlist side by side */
.pd-actions-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}
```

In JSX, restructure actions as:
```jsx
<div className="pd-actions" ref={ctaRef}>
  <button className="pd-buy-now" ...>Buy Now</button>
  <div className="pd-actions-row">
    <button className="pd-add-to-cart" ...>Add to Cart</button>
    <button className="pd-wishlist-btn" ...><Heart /></button>
  </div>
</div>
```

### Change 2.C — Micro-interactions on CTAs
```css
.pd-add-to-cart,
.pd-buy-now {
  transform: translateZ(0);
  transition: all var(--ds-duration-normal) ease, transform 120ms ease;
}
.pd-add-to-cart:hover,
.pd-buy-now:hover {
  transform: scale(1.015) translateZ(0);
}
.pd-add-to-cart:active,
.pd-buy-now:active {
  transform: scale(0.975) translateZ(0);
}
```

### Change 2.D — Rename brand label class
```css
/* Add new .pd-brand-label that is identical to current .pd-category */
/* Keep .pd-category as alias for backwards compatibility */
.pd-brand-label,
.pd-category {
  /* same styles as current .pd-category */
}
```

### Change 2.E — Gallery hover zoom reduction
```
/* In ProductGallery.css, change .pg-desktop-hero-item img hover: */
/* 
   Current JS: heroImgRef.current.style.transform = "scale(1.5)"
   Change to: scale(1.35)
   This is a JS change in ProductGallery.jsx line ~37
*/
```

---

## FILE 3: `src/features/products/components/StickyPurchaseBar.css`

**Reason for Modification:** Align with design tokens, luxury polish  
**Estimated LOC change:** Full rewrite — ~60 → ~90 lines  
**Integration risk:** Very low — visual only  
**Dependencies:** design-tokens.css (uses CSS variables)

### Key changes
```css
.spb-root {
  /* position, z-index unchanged */
}
.spb-inner {
  background: rgba(255,255,255,0.97);
  backdrop-filter: blur(12px);                /* glass-morphism */
  border-top: 1px solid var(--ds-color-border-subtle, #f0f0f0);
  box-shadow: 0 -4px 24px rgba(0,0,0,0.06);
  /* use design tokens for padding */
  padding: var(--ds-space-3, 12px) var(--ds-space-6, 24px);
}
.spb-title {
  font-family: var(--ds-font-sans), sans-serif;
  font-size: 14px;
  font-weight: 500;                           /* not 600 */
  color: var(--ds-color-text, #111827);
}
.spb-variant {
  font-family: var(--ds-font-sans), sans-serif;
  font-size: 12px;
  color: var(--ds-color-text-muted, #667085);
}
.spb-price {
  font-family: var(--ds-font-sans), sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--ds-color-text, #111827);
}
.spb-cta {
  background: var(--ds-color-text, #111827);  /* was #111 */
  color: #ffffff;
  border: none;
  font-family: var(--ds-font-sans), sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: var(--ds-space-3, 12px) var(--ds-space-6, 24px);
  border-radius: var(--ds-radius-xs, 4px);     /* less rounding = more luxury */
  cursor: pointer;
  transition: all var(--ds-duration-normal) ease;
  white-space: nowrap;
}
.spb-cta:hover {
  background: #2d3748;
}
```

---

## FILE 4: `src/features/products/components/ProductInfo.jsx`

**Reason for Modification:** Fix critical price formatting bug  
**Estimated LOC change:** +2 lines changed  
**Integration risk:** Very low — not currently used in ProductDetail  
**Dependencies:** `@/utils/pricing` formatPrice

### Change 4.A
```jsx
// Line 4: ADD import
import { formatPrice } from "@/utils/pricing";

// Line 30 CHANGE:
// BEFORE: <span className="pd-price">{CURRENCY.symbol}{payPrice}.00</span>
// AFTER:
<span className="pd-price">{formatPrice(payPrice)}</span>

// Line 33 CHANGE:
// BEFORE: <span className="pd-old-price">{CURRENCY.symbol}{oldPrice}.00</span>
// AFTER:
<span className="pd-old-price">{formatPrice(oldPrice)}</span>

// Line 4: REMOVE import (if no longer needed):
// import { CURRENCY } from "@/constants/currency";
```

---

## FILE 5: `src/features/products/components/ProductGallery.jsx`

**Reason for Modification:** Performance (image loading), hover zoom reduction, deduplication cleanup  
**Estimated LOC change:** ~10 lines changed  
**Integration risk:** Low  
**Dependencies:** None

### Change 5.A — Fix image loading strategy
```jsx
// In desktop hero img:
// CHANGE: loading="eager"  (first image only)
// Rest of images in thumbs: loading="lazy"

// In thumbnail sidebar:
<img
  src={img.thumb || img.src}
  loading={i === 0 ? "eager" : "lazy"}  // ← was always loading default
/>
```

### Change 5.B — Reduce hover zoom
```javascript
// Line ~37 in handleMouseMove:
// CHANGE:
heroImgRef.current.style.transform = "scale(1.5)";
// TO:
heroImgRef.current.style.transform = "scale(1.35)";
```

### Change 5.C — Remove internal deduplication (trust parent input)
```javascript
// ProductDetail.jsx already deduplicates before passing to ProductGallery.
// Remove the internal seen-Set deduplication from ProductGallery.
// Change:
//   const { uniqueImages, uniqueIndices } = useMemo(() => { ... seen = new Set ... }, [images])
// To:
//   const uniqueImages = useMemo(() => images.slice(0, 5), [images]);
//   const uniqueIndices = useMemo(() => images.slice(0, 5).map((_, i) => i), [images]);
```

---

## FILE 6: `src/features/products/components/StyleInspiration.jsx`

**Reason for Modification:** Minor — normalize image prop handling  
**Estimated LOC change:** ~5 lines changed  
**Integration risk:** Very low  
**Dependencies:** None

### Change 6.A — Accept `images` as flat string array OR {src} object array
```javascript
// Current code handles both string and object:
// src: images[0]?.src || images[0]
// This is already correct. No changes needed.
// Just verify: ProductDetail passes galleryImages (string array) ✓
```

No code changes needed in StyleInspiration.jsx — it already handles the data shape `ProductDetail` will pass.

---

## NEW FILE 7: `src/features/products/components/SizeGuideModal.jsx`

**Reason for Creation:** Size guide button in VariantSelector links nowhere. Provide a simple inline size chart.  
**Estimated LOC:** ~80 lines JSX + ~40 lines CSS  
**Integration risk:** Very low — additive, no existing files modified  
**Dependencies:** None (hardcoded size table from siteContent or local constant)

### Responsibilities
- Renders a modal overlay (portal or inline) with a standard clothing size chart
- Size data is hardcoded in a new `siteContent.sizeGuide` config block (not from API)
- Receives `isOpen` and `onClose` props from VariantSelector or ProductDetail
- Contains: Chest, Waist, Hip measurements in XS/S/M/L/XL/XXL

### Integration point
```jsx
// In VariantSelector.jsx, when name === "size":
// Pass `onSizeGuide` prop down to VariantSelector
// VariantSelector calls onSizeGuide() on Size Guide button click
// ProductDetail.jsx manages isSizeGuideOpen state
// ProductDetail.jsx renders: <SizeGuideModal isOpen={...} onClose={() => setSizeGuideOpen(false)} />
```

---

## APPROVAL CHECKLIST

Before code generation begins, confirm:

| Item | Status |
|------|--------|
| Backend unchanged | ✅ Confirmed |
| API contracts preserved | ✅ Confirmed |
| Route structure unchanged | ✅ Confirmed |
| All 7 files scoped | ✅ Ready |
| No new API endpoints proposed | ✅ Confirmed |
| All existing functionality preserved | ✅ Confirmed |
| Approval to proceed with File 1 (ProductDetail.jsx)? | ⬜ Awaiting |
| Approval to proceed with File 2 (ProductDetail.css)? | ⬜ Awaiting |
| Approval to proceed with File 3 (StickyPurchaseBar.css)? | ⬜ Awaiting |
| Approval to proceed with File 4 (ProductInfo.jsx)? | ⬜ Awaiting |
| Approval to proceed with File 5 (ProductGallery.jsx)? | ⬜ Awaiting |
| Approval to proceed with File 6 (StyleInspiration.jsx)? | ⬜ Awaiting |
| Approval to proceed with File 7 (SizeGuideModal.jsx new)? | ⬜ Awaiting |

---

## IMPLEMENTATION ORDER

```
Step 1: ProductInfo.jsx          (5 min, isolated, no risk)
Step 2: ProductDetail.css        (30 min, visual only)
Step 3: StickyPurchaseBar.css    (20 min, visual only)
Step 4: ProductGallery.jsx       (15 min, low risk)
Step 5: SizeGuideModal.jsx       (45 min, new file)
Step 6: StyleInspiration.jsx     (5 min, already correct)
Step 7: ProductDetail.jsx        (60 min, highest risk - do last)

Total estimated implementation: ~3 hours
```

---

## REGRESSION TEST MATRIX

After implementation, run through this complete test matrix:

### Core Commerce Flows
| Test | Expected | Priority |
|------|----------|----------|
| Load PDP with valid ObjectId in URL | Product renders | P0 |
| Load PDP with invalid productId | "Product Not Found" renders | P0 |
| Load PDP while products fetching | Skeleton renders | P0 |
| Add to Cart (no size, product has sizes) | Error shown, scroll to size | P0 |
| Add to Cart (size selected) | Item in cart, "Added ✓" | P0 |
| Add to Cart (out of stock) | Button disabled | P0 |
| Buy Now | Cart add + /checkout navigation | P0 |
| Wishlist toggle (add) | Heart fills, API called | P0 |
| Wishlist toggle (remove) | Heart empty, API called | P0 |
| Variant selection changes image | Gallery updates | P1 |
| Variant selection changes price | Price updates | P1 |

### Gallery Tests
| Test | Expected |
|------|----------|
| Desktop (≥901px) | Sidebar thumbs + hero |
| Mobile (≤900px) | CSS snap slider |
| Lightbox open | Full screen, keyboard nav |
| Lightbox close (ESC) | Closes correctly |
| Lightbox swipe | Next/prev navigate |
| 1 image product | No thumbnails, single hero |
| 5 images product | All 5 shown, no duplicates |

### Sticky Bar Tests
| Test | Expected |
|------|----------|
| Scroll past CTA | Sticky bar appears |
| Scroll back up | Sticky bar disappears |
| Sticky bar "Add to Cart" | Same validation + handler |
| Out of stock product | Sticky bar shows "Unavailable" |

### Responsive Tests
| Viewport | Expected |
|----------|----------|
| 1440px | Desktop layout, sidebar gallery |
| 1024px | Desktop layout, sidebar gallery |
| 900px | Mobile gallery (snap slider) |
| 768px | Single column layout |
| 375px | Mobile optimized, sticky bar |
| 320px | Compact mobile |
