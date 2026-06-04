import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  ToggleRight,
  ToggleLeft,
  X,
} from "lucide-react";
import API from "../../utils/api";
import Modal from "../../components/Modal";
import "../../styles/vendor.css";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function VendorCoupons() {
  const { vendorSlug } = useParams();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, [vendorSlug]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await API(`${BASE}/api/vendor/${vendorSlug}/coupons`);
      const list = Array.isArray(data) ? data : data?.data ?? data?.coupons ?? [];
      setCoupons(list);
    } catch (err) {
      setError("Failed to load coupons");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    if (filter === "active") return c.isActive === true;
    if (filter === "inactive") return c.isActive === false;
    return true;
  });

  const activeCoupons = coupons.filter((c) => c.isActive).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);

  const handleDelete = async (couponId) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await API(`${BASE}/api/vendor/${vendorSlug}/coupons/${couponId}`, {
        method: "DELETE",
      });
      setCoupons(coupons.filter((c) => c._id !== couponId));
    } catch (err) {
      alert("Failed to delete coupon");
    }
  };

  const handleToggle = async (couponId, currentStatus) => {
    try {
      await API(`${BASE}/api/vendor/${vendorSlug}/coupons/${couponId}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      setCoupons(
        coupons.map((c) =>
          c._id === couponId ? { ...c, isActive: !currentStatus } : c
        )
      );
    } catch (err) {
      alert("Failed to update coupon");
    }
  };

  const handleSaveCoupon = async (form) => {
    setSaving(true);
    try {
      if (showModal.mode === "create") {
        await API(`${BASE}/api/vendor/${vendorSlug}/coupons`, {
          method: "POST",
          body: JSON.stringify(form),
        });
      } else {
        await API(`${BASE}/api/vendor/${vendorSlug}/coupons/${showModal.data._id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      }
      setShowModal(null);
      fetchCoupons();
    } catch (err) {
      alert(err.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vendor-page">
      {/* Header */}
      <div className="vendor-header">
        <div className="vendor-header-content">
          <div className="subtitle">🎟️ Promotions</div>
          <h1>Coupons & Discounts</h1>
          <p className="description">Create and manage discount coupons for your customers</p>
        </div>
        <div className="vendor-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal({ mode: "create" })}>
            <Plus size={16} />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon success">
            <Tag size={20} />
          </div>
          <div>
            <div className="stat-value">{coupons.length}</div>
            <div className="stat-label">Total Coupons</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary">
            <ToggleRight size={20} />
          </div>
          <div>
            <div className="stat-value">{activeCoupons}</div>
            <div className="stat-label">Active Now</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <Users size={20} />
          </div>
          <div>
            <div className="stat-value">{totalUses}</div>
            <div className="stat-label">Total Uses</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: "24px", padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { value: "all", label: "All Coupons" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={filter === btn.value ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="grid-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="card" style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--error)" }}>
          <AlertCircle size={20} style={{ display: "inline", marginRight: "8px" }} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && filteredCoupons.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Tag size={32} />
          </div>
          <h3 className="empty-state-title">No coupons found</h3>
          <p className="empty-state-description">Create your first coupon to offer discounts to customers</p>
          <button className="btn btn-primary" style={{ marginTop: "16px" }} onClick={() => setShowModal({ mode: "create" })}>
            <Plus size={16} />
            Create Coupon
          </button>
        </div>
      )}

      {!loading && !error && filteredCoupons.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Discount Details</th>
                <th>Usage & Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="stat-icon warning" style={{ width: 32, height: 32 }}>
                        <Tag size={16} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {coupon.code || "Unnamed"}
                      </h3>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% off`
                        : `₹${coupon.discountValue} off`}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                        <Users size={12} /> Used {coupon.usageCount || 0} times
                      </span>
                      {coupon.expiryDate && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={12} /> Expires {new Date(coupon.expiryDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${coupon.isActive ? "badge-success" : "badge-secondary"}`}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-icon btn-secondary"
                        onClick={() => handleToggle(coupon._id, coupon.isActive)}
                        title={coupon.isActive ? "Deactivate" : "Activate"}
                      >
                        {coupon.isActive ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-muted" />}
                      </button>
                      <button className="btn btn-icon btn-secondary" title="Edit" onClick={() => setShowModal({ mode: "edit", data: coupon })}>
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => handleDelete(coupon._id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CouponModal
          mode={showModal.mode}
          initial={showModal.data}
          onClose={() => setShowModal(null)}
          onSave={handleSaveCoupon}
          saving={saving}
        />
      )}
    </div>
  );
}

function CouponModal({ mode, initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(
    initial || { code: "", discountType: "percent", discountValue: "", minOrderValue: "", maxUses: "", expiresAt: "" }
  );
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.code.trim()) return setErr("Coupon code is required");
    if (!form.discountValue || Number(form.discountValue) <= 0) return setErr("Valid discount value required");
    setErr("");
    
    const payload = {
      ...form,
      discountValue: Number(form.discountValue),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null
    };
    onSave(payload);
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="medium">
      <div className="modal-header">
        <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Tag size={20} className="text-info" /> {mode === "create" ? "Create New Coupon" : "Edit Coupon"}
        </h2>
        <button className="modal-close" onClick={onClose} disabled={saving}><X size={20} /></button>
      </div>

      <form onSubmit={submit}>
        {err && (
          <div className="form-group">
            <div style={{ padding: "12px", background: "rgba(220,38,38,0.1)", color: "var(--error)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} /> {err}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Coupon Code <span className="required">*</span></label>
          <input type="text" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. SUMMER50" disabled={saving || mode === "edit"} autoFocus />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Discount Type</label>
            <select value={form.discountType} onChange={(e) => set("discountType", e.target.value)} disabled={saving}>
              <option value="percent">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Discount Value <span className="required">*</span></label>
            <input type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} placeholder="0" disabled={saving} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Min Order Value (₹)</label>
            <input type="number" min="0" step="0.01" value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} placeholder="Optional" disabled={saving} />
          </div>
          <div className="form-group">
            <label>Max Uses (Total)</label>
            <input type="number" min="1" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Unlimited" disabled={saving} />
          </div>
        </div>

        <div className="form-group">
          <label>Expiry Date</label>
          <input type="date" value={form.expiresAt ? new Date(form.expiresAt).toISOString().split('T')[0] : ""} onChange={(e) => set("expiresAt", e.target.value)} disabled={saving} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Coupon"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default VendorCoupons;
