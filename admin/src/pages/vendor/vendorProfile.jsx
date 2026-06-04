import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Store,
  Save,
  AlertCircle,
  CheckCircle,
  Upload,
  Lock,
} from "lucide-react";
import API from "../../utils/api";
import "../../styles/vendor.css";

function VendorProfile() {
  const { vendorSlug } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    shopName: "",
    businessEmail: "",
    businessPhone: "",
    websiteUrl: "",
    address: "",
    city: "",
    pincode: "",
    description: "",
    logo: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await API(`/api/vendor/${vendorSlug}/me`);
      const vendorData = response?.data;
      setVendor(vendorData);
      setFormData({
        shopName: vendorData?.shopName || "",
        businessEmail: vendorData?.businessEmail || "",
        businessPhone: vendorData?.businessPhone || "",
        websiteUrl: vendorData?.websiteUrl || "",
        address: vendorData?.address || "",
        city: vendorData?.city || "",
        pincode: vendorData?.pincode || "",
        description: vendorData?.description || "",
        logo: vendorData?.logo || "",
      });
    } catch (err) {
      setError(err.message || "Failed to load profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vendorSlug]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      await API(`/api/vendor/${vendorSlug}/me`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setSuccess("Profile updated successfully!");
      await loadProfile();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="vendor-page">
      {/* Header */}
      <div className="vendor-header">
        <div className="vendor-header-content">
          <div className="subtitle">👤 Settings</div>
          <h1>Vendor Profile</h1>
          <p className="description">Manage your store information and business details</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="card" style={{ background: "rgba(52, 211, 153, 0.1)", color: "var(--success)", marginBottom: "24px", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--error)", marginBottom: "24px", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: "70%" }} />
        </div>
      ) : (
        <>
          {/* Profile Header */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "12px",
                  background: "var(--secondary-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--info)",
                  fontSize: "32px",
                  flex: "0 0 auto",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid var(--border-color)"
                }}
              >
                {vendor?.logo ? (
                  <img
                    src={vendor.logo}
                    alt={vendor.shopName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Store size={40} className="text-muted" />
                )}
                <button
                  className="btn btn-primary"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    borderRadius: "6px 0 12px 0",
                    padding: "6px 8px",
                  }}
                  title="Change logo"
                >
                  <Upload size={14} />
                </button>
              </div>

              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
                  {vendor?.shopName || "Your Store"}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                  {vendor?.businessType || "Vendor"} • Active since{" "}
                  {vendor?.createdAt ? new Date(vendor.createdAt).toLocaleDateString("en-IN") : "N/A"}
                </p>
                <div style={{ marginTop: "8px", display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Slug: <code style={{ color: "var(--text-primary)", background: "var(--secondary-bg)", padding: "2px 6px", borderRadius: "4px" }}>{vendorSlug}</code>
                  </span>
                  {vendor?.verified && (
                    <span className="badge badge-success" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={12} /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="card" style={{ marginBottom: "24px", padding: 0 }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border-color)", padding: "20px", marginBottom: 0 }}>
              <h3 className="card-title">
                <UserCircle size={20} className="text-primary" />
                Store Information
              </h3>
            </div>

            <div style={{ padding: "24px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
                Business Details
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label>Shop Name</label>
                  <input
                    type="text"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleChange}
                    placeholder="Your shop name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Mail size={14} style={{ display: "inline", marginRight: "4px" }} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="businessEmail"
                    value={formData.businessEmail}
                    onChange={handleChange}
                    placeholder="business@example.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Phone size={14} style={{ display: "inline", marginRight: "4px" }} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="businessPhone"
                    value={formData.businessPhone}
                    onChange={handleChange}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Business Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell us about your business..."
                  rows="4"
                />
              </div>

              {/* Address */}
              <div style={{ marginTop: "28px", paddingTop: "28px", borderTop: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
                  <MapPin size={16} style={{ display: "inline", marginRight: "8px" }} />
                  Address
                </h4>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Street address"
                  />
                </div>

                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input type="url" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="https://" />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="000000" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="form-actions" style={{ marginTop: "24px" }}>
                <button className="btn btn-secondary" onClick={loadProfile} disabled={isSaving}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border-color)", padding: "20px", marginBottom: 0 }}>
              <h3 className="card-title">
                <Lock size={20} className="text-warning" />
                Security
              </h3>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                    Change Password
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                    Update your account password
                  </p>
                </div>
                <button className="btn btn-secondary">Change Password</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default VendorProfile;
