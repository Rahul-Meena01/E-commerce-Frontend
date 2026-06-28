/*
 * Handover note: Admin category manager.
 * Fetches /api/category/all, creates/updates/deletes categories, and keeps the local table state synchronized after each action.
 */
import { useState, useEffect } from "react";
import ImageUploader from "../../components/ImageUploader";

const S = { fontFamily: "'Outfit',sans-serif" };

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

// Icon Components
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

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "28px",
          width: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              ...S,
              margin: 0,
              fontWeight: "700",
              fontSize: "18px",
              color: "#0f172a",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "#94a3b8",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

import Pagination from "../../components/Pagination";
import StatCard from "../../components/admin/StatCard";
import AdminButton from "../../components/admin/AdminButton";
import { ToggleLeft, ToggleRight, Edit2, Trash2, Plus } from "lucide-react";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", status: "Active", image: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    loadCategories(page);
  }, [page]);
  
  useEffect(() => {
    let list = [...categories];
    if (search)
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug?.toLowerCase().includes(search.toLowerCase()),
      );
    if (filterStatus !== "all")
      list = list.filter((c) => c.status?.toLowerCase() === filterStatus);
     setFiltered(list);
  }, [categories, search, filterStatus]);

  async function loadCategories(pageNum = 1) {
    const res = await fetch(`/api/category/all?page=${pageNum}`, { headers: getHeaders() });
    const data = await res.json();
    setCategories(data.data || []);
    setTotalPages(data.pages || data.totalPages || 1);
    setStats({
      total: data.total || 0,
      active: data.active || 0,
      inactive: data.inactive || 0,
    });
    setSelected([]);
  }

  const openAdd = () => {
    setEditData(null);
    setForm({ name: "", slug: "", status: "Active", image: "" });
    setShowForm(true);
  };
  const openEdit = (cat) => {
    setEditData(cat);
    setForm({ name: cat.name, slug: cat.slug, status: cat.status, image: cat.image || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Name is required");
    setSaving(true);
    const url = editData
      ? `/api/category/update/${editData._id}`
      : "/api/category/create";
    const method = editData ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setShowForm(false);
      loadCategories();
    } else alert(data.message);
  };

  const handleToggleStatus = async (cat) => {
    try {
      const newStatus = cat.status === "Active" ? "Inactive" : "Active";
      const response = await fetch(`/api/category/update/${cat._id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ ...cat, status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        loadCategories(page);
      } else {
        alert(data.message || "Failed to update category status");
      }
    } catch (err) {
      console.error(err);
      alert("Error toggling category status");
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "Delete this category? All linked subcategories and products will become inactive.",
      )
    )
      return;
    await fetch(`/api/category/delete/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    loadCategories();
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} categories?`)) return;
    await Promise.all(
      selected.map((id) =>
        fetch(`/api/category/delete/${id}`, {
          method: "DELETE",
          headers: getHeaders(),
        }),
      ),
    );
    loadCategories();
  };

  const toggleSelect = (id) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  const toggleAll = () =>
    setSelected(
      selected.length === filtered.length ? [] : filtered.map((c) => c._id),
    );



  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px", color: "#0f172a", fontFamily: "'Outfit',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Category Management</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "15px" }}>Create and manage product categories.</p>
        </div>
        <AdminButton icon={Plus} onClick={openAdd}>
          Add Category
        </AdminButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <StatCard label="Total Categories" value={stats.total} color="#6366f1" />
        <StatCard label="Active" value={stats.active} color="#10b981" />
        <StatCard label="Inactive" value={stats.inactive} color="#f43f5e" />
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "20px"
        }}
      >
        <input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "14px",
            background: "white",
            cursor: "pointer",
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div style={{ padding: "12px 16px", background: "#eef2ff", borderRadius: "12px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid #c7d2fe" }}>
          <span style={{ fontWeight: "600", color: "#3730a3" }}>{selected.length} selected</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <AdminButton variant="success" onClick={() => handleBulkStatus("Active")}>Set Active</AdminButton>
            <AdminButton variant="secondary" onClick={() => handleBulkStatus("Inactive")}>Set Inactive</AdminButton>
            <AdminButton variant="danger" onClick={handleBulkDelete}>Delete Selected</AdminButton>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <th style={{ padding: "12px 16px", textAlign: "left" }}>
                  <input
                    type="checkbox"
                    checked={
                      selected.length === filtered.length && filtered.length > 0
                    }
                    onChange={toggleAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                {["Image", "ID", "Name", "Slug", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      color: "#64748b",
                      fontWeight: "600",
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    No categories found
                  </td>
                </tr>
              ) : (
                filtered.map((cat, i) => (
                  <tr
                    key={cat._id}
                    style={{
                      borderBottom: "1px solid #f8fafc",
                      background: selected.includes(cat._id)
                        ? "#f5f3ff"
                        : "white",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(cat._id)}
                        onChange={() => toggleSelect(cat._id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", width: "50px" }}>
                      {cat.image ? (
                        <img 
                          src={cat.image.startsWith('http') ? cat.image : `${window.location.origin}${cat.image}`} 
                          alt={cat.name}
                          style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", border: "1px solid #e2e8f0" }}
                        />
                      ) : (
                        <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", border: "1px solid #e2e8f0" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      {(page - 1) * 10 + i + 1}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#0f172a",
                        fontWeight: "500",
                      }}
                    >
                      {cat.name}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>
                      <code
                        style={{
                          background: "#f1f5f9",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {cat.slug}
                      </code>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "99px",
                          fontSize: "11px",
                          fontWeight: "600",
                          background:
                            cat.status?.toLowerCase() === "active"
                              ? "#dcfce7"
                              : "#fef2f2",
                          color:
                            cat.status?.toLowerCase() === "active"
                              ? "#166534"
                              : "#991b1b",
                        }}
                      >
                        {cat.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <AdminButton
                          variant="secondary"
                          icon={cat.status === "Active" ? ToggleRight : ToggleLeft}
                          onClick={() => handleToggleStatus(cat)}
                          title={cat.status === "Active" ? "Set Inactive" : "Set Active"}
                          style={{ color: cat.status === "Active" ? "#10b981" : "#94a3b8" }}
                        />
                        <AdminButton
                          variant="secondary"
                          icon={Edit2}
                          onClick={() => openEdit(cat)}
                          title="Edit"
                        />
                        <AdminButton
                          variant="danger"
                          icon={Trash2}
                          onClick={() => handleDelete(cat._id)}
                          title="Delete"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <Pagination page={page} pages={totalPages} onPageChange={setPage} />
      </div>

      {/* Form Modal */}
      {showForm && (
        <Modal
          title={editData ? "Update Category" : "Add Category"}
          onClose={() => setShowForm(false)}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <ImageUploader 
              label="Category Thumbnail" 
              initialUrl={form.image} 
              onUploadSuccess={(url) => setForm((f) => ({ ...f, image: url }))} 
              onRemove={() => setForm((f) => ({ ...f, image: "" }))} 
              aspectRatio="1/1"
            />
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                Category Name *
              </label>
              {/* <input value={form.name}
               onChange={e => setForm(f=>({...f, name:e.target.value,
                slug: editData ? f.slug : e.target.value.toLowerCase().replace(/\s+/g,"-") })}
              } style={{ width:"100%", padding:"10px 14px", borderRadius:"8px", border:"1px solid #e2e8f0",
                fontSize:"14px", boxSizing:"border-box", fontFamily:"'Outfit',sans-serif", outline:"none" }} /> */}
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: editData
                      ? f.slug
                      : e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  }))
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "'Outfit',sans-serif",
                  outline: "none",
                }}
              />
              {/* <input
                value={form.name}
                onChange={(e) => {
                  const value = e.target.value;

                  setForm((prev) => ({
                    ...prev,
                    name: value,
                    slug: editData ? prev.slug : generateSlug(value),
                  }));
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "'Outfit',sans-serif",
                  outline: "none",
                }}
              /> */}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "'Outfit',sans-serif",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "14px",
                  fontFamily: "'Outfit',sans-serif",
                  background: "white",
                  outline: "none",
                }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {form.status === "Inactive" && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#92400e",
                }}
              >
                ⚠️ Making a category inactive will also deactivate all its
                subcategories and products.
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "8px",
                  background: "#6366f1",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : editData ? "Update" : "Add Category"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
  