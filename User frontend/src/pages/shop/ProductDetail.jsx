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
import { isOutOfStock, getProductStock, canAddQuantity, getAvailableQuantity } from "../../shared/utils/productUtils";
import ProductGallery from "@/features/products/components/ProductGallery";
import LightboxModal from "@/features/products/components/LightboxModal";
import { resolveProductImage } from "@/shared/utils/api";
import authFetch from "@/shared/utils/http";
import logger from "@/shared/utils/logger";
import { recordRecentlyViewedProduct } from "../../features/search/hooks/useRecentlyViewedProducts";
import { siteContent } from "@/config/siteContent";
import { formatPrice } from "../../utils/pricing";
import VariantSelector from "@/features/products/components/VariantSelector";
import StickyPurchaseBar from "@/features/products/components/StickyPurchaseBar";
import StockIndicator from "@/features/products/components/StockIndicator";
import StyleInspiration from "@/features/products/components/StyleInspiration";
import SizeGuideModal from "@/features/products/components/SizeGuideModal";

const colorMap = {
  black: "#1a1a1a",
  navy: "#0d1b2a",
  blue: "#2b6cb0",
  red: "#c53030",
  green: "#2f855a",
  white: "#ffffff",
  grey: "#718096",
  gray: "#718096",
  yellow: "#ecc94b",
  pink: "#ed64a6",
  beige: "#f5f5dc",
  brown: "#975a16",
  gold: "#d4af37",
  silver: "#c0c0c0",
};

/**
 * Clean luxury specifications and shipping policies accordion
 */
const ProductAccordion = ({ product }) => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const parentCat = product?.subCategory?.parentCategory?.name || "";
  const subCat = product?.subCategory?.name || "";
  const brand = product?.brand || "";
  const { policies } = siteContent;

  const items = useMemo(() => {
    const sections = [];

    // 1. Product Details (only if description or custom details exist)
    if (product?.description) {
      sections.push({
        title: "Product Details",
        icon: <FileText size={16} strokeWidth={2} />,
        content: (
          <div className="pd-accordion-text">
            <p>{product.description}</p>
          </div>
        ),
      });
    }

    // 2. Specifications (always exists from base fields)
    sections.push({
      title: "Specifications",
      icon: <Sliders size={16} strokeWidth={2} />,
      content: (
        <div className="pd-accordion-text">
          <div className="pd-spec-grid">
            <div className="pd-spec-item">
              <span className="pd-spec-label">Brand</span>
              <span className="pd-spec-value">{brand}</span>
            </div>
            {parentCat && (
              <div className="pd-spec-item">
                <span className="pd-spec-label">Category</span>
                <span className="pd-spec-value">{parentCat}</span>
              </div>
            )}
            {subCat && (
              <div className="pd-spec-item">
                <span className="pd-spec-label">Subcategory</span>
                <span className="pd-spec-value">{subCat}</span>
              </div>
            )}
            <div className="pd-spec-item">
              <span className="pd-spec-label">Availability</span>
              <span className="pd-spec-value">
                {product?.stock > 0 ? `In Stock (${product.stock} units)` : "Out of Stock"}
              </span>
            </div>
          </div>
        </div>
      ),
    });

    // 3. Materials & Care (only if data exists)
    if (product?.materials || product?.care) {
      sections.push({
        title: "Materials & Care",
        icon: <Shirt size={16} strokeWidth={2} />,
        content: (
          <div className="pd-accordion-text">
            {product.materials && <p><strong>Materials:</strong> {product.materials}</p>}
            {product.care && <p><strong>Care Instructions:</strong> {product.care}</p>}
          </div>
        ),
      });
    }

    // 4. Shipping & Returns (always exists from siteContent policies)
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
  }, [product, brand, parentCat, subCat, policies]);

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

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const cleanProductId = useMemo(() => {
    const parts = (productId || "").split("_");
    return parts[1] || parts[0];
  }, [productId]);

  // Resolve slug or categoryPrefix_id to a clean MongoDB ObjectId
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

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [addedToCart, setAddedToCart] = useState(false);
  const toast = useToast();
  const wishlisted = isInWishlist(product?._id);

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    toggleWishlist({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      brand: product.brand,
      category: product.category,
    });
  };
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const activeProduct = selectedVariant || product;
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 900 : false,
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const similarGridRef = useRef(null);
  
  // New States and Refs for PDP Redesign
  const [sizeError, setSizeError] = useState("");
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const ctaRef = useRef(null);
  const sizeRef = useRef(null);
  
  // Lightbox States
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  const scrollSimilar = (direction) => {
    if (similarGridRef.current) {
      const scrollAmount = 320;
      similarGridRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
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
      const maxStock = getAvailableQuantity(activeProduct);
      setQuantity(Math.max(1, Math.min(num, maxStock)));
    }
  };

  const handleQuantityBlur = () => {
    let qty = quantity === "" || isNaN(quantity) || quantity < 1 ? 1 : parseInt(quantity, 10);
    const maxStock = getAvailableQuantity(activeProduct);
    if (qty > maxStock) {
      qty = maxStock === Infinity ? 1 : maxStock;
      toast.info(`Only ${maxStock} units available.`);
    }
    setQuantity(qty);
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

  useEffect(() => {
    if (activeProduct) {
      const maxStock = getAvailableQuantity(activeProduct);
      setQuantity((prev) => {
        const currentQty = Number(prev) || 1;
        if (currentQty > maxStock) {
          return Math.max(1, maxStock === Infinity ? 1 : maxStock);
        }
        return currentQty;
      });
    }
  }, [activeProduct, selectedColor, selectedSize]);

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

  const availableSizes = useMemo(() => {
    const sizes = activeProduct?.sizes || product?.sizes || [];
    return Array.isArray(sizes) ? sizes.filter(Boolean) : [];
  }, [activeProduct, product]);

  const availableColors = useMemo(() => {
    const colors = activeProduct?.colors || product?.colors || [];
    return Array.isArray(colors) ? colors.filter(Boolean) : [];
  }, [activeProduct, product]);

  const styleOptions = useMemo(() => {
    const opts = [{ value: "default", label: "Default" }];
    productVariants.forEach((v) => {
      opts.push({
        value: v._id || v.id,
        label: v.name,
      });
    });
    return opts;
  }, [productVariants]);

  const sizeOptions = useMemo(() => {
    return availableSizes.map((sz) => ({
      value: sz,
      label: sz,
    }));
  }, [availableSizes]);

  const colorOptions = useMemo(() => {
    return availableColors.map((col) => {
      const lower = col.toLowerCase();
      const swatch = colorMap[lower] || lower;
      return {
        value: col,
        label: col,
        swatch,
      };
    });
  }, [availableColors]);

  const handleStyleChange = (val) => {
    if (val === "default") {
      setSelectedVariant(null);
    } else {
      const found = productVariants.find((v) => (v._id || v.id) === val);
      if (found) setSelectedVariant(found);
    }
    setSelectedSize("");
    setSelectedColor("");
  };

  const handleColorChange = (val) => {
    setSelectedColor(val);
  };

  const isProductInStock = useMemo(() => {
    if (!activeProduct) return false;
    return !isOutOfStock(activeProduct);
  }, [activeProduct]);

  const isDiscounted = useMemo(() => {
    if (!activeProduct) return false;
    return !!(activeProduct.discountPrice && activeProduct.discountPrice < activeProduct.price);
  }, [activeProduct]);

  const payPrice = useMemo(() => {
    if (!activeProduct) return 0;
    return isDiscounted ? activeProduct.discountPrice : activeProduct.price;
  }, [activeProduct, isDiscounted]);

  const oldPrice = useMemo(() => {
    if (!activeProduct) return null;
    return isDiscounted ? activeProduct.price : null;
  }, [activeProduct, isDiscounted]);

  const discountPercent = useMemo(() => {
    if (!isDiscounted || !activeProduct || !activeProduct.price || !activeProduct.discountPrice) return 0;
    return Math.round(
      ((activeProduct.price - activeProduct.discountPrice) / activeProduct.price) * 100
    );
  }, [activeProduct, isDiscounted]);

  const expectedDeliveryDate = useMemo(() => {
    const today = new Date();
    const minDelivery = new Date(today);
    minDelivery.setDate(today.getDate() + 3);
    const maxDelivery = new Date(today);
    maxDelivery.setDate(today.getDate() + 5);
    const options = { weekday: "long", month: "short", day: "numeric" };
    return `${minDelivery.toLocaleDateString("en-IN", options)} – ${maxDelivery.toLocaleDateString("en-IN", options)}`;
  }, []);

  const galleryImages = useMemo(() => {
    if (!activeProduct) return [];

    const images = [];
    if (activeProduct.image) images.push(resolveProductImage(activeProduct.image));
    if (activeProduct.image1) images.push(resolveProductImage(activeProduct.image1));
    if (activeProduct.image2) images.push(resolveProductImage(activeProduct.image2));
    if (activeProduct.image3) images.push(resolveProductImage(activeProduct.image3));
    if (activeProduct.image4) images.push(resolveProductImage(activeProduct.image4));
    if (Array.isArray(activeProduct.images)) {
      activeProduct.images.forEach((img) => {
        if (img) images.push(resolveProductImage(img));
      });
    }

    // Exclude duplicates and empty values
    return Array.from(new Set(images.filter(Boolean)));
  }, [activeProduct]);

  const galleryItems = useMemo(() => {
    const productName = activeProduct?.name || "Product";

    return galleryImages.map((src, i) => ({
      src,
      thumb: src,
      alt: `${productName} view ${i + 1}`,
      sources: [],
    }));
  }, [galleryImages, activeProduct?.name]);

  const uniqueImages = useMemo(() => {
    return galleryItems.slice(0, 5);
  }, [galleryItems]);

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

  const handleAddToCart = () => {
    if (isOutOfStock(activeProduct)) {
      toast.error("This product is currently out of stock.");
      return;
    }
    if (availableSizes.length > 0 && !selectedSize) {
      setSizeError("Please select a size to continue");
      sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSizeError("");

    const qtyToSubmit = Math.max(1, parseInt(quantity, 10) || 1);
    const maxStock = getAvailableQuantity(activeProduct);
    if (qtyToSubmit > maxStock) {
      toast.warning(`Only ${maxStock} units available. Quantity adjusted.`);
    }
    addToCart({
      product: {
        productId: product._id,
        id: product._id,
        name: activeProduct.name,
        price: payPrice,
        image: activeProduct.image,
        brand: activeProduct.brand,
        stock: getProductStock(activeProduct),
      },
      size: selectedSize,
      color: selectedColor,
      quantity: qtyToSubmit,
    });
    toast.success(`${activeProduct.name} added to bag!`);
    setAddedToCart(true);
    setQuantity(1);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  if (loading) {
    return (
      <div className="pd-page pd-page-loading" aria-busy="true" aria-label="Loading product details">
        {/* Breadcrumb Skeleton */}
        <div className="pd-breadcrumb">
          <div className="pd-breadcrumb-inner" style={{ paddingBottom: "12px", border: "none" }}>
            <div className="ds-skeleton" style={{ height: "28px", width: "80px", borderRadius: "4px" }}></div>
            <div className="ds-skeleton" style={{ height: "16px", width: "220px", borderRadius: "4px" }}></div>
          </div>
        </div>

        <section className="pd-main">
          {/* Gallery Section Skeleton */}
          <div className="pd-gallery-section">
            <div className="pg-editorial pg-editorial--desktop">
              <div className="pg-desktop-layout">
                {/* Thumbnails Sidebar Skeleton */}
                <div className="pg-desktop-anchors">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="ds-skeleton" style={{ width: "90px", height: "120px", borderRadius: "8px" }}></div>
                  ))}
                </div>
                {/* Hero Preview Skeleton */}
                <div className="pg-desktop-hero-container">
                  <div className="ds-skeleton" style={{ width: "100%", aspectRatio: "4/5", borderRadius: "12px" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section Skeleton */}
          <div className="pd-info-section">
            <div>
              <div className="ds-skeleton" style={{ height: "12px", width: "80px", marginBottom: "8px", borderRadius: "2px" }}></div>
              <div className="ds-skeleton" style={{ height: "36px", width: "90%", marginBottom: "12px", borderRadius: "4px" }}></div>
              <div className="ds-skeleton" style={{ height: "40px", width: "40%", marginBottom: "16px", borderRadius: "4px" }}></div>
            </div>

            {/* Delivery Info Skeleton */}
            <div className="ds-skeleton" style={{ height: "48px", width: "100%", borderRadius: "4px", marginBottom: "8px" }}></div>

            {/* Quantity and Stock Skeleton */}
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div className="ds-skeleton" style={{ height: "44px", width: "132px", borderRadius: "6px" }}></div>
              <div className="ds-skeleton" style={{ height: "24px", width: "80px", borderRadius: "999px" }}></div>
            </div>

            {/* Selector Skeletons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <div className="ds-skeleton" style={{ height: "70px", width: "100%", borderRadius: "6px" }}></div>
              <div className="ds-skeleton" style={{ height: "70px", width: "100%", borderRadius: "6px" }}></div>
            </div>

            {/* Actions Buttons Skeleton */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              <div className="ds-skeleton" style={{ height: "50px", width: "100%", borderRadius: "4px" }}></div>
              <div className="ds-skeleton" style={{ height: "50px", width: "100%", borderRadius: "4px" }}></div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!product && !loading) {
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
    <div className="pd-page">
      <div className="pd-breadcrumb">
        <div className="pd-breadcrumb-inner">
          <button
            onClick={() => navigate(-1)}
            className="pd-back-btn"
            aria-label="Go back"
          >
            <ChevronLeft size={20} strokeWidth={2} /> Back
          </button>
          <div className="pd-crumb-trail">
            <Link to="/">Home</Link>
            <span className="pd-crumb-sep">/</span>
            <Link to={`/shop/${displayCategory}`}>
              {displayCategory.charAt(0).toUpperCase() +
                displayCategory.slice(1)}
            </Link>
            <span className="pd-crumb-sep">/</span>
            <span className="pd-crumb-current">{activeProduct.name}</span>
          </div>
        </div>
      </div>

      <section className="pd-main">
        <div className="pd-gallery-section">
          <ProductGallery
            images={uniqueImages}
            alt={activeProduct.name}
            isMobile={isMobileView}
            openLightbox={(idx) => {
              setLightboxStartIndex(idx);
              setLightboxOpen(true);
            }}
          />
        </div>

        <div className="pd-info-section">
          <div>
            <span className="pd-brand-label">{activeProduct.brand}</span>
            <h1 className="pd-title">{activeProduct.name}</h1>

            <div className="pd-price-block">
              <span className="pd-price">{formatPrice(payPrice)}</span>
              {isDiscounted && oldPrice && (
                <>
                  <span className="pd-old-price">{formatPrice(oldPrice)}</span>
                  <span className="pd-discount">-{discountPercent}%</span>
                </>
              )}
            </div>
          </div>

          {/* Expected Delivery Section */}
          <div className="pd-delivery-info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Truck size={18} className="pd-delivery-icon" style={{ color: "var(--ds-color-accent)", flexShrink: 0 }} />
            <div>
              <span className="pd-delivery-label">Delivery:</span> Expected by <strong className="pd-delivery-date">{expectedDeliveryDate}</strong> (3-5 business days)
            </div>
          </div>
 
          {/* Quantity Selector and Stock Indicator Row */}
          <div className="pd-quantity-stock-row">
            <div className="pd-quantity-selector">
              <button
                type="button"
                className="pd-qty-btn"
                onClick={() =>
                  setQuantity((prev) => Math.max(1, (Number(prev) || 1) - 1))
                }
                disabled={Number(quantity) <= 1}
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
              />
              <button
                type="button"
                className="pd-qty-btn"
                onClick={() => {
                  const next = (Number(quantity) || 1) + 1;
                  const maxStock = getAvailableQuantity(activeProduct);
                  if (next > maxStock) {
                    toast.info(`Only ${maxStock} units available.`);
                    return;
                  }
                  setQuantity(next);
                }}
                aria-label="Increase quantity"
                disabled={!canAddQuantity(activeProduct, (Number(quantity) || 1) + 1)}
              >
                +
              </button>
            </div>
            <StockIndicator
              inStock={isProductInStock}
              stockCount={typeof activeProduct.stock === "number" ? activeProduct.stock : undefined}
            />
          </div>
 
          {/* Style Selector (only if backend provides variants) */}
          {productVariants.length > 0 && (
            <VariantSelector
              name="style"
              label="Select Style"
              type="text"
              options={styleOptions}
              selectedValue={selectedVariant ? (selectedVariant._id || selectedVariant.id) : "default"}
              onChange={handleStyleChange}
            />
          )}
 
          {/* Size Selector (only if backend provides sizes) */}
          {availableSizes.length > 0 && (
            <div ref={sizeRef}>
              <VariantSelector
                name="size"
                label="Select Size"
                type="size"
                options={sizeOptions}
                selectedValue={selectedSize}
                onChange={(val) => {
                  setSelectedSize(val);
                  setSizeError("");
                }}
                onSizeGuideClick={() => setIsSizeGuideOpen(true)}
                error={sizeError}
              />
            </div>
          )}
 
          {/* Color Selector (only if backend provides colors) */}
          {availableColors.length > 0 && (
            <VariantSelector
              name="color"
              label="Select Color"
              type="color"
              options={colorOptions}
              selectedValue={selectedColor}
              onChange={handleColorChange}
            />
          )}

          <div className="pd-actions" ref={ctaRef}>
            <div className="pd-actions-row">
              <button
                className={`pd-add-to-cart ${addedToCart ? "added" : ""}`}
                onClick={handleAddToCart}
                disabled={!isProductInStock}
              >
                <ShoppingBag size={18} style={{ marginRight: "8px", verticalAlign: "middle" }} />
                {addedToCart ? "Added ✓" : "Add to Bag"}
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

          {/* Store-level Trust Badges (No product generated content) */}
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

          {/* Product Specifications (Real Backend Data only) */}
          <ProductAccordion product={product} />
        </div>
      </section>

      {/* Style Inspiration Section */}
      {galleryImages.length >= 2 && (
        <StyleInspiration
          images={galleryImages}
          productName={activeProduct?.name || "Product"}
        />
      )}

      {/* Similar Products Section */}
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

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <LightboxModal
          images={uniqueImages}
          startIndex={lightboxStartIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />

      {/* Sticky Purchase Bar */}
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
    </div>
  );
};

export default ProductDetail;
