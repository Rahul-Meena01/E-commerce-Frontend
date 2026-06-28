import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Grid,
  Package,
  Search,
  X,
  ImageOff,
  FolderOpen,
  CheckCircle2,
  Link2,
  Tag,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import API from "../../utils/api";
import Modal from "../../components/Modal";
import ImageUploader from "../../components/ImageUploader";
import Pagination from "../../components/Pagination";
import "../../styles/vendor.css";

/* ─── Sub-components ───────────────────────────────────────────────────────── */

const SkeletonLoader = () => (
  <div className="grid-auto" style={{ marginBottom: "24px" }}>
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
      </div>
    ))}
  </div>
);

const StatCard = ({ icon: Icon, value, label, variant = "primary" }) => (
  <div className="stat-card">
    <div className={`stat-icon ${variant}`} aria-hidden="true">
      <Icon size={20} />
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const StatusBadge = ({ isActive }) => (
  <span className={`badge ${isActive ? "badge-success" : "badge-secondary"}`}>
    {isActive ? "Active" : "Inactive"}
  </span>
);

const CategoryImage = ({ src, alt }) =>
  src ? (
    <img src={src} alt={alt} style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border-color)" }} loading="lazy" />
  ) : (
    <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--tertiary-bg)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }} aria-label="No image">
      <ImageOff size={16} />
    </div>
  );

/* ─── Main component ───────────────────────────────────────────────────────── */

function VendorCategories() {
  const { vendorSlug } = useParams();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({ name: "", image: "" });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await API(`/api/vendor/${vendorSlug}/categories?page=${page}&limit=${PAGE_SIZE}`);
      const list = Array.isArray(response?.data)
        ? response.data
        : response?.data || [];
      const pageInfo = response || {};
      
      setCategories(list);
      setTotalPages(pageInfo.totalPages || 1);
      setTotalCount(pageInfo.totalCount || 0);
    } catch (err) {
      setError(err.message || "Failed to load categories");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vendorSlug, page]);

  /* ── data fetching ── */
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  /* ── derived state ── */
  // With pagination, display all categories on current page
  const displayCategories = categories;

  // Filter categories on current page by search term
  const filteredCategories = useMemo(
    () =>
      displayCategories.filter((c) =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [displayCategories, searchTerm],
  );

  const totalProductsCurrentPage = useMemo(
    () => displayCategories.reduce((sum, c) => sum + (c.productCount || 0), 0),
    [displayCategories],
  );

  /* ── handlers ── */
  const handleDelete = useCallback(
    async (categoryId) => {
      try {
        await API(`/api/vendor/${vendorSlug}/categories/${categoryId}`, {
          method: "DELETE",
        });
        showSuccess("Category deleted successfully!");
        setDeleteConfirm(null);
        // Reset to first page after deletion and reload
        setPage(1);
        // Give a slight delay to ensure state updates
        setTimeout(() => loadCategories(), 100);
      } catch (err) {
        showError(err.message || "Failed to delete category");
        console.error(err);
      }
    },
    [vendorSlug, loadCategories],
  );

  const handleSaveCategory = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError(null);
      if (!formData.name.trim()) {
        setFormError("Category name is required");
        return;
      }
      setSubmitting(true);
      try {
        const isEdit = showModal?.mode === "edit";
        const url = isEdit 
          ? `/api/vendor/${vendorSlug}/categories/${showModal.data._id}`
          : `/api/vendor/${vendorSlug}/categories`;
        const method = isEdit ? "PUT" : "POST";

        const response = await API(url, {
          method,
          body: JSON.stringify({
            name: formData.name.trim(),
            image: formData.image.trim() || "",
          }),
        });
        const savedCategory = response?.data;
        if (savedCategory || isEdit) {
          setFormData({ name: "", image: "" });
          setShowModal(null);
          showSuccess(isEdit ? "Category updated successfully!" : "Category created successfully!");
          // For new categories, go to first page; for edits, stay on current page
          if (!isEdit) {
            setPage(1);
          }
          setTimeout(() => loadCategories(), 100);
        }
      } catch (err) {
        setFormError(err.message || "Failed to save category");
        console.error("Save category error:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [vendorSlug, formData, loadCategories, showModal],
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(null);
    setFormData({ name: "", image: "" });
    setFormError(null);
  }, []);

  const openEditModal = (category) => {
    setShowModal({ mode: "edit", data: category });
    setFormData({ name: category.name || "", image: category.image || "" });
  };

  const openCreateModal = () => {
    setShowModal({ mode: "create" });
    setFormData({ name: "", image: "" });
  };

  const handleFieldChange = useCallback(
    (field) => (e) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  /* ── render ── */
  return (
    <div className="vendor-page">
      {/* ── Page header ── */}
      <header className="vendor-header">
        <div className="vendor-header-content">
          <div className="subtitle" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Grid size={14} /> Catalog
          </div>
          <h1>Categories</h1>
          <p className="description">
            Organize your products into categories for better discoverability
          </p>
        </div>
        <div className="vendor-header-actions">
          <button className="btn btn-secondary" onClick={loadCategories} disabled={loading} title="Refresh">
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={15} /> Add Category
          </button>
        </div>
      </header>

      {/* ── Alerts ── */}
      {successMessage && (
        <div className="card" style={{ background: "var(--success)", color: "white", padding: "12px 20px", marginBottom: "20px" }}>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="card" style={{ background: "var(--error)", color: "white", padding: "12px 20px", marginBottom: "20px" }}>
          {errorMessage}
        </div>
      )}

      {/* ── Statistics ── */}
      <div className="stat-grid">
        <StatCard
          icon={Layers}
          value={totalCount}
          label="Total Categories"
          variant="primary"
        />
        <StatCard
          icon={Package}
          value={totalProductsCurrentPage}
          label="Products on Page"
          variant="success"
        />
      </div>

      {/* ── Search ── */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }} />
          <input
            type="search"
            style={{ width: "100%", padding: "10px 10px 10px 36px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--secondary-bg)", outline: "none" }}
            placeholder="Search categories on this page…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Loading skeletons ── */}
      {loading && <SkeletonLoader />}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="card" style={{ background: "rgba(220,38,38,0.1)", color: "var(--error)" }}>
          <AlertCircle size={16} style={{ display: "inline", marginRight: "8px" }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && filteredCategories.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">
            {searchTerm ? <Search size={28} /> : <FolderOpen size={28} />}
          </div>
          <h3 className="empty-state-title">{searchTerm ? "No results found" : "No categories yet"}</h3>
          <p className="empty-state-description">
            {searchTerm
              ? `No categories match "${searchTerm}". Try a different search term.`
              : "Create your first category to start organizing your products."}
          </p>
          {!searchTerm && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={15} /> Create First Category
            </button>
          )}
        </div>
      )}

      {/* ── Category table ── */}
      {!loading && !error && filteredCategories.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="card-header" style={{ padding: "20px", marginBottom: 0, borderBottom: "1px solid var(--border-color)" }}>
            <h2 className="card-title">Category List</h2>
            <span className="badge badge-info">{filteredCategories.length} Categories</span>
          </div>

          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Image</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category._id}>
                    <td>
                      <div>
                        <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {category.name || "Unnamed"}
                        </p>
                        {category.slug && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {category.slug}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <CategoryImage src={category.image} alt={category.name} />
                    </td>
                    <td>{category.productCount ?? 0}</td>
                    <td>
                      <StatusBadge isActive={category.isActive} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-icon btn-secondary" title="Edit category" onClick={() => openEditModal(category)}>
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => setDeleteConfirm(category._id)}
                          title="Delete category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <Pagination page={page} pages={totalPages} onPageChange={setPage} />
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title" style={{ color: "var(--error)", marginBottom: "12px" }}>Delete Category</h2>
            <p className="text-secondary" style={{ marginBottom: "24px" }}>Are you sure you want to delete this category? This action cannot be undone.</p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Category Modal ── */}
      <Modal isOpen={!!showModal} onClose={handleCloseModal} size="medium">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Tag size={20} className="text-info" /> {showModal?.mode === "edit" ? "Edit Category" : "Create New Category"}
          </h2>
          <button className="modal-close" onClick={handleCloseModal}><X size={20} /></button>
        </div>

        <form onSubmit={handleSaveCategory}>
          {formError && (
            <div className="form-group">
              <div style={{ padding: "12px", background: "rgba(220,38,38,0.1)", color: "var(--error)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} /> {formError}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Category Name <span className="required">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={handleFieldChange("name")}
              placeholder="e.g. Electronics, Clothing, Books"
              disabled={submitting}
              autoFocus
            />
            <span className="text-muted text-sm"><CheckCircle2 size={12} style={{ display: "inline", marginRight: "4px" }}/>A clear, descriptive name helps customers browse faster</span>
          </div>

          <div className="form-group">
            <label style={{ display: "block", marginBottom: "8px" }}>
              Category Image <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "normal" }}>(Optional)</span>
            </label>
            <div style={{ height: "160px" }}>
              <ImageUploader
                initialUrl={formData.image}
                onUploadSuccess={(url) => setFormData(f => ({ ...f, image: url }))}
                onRemove={() => setFormData(f => ({ ...f, image: "" }))}
                aspectRatio="16/9"
                label="Category thumbnail"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : (showModal?.mode === "edit" ? "Save Changes" : "Create Category")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default VendorCategories;
