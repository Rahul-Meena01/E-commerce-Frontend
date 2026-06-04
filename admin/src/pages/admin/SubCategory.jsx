/*
 * Handover note: Admin subcategory manager.
 * Loads categories for the parent dropdown, fetches /api/subCategory/all, and handles create/update/delete flows.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import SearchableDropdown from "../../components/SearchableDropdown";

const EditIcon = () => (
  <svg
    width="18"
    height="18"
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
    width="18"
    height="18"
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

const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#fff",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.15)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "24px",
              cursor: "pointer",
              color: "#64748b",
              lineHeight: 1,
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SubCategory() {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterParent, setFilterParent] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    parentCategory: "",
    name: "",
    slug: "",
    status: "Active",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const getEffectiveSubStatus = (sub) =>
    sub.parentCategory?.status === "Inactive"
      ? "Inactive"
      : sub.status;

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  });

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/category/all", { headers: getHeaders() });
    const data = await res.json();
    setCategories(data.data || []);
  }, []);

  const loadSubCategories = useCallback(async (pageNum = 1) => {
    const res = await fetch(`/api/subCategory/all?page=${pageNum}`, { headers: getHeaders() });
    const data = await res.json();
    setSubCategories(data.data || []);
    setTotalPages(data.totalPages || 1);
    setStats({
      total: data.total || 0,
      active: data.active || 0,
      inactive: data.inactive || 0,
    });
  }, []);

  useEffect(() => {
    loadSubCategories(page);
  }, [page, loadSubCategories]);

  useEffect(() => {
    const init = async () => {
      await loadCategories();
      await loadSubCategories();
    };

    init();
  }, [loadCategories, loadSubCategories]);

  const parentCategoryNote = categories.find((cat) => cat._id === form.parentCategory)?.status === "Inactive"
    ? "Selected parent category is inactive. This subcategory cannot be active."
    : "";



  const filteredSubCategories = useMemo(() => {
    return subCategories.filter((sub) => {
      const searchValue = search.trim().toLowerCase();
      const matchesSearch =
        !searchValue ||
        sub.name?.toLowerCase().includes(searchValue) ||
        sub.slug?.toLowerCase().includes(searchValue) ||
        sub.parentCategory?.name?.toLowerCase().includes(searchValue);

      const effectiveStatus = getEffectiveSubStatus(sub);
      const matchesStatus =
        filterStatus === "all" || effectiveStatus?.toLowerCase() === filterStatus;

      const matchesParent =
        filterParent === "all" || sub.parentCategory?._id === filterParent;

      return matchesSearch && matchesStatus && matchesParent;
    });
  }, [subCategories, search, filterStatus, filterParent]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ parentCategory: "", name: "", slug: "", status: "Active" });
    setShowModal(true);
  };

  const openEditModal = (sub) => {
    setEditingId(sub._id);
    setForm({
      parentCategory: sub.parentCategory?._id || "",
      name: sub.name || "",
      slug: sub.slug || "",
      status: sub.status || "Active",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({ parentCategory: "", name: "", slug: "", status: "Active" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.parentCategory) return alert("Please select a parent category.");
    if (!form.name.trim()) return alert("Subcategory name is required.");
    if (!form.slug.trim()) return alert("Slug is required.");

    setIsSaving(true);

    const category = categories.find((cat) => cat._id === form.parentCategory);

    if (category?.status === "Inactive" && form.status === "Active") {
      alert(
        "Cannot activate subcategory because its parent category is inactive.",
      );
      setIsSaving(false);
      return;
    }

    const payload = {
      parentCategory: form.parentCategory,
      name: form.name,
      slug: form.slug,
      status: category?.status === "Inactive" ? "Inactive" : form.status,
    };

    const url = editingId
      ? `/api/subCategory/update/${editingId}`
      : "/api/subCategory/create";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setIsSaving(false);

    if (data.success) {
      loadSubCategories();
      resetForm();
      closeModal();
    } else {
      alert(data.message || "Unable to save subcategory.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this subcategory?")) return;
    const res = await fetch(`/api/subCategory/delete/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      loadSubCategories();
    } else {
      alert(data.message || "Unable to delete subcategory.");
    }
  };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", padding: "24px", color: "#0f172a" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "18px", marginBottom: "22px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Sub Categories</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>Search, filter and manage all subcategories.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
            {[
              ["Total", stats.total, "#4338ca"],
              ["Active", stats.active, "#16a34a"],
              ["Inactive", stats.inactive, "#dc2626"],
            ].map(([label, value, color]) => (
              <div key={label} style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "14px", minWidth: "120px", border: `1px solid ${color}22` }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{label}</p>
                <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 700, color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            maxHeight: "50px",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "99px",
            padding: "2px 8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <PlusIcon />
          Create Subcategory
        </button>
      </div>

      <div style={{ display: "grid", gap: "14px", marginBottom: "20px", gridTemplateColumns: "1fr auto auto" }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search subcategories..."
          style={{ width: "100%", minWidth: "220px", padding: "12px 14px", borderRadius: "14px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" }}
        />
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          style={{ padding: "12px 14px", borderRadius: "14px", border: "1px solid #cbd5e1", fontSize: "14px", minWidth: "160px" }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div style={{ minWidth: "220px" }}>
          <SearchableDropdown
            value={filterParent === "all" ? "" : filterParent}
            onChange={(val) => setFilterParent(val || "all")}
            fetchUrl="/api/category/search"
            placeholder="All Parent Categories"
          />
        </div>
      </div>

      <div style={{ overflowX: "auto", background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "1px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "780px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={headerCellStyle}>Parent Category</th>
              <th style={headerCellStyle}>Subcategory</th>
              <th style={headerCellStyle}>Slug</th>
              <th style={headerCellStyle}>Status</th>
              <th style={headerCellStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubCategories.map((subCategory) => (
              <tr key={subCategory._id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={bodyCellStyle}>{subCategory.parentCategory?.name || "—"}</td>
                <td style={bodyCellStyle}>{subCategory.name}</td>
                <td style={bodyCellStyle}>{subCategory.slug}</td>
                <td style={bodyCellStyle}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      background: getEffectiveSubStatus(subCategory) === "Active" ? "#d1fae5" : "#fee2e2",
                      color: getEffectiveSubStatus(subCategory) === "Active" ? "#065f46" : "#991b1b",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {getEffectiveSubStatus(subCategory)}
                  </span>
                </td>
                <td style={bodyCellStyle}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => openEditModal(subCategory)}
                      title="Edit"
                      style={actionButtonStyleBlue}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(subCategory._id)}
                      title="Delete"
                      style={actionButtonStyleRed}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSubCategories.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                  No subcategories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderTop: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: page === 1 ? "#f8fafc" : "white",
                color: page === 1 ? "#94a3b8" : "#0f172a",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: page === totalPages ? "#f8fafc" : "white",
                color: page === totalPages ? "#94a3b8" : "#0f172a",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title={editingId ? "Update Subcategory" : "Create Subcategory"} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "14px" }}>
              <label style={labelStyle}>
                Parent Category
                <div style={{ marginTop: "8px" }}>
                  <SearchableDropdown
                    value={form.parentCategory}
                    onChange={(val) => handleChange("parentCategory", val)}
                    fetchUrl="/api/category/search"
                    placeholder="Select parent category"
                  />
                </div>
              </label>

              <label style={labelStyle}>
                Subcategory Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  style={inputStyle}
                  placeholder="Enter subcategory name"
                />
              </label>

              <label style={labelStyle}>
                Slug
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => handleChange("slug", event.target.value)}
                  style={inputStyle}
                  placeholder="Enter slug"
                />
              </label>

              <label style={labelStyle}>
                Status
                <select
                  value={form.status}
                  onChange={(event) => handleChange("status", event.target.value)}
                  style={inputStyle}
                >
                  <option value="Active" disabled={
                    categories.find((cat) => cat._id === form.parentCategory)
                      ?.status === "Inactive"
                  }>
                    Active
                  </option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              {parentCategoryNote && (
                <p style={{ margin: 0, color: "#b91c1c", fontSize: "13px" }}>{parentCategoryNote}</p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "6px" }}>
                <button type="button" onClick={closeModal} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} style={submitButtonStyle}>
                  {isSaving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const headerCellStyle = {
  textAlign: "left",
  padding: "16px 18px",
  fontSize: "14px",
  color: "#475569",
  whiteSpace: "nowrap",
};

const bodyCellStyle = {
  padding: "16px 18px",
  fontSize: "14px",
  color: "#0f172a",
  verticalAlign: "middle",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  outline: "none",
  fontSize: "14px",
  marginTop: "8px",
};

const labelStyle = {
  display: "block",
  fontSize: "14px",
  color: "#475569",
  fontWeight: 500,
};

const actionButtonStyleBlue = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const actionButtonStyleRed = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const cancelButtonStyle = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#475569",
  padding: "12px 18px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: 600,
};

const submitButtonStyle = {
  border: "none",
  background: "#2563eb",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: 700,
};
