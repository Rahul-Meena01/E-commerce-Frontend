/*
 * Handover note: Admin category manager.
 * Fetches /api/category/all, creates/updates/deletes categories, and keeps the local table state synchronized after each action.
 */
import { useState, useEffect } from "react";

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

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", status: "Active" });
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
    setTotalPages(data.totalPages || 1);
    setStats({
      total: data.total || 0,
      active: data.active || 0,
      inactive: data.inactive || 0,
    });
    setSelected([]);
  }

  const openAdd = () => {
    setEditData(null);
    setForm({ name: "", slug: "", status: "Active" });
    setShowForm(true);
  };
  const openEdit = (cat) => {
    setEditData(cat);
    setForm({ name: cat.name, slug: cat.slug, status: cat.status });
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
    <div style={S}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            color: "#0f172a",
            fontWeight: "700",
            fontSize: "24px",
            margin: 0,
          }}
        >
          Categories
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
          Manage product categories
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        {[
          ["Total", stats.total, "#6366f1"],
          ["Active", stats.active, "#10b981"],
          ["Inactive", stats.inactive, "#ef4444"],
        ].map(([l, v, c]) => (
          <div
            key={l}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px 24px",
              border: `1px solid ${c}22`,
              flex: 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {l} Categories
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "28px",
                fontWeight: "700",
                color: c,
              }}
            >
              {v}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px 20px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
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
            fontFamily: "'Outfit',sans-serif",
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
            fontFamily: "'Outfit',sans-serif",
            background: "white",
            cursor: "pointer",
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {selected.length > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#ef4444",
              border: "1px solid #fecaca",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Delete ({selected.length})
          </button>
        )}
        <button
          onClick={openAdd}
          style={{
            padding: "9px 20px",
            borderRadius: "8px",
            background: "#6366f1",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          + Add Category
        </button>
      </div>

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
                {["ID", "Name", "Slug", "Status", "Actions"].map((h) => (
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
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      #{String(i + 1).padStart(3, "0")}
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
                        <button
                          onClick={() => openEdit(cat)}
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            background: "#eff6ff",
                            color: "#3b82f6",
                            border: "1px solid #bfdbfe",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id)}
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            background: "#fef2f2",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Delete"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
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

      {/* Form Modal */}
      {showForm && (
        <Modal
          title={editData ? "Update Category" : "Add Category"}
          onClose={() => setShowForm(false)}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
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

// import { useState, useEffect } from "react";

// function Category() {
//   const [categories, setCategories] = useState([]);
//   const [name, setName] = useState("");
//   const [slug, setSlug] = useState("");
//   const [status, setStatus] = useState("active");
//   let [editingId, setEditingId] = useState(null);

//   useEffect(() => {
//     loadCategories();
//   }, []);

//   const getHeaders = () => ({
//     Authorization: `Bearer ${localStorage.getItem("token")}`,
//     "Content-Type": "application/json",
//   });

//   async function loadCategories() {
//     const res = await fetch("/api/category/all", { headers: getHeaders() });
//     const data = await res.json();
//     setCategories(data.data);
//   }
//   const handleDelete = async (id) => {
//     const res = await fetch(`/api/category/delete/${id}`, {
//       method: "DELETE",
//       headers: getHeaders(),
//     });
//     const data = await res.json();
//     if (data.success) {
//       loadCategories();
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (editingId) {
//       const res = await fetch(`/api/category/update/${editingId}`, {
//         method: "PUT",
//         headers: getHeaders(),
//         body: JSON.stringify({ name, slug, status }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         alert("Category updated successfully :)");
//         loadCategories();
//         setEditingId(null);
//       }
//     } else {
//       const res = await fetch("/api/category/create", {
//         method: "POST",
//         headers: getHeaders(),
//         body: JSON.stringify({ name, slug, status }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         loadCategories(); // reload from DB
//         setName("");
//         setSlug("");
//         setStatus("active");
//       } else {
//         alert(data.message);
//       }
//     }
//   };

//   const handleEdit = (category) => {
//     setEditingId(category._id);
//     setName(category.name);
//     setSlug(category.slug);
//     setStatus(category.status);
//   };
//   return (
//     <div className="container">
//       <h1>Manage Categories</h1>

//       {/* Category Form */}
//       <form onSubmit={handleSubmit}>
//         <input
//           type="text"
//           name="name"
//           placeholder="Enter category name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//         />

//         <input
//           type="text"
//           name="slug"
//           placeholder="Enter category slug"
//           value={slug}
//           onChange={(e) => setSlug(e.target.value)}
//         />

//         <select
//           name="status"
//           value={status}
//           onChange={(e) => setStatus(e.target.value)}
//         >
//           <option value="">Select Status</option>
//           <option value="Active">Active</option>
//           <option value="Inactive">Inactive</option>
//         </select>

//         <button type="submit">
//           {editingId ? "Update Category" : "Add Category"}
//         </button>
//       </form>

//       {/* Categories Table */}
//       <div className="table-container">
//         <table border="1" cellPadding="10">
//           <thead>
//             <tr>
//               <th>Name</th>
//               <th>Slug</th>
//               <th>Status</th>
//               <th>Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {categories.length > 0 ? (
//               categories.map((category) => (
//                 <tr key={category._id}>
//                   <td>{category.name}</td>
//                   <td>{category.slug}</td>
//                   <td>{category.status}</td>
//                   <td>
//                     <button onClick={() => handleEdit(category)}>Edit</button>
//                     <button onClick={() => handleDelete(category._id)}>
//                       Delete
//                     </button>
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan="4">No categories added</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default Category;
