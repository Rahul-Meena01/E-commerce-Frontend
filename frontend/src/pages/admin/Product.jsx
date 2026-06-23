
import { useState, useEffect, useCallback } from "react";
import "./product.css";
import SearchableDropdown from "../../components/SearchableDropdown";
import ImageUploader from "../../components/ImageUploader";

// ─────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────


const EditIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ImagePlaceholderIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const API_URL = "http://localhost:3000";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const calcFinalPrice = (price, pct) => {
  if (!pct) return price;
  return Math.round(price - (price * pct) / 100);
};

// ─────────────────────────────────────────────────────────────
// PRODUCT MODAL
// ─────────────────────────────────────────────────────────────

function ProductModal({
  mode,
  product,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [selectedParent, setSelectedParent] = useState(
    isEdit ? product?.subCategory?.parentCategory?._id || "" : "",
  );

  const [selectedCategory, setSelectedCategory] = useState(
    isEdit ? product?.subCategory?._id || "" : "",
  );

  const [name, setName] = useState(isEdit ? product?.name || "" : "");
  const [brand, setBrand] = useState(isEdit ? product?.brand || "" : "");
  const [slug, setSlug] = useState(isEdit ? product?.slug || "" : "");
  const [stock, setStock] = useState(isEdit ? product?.stock ?? "" : "");
  const [price, setPrice] = useState(isEdit ? product?.price || "" : "");

  const [discountPercent, setDiscountPercent] = useState(
    isEdit ? product?.discountPercent || "" : "",
  );

  const [status, setStatus] = useState(
    isEdit ? product?.status || "Active" : "Active",
  );

  const createImageState = (existing = "") => ({
    file: null,
    existing,
  });

  const [images, setImages] = useState({
    image: createImageState(product?.image || ""),
    image1: createImageState(product?.image1 || ""),
    image2: createImageState(product?.image2 || ""),
    image3: createImageState(product?.image3 || ""),
    image4: createImageState(product?.image4 || ""),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const relationInactive = false; // Simplified for now since we don't have full objects

  useEffect(() => {
    if (relationInactive) {
      setStatus("Inactive");
    }
  }, [relationInactive]);

  // Image handlers handled directly in renderUploadBox now



  const handleSubmit = async () => {
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }

    if (stock === "" || stock < 0) {
      setError("Stock must be 0 or more.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();

      formData.append("subCategory", selectedCategory);
      formData.append("name", name);
      formData.append("brand", brand);
      formData.append("price", price);
      formData.append("discountPercent", discountPercent);
      formData.append("status", relationInactive ? "Inactive" : status);
      formData.append("slug", slug.trim());
      formData.append("stock", stock);

      Object.keys(images).forEach((key) => {
        if (images[key].file instanceof File) {
          formData.append(key, images[key].file);
        } else {
          formData.append(key, images[key].existing || "");
        }
      });

      const response = await fetch(
        isEdit ? `/api/product/update/${product._id}` : "/api/product/create",
        {
          method: isEdit ? "PUT" : "POST",
          headers: getHeaders(),
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        onSaved();
        onClose();
      } else {
        setError(data.message || "Failed");
      }
    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const renderUploadBox = (field, isHero = false) => {
    const current = images[field];

    return (
      <ImageUploader
        label={isHero ? "MAIN IMAGE" : ""}
        initialUrl={current.existing}
        onUploadSuccess={(url) => {
          setImages((prev) => ({
            ...prev,
            [field]: { file: null, existing: url },
          }));
        }}
        onRemove={() => {
          setImages((prev) => ({
            ...prev,
            [field]: { file: null, existing: "" },
          }));
        }}
        aspectRatio="1/1"
        style={{ height: "100%", width: "100%" }}
        className={`pm-img-upload ${isHero ? "pm-img-hero" : "pm-img-carousel"}`}
      />
    );
  };

  return (
    <div className="pm-overlay">
      <div className="pm-modal">
        <div className="pm-modal-header">
          <span className="pm-modal-title">
            {isEdit ? "Edit Product" : "New Product"}
          </span>

          <button className="btn-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-image-blueprint">
            {renderUploadBox("image", true)}

            <div className="pm-carousel-grid">
              {renderUploadBox("image1")}
              {renderUploadBox("image2")}
              {renderUploadBox("image3")}
              {renderUploadBox("image4")}
            </div>
          </div>

          <div className="pm-field">
            <label>Parent Category</label>
            <div style={{ marginTop: "8px" }}>
              <SearchableDropdown
                value={selectedParent}
                onChange={(val) => {
                  setSelectedParent(val);
                  setSelectedCategory("");
                }}
                fetchUrl="/api/category/search"
                placeholder="Select Parent Category"
              />
            </div>
          </div>

          <div className="pm-field">
            <label>Sub Category</label>
            <div style={{ marginTop: "8px" }}>
              <SearchableDropdown
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                fetchUrl="/api/subCategory/search"
                placeholder="Select Sub Category"
              />
            </div>
          </div>

          <div className="pm-row">
            <div className="pm-field">
              <label>Product Name</label>

              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEdit) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }}
              />
            </div>

            <div className="pm-field">
              <label>Brand</label>

              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="pm-row">
            <div className="pm-field">
              <label>Slug</label>

              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>

            <div className="pm-field">
              <label>Stock</label>

              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="pm-row">
            <div className="pm-field">
              <label>Price</label>

              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="pm-field">
              <label>Discount %</label>

              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
          </div>

          <div className="pm-field">
            <label>Status</label>

            <select
              value={relationInactive ? "Inactive" : status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={relationInactive}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {error && <p className="pm-error">{error}</p>}
        </div>

        <div className="pm-modal-footer">
          <button className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn-modal-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : isEdit
                ? "Update Product"
                : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DELETE MODAL
// ─────────────────────────────────────────────────────────────

function ConfirmModal({ product, onClose, onConfirm }) {
  return (
    <div className="pm-overlay">
      <div className="pm-modal pm-modal-sm">
        <div className="pm-modal-header">
          <span className="pm-modal-title">Delete Product</span>

          <button className="btn-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="pm-modal-body">
          <p className="pm-confirm-text">
            Are you sure you want to delete
            <strong> {product.name}</strong> ?
          </p>
        </div>

        <div className="pm-modal-footer">
          <button className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>

          <button className="btn-modal-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

function Product() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const load = useCallback(async (pageNum = 1) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getHeaders(),
      };

      const params = new URLSearchParams({
        page: pageNum,
        search: search,
        status: filterStatus,
      });

      if (filterCategory) {
        params.append("category", filterCategory);
      }

      const queryParams = params.toString();
      const prodRes = await fetch(`/api/product/all?${queryParams}`, { headers });
      const prodData = await prodRes.json();

      setProducts(prodData.data || []);
      setTotalPages(Math.ceil((prodData.total || 1) / PAGE_SIZE) || 1);
      setStats({
        total: prodData.total || 0,
        active: prodData.active || 0,
        inactive: prodData.inactive || 0,
      });
    } catch (err) {
      console.log(err);
    }
  }, [search, filterStatus, filterCategory]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCategory]);

  const getEffectiveProductStatus = (product) => {
    const categoryInactive =
      product.subCategory?.parentCategory?.status === "Inactive";
    const subCategoryInactive = product.subCategory?.status === "Inactive";

    return categoryInactive || subCategoryInactive ? "Inactive" : product.status;
  };

  const paginated = products;

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/product/delete/${deleteTarget._id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        load();
        setDeleteTarget(null);
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="container">
      <div className="pm-header">
        <h1>Manage Products</h1>

        <button
          className="btn-new-product"
          onClick={() =>
            setModal({
              mode: "create",
            })
          }
        >
          <PlusIcon />
          New Product
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        {[
          ["Total", stats.total, "#6366f1"],
          ["Active", stats.active, "#10b981"],
          ["Inactive", stats.inactive, "#f43f5e"],
        ].map(([label, val, color]) => (
          <div
            key={label}
            style={{
              flex: 1,
              background: "white",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              borderLeft: `4px solid ${color}`,
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                margin: 0
              }}
            >
              {label}
            </p>
            <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a" }}>
              {val}
            </h2>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTERS */}

      <div className="pm-toolbar">
        <div className="pm-search-wrap">
          <SearchIcon />

          <input
            className="pm-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ minWidth: "220px" }}>
          <SearchableDropdown
            value={filterCategory}
            onChange={(val) => setFilterCategory(val || "")}
            fetchUrl="/api/category/search"
            placeholder="All Categories"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* TABLE */}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Product</th>
              <th>Brand</th>
              <th>Slug</th>
              <th>Stock</th>
              <th>Category</th>
              <th>SubCategory</th>
              <th>Price</th>
              <th>Discount</th>
              <th>Final Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="12">No Products Found</td>
              </tr>
            ) : (
              paginated.map((product) => {
                const finalPrice = calcFinalPrice(
                  product.price,
                  product.discountPercent,
                );
                const effectiveStatus = getEffectiveProductStatus(product);

                return (
                  <tr key={product._id}>
                    <td>
                      {product.image ? (
                        <img
                          src={`${API_URL}${product.image}`}
                          alt={product.name}
                          className="pm-thumb"
                        />
                      ) : (
                        <div className="pm-no-img">
                          <ImagePlaceholderIcon />
                        </div>
                      )}
                    </td>

                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.brand || "—"}</td>

                    <td>{product.slug || "—"}</td>

                    <td>{product.stock ?? "—"}</td>

                    <td>{product.subCategory?.parentCategory?.name || "—"}</td>

                    <td>{product.subCategory?.name || "—"}</td>

                    <td>₹{product.price}</td>

                    <td>
                      {product.discountPercent
                        ? `${product.discountPercent}%`
                        : "—"}
                    </td>

                    <td>
                      <strong>₹{finalPrice}</strong>
                    </td>

                    <td>
                      <span
                        className={`pm-badge ${
                          effectiveStatus === "Active"
                            ? "pm-badge-active"
                            : "pm-badge-inactive"
                        }`}
                      >
                        {effectiveStatus}
                      </span>
                    </td>

                    <td>
                      <div className="pm-action-cell">
                        <button
                          className="btn-icon-action btn-edit-icon"
                          onClick={() =>
                            setModal({
                              mode: "edit",
                              product,
                            })
                          }
                        >
                          <EditIcon />
                        </button>

                        <button
                          className="btn-icon-action btn-del-icon"
                          onClick={() => setDeleteTarget(product)}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}

      {totalPages > 1 && (
        <div className="pm-pagination">
          <button
            className="pm-page-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeftIcon />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`pm-page-btn ${page === p ? "pm-page-active" : ""}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            className="pm-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}

      {/* MODALS */}

      {modal && (
        <ProductModal
          mode={modal.mode}
          product={modal.product}
          onClose={() => setModal(null)}
          onSaved={() => load(page)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

export default Product;
