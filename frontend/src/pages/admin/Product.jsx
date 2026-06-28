import { useState, useEffect, useCallback, useRef } from "react";
import "./product.css";
import SearchableDropdown from "../../components/SearchableDropdown";
import ImageUploader from "../../components/ImageUploader";
import Pagination from "../../components/Pagination";
import StatCard from "../../components/admin/StatCard";
import AdminButton from "../../components/admin/AdminButton";
import { ToggleLeft, ToggleRight } from "lucide-react";
import API from "../../utils/api";

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
  const [stock, setStockQty] = useState(isEdit ? product?.stock ?? "" : "");
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

      const data = await API(
        isEdit ? `/api/product/update/${product._id}` : "/api/product/create",
        {
          method: isEdit ? "PUT" : "POST",
          body: formData,
        },
      );

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
                fetchUrl={selectedParent ? `/api/subCategory/search?parentCategory=${selectedParent}` : "/api/subCategory/search"}
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
                <label className="pm-label">Stock *</label>
                <input
                  type="number"
                  className="pm-input"
                  value={stock}
                  onChange={(e) => setStockQty(e.target.value)}
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
      const params = new URLSearchParams({
        page: pageNum,
        search: search,
        status: filterStatus,
      });

      if (filterCategory) {
        params.append("category", filterCategory);
      }

      const queryParams = params.toString();
      const prodData = await API(`/api/product/all?${queryParams}`);

      const activeProducts = (prodData.data || []).filter(p => !p.isDeleted);
      setProducts(activeProducts);
      setTotalPages(prodData.pages || Math.ceil((prodData.total || 1) / PAGE_SIZE) || 1);
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
      const data = await API(`/api/product/delete/${deleteTarget._id}`, {
        method: "DELETE",
      });

      if (data.success) {
        load();
        setDeleteTarget(null);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const newStatus = product.status === "Active" ? "Inactive" : "Active";
      const data = await API(`/api/product/update/${product._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (data.success) {
        load();
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="container">
      <div className="pm-header">
        <h1>Manage Products</h1>
        <AdminButton
          icon={PlusIcon}
          onClick={() => setModal({ mode: "create" })}
        >
          New Product
        </AdminButton>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <StatCard label="Total" value={stats.total} color="#6366f1" />
        <StatCard label="Active" value={stats.active} color="#10b981" />
        <StatCard label="Inactive" value={stats.inactive} color="#f43f5e" />
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
              <th>ID</th>
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
              paginated.map((product, index) => {
                const finalPrice = calcFinalPrice(
                  product.price,
                  product.discountPercent,
                );
                const effectiveStatus = getEffectiveProductStatus(product);
                const displayId = (page - 1) * PAGE_SIZE + index + 1;

                return (
                  <tr key={product._id}>
                    <td>{displayId}</td>
                    <td>
                      {product.image ? (
                        <img
                          src={product.image.startsWith("http") ? product.image : `${API_URL}${product.image}`}
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
                      <div className="pm-action-cell" style={{ display: "flex", gap: "8px" }}>
                        <AdminButton
                          variant="secondary"
                          icon={product.status === "Active" ? ToggleRight : ToggleLeft}
                          onClick={() => handleToggleStatus(product)}
                          title={product.status === "Active" ? "Set Inactive" : "Set Active"}
                          style={{ color: product.status === "Active" ? "#10b981" : "#94a3b8" }}
                        />
                        <AdminButton
                          variant="secondary"
                          icon={EditIcon}
                          onClick={() => setModal({ mode: "edit", product })}
                          title="Edit"
                        />
                        <AdminButton
                          variant="danger"
                          icon={DeleteIcon}
                          onClick={() => setDeleteTarget(product)}
                          title="Delete"
                        />
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
      <Pagination page={page} pages={totalPages} onPageChange={setPage} />

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
