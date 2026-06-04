import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Star,
  Truck,
  RotateCcw,
  Shield,
  ChevronLeft,
  ChevronRight,
  Heart,
  Wind,
  Feather,
  Activity,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProductQuery } from "../../features/products/hooks/useProductQuery";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useCart } from "@/features/cart/hooks/useCart";
import { useToast } from "../../context/ToastContext";
import ProductCard from "@/features/products/components/ProductCard";
import { IMAGE_FALLBACK } from "../../constants/images";
import { CURRENCY } from "@/constants/currency";
import "../../styles/ProductDetail.css";
import ProductGallery from "@/features/products/components/ProductGallery";
import ProductInfo from "@/features/products/components/ProductInfo";
import StickyPurchaseBar from "@/features/products/components/StickyPurchaseBar";
import LightboxModal from "@/features/products/components/LightboxModal";
import ResponsiveImage from "@/shared/components/ui/ResponsiveImage";
import logger from "@/shared/utils/logger";
import { API_BASE_URL, buildApiUrl } from "@/shared/utils/api";
import { recordRecentlyViewedProduct } from "../../features/search/hooks/useRecentlyViewedProducts";

const COLOR_OPTIONS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "Navy", hex: "#1b2a4a" },
  { name: "Beige", hex: "#c8b896" },
  { name: "Charcoal", hex: "#444444" },
];

/**
 * Luxury Product details Accordion (Details & Specifications, Shipping & Returns)
 */
const ProductAccordion = ({ product, displayProduct, currentVariant, derivedStock }) => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const parentCat = product?.subCategory?.parentCategory?.name || "";
  const subCat = product?.subCategory?.name || "";
  const brand = product?.brand || "";
  const sku = displayProduct?.sku || currentVariant?.sku || "N/A";
  const stock = typeof derivedStock === 'number' ? derivedStock : (displayProduct?.stock ?? product?.stock ?? 0);

  const items = [
    {
      title: "Details & Specifications",
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
              <span className="pd-spec-label">SKU</span>
              <span className="pd-spec-value">{sku}</span>
            </div>
            <div className="pd-spec-item">
              <span className="pd-spec-label">Availability</span>
              <span className="pd-spec-value">
                {stock > 0 ? `In Stock (${stock} units)` : "Out of Stock"}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Shipping & Returns",
      content: (
        <div className="pd-accordion-text">
          <p>Complimentary standard shipping is included with all orders. Delivery typically takes 3–5 business days.</p>
          <p>We offer free returns and exchanges within 30 days of delivery. Items must be unworn, unwashed, and returned in their original packaging with tags intact.</p>
        </div>
      ),
    },
  ];

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
            <span>{item.title}</span>
            <span className="pd-accordion-icon">{openIndex === i ? "—" : "+"}</span>
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

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [sizeError, setSizeError] = useState("");
  
  const { data: product, isLoading: loading } = useProductQuery(productId);
  
  const { data: similarProducts = [] } = useQuery({
    queryKey: ["products", "similar", product?._id],
    queryFn: async () => {
      if (!product) return [];
      const categoryId = product.category?._id || product.category;
      const subCategoryId = product.subCategory?._id || product.subCategory;
      const tagQuery = product.tags?.length ? `&tags=${product.tags[0]}` : "";
      const res = await fetch(
        buildApiUrl(`/api/product/public/all?category=${categoryId}&subCategory=${subCategoryId}${tagQuery}`)
      );
      if (!res.ok) return [];
      const json = await res.json();
      const filtered = (json.data || []).filter((p) => p._id !== product._id);
      return filtered.sort(() => 0.5 - Math.random()).slice(0, 8);
    },
    enabled: !!product,
    staleTime: 5 * 60 * 1000,
  });

  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const actionsRef = useRef(null);
  const [actionsInView, setActionsInView] = useState(true);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 840 : false,
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const similarGridRef = useRef(null);
  
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
      setQuantity(Math.max(1, num));
    }
  };

  const handleQuantityBlur = () => {
    if (quantity === "" || isNaN(quantity) || quantity < 1) {
      setQuantity(1);
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
    return product?.category || urlSplit.category;
  }, [product, urlSplit]);

  useEffect(() => {
    if (product) {
      recordRecentlyViewedProduct(product);
    }
  }, [product]);



  const colorOptions = useMemo(() => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      const uniqueColors = {};
      product.variants.forEach((v) => {
        if (v.status === "Active" && v.color) {
          const key = v.color.toLowerCase();
          if (!uniqueColors[key]) {
            uniqueColors[key] = {
              value: key,
              label: v.color,
              swatch: v.colorHex || "#b5b5b5",
            };
          }
        }
      });
      const list = Object.values(uniqueColors);
      if (list.length > 0) return list;
    }

    const fromProduct = Array.isArray(product?.colors)
      ? product.colors.map((color, index) => {
          const colorValue = typeof color === "string" ? color : color.value;
          const label =
            typeof color === "string" ? color : color.label || color.value;
          return {
            value: String(colorValue || `color-${index}`).toLowerCase(),
            label,
            swatch:
              typeof color === "string"
                ? COLOR_OPTIONS.find(
                    (defaultColor) =>
                      defaultColor.name.toLowerCase() === color.toLowerCase(),
                  )?.hex || "#b5b5b5"
                : color.hex || "#b5b5b5",
          };
        })
      : [];

    if (fromProduct.length > 0) return fromProduct;

    return COLOR_OPTIONS.map((color) => ({
      value: color.name.toLowerCase(),
      label: color.name,
      swatch: color.hex,
    }));
  }, [product?.colors, product?.variants]);

  const currentVariant = useMemo(() => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return product.variants.find(
        (v) =>
          v.status === "Active" &&
          v.color.toLowerCase() === selectedColor.toLowerCase() &&
          v.size === selectedSize
      );
    }
    return null;
  }, [product?.variants, selectedColor, selectedSize]);

  const displayProduct = useMemo(() => {
    if (!product) return null;
    const copy = { ...product };
    if (currentVariant) {
      copy.price = currentVariant.price;
      copy.discountPrice = currentVariant.discountPrice;
      copy.discountPercent = currentVariant.discountPercent;
      copy.sku = currentVariant.sku;
      copy.stock = currentVariant.stock;
      if (currentVariant.image) {
        copy.image = currentVariant.image;
      }
    }
    return copy;
  }, [product, currentVariant]);

  const sizeStockMap = useMemo(() => {
    if (product?.stockBySize && typeof product.stockBySize === "object") {
      return product.stockBySize;
    }

    if (Array.isArray(product?.variants)) {
      return product.variants.reduce((acc, variant) => {
        if (variant?.size && variant.color.toLowerCase() === selectedColor.toLowerCase()) {
          acc[variant.size] = Number.isFinite(variant.stock) ? variant.stock : 0;
        }
        return acc;
      }, {});
    }

    return {};
  }, [product, selectedColor]);

  const sizeOptions = useMemo(() => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      const sizesFromVariants = Array.from(
        new Set(product.variants.filter((v) => v.status === "Active").map((v) => v.size))
      );
      const order = { "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "XXL": 6 };
      sizesFromVariants.sort((a, b) => (order[a] || 99) - (order[b] || 99));

      const finalSizes = sizesFromVariants.length > 0 ? sizesFromVariants : ["S", "M", "L", "XL"];

      return finalSizes.map((size) => {
        const knownStock = sizeStockMap[size];
        const outOfStock = Number.isFinite(knownStock) ? knownStock <= 0 : true;
        return {
          value: size,
          label: size,
          outOfStock,
          disabled: outOfStock,
        };
      });
    }

    const rawSizes =
      Array.isArray(product?.sizes) && product.sizes.length > 0
        ? product.sizes
        : ["S", "M", "L", "XL"];

    return rawSizes.map((size) => {
      const knownStock = sizeStockMap[size];
      const outOfStock = Number.isFinite(knownStock) ? knownStock <= 0 : false;
      return {
        value: size,
        label: size,
        outOfStock,
        disabled: outOfStock,
      };
    });
  }, [product?.sizes, product?.variants, sizeStockMap]);

  const selectedSizeOption = useMemo(
    () => sizeOptions.find((option) => option.value === selectedSize),
    [selectedSize, sizeOptions],
  );

  const selectedColorLabel = useMemo(() => {
    return (
      colorOptions.find((option) => option.value === selectedColor)?.label ||
      selectedColor
    );
  }, [colorOptions, selectedColor]);

  const isSelectedSizeOutOfStock = Boolean(selectedSizeOption?.outOfStock);

  const isProductInStock = useMemo(() => {
    if (!product) return false;
    if (currentVariant) {
      return currentVariant.stock > 0;
    }
    if (typeof product.stock === "number") {
      return product.stock > 0;
    }
    return product.inStock !== false;
  }, [product, currentVariant]);

  const derivedStock = useMemo(() => {
    return selectedSize && sizeStockMap && sizeStockMap[selectedSize] !== undefined
      ? sizeStockMap[selectedSize]
      : (displayProduct ? displayProduct.stock : 0);
  }, [selectedSize, sizeStockMap, displayProduct]);

  const stockStatusMessage = useMemo(() => {
    if (!isProductInStock) return "Out of stock";
    if (!selectedSize) return "Select a size to confirm stock";
    if (isSelectedSizeOutOfStock)
      return `${selectedSize} is currently out of stock`;
    if (derivedStock <= 5 && derivedStock > 0) {
      return `Only ${derivedStock} left in stock`;
    }
    return "In stock and ready to ship";
  }, [isSelectedSizeOutOfStock, isProductInStock, selectedSize, derivedStock]);

  const isDiscounted = useMemo(() => {
    if (!displayProduct) return false;
    return displayProduct.discountPercent > 0 || (displayProduct.discountPrice && displayProduct.discountPrice < displayProduct.price);
  }, [displayProduct]);

  const payPrice = useMemo(() => {
    if (!displayProduct) return 0;
    return isDiscounted ? displayProduct.discountPrice : displayProduct.price;
  }, [displayProduct, isDiscounted]);

  const oldPrice = useMemo(() => {
    if (!displayProduct) return null;
    return isDiscounted ? displayProduct.price : null;
  }, [displayProduct, isDiscounted]);

  const discountPercent = useMemo(() => {
    if (!isDiscounted || !displayProduct) return 0;
    return displayProduct.discountPercent || Math.round(((displayProduct.price - displayProduct.discountPrice) / displayProduct.price) * 100);
  }, [displayProduct, isDiscounted]);


  const categoryFeatures = useMemo(() => {
    if (!product) return [];
    const name = (product.name || "").toLowerCase();
    const catName = (product.category?.name || displayCategory || "").toLowerCase();
    
    if (name.includes("shoe") || catName.includes("shoe") || catName.includes("sport")) {
      return [
        { icon: Wind, title: "Breathable Knit Upper", desc: "For all-day comfort" },
        { icon: Feather, title: "Lightweight Design", desc: "Reduces fatigue" },
        { icon: Activity, title: "Flexible Outsole", desc: "Natural movement" },
        { icon: Layers, title: "Cushioned Midsole", desc: "Soft & responsive" }
      ];
    } else if (name.includes("shirt") || name.includes("pant") || name.includes("jacket") || catName.includes("clothing")) {
      return [
        { icon: Wind, title: "Premium Natural Fibers", desc: "Exceptional softness" },
        { icon: Feather, title: "Thermoregulating", desc: "All-day breathability" },
        { icon: Layers, title: "Reinforced Seams", desc: "Built to last" },
        { icon: Shield, title: "Easy Care", desc: "Machine washable" }
      ];
    } else {
      return [
        { icon: Shield, title: "Premium Materials", desc: "Timeless quality" },
        { icon: Layers, title: "Minimal Design", desc: "Effortless styling" },
        { icon: Feather, title: "Comfortable Fit", desc: "Designed for movement" },
        { icon: RotateCcw, title: "Sustainable Sourcing", desc: "OCS certified organic" }
      ];
    }
  }, [product, displayCategory]);

  const showDetailsSection = categoryFeatures.length > 0;

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          fill={i <= Math.round(rating) ? "#1a1a1a" : "none"}
          stroke="#1a1a1a"
          strokeWidth={2}
        />,
      );
    }
    return stars;
  };

  const galleryImages = useMemo(() => {
    if (!product)
      return [IMAGE_FALLBACK];

    const resolveImage = (path) => {
      if (!path) return null;
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }
      return `${API_BASE_URL}${path}`;
    };

    const targetObj = currentVariant && currentVariant.image ? currentVariant : product;

    const images = [];
    if (targetObj.image) images.push(resolveImage(targetObj.image));
    if (targetObj.image1) images.push(resolveImage(targetObj.image1));
    if (targetObj.image2) images.push(resolveImage(targetObj.image2));
    if (targetObj.image3) images.push(resolveImage(targetObj.image3));
    if (targetObj.image4) images.push(resolveImage(targetObj.image4));

    if (images.length === 0) {
      images.push(IMAGE_FALLBACK);
    }

    return images;
  }, [product, currentVariant]);

  const galleryItems = useMemo(() => {
    const productName = product?.name || "Product";

    return galleryImages.map((src, i) => ({
      src,
      thumb: src,
      alt: `${productName} view ${i + 1}`,
      sources: [],
    }));
  }, [galleryImages, product?.name]);

  const { uniqueImages, uniqueIndices } = useMemo(() => {
    const seen = new Set();
    const imgs = [];
    const idxs = [];
    galleryItems.forEach((img, i) => {
      if (img.src && !seen.has(img.src)) {
        seen.add(img.src);
        imgs.push(img);
        idxs.push(i);
      }
    });
    return { uniqueImages: imgs, uniqueIndices: idxs };
  }, [galleryItems]);

  useEffect(() => {
    if (!sizeError) return;
    if (selectedSize && !isSelectedSizeOutOfStock) {
      setSizeError("");
    }
  }, [isSelectedSizeOutOfStock, selectedSize, sizeError]);

  useEffect(() => {
    if (!colorOptions.length) return;
    const selectedExists = colorOptions.some(
      (option) => option.value === selectedColor,
    );
    if (!selectedExists) {
      setSelectedColor(colorOptions[0].value);
    }
  }, [colorOptions, selectedColor]);

  // Sync selected size if it becomes unavailable or out-of-stock in newly selected color
  useEffect(() => {
    if (selectedSize && sizeStockMap) {
      const stock = sizeStockMap[selectedSize];
      if (stock === undefined || stock <= 0) {
        setSelectedSize("");
      }
    }
  }, [selectedColor, sizeStockMap, selectedSize]);


  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 840);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // True if the purchase block has scrolled past the top of the screen (out of view above)
        const isPast = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
        setActionsInView(!isPast);
      },
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [actionsRef]);

  const stickyVisible = isMobileView && !actionsInView;

  const handleAddToCart = () => {
    if (!selectedSize || isSelectedSizeOutOfStock) {
      setSizeError(
        selectedSize
          ? "Selected size is unavailable. Please choose another."
          : "Please select a size",
      );
      toast.warning("Please select a size");
      // Focus size selector for keyboard accessibility
      const sizeSelectorEl = document.querySelector(".vs-root--size .vs-option:not(.vs-option--disabled)");
      if (sizeSelectorEl) {
        sizeSelectorEl.focus();
      } else {
        const firstSizeEl = document.querySelector(".vs-root--size .vs-option");
        if (firstSizeEl) firstSizeEl.focus();
      }
      return;
    }
    const qtyToSubmit = Math.max(1, parseInt(quantity, 10) || 1);
    addToCart({
      product: {
        productId: product._id,
        id: product._id,
        name: displayProduct.name,
        price: displayProduct.price,
        image: displayProduct.image,
        brand: displayProduct.brand,
      },
      size: selectedSize,
      color: selectedColorLabel,
      quantity: qtyToSubmit,
    });
    toast.success(`${product.name} added to cart!`);
    setAddedToCart(true);
    setQuantity(1);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (loading) {
    return (
      <div className="pd-page" style={{ padding: "40px var(--spacing-section-lg)", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "60px" }}>
          <div>
            <div className="ds-skeleton" style={{ aspectRatio: "3/4", width: "100%", borderRadius: "8px" }}></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="ds-skeleton" style={{ height: "24px", width: "30%" }}></div>
            <div className="ds-skeleton" style={{ height: "48px", width: "90%" }}></div>
            <div className="ds-skeleton" style={{ height: "32px", width: "40%" }}></div>
            <div className="ds-skeleton" style={{ height: "100px", width: "100%" }}></div>
            <div className="ds-skeleton" style={{ height: "54px", width: "100%" }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
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
            <span className="pd-crumb-current">{product.name}</span>
          </div>
        </div>
      </div>

      <section className="pd-main">
        <div className="pd-gallery-section">
          <ProductGallery
            images={galleryItems}
            alt={product.name}
            isMobile={isMobileView}
            openLightbox={(idx) => {
              setLightboxStartIndex(idx);
              setLightboxOpen(true);
            }}
          />
        </div>

        <div className="pd-info-section">
          <ProductInfo
            displayCategory={displayCategory}
            product={displayProduct}
            colorOptions={colorOptions}
            sizeOptions={sizeOptions}
            selectedColor={selectedColor}
            onColorChange={(v) => setSelectedColor(v)}
            selectedSize={selectedSize}
            onSizeChange={(v) => {
              setSelectedSize(v);
              setSizeError("");
            }}
            sizeError={sizeError}
            payPrice={payPrice}
            oldPrice={oldPrice}
            discountPercent={discountPercent}
          />

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
                onClick={() => setQuantity((prev) => (Number(prev) || 1) + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <div className="pd-stock-indicator">
              {stockStatusMessage}
            </div>
          </div>

          <div className="pd-actions" ref={actionsRef}>
            <button
              className="pd-add-to-cart"
              onClick={handleAddToCart}
              disabled={!isProductInStock || isSelectedSizeOutOfStock}
            >
              <ShoppingBag size={18} style={{ marginRight: "8px", verticalAlign: "middle" }} />
              {addedToCart ? "Added ✓" : "Add to Cart"}
            </button>
            <button
              className="pd-buy-now"
              onClick={() => {
                if (!selectedSize || isSelectedSizeOutOfStock) {
                  setSizeError(
                    selectedSize
                      ? "Selected size is unavailable. Please choose another."
                      : "Please select a size",
                  );
                  toast.warning("Please select a size");
                  // Focus size selector for keyboard accessibility
                  const sizeSelectorEl = document.querySelector(".vs-root--size .vs-option:not(.vs-option--disabled)");
                  if (sizeSelectorEl) {
                    sizeSelectorEl.focus();
                  } else {
                    const firstSizeEl = document.querySelector(".vs-root--size .vs-option");
                    if (firstSizeEl) firstSizeEl.focus();
                  }
                  return;
                }
                const qtyToSubmit = Math.max(1, parseInt(quantity, 10) || 1);
                addToCart({
                  product: {
                    productId: product._id,
                    id: product._id,
                    name: displayProduct.name,
                    price: payPrice,
                    image: displayProduct.image,
                    brand: displayProduct.brand,
                  },
                  size: selectedSize,
                  color: selectedColorLabel,
                  quantity: qtyToSubmit,
                });
                toast.success(`${product.name} added to cart!`);
                navigate("/checkout");
              }}
              disabled={!isProductInStock || isSelectedSizeOutOfStock}
            >
              Buy Now
            </button>
          </div>

          {/* Trust badges */}
          <div className="pd-trust-row">
            <div className="pd-trust-item">
              <Shield size={16} className="pd-trust-icon" />
              <div className="pd-trust-text">
                <span className="pd-trust-title">Secure Payment</span>
                <span className="pd-trust-desc">100% protected</span>
              </div>
            </div>
            <div className="pd-trust-item">
              <RotateCcw size={16} className="pd-trust-icon" />
              <div className="pd-trust-text">
                <span className="pd-trust-title">Easy Returns</span>
                <span className="pd-trust-desc">30-day return policy</span>
              </div>
            </div>
            <div className="pd-trust-item">
              <Truck size={16} className="pd-trust-icon" />
              <div className="pd-trust-text">
                <span className="pd-trust-title">Free Shipping</span>
                <span className="pd-trust-desc">Orders above ₹1000</span>
              </div>
            </div>
          </div>

          {/* Product details (Accordion) */}
          <ProductAccordion
            product={product}
            displayProduct={displayProduct}
            currentVariant={currentVariant}
            derivedStock={derivedStock}
          />
        </div>


      </section>

      <section className="pd-similar">
        <div className="pd-similar-header">
          <h2 className="pd-similar-title">Explore Similar Items</h2>
          <div className="pd-similar-controls">
            <Link to={`/shop/${displayCategory}`} className="pd-view-all">
              View All
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

      <StickyPurchaseBar
        product={displayProduct}
        thumbnail={
          galleryItems && galleryItems[0]
            ? galleryItems[0].thumb
            : displayProduct.image
        }
        title={displayProduct.name}
        selectedVariantSummary={`${selectedColorLabel} / ${selectedSize || "Size"}`}
        price={displayProduct.price}
        disabled={!isProductInStock || isSelectedSizeOutOfStock}
        onAddToCart={handleAddToCart}
        visible={stickyVisible}
      />

      {/* ════════════ LIGHTBOX ════════════ */}
      {lightboxOpen && (
        <LightboxModal
          images={uniqueImages}
          startIndex={lightboxStartIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductDetail;
