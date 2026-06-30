import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Truck,
  RotateCcw,
  Shield,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  FileText,
  Sliders,
  Shirt,
  Heart,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProductQuery } from "../../features/products/hooks/useProductQuery";
import { useCart } from "@/features/cart/hooks/useCart";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useToast } from "../../context/ToastContext";
import ProductCard from "@/features/products/components/ProductCard";
import "../../styles/ProductDetail.css";
import ProductGallery from "@/features/products/components/ProductGallery";
import LightboxModal from "@/features/products/components/LightboxModal";
import authFetch from "@/shared/utils/http";
import logger from "@/shared/utils/logger";
import { recordRecentlyViewedProduct } from "../../features/search/hooks/useRecentlyViewedProducts";
import { siteContent } from "@/config/siteContent";
import { formatPrice } from "../../utils/pricing";
import StickyPurchaseBar from "@/features/products/components/StickyPurchaseBar";
import StockIndicator from "@/features/products/components/StockIndicator";
import StyleInspiration from "@/features/products/components/StyleInspiration";
import VariantSelector from "@/features/products/components/VariantSelector";

// Context & Presentation Builder imports
import { ProductPresentationProvider, useProductPresentation } from "@/features/products/context/ProductPresentationContext";
import { buildProductPresentation } from "@/features/products/utils/productPresentation";

/**
 * Clean dynamic specifications and shipping policies accordion.
 * Pulls directly from the presentation context.
 */
const ProductAccordion = () => {
  const presentation = useProductPresentation();
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const { description, specs, materials, care } = presentation || {};
  const { policies } = siteContent;

  const items = useMemo(() => {
    const sections = [];

    // 1. Product Details
    if (description) {
      sections.push({
        title: "Product Details",
        icon: <FileText size={16} strokeWidth={2} />,
        content: (
          <div className="pd-accordion-text">
            <p>{description}</p>
          </div>
        ),
      });
    }

    // 2. Specifications
    if (specs && specs.length > 0) {
      sections.push({
        title: "Specifications",
        icon: <Sliders size={16} strokeWidth={2} />,
        content: (
          <div className="pd-accordion-text">
            <div className="pd-spec-grid">
              {specs.map((spec, idx) => (
                <div key={idx} className="pd-spec-item">
                  <span className="pd-spec-label">{spec.label}</span>
                  <span className="pd-spec-value">{spec.value}</span>
                </div>
              ))}
              <div className="pd-spec-item">
                <span className="pd-spec-label">Availability</span>
                <span className="pd-spec-value">
                  {presentation.availability.inStock
                    ? `In Stock (${presentation.availability.stock} units)`
                    : "Out of Stock"}
                </span>
              </div>
            </div>
          </div>
        ),
      });
    }

    // 3. Materials & Care
    if (materials || care) {
      sections.push({
        title: "Materials & Care",
        icon: <Shirt size={16} strokeWidth={2} />,
        content: (
          <div className="pd-accordion-text">
            {materials && <p><strong>Materials:</strong> {materials}</p>}
            {care && <p><strong>Care Instructions:</strong> {care}</p>}
          </div>
        ),
      });
    }

    // 4. Shipping & Returns
    if (policies) {
      sections.push({
        title: policies.shippingTitle || "Shipping & Returns",
        icon: <Truck size={16} strokeWidth={2} />,
        content: (
          <div className="pd-accordion-text">
            <p>{policies.shippingDetails}</p>
            <p>{policies.returnsDetails}</p>
          </div>
        ),
      });
    }

    return sections;
  }, [presentation, policies, description, specs, materials, care]);

  return (
    <div className="pd-accordion">
      {items.map((item, i) => (
        <div key={i} className={`pd-accordion-item ${openIndex === i ? "active" : ""}`}>
          <button
            className="pd-accordion-header"
            onClick={() => toggle(i)}
            aria-expanded={openIndex === i}
            type="button"
          >
            <span className="pd-accordion-title-wrap">
              <span className="pd-accordion-title-text">{item.title}</span>
            </span>
            <span className="pd-accordion-chevron">
              {openIndex === i ? "−" : "+"}
            </span>
          </button>
          <div className="pd-accordion-content-wrap">
            <div className="pd-accordion-content">{item.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProductDetailContent = ({
  product,
  similarProducts,
  isMobileView,
  canScrollLeft,
  canScrollRight,
  scrollSimilar,
  similarGridRef,
  quantity,
  setQuantity,
  selectedVariantId,
  setSelectedVariantId,
  selectedVariant,
  ctaRef,
  stickyVisible,
  lightboxOpen,
  setLightboxOpen,
  lightboxStartIndex,
  setLightboxStartIndex,
  displayCategory,
}) => {
  const presentation = useProductPresentation();
  const { addToCart, cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [addedToCart, setAddedToCart] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const wishlisted = isInWishlist(product?._id);

  const productVariants = useMemo(() => {
    return product?.variants || [];
  }, [product]);

  const qtyInCart = useMemo(() => {
    if (!product || !cartItems) return 0;
    const item = cartItems.find((i) => {
      const pId = typeof i.product === "object" && i.product ? (i.product._id || i.product.id) : i.product;
      return pId === product._id &&
             (i.size || "") === (selectedVariant?.size || "") &&
             (i.color || "") === (selectedVariant?.color || "");
    });
    return item ? item.quantity : 0;
  }, [product, cartItems, selectedVariant]);

  const effectiveMaxStock = useMemo(() => {
    return Math.max(0, presentation.availability.stock - qtyInCart);
  }, [presentation.availability.stock, qtyInCart]);

  useEffect(() => {
    if (effectiveMaxStock <= 0) {
      setQuantity(0);
    } else {
      setQuantity((prev) => {
        const currentQty = Number(prev) || 1;
        if (currentQty > effectiveMaxStock) {
          return effectiveMaxStock;
        }
        if (currentQty === 0) {
          return 1;
        }
        return currentQty;
      });
    }
  }, [effectiveMaxStock, setQuantity]);

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    toggleWishlist({
      id: product._id,
      name: product.name,
      price: presentation.pricing.price,
      image: presentation.gallery.images[0]?.src || product.image,
      brand: product.brand,
      category: product.category,
    });
  };

  const handleQuantityChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      setQuantity("");
      return;
    }
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (cleanVal === "") {
      setQuantity("");
      return;
    }
    const num = parseInt(cleanVal, 10);
    if (!isNaN(num)) {
      setQuantity(Math.max(1, Math.min(num, effectiveMaxStock)));
    }
  };

  const handleQuantityBlur = () => {
    let qty = quantity === "" || isNaN(quantity) || quantity < 1 ? 1 : parseInt(quantity, 10);
    if (qty > effectiveMaxStock) {
      qty = effectiveMaxStock;
      toast.info(`Only ${effectiveMaxStock} units available.`);
    }
    setQuantity(qty);
  };

  const selectedVariantSummary = useMemo(() => {
    if (selectedVariant) {
      return [selectedVariant.color, selectedVariant.size].filter(Boolean).join(" · ");
    }
    return "";
  }, [selectedVariant]);

  const handleAddToCart = async () => {
    if (!presentation.availability.inStock) {
      toast.error("This product is currently out of stock.");
      return;
    }

    if (effectiveMaxStock <= 0) {
      toast.error("You have already added all available units to your cart.");
      return;
    }

    const qtyToSubmit = Math.max(1, parseInt(quantity, 10) || 1);
    if (qtyToSubmit > effectiveMaxStock) {
      toast.warning(`Only ${effectiveMaxStock} units available. Quantity adjusted.`);
    }

    const size = selectedVariant?.size || "";
    const color = selectedVariant?.color || "";
    const variantId = selectedVariant?._id || null;

    try {
      await addToCart({
        product: {
          productId: product._id,
          id: product._id,
          name: product.name,
          price: presentation.pricing.price,
          image: presentation.gallery.images[0]?.src || product.image,
          brand: product.brand,
          stock: presentation.availability.stock,
        },
        size,
        color,
        quantity: qtyToSubmit,
        variant: variantId,
      });

      toast.success(`${product.name} added to bag!`);
      setAddedToCart(true);
      setQuantity(effectiveMaxStock - qtyToSubmit > 0 ? 1 : 0);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch (err) {
      toast.error(err.message || "Failed to add item to bag");
    }
  };

  const expectedDeliveryDate = useMemo(() => {
    const today = new Date();
    const minDelivery = new Date(today);
    minDelivery.setDate(today.getDate() + 3);
    const maxDelivery = new Date(today);
    maxDelivery.setDate(today.getDate() + 5);
    const options = { weekday: "long", month: "short", day: "numeric" };
    return `${minDelivery.toLocaleDateString("en-IN", options)} – ${maxDelivery.toLocaleDateString("en-IN", options)}`;
  }, []);

  return (
    <>
      <div className="pd-breadcrumb">
        <div className="pd-breadcrumb-inner">
          <button onClick={() => navigate(-1)} className="pd-back-btn" aria-label="Go back">
            <ChevronLeft size={20} strokeWidth={2} /> Back
          </button>
          <div className="pd-crumb-trail">
            <Link to="/">Home</Link>
            <span className="pd-crumb-sep">/</span>
            <Link to={`/shop/${displayCategory}`}>
              {displayCategory.charAt(0).toUpperCase() + displayCategory.slice(1)}
            </Link>
            <span className="pd-crumb-sep">/</span>
            <span className="pd-crumb-current">{product.name}</span>
          </div>
        </div>
      </div>

      <section className="pd-main">
        <div className="pd-gallery-section">
          <ProductGallery
            images={presentation.gallery.images}
            alt={presentation.name}
            isMobile={isMobileView}
            openLightbox={(idx) => {
              setLightboxStartIndex(idx);
              setLightboxOpen(true);
            }}
          />
        </div>

        <div className="pd-info-section">
          <div>
            <span className="pd-brand-label">
              {presentation.brand}
              {presentation.sku && (
                <span className="pd-sku-label" style={{ marginLeft: "12px", opacity: 0.6 }}>
                  SKU: {presentation.sku}
                </span>
              )}
            </span>
            <h1 className="pd-title">{presentation.name}</h1>

            <div className="pd-price-block">
              <span className="pd-price">{formatPrice(presentation.pricing.price)}</span>
              {presentation.pricing.isDiscounted && presentation.pricing.oldPrice && (
                <>
                  <span className="pd-old-price">{formatPrice(presentation.pricing.oldPrice)}</span>
                  <span className="pd-discount">-{presentation.pricing.discountPercent}%</span>
                </>
              )}
            </div>
          </div>

          <div className="pd-delivery-info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Truck size={18} className="pd-delivery-icon" style={{ color: "var(--ds-color-accent)", flexShrink: 0 }} />
            <div>
              <span className="pd-delivery-label">Delivery:</span> Expected by <strong className="pd-delivery-date">{expectedDeliveryDate}</strong> (3-5 business days)
            </div>
          </div>

          <div className="pd-quantity-stock-row">
            <div className="pd-quantity-selector">
              <button
                type="button"
                className="pd-qty-btn"
                onClick={() => setQuantity((prev) => Math.max(1, (Number(prev) || 1) - 1))}
                disabled={Number(quantity) <= 1 || effectiveMaxStock <= 0}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <input
                type="text"
                className="pd-qty-input"
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                aria-label="Quantity input"
                disabled={effectiveMaxStock <= 0}
              />
              <button
                type="button"
                className="pd-qty-btn"
                onClick={() => {
                  const next = (Number(quantity) || 1) + 1;
                  if (next > effectiveMaxStock) {
                    toast.info(`Only ${effectiveMaxStock} units available.`);
                    return;
                  }
                  setQuantity(next);
                }}
                aria-label="Increase quantity"
                disabled={Number(quantity) >= effectiveMaxStock}
              >
                +
              </button>
            </div>
            <StockIndicator
              inStock={presentation.availability.inStock}
              stockCount={presentation.availability.stock}
            />
          </div>

          <VariantSelector
            product={product}
            variants={productVariants}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
          />

          <div className="pd-actions" ref={ctaRef}>
            <div className="pd-actions-row">
              <button
                className={`pd-add-to-cart ${addedToCart ? "added" : ""}`}
                onClick={handleAddToCart}
                disabled={!presentation.availability.inStock || effectiveMaxStock <= 0}
              >
                <ShoppingBag size={18} style={{ marginRight: "8px", verticalAlign: "middle" }} />
                {addedToCart ? "Added ✓" : effectiveMaxStock <= 0 ? "All Available in Bag" : "Add to Bag"}
              </button>
              <button
                type="button"
                className={`pd-wishlist-btn ${wishlisted ? "active" : ""}`}
                onClick={handleWishlistToggle}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={20} fill={wishlisted ? "var(--ds-color-danger, #8B3A3A)" : "none"} color={wishlisted ? "var(--ds-color-danger, #8B3A3A)" : "currentColor"} />
              </button>
            </div>
          </div>

          <div className="pd-trust-row">
            {siteContent.trustBadges.map((badge, idx) => {
              const Icon = idx === 0 ? Shield : idx === 1 ? RotateCcw : Truck;
              return (
                <div key={idx} className="pd-trust-item">
                  <Icon size={16} className="pd-trust-icon" />
                  <div className="pd-trust-text">
                    <span className="pd-trust-title">{badge.title}</span>
                    <span className="pd-trust-desc">{badge.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <ProductAccordion />
        </div>
      </section>

      {presentation.gallery.images.length >= 2 && (
        <StyleInspiration
          images={presentation.gallery.images}
          productName={presentation.name}
        />
      )}

      {similarProducts.length > 0 && (
        <section className="pd-similar">
          <div className="pd-similar-header">
            <h2 className="pd-similar-title">You May Also Like</h2>
            <div className="pd-similar-controls">
              <Link to={`/shop/${displayCategory}`} className="pd-view-all">
                View all
              </Link>
              <button
                className="pd-arrow-btn"
                aria-label="Previous"
                onClick={() => scrollSimilar("left")}
                disabled={!canScrollLeft}
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button
                className="pd-arrow-btn"
                aria-label="Next"
                onClick={() => scrollSimilar("right")}
                disabled={!canScrollRight}
              >
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div ref={similarGridRef} className="pd-similar-grid">
            {similarProducts.map((item) => (
              <ProductCard
                key={item.productId || item._id || item.id}
                product={item}
              />
            ))}
          </div>
        </section>
      )}

      {lightboxOpen && (
        <LightboxModal
          images={presentation.gallery.images}
          startIndex={lightboxStartIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <StickyPurchaseBar
        product={product}
        thumbnail={presentation.gallery.images[0]?.src || ""}
        title={presentation.name}
        selectedVariantSummary={selectedVariantSummary}
        price={presentation.pricing.price}
        disabled={!presentation.availability.inStock}
        onAddToCart={handleAddToCart}
        visible={stickyVisible}
      />
    </>
  );
};

const ProductDetail = () => {
  const { productId } = useParams();

  const cleanProductId = useMemo(() => {
    const parts = (productId || "").split("_");
    return parts[1] || parts[0];
  }, [productId]);

  const { data: resolvedProductId, isLoading: resolving } = useQuery({
    queryKey: ["resolve-slug", cleanProductId],
    queryFn: async () => {
      if (!cleanProductId) return null;

      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(cleanProductId);
      if (isValidObjectId) {
        return cleanProductId;
      }

      try {
        const res = await authFetch("/api/product/public/all");
        if (!res.ok) return "invalid";
        const json = await res.json();
        const list = json.data || [];
        const found = list.find(
          (p) =>
            p.slug === cleanProductId ||
            p._id === cleanProductId ||
            p.id === cleanProductId
        );
        return found ? found._id : "invalid";
      } catch (err) {
        logger.error("Slug resolution error:", err);
        return "invalid";
      }
    },
    enabled: !!cleanProductId,
  });

  const isInvalid = resolvedProductId === "invalid";
  const queryId = resolvedProductId && !isInvalid ? resolvedProductId : null;

  const { data: product, isLoading: productLoading } = useProductQuery(queryId);
  const loading = resolving || productLoading;

  const { data: similarProducts = [] } = useQuery({
    queryKey: ["products", "similar", product?._id],
    queryFn: async () => {
      if (!product) return [];
      const subCategoryId = product.subCategory?._id || product.subCategory;
      const res = await authFetch(
        `/api/product/public/all?subCategory=${subCategoryId}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      const filtered = (json.data || []).filter((p) => p._id !== product._id);
      return filtered.slice(0, 4);
    },
    enabled: !!product,
    staleTime: 5 * 60 * 1000,
  });

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const ctaRef = useRef(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 900 : false
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const similarGridRef = useRef(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  const scrollSimilar = (direction) => {
    if (similarGridRef.current) {
      const scrollAmount = 320;
      similarGridRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const updateScrollButtons = () => {
    if (similarGridRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = similarGridRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  useEffect(() => {
    const grid = similarGridRef.current;
    if (grid) {
      grid.addEventListener("scroll", updateScrollButtons);
      updateScrollButtons();

      const resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(grid);

      return () => {
        grid.removeEventListener("scroll", updateScrollButtons);
        resizeObserver.disconnect();
      };
    }
  }, [similarProducts]);

  const urlSplit = useMemo(() => {
    const parts = (productId || "").split("_");
    return {
      category: parts[0] || "",
      id: parts[1] || "",
    };
  }, [productId]);

  const displayCategory = useMemo(() => {
    return product?.subCategory?.parentCategory?.slug || urlSplit.category || "all";
  }, [product, urlSplit]);

  useEffect(() => {
    if (product) {
      recordRecentlyViewedProduct(product);
    }
  }, [product]);

  const productVariants = useMemo(() => {
    return product?.variants || [];
  }, [product]);

  // Reset selected variant on product change
  useEffect(() => {
    setSelectedVariantId("");
  }, [productVariants]);

  const selectedVariant = useMemo(() => {
    return Array.isArray(productVariants) ? productVariants.find((v) => v && v._id === selectedVariantId) || null : null;
  }, [productVariants, selectedVariantId]);

  // Derived presentation layer model
  const presentation = useMemo(() => {
    return buildProductPresentation({ product, selectedVariant });
  }, [product, selectedVariant]);

  // Adjust quantity when selection changes to fit current stock limits
  useEffect(() => {
    if (presentation) {
      const maxStock = presentation.availability.stock;
      setQuantity((prev) => {
        const currentQty = Number(prev) || 1;
        if (currentQty > maxStock) {
          return Math.max(1, maxStock);
        }
        return currentQty;
      });
    }
  }, [presentation]);

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!ctaRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, [loading]);

  if (loading) {
    return (
      <div className="pd-page pd-page-loading" aria-busy="true" aria-label="Loading product details">
        <div className="pd-breadcrumb">
          <div className="pd-breadcrumb-inner" style={{ paddingBottom: "12px", border: "none" }}>
            <div className="ds-skeleton" style={{ height: "28px", width: "80px", borderRadius: "4px" }}></div>
            <div className="ds-skeleton" style={{ height: "16px", width: "220px", borderRadius: "4px" }}></div>
          </div>
        </div>

        <section className="pd-main">
          <div className="pd-gallery-section">
            <div className="pg-editorial pg-editorial--desktop">
              <div className="pg-desktop-layout">
                <div className="pg-desktop-anchors">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="ds-skeleton" style={{ width: "90px", height: "120px", borderRadius: "8px" }}></div>
                  ))}
                </div>
                <div className="pg-desktop-hero-container">
                  <div className="ds-skeleton" style={{ width: "100%", aspectRatio: "4/5", borderRadius: "12px" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pd-info-section">
            <div>
              <div className="ds-skeleton" style={{ height: "12px", width: "80px", marginBottom: "8px", borderRadius: "2px" }}></div>
              <div className="ds-skeleton" style={{ height: "36px", width: "90%", marginBottom: "12px", borderRadius: "4px" }}></div>
              <div className="ds-skeleton" style={{ height: "40px", width: "40%", marginBottom: "16px", borderRadius: "4px" }}></div>
            </div>

            <div className="ds-skeleton" style={{ height: "48px", width: "100%", borderRadius: "4px", marginBottom: "8px" }}></div>

            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div className="ds-skeleton" style={{ height: "44px", width: "132px", borderRadius: "6px" }}></div>
              <div className="ds-skeleton" style={{ height: "24px", width: "80px", borderRadius: "999px" }}></div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <div className="ds-skeleton" style={{ height: "70px", width: "100%", borderRadius: "6px" }}></div>
              <div className="ds-skeleton" style={{ height: "70px", width: "100%", borderRadius: "6px" }}></div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              <div className="ds-skeleton" style={{ height: "50px", width: "100%", borderRadius: "4px" }}></div>
              <div className="ds-skeleton" style={{ height: "50px", width: "100%", borderRadius: "4px" }}></div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if ((!product && !loading) || isInvalid) {
    return (
      <div className="pd-not-found">
        <h1>Product Not Found</h1>
        <p>The product you're looking for doesn't exist.</p>
        <Link to="/" className="pd-back-home">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <ProductPresentationProvider value={presentation}>
      <div className="pd-page">
        <ProductDetailContent
          product={product}
          similarProducts={similarProducts}
          isMobileView={isMobileView}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          scrollSimilar={scrollSimilar}
          similarGridRef={similarGridRef}
          quantity={quantity}
          setQuantity={setQuantity}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          selectedVariant={selectedVariant}
          ctaRef={ctaRef}
          stickyVisible={stickyVisible}
          lightboxOpen={lightboxOpen}
          setLightboxOpen={setLightboxOpen}
          lightboxStartIndex={lightboxStartIndex}
          setLightboxStartIndex={setLightboxStartIndex}
          displayCategory={displayCategory}
        />
      </div>
    </ProductPresentationProvider>
  );
};

export default ProductDetail;
