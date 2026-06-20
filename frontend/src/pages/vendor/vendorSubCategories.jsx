import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Layers,
  Search,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Tag,
  FolderOpen,
  ImageOff,
} from "lucide-react";
import API from "../../utils/api";
import ImageUploader from "../../components/ImageUploader";
import "../../styles/vendor.css";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;
const EMPTY_FORM = { name: "", category: "", isActive: true, image: "" };

/* ─────────────────────────────────────────────────────────────
   MODAL — Create / Edit subcategory
───────────────────────────────────────────────────────────── */
function SubCategoryModal({
  mode,
  initial,
  parentCategories,
  onSave,
  onClose,
  saving,
}) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [err, setErr] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) return setErr("Sub-category name is required.");
    if (!form.category) return setErr("Please select a parent category.");
    setErr("");
    onSave(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <GitBranch size={20} className="text-info" />
            {mode === "create" ? "New Sub-Category" : "Edit Sub-Category"}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="text-secondary" style={{ marginBottom: "24px", fontSize: "13px" }}>
          {mode === "create"
            ? "Add a sub-category under one of your categories."
            : "Update the sub-category details."}
        </p>

        {err && (
          <div className="form-group">
            <div style={{ padding: "12px", background: "rgba(220,38,38,0.1)", color: "var(--error)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} /> {err}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Name <span className="required">*</span></label>
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Running Shoes"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label>Parent Category <span className="required">*</span></label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            disabled={saving}
          >
            <option value="">Select a category…</option>
            {parentCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label style={{ display: "block", marginBottom: "8px" }}>
            Sub-Category Image <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "normal" }}>(Optional)</span>
          </label>
          <div style={{ height: "160px" }}>
            <ImageUploader
              initialUrl={form.image}
              onUploadSuccess={(url) => set("image", url)}
              onRemove={() => set("image", "")}
              aspectRatio="16/9"
              label="Sub-category thumbnail"
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              Active
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Visible to customers
            </div>
          </div>
          <button
            type="button"
            className={`toggle-btn ${form.isActive ? 'active' : 'inactive'}`}
            onClick={() => set("isActive", !form.isActive)}
            disabled={saving}
          >
            {form.isActive ? (
              <ToggleRight size={28} />
            ) : (
              <ToggleLeft size={28} />
            )}
          </button>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? (
              <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
            ) : (
              <><CheckCircle2 size={14} /> {mode === "create" ? "Create" : "Save Changes"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CONFIRM DELETE MODAL
───────────────────────────────────────────────────────────── */
function DeleteModal({ name, onConfirm, onClose, deleting }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "380px" }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: "var(--error)" }}>
            Delete Sub-Category
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="text-secondary" style={{ fontSize: "13px", margin: "0 0 24px" }}>
          Delete <strong>{name}</strong>? This action cannot be undone and may affect products linked to it.
        </p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="btn btn-danger"
          >
            {deleting ? (
              <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Deleting...</>
            ) : (
              <><Trash2 size={14} /> Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
function VendorSubCategories() {
  const { vendorSlug } = useParams();

  /* ── data state ── */
  const [subCategories, setSubCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  /* ── ui state ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  /* ── modal state ── */
  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', data: {} }
  const [deleteTarget, setDeleteTarget] = useState(null); // null | { _id, name }
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── toast ── */
  const [toast, setToast] = useState(null); // { type, msg }
  const toastTimer = useRef(null);

  const showToast = useCallback((type, msg) => {
    clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── fetch helpers ── */
  const loadParentCategories = useCallback(async () => {
    try {
      const res = await API(`/api/vendor/${vendorSlug}/categories`);
      const list = Array.isArray(res?.data) ? res.data : [];
      setParentCategories(list);
    } catch (_) {
      // non-fatal — forms will be empty but page still works
    }
  }, [vendorSlug]);

  const loadSubCategories = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await API(`/api/vendor/${vendorSlug}/subcategories`);
      const list = Array.isArray(res?.data) ? res.data : [];
      setSubCategories(list);
    } catch (err) {
      setFetchError(err.message || "Failed to load sub-categories");
    } finally {
      setLoading(false);
    }
  }, [vendorSlug]);

  useEffect(() => {
    void loadParentCategories();
    void loadSubCategories();
  }, [loadParentCategories, loadSubCategories]);

  /* ── derived / filtered data ── */
  const categoryOptions = [
    ...new Map(
      subCategories
        .filter((sc) => sc.category)
        .map((sc) => [
          sc.category._id,
          { id: sc.category._id, name: sc.category.name },
        ]),
    ).values(),
  ];

  const filtered = subCategories.filter((sc) => {
    const matchSearch = sc.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchCat =
      filterCategory === "all" || sc.category?._id === filterCategory;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && sc.isActive) ||
      (filterStatus === "inactive" && !sc.isActive);
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterCategory, filterStatus]);

  /* ── CRUD handlers ── */

  const handleCreate = useCallback(
    async (form) => {
      setSaving(true);
      try {
        await API(`/api/vendor/${vendorSlug}/subcategories`, {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            image: form.image,
          }),
        });
        showToast("success", `"${form.name}" created successfully!`);
        setModal(null);
        await loadSubCategories();
      } catch (err) {
        showToast("error", err.message || "Failed to create sub-category");
      } finally {
        setSaving(false);
      }
    },
    [vendorSlug, loadSubCategories, showToast],
  );

  const handleUpdate = useCallback(
    async (form) => {
      setSaving(true);
      try {
        await API(`/api/vendor/${vendorSlug}/subcategories/${modal.data._id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            isActive: form.isActive,
            image: form.image,
          }),
        });
        showToast("success", `"${form.name}" updated!`);
        setModal(null);
        await loadSubCategories();
      } catch (err) {
        showToast("error", err.message || "Failed to update sub-category");
      } finally {
        setSaving(false);
      }
    },
    [vendorSlug, modal, loadSubCategories, showToast],
  );

  const handleToggle = useCallback(
    async (sc) => {
      try {
        await API(`/api/vendor/${vendorSlug}/subcategories/${sc._id}`, {
          method: "PUT",
          body: JSON.stringify({ isActive: !sc.isActive }),
        });
        showToast(
          "success",
          `"${sc.name}" ${sc.isActive ? "deactivated" : "activated"}.`,
        );
        await loadSubCategories();
      } catch (err) {
        showToast("error", err.message || "Failed to toggle status");
      }
    },
    [vendorSlug, loadSubCategories, showToast],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API(`/api/vendor/${vendorSlug}/subcategories/${deleteTarget._id}`, {
        method: "DELETE",
      });
      showToast("success", `"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      await loadSubCategories();
    } catch (err) {
      showToast("error", err.message || "Failed to delete sub-category");
    } finally {
      setDeleting(false);
    }
  }, [vendorSlug, deleteTarget, loadSubCategories, showToast]);

  const pageNumbers = () => {
    const pages = [];
    const delta = 1;
    const left = safePage - delta;
    const right = safePage + delta;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right))
        pages.push(i);
      else if (pages[pages.length - 1] !== "...") pages.push("...");
    }
    return pages;
  };

  return (
    <div className="vendor-page">
      {/* ── Page Header ── */}
      <header className="vendor-header">
        <div className="vendor-header-content">
          <div className="subtitle" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <GitBranch size={14} /> Catalog / Hierarchy
          </div>
          <h1>Sub-Categories</h1>
          <p className="description">
            Organize products further within your main categories
          </p>
        </div>
        <div className="vendor-header-actions">
          <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
            <Plus size={15} /> New Sub-Category
          </button>
        </div>
      </header>

      {/* ── Toasts ── */}
      {toast && (
        <div className="card" style={{ padding: "12px 20px", marginBottom: "20px", background: toast.type === "success" ? "var(--success)" : "var(--error)", color: "white" }}>
          {toast.type === "success" ? <CheckCircle2 size={16} style={{ display: "inline", marginRight: "8px" }} /> : <AlertCircle size={16} style={{ display: "inline", marginRight: "8px" }} />}
          {toast.msg}
        </div>
      )}

      {/* ── Statistics ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Layers size={20} />
          </div>
          <div>
            <div className="stat-value">{subCategories.length}</div>
            <div className="stat-label">Total Sub-Categories</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <ToggleRight size={20} />
          </div>
          <div>
            <div className="stat-value">{subCategories.filter(sc => sc.isActive).length}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar (Filters & Search) ── */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--secondary-bg)", outline: "none" }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--secondary-bg)", color: "var(--text-primary)", outline: "none" }}
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--secondary-bg)", color: "var(--text-primary)", outline: "none" }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* ── Fetch Error ── */}
      {!loading && fetchError && (
        <div className="card" style={{ background: "rgba(220,38,38,0.1)", color: "var(--error)" }}>
          <AlertCircle size={16} style={{ display: "inline", marginRight: "8px" }} />
          <span>{fetchError}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="grid-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !fetchError && filtered.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">
            {searchTerm || filterCategory !== "all" || filterStatus !== "all" ? (
              <Search size={32} />
            ) : (
              <FolderOpen size={32} />
            )}
          </div>
          <h3 className="empty-state-title">
            {searchTerm || filterCategory !== "all" || filterStatus !== "all"
              ? "No sub-categories match your filters"
              : "No sub-categories yet"}
          </h3>
          <p className="empty-state-description">
            {searchTerm || filterCategory !== "all" || filterStatus !== "all"
              ? "Try adjusting your search term or filters to find what you're looking for."
              : "Create a sub-category to further organize your product catalog."}
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !fetchError && filtered.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Image</th>
                <th>Parent Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((sc) => (
                <tr key={sc._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                      {sc.name || "Unnamed"}
                    </div>
                    {sc.slug && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {sc.slug}
                      </div>
                    )}
                  </td>
                  <td>
                    {sc.image ? (
                      <img src={sc.image} alt={sc.name} style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border-color)" }} />
                    ) : (
                      <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--tertiary-bg)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                        <ImageOff size={16} />
                      </div>
                    )}
                  </td>
                  <td>
                    {sc.category ? (
                      <span className="badge badge-info">
                        {sc.category.name}
                      </span>
                    ) : (
                      <span className="text-muted text-sm italic">Uncategorized</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${sc.isActive ? "badge-success" : "badge-secondary"}`}>
                      {sc.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-icon btn-secondary"
                        onClick={() => handleToggle(sc)}
                        title={sc.isActive ? "Deactivate" : "Activate"}
                      >
                        {sc.isActive ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} className="text-muted" />}
                      </button>
                      <button
                        className="btn btn-icon btn-secondary"
                        onClick={() => setModal({ mode: "edit", data: sc })}
                        title="Edit sub-category"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => setDeleteTarget(sc)}
                        title="Delete sub-category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Showing <strong>{(safePage - 1) * PAGE_SIZE + 1}</strong> to{" "}
                <strong>{Math.min(safePage * PAGE_SIZE, filtered.length)}</strong> of{" "}
                <strong>{filtered.length}</strong> results
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={safePage === 1}
                  onClick={() => setPage(safePage - 1)}
                  style={{ padding: "4px 8px" }}
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers().map((p, i) => (
                  <button
                    key={i}
                    className={`btn btn-sm ${p === safePage ? "btn-primary" : "btn-secondary"}`}
                    disabled={p === "..."}
                    onClick={() => p !== "..." && setPage(p)}
                    style={{ padding: "4px 10px", minWidth: "32px" }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(safePage + 1)}
                  style={{ padding: "4px 8px" }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {modal && (
        <SubCategoryModal
          mode={modal.mode}
          initial={
            modal.mode === "edit"
              ? {
                  name: modal.data.name,
                  category: modal.data.category?._id || "",
                  isActive: modal.data.isActive,
                  image: modal.data.image || "",
                }
              : null
          }
          parentCategories={parentCategories}
          onSave={modal.mode === "create" ? handleCreate : handleUpdate}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

export default VendorSubCategories;
