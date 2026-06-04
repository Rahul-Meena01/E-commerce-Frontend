import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Package, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, RefreshCw, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, ImageOff, Tag, Layers, IndianRupee, BarChart2, ShoppingBag, TrendingDown, Upload, Star, Images,
} from "lucide-react";
import API from "../../utils/api";
import "../../styles/vendor.css";

const PAGE_SIZE = 10;
const EMPTY_FORM = {
  name: "", description: "", price: "", salePrice: "", stock: "", category: "", subCategory: "", isActive: true,
};
const TOTAL_SLOTS = 5;

// Helpers
const StatusBadge = ({ isActive }) => (
  <span className={`badge ${isActive ? "badge-success" : "badge-secondary"}`}>
    {isActive ? "Active" : "Inactive"}
  </span>
);

const StockBadge = ({ stock }) => {
  const low = stock <= 5;
  const out = stock === 0;
  return (
    <span className={`badge ${out ? "badge-error" : low ? "badge-warning" : "badge-info"}`}>
      {stock} {out ? "— Out" : low ? "— Low" : "units"}
    </span>
  );
};

const StatCard = ({ icon: Icon, value, label, variant }) => (
  <div className="stat-card">
    <div className={`stat-icon ${variant}`}>
      <Icon size={20} />
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

// ── IMAGE UPLOADER COMPONENT ──
function ImageUploader({ vendorSlug, slots, onChange }) {
  const fileInputRefs = useRef([]);
  const triggerPick = (idx) => fileInputRefs.current[idx]?.click();

  const handleFilePick = async (idx, file) => {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    const next = slots.map((s, i) => i === idx ? { url: localUrl, uploading: true, _localBlob: file } : s);
    onChange(next);

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`/api/vendor/${vendorSlug}/products/upload-image`, {
        method: "POST", credentials: "include", body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url: serverUrl } = await res.json();
      onChange((prev) => prev.map((s, i) => i === idx ? { url: serverUrl, uploading: false, _localBlob: null } : s));
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      onChange((prev) => prev.map((s, i) => (i === idx ? { url: null, uploading: false } : s)));
      URL.revokeObjectURL(localUrl);
      alert(`Image upload failed: ${err.message}`);
    }
  };

  const handleRemove = (idx, e) => {
    e.stopPropagation();
    const s = slots[idx];
    if (s?._localBlob && s?.url?.startsWith("blob:")) URL.revokeObjectURL(s.url);
    onChange(slots.map((sl, i) => (i === idx ? { url: null, uploading: false } : sl)));
  };

  const renderSlot = (idx, style) => {
    const slot = slots[idx] || { url: null, uploading: false };
    const hasImg = !!slot.url;
    return (
      <div
        key={idx}
        className={`img-slot ${hasImg ? "has-img" : ""} ${slot.uploading ? "uploading" : ""}`}
        style={style}
        onClick={() => !slot.uploading && triggerPick(idx)}
      >
        <input ref={(el) => (fileInputRefs.current[idx] = el)} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={(e) => handleFilePick(idx, e.target.files?.[0])} onClick={(e) => (e.target.value = null)} />
        {hasImg ? (
          <>
            <img src={slot.url} alt={`Product image ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
            <button className="img-slot-remove" onClick={(e) => handleRemove(idx, e)}><X size={14} /></button>
            <span className="img-slot-badge">{idx === 0 ? "Thumbnail" : `Carousel ${idx}`}</span>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "11px" }}>
            {idx === 0 ? <Upload size={20} style={{ margin: "0 auto" }} /> : <Images size={16} style={{ margin: "0 auto" }} />}
            <div style={{ marginTop: "4px" }}>{idx === 0 ? "Main thumbnail" : `Carousel ${idx}`}</div>
          </div>
        )}
        {slot.uploading && <div className="img-slot-spinner"><RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /></div>}
      </div>
    );
  };

  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>Product Images</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "130px 64px", gap: "8px", marginBottom: "6px" }}>
        {renderSlot(0, { gridRow: "1 / 3", gridColumn: "1 / 2" })}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {renderSlot(1, { height: "100%" })}
          {renderSlot(2, { height: "100%" })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {renderSlot(3, { height: "100%" })}
          {renderSlot(4, { height: "100%" })}
        </div>
      </div>
      <div className="text-muted" style={{ fontSize: "11px", display: "flex", gap: "4px" }}><Star size={12} className="text-warning"/> First slot is main thumbnail. Up to 5MB.</div>
    </div>
  );
}

// ── PRODUCT MODAL ──
function ProductModal({ mode, initial, initialImages, categories, vendorSlug, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [err, setErr] = useState("");
  
  const buildInitialSlots = () => {
    const result = Array.from({ length: TOTAL_SLOTS }, () => ({ url: null, uploading: false }));
    if (initialImages?.length) {
      initialImages.slice(0, TOTAL_SLOTS).forEach((url, i) => { result[i] = { url, uploading: false }; });
    }
    return result;
  };
  const [imageSlots, setImageSlots] = useState(buildInitialSlots);

  const filteredSubCats = categories.find((c) => c._id === form.category)?.subCategories || [];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  
  const submit = () => {
    if (!form.name.trim()) return setErr("Product name is required.");
    if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 0) return setErr("A valid price (≥ 0) is required.");
    if (form.salePrice !== "" && Number(form.salePrice) >= Number(form.price)) return setErr("Sale price must be less than the regular price.");
    if (imageSlots.some((s) => s.uploading)) return setErr("Please wait for all uploads to finish before saving.");
    setErr("");

    const images = imageSlots.map((s) => s.url).filter(Boolean);
    onSave({
      name: form.name.trim(), description: form.description.trim(), price: Number(form.price),
      salePrice: form.salePrice !== "" ? Number(form.salePrice) : null,
      stock: form.stock !== "" ? Number(form.stock) : 0, category: form.category || null,
      subCategory: form.subCategory || null, isActive: form.isActive, images,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === "create" ? "Add to Catalog" : "Edit Product"}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {err && <div className="card" style={{ background: "rgba(220,38,38,0.1)", color: "var(--error)", marginBottom: "16px", padding: "10px" }}><AlertCircle size={14} style={{ display: "inline", marginRight: "6px" }} />{err}</div>}

        <div className="form-group">
          <label>Product Name <span className="required">*</span></label>
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Premium Running Shoes" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price (₹) <span className="required">*</span></label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Sale Price (₹)</label>
            <input type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Stock (units)</label>
            <input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={(e) => { set("category", e.target.value); set("subCategory", ""); }}>
              <option value="">None</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Sub-Category</label>
            <select value={form.subCategory} onChange={(e) => set("subCategory", e.target.value)} disabled={filteredSubCats.length === 0 && !form.subCategory}>
              <option value="">None</option>
              {filteredSubCats.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional product description…" rows="3" />
        </div>

        <div className="card" style={{ padding: "16px", marginBottom: "16px", background: "var(--secondary-bg)" }}>
          <ImageUploader vendorSlug={vendorSlug} slots={imageSlots} onChange={setImageSlots} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Active / Visible</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Customers can see this product</div>
          </div>
          <button type="button" className={`toggle-btn ${form.isActive ? 'active' : 'inactive'}`} onClick={() => set("isActive", !form.isActive)}>
            {form.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : (mode === "create" ? "Create Product" : "Save Changes")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ──
function VendorProducts() {
  const { vendorSlug } = useParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await API(`/api/vendor/${vendorSlug}/categories`);
      const cats = Array.isArray(res?.data) ? res.data : [];
      const subRes = await API(`/api/vendor/${vendorSlug}/subcategories`);
      const subs = Array.isArray(subRes?.data) ? subRes.data : [];
      setCategories(cats.map(c => ({ ...c, subCategories: subs.filter(s => s.category?._id === c._id || s.category === c._id) })));
    } catch {}
  }, [vendorSlug]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true); setFetchError(null);
      const res = await API(`/api/vendor/${vendorSlug}/products`);
      setProducts(Array.isArray(res?.data) ? res.data : []);
    } catch (err) { setFetchError(err.message || "Failed to load products"); }
    finally { setLoading(false); }
  }, [vendorSlug]);

  useEffect(() => { loadCategories(); loadProducts(); }, [loadCategories, loadProducts]);

  const catOptions = [...new Map(products.filter(p => p.category).map(p => [p.category._id, { id: p.category._id, name: p.category.name }])).values()];

  const filtered = products.filter((p) => {
    return (p.name?.toLowerCase().includes(search.toLowerCase())) &&
      (filterCat === "all" || p.category?._id === filterCat) &&
      (filterStatus === "all" || (filterStatus === "active" && p.isActive) || (filterStatus === "inactive" && !p.isActive));
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
    if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
    if (sortBy === "stock-low") return (a.stock || 0) - (b.stock || 0);
    return 0; // newest
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterCat, filterStatus, sortBy]);

  const activeCount = products.filter(p => p.isActive).length;
  const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
  const totalValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await API(`/api/vendor/${vendorSlug}/products`, { method: "POST", body: JSON.stringify(form) });
      setModal(null); await loadProducts();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      await API(`/api/vendor/${vendorSlug}/products/${modal.data._id}`, { method: "PUT", body: JSON.stringify(form) });
      setModal(null); await loadProducts();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const handleToggle = async (p) => {
    try {
      await API(`/api/vendor/${vendorSlug}/products/${p._id}`, { method: "PUT", body: JSON.stringify({ isActive: !p.isActive }) });
      await loadProducts();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API(`/api/vendor/${vendorSlug}/products/${deleteTarget._id}`, { method: "DELETE" });
      setDeleteTarget(null); await loadProducts();
    } catch (err) { alert(err.message); } finally { setDeleting(false); }
  };

  return (
    <div className="vendor-page">
      {modal && (
        <ProductModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? { ...modal.data, category: modal.data.category?._id, subCategory: modal.data.subCategory?._id } : null}
          initialImages={modal.mode === "edit" ? modal.data.images || [] : []}
          categories={categories} vendorSlug={vendorSlug}
          onSave={modal.mode === "create" ? handleCreate : handleUpdate}
          onClose={() => !saving && setModal(null)} saving={saving}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "400px" }}>
            <h2 className="modal-title" style={{ color: "var(--error)" }}>Delete Product</h2>
            <p className="text-secondary" style={{ marginBottom: "24px" }}>Are you sure you want to permanently delete {deleteTarget.name}?</p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <header className="vendor-header">
        <div className="vendor-header-content">
          <div className="subtitle">📦 Inventory Management</div>
          <h1>Products</h1>
          <p className="description">Manage your full product catalog — pricing, stock, and visibility.</p>
        </div>
        <div className="vendor-header-actions">
          <button className="btn btn-secondary" onClick={loadProducts}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}><Plus size={15} /> Add Product</button>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard icon={ShoppingBag} value={products.length} label="Total Products" variant="primary" />
        <StatCard icon={CheckCircle2} value={activeCount} label="Active" variant="success" />
        <StatCard icon={TrendingDown} value={outOfStock} label="Out of Stock" variant="danger" />
        <StatCard icon={IndianRupee} value={`₹${(totalValue / 1000).toFixed(0)}K`} label="Inventory Value" variant="warning" />
        <StatCard icon={BarChart2} value={filtered.length} label="Matching Filter" variant="info" />
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--secondary-bg)", outline: "none" }}
            />
          </div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ padding: "10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "var(--secondary-bg)" }}>
            <option value="all">All Categories</option>
            {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "var(--secondary-bg)" }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "var(--secondary-bg)" }}>
            <option value="newest">Newest First</option>
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="price-low">Price: Low→High</option>
            <option value="price-high">Price: High→Low</option>
            <option value="stock-low">Stock: Low→High</option>
          </select>
        </div>
      </div>

      {loading && <div className="grid-auto">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-text" /></div>)}</div>}

      {!loading && fetchError && (
        <div className="card" style={{ background: "rgba(220,38,38,0.1)", color: "var(--error)" }}>
          <AlertCircle size={16} style={{ display: "inline", marginRight: "8px" }} /> {fetchError}
        </div>
      )}

      {!loading && !fetchError && sorted.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon"><Package size={32} /></div>
          <h3 className="empty-state-title">No products found</h3>
        </div>
      )}

      {!loading && !fetchError && sorted.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "6px", background: "var(--secondary-bg)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                        {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageOff size={16} className="text-muted" style={{ margin: "12px" }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{p.slug || "No slug"}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.category ? <span className="badge badge-info">{p.category.name}</span> : <span className="text-muted text-sm italic">Uncategorized</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>₹{p.price}</div>
                    {p.salePrice && <div style={{ fontSize: "11px", color: "var(--success)" }}>Sale: ₹{p.salePrice}</div>}
                  </td>
                  <td><StockBadge stock={p.stock || 0} /></td>
                  <td><StatusBadge isActive={p.isActive} /></td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btn-icon btn-secondary" onClick={() => handleToggle(p)}>
                        {p.isActive ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-muted" />}
                      </button>
                      <button className="btn btn-icon btn-secondary" onClick={() => setModal({ mode: "edit", data: p })}><Edit2 size={16} /></button>
                      <button className="btn btn-icon btn-danger" onClick={() => setDeleteTarget(p)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Showing <strong>{(safePage - 1) * PAGE_SIZE + 1}</strong> to <strong>{Math.min(safePage * PAGE_SIZE, sorted.length)}</strong> of <strong>{sorted.length}</strong> results
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button className="btn btn-secondary btn-sm" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><ChevronLeft size={14} /></button>
                <button className="btn btn-secondary btn-sm" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VendorProducts;
