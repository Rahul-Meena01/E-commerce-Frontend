/*
 * Handover note: Admin profile screen.
 * Reads admin profile data from /api/admin/profile and submits text/image updates as FormData.
 */
import { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import ImageUploader from "../../components/ImageUploader";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const formFieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "18px",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "white",
  fontSize: "14px",
  color: "#0f172a",
  outline: "none",
};

const buttonStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "14px",
  padding: "14px 20px",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: "#f1f5f9",
  color: "#334155",
};

function Field({ label, error, children }) {
  return (
    <div style={formFieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && (
        <span style={{ color: "#dc2626", fontSize: "13px" }}>{error}</span>
      )}
    </div>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: "", message: "" });
  const [profileImage, setProfileImage] = useState("");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    return imagePath.startsWith("http") ? imagePath : imagePath;
  };

  const profileImageUrl = useMemo(() => {
    if (profileImage) return profileImage;
    return profile?.profileImage ? getImageUrl(profile.profileImage) : "";
  }, [profile, profileImage]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await API("/api/admin/profile");
        if (response.success) {
          setProfile(response.profile);
          setForm((prev) => ({
            ...prev,
            name: response.profile.name || "",
            email: response.profile.email || "",
            phone: response.profile.phone || "",
          }));
        } else {
          setNotification({ type: "error", message: response.message || "Unable to load profile." });
        }
      } catch (error) {
        setNotification({ type: "error", message: error.message || "Unable to load profile." });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email address is required.";
    else if (!/^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (form.newPassword) {
      if (!form.currentPassword) nextErrors.currentPassword = "Current password is required.";
      if (form.newPassword.length < 6) nextErrors.newPassword = "New password must be at least 6 characters.";
      if (form.newPassword !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  };



  const handleInputChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const clearNotification = () => setNotification({ type: "", message: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotification({ type: "", message: "" });

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const token = (() => {
        try {
          const userInfo = JSON.parse(localStorage.getItem("userInfo"));
          return userInfo?.token || localStorage.getItem("token") || "";
        } catch {
          return localStorage.getItem("token") || "";
        }
      })();

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());
      formData.append("phone", form.phone.trim());
      if (form.currentPassword) formData.append("currentPassword", form.currentPassword);
      if (form.newPassword) formData.append("newPassword", form.newPassword);
      if (form.confirmPassword) formData.append("confirmPassword", form.confirmPassword);
      if (profileImage) formData.append("profileImage", profileImage);

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${API_URL}/api/admin/profile`, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
        setForm((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        setProfileImage("");
        setNotification({ type: "success", message: data.message || "Profile updated successfully." });
      } else {
        setNotification({ type: "error", message: data.message || "Unable to save profile." });
      }
    } catch (error) {
      setNotification({ type: "error", message: error.message || "Unable to save profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px", minHeight: "100vh", fontFamily: "'Outfit', sans-serif", color: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Admin Profile</h1>
          <p style={{ marginTop: "10px", color: "#64748b", fontSize: "15px", maxWidth: "680px" }}>
            View and update your admin account information. Changes are saved immediately and reflected in the UI without refresh.
          </p>
        </div>
      </div>

      {notification.message && (
        <div
          style={{
            marginBottom: "20px",
            padding: "16px 18px",
            borderRadius: "16px",
            background: notification.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${notification.type === "success" ? "#34d399" : "#fecaca"}`,
            color: notification.type === "success" ? "#14532d" : "#991b1b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={clearNotification}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: notification.type === "success" ? "#14532d" : "#991b1b",
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: "24px" }}>
        <section
          style={{
            background: "#fff",
            padding: "26px",
            borderRadius: "24px",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
            minHeight: "320px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "110px",
                  height: "110px",
                  margin: "0 auto 18px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#e2e8f0",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "#475569", fontSize: "34px", fontWeight: 700 }}>
                    {profile?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: "10px" }}>
                <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
                  {profile?.name || "Administrator"}
                </h2>
                <p style={{ margin: "8px 0 0", color: "#64748b" }}>{profile?.email || "admin@example.com"}</p>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ color: "#475569", fontSize: "13px", fontWeight: 600, background: "#f8fafc", borderRadius: "999px", padding: "8px 14px" }}>
                  {profile?.role?.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gap: "8px" }}>
                <span style={{ color: "#475569", fontWeight: 600 }}>Contact</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "14px", color: "#334155" }}>
                    <strong>Phone:</strong> {profile?.phone || "Not set"}
                  </div>
                  <div style={{ fontSize: "14px", color: "#334155" }}>
                    <strong>Role:</strong> {profile?.role || "admin"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                <span style={{ color: "#475569", fontWeight: 600 }}>Account stats</span>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#334155" }}>
                    <span>Joined</span>
                    <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#334155" }}>
                    <span>Last updated</span>
                    <span>{profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            padding: "26px",
            borderRadius: "24px",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#0f172a" }}>Profile settings</h2>
              <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                Keep your admin profile information up to date.
              </p>
            </div>
            <span style={{ color: "#64748b", fontSize: "14px" }}>{loading ? "Loading..." : "Ready to edit"}</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px" }}>
            <div style={{ display: "grid", gap: "20px" }}>
              <Field label="Profile image">
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ width: "120px" }}>
                    <ImageUploader 
                      initialUrl={profileImageUrl}
                      onUploadSuccess={(url) => setProfileImage(url)}
                      onRemove={() => setProfileImage("")}
                      aspectRatio="1/1"
                      label=""
                    />
                  </div>
                </div>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Field label="Full name" error={errors.name}>
                  <input
                    style={inputStyle}
                    value={form.name}
                    onChange={(event) => handleInputChange("name", event.target.value)}
                    placeholder="Your full name"
                  />
                </Field>

                <Field label="Email address" error={errors.email}>
                  <input
                    style={inputStyle}
                    value={form.email}
                    onChange={(event) => handleInputChange("email", event.target.value)}
                    placeholder="admin@example.com"
                  />
                </Field>
              </div>

              <Field label="Phone number">
                <input
                  style={inputStyle}
                  value={form.phone}
                  onChange={(event) => handleInputChange("phone", event.target.value)}
                  placeholder="+1 234 567 890"
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <Field label="Current password" error={errors.currentPassword}>
                  <input
                    style={inputStyle}
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) => handleInputChange("currentPassword", event.target.value)}
                    placeholder="Enter current password"
                  />
                </Field>

                <Field label="New password" error={errors.newPassword}>
                  <input
                    style={inputStyle}
                    type="password"
                    value={form.newPassword}
                    onChange={(event) => handleInputChange("newPassword", event.target.value)}
                    placeholder="Enter new password"
                  />
                </Field>
              </div>

              <Field label="Confirm new password" error={errors.confirmPassword}>
                <input
                  style={inputStyle}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => handleInputChange("confirmPassword", event.target.value)}
                  placeholder="Repeat new password"
                />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  name: profile?.name || "",
                  email: profile?.email || "",
                  phone: profile?.phone || "",
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                }));
                setErrors({});
                setNotification({ type: "", message: "" });
                setProfileImage("");
              }} style={secondaryButtonStyle}>
                Reset
              </button>
              <button type="submit" style={{ ...buttonStyle, opacity: saving ? 0.75 : 1 }} disabled={saving}>
                {saving ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {loading && (
        <div style={{ marginTop: "20px", color: "#64748b" }}>Loading profile information...</div>
      )}
    </div>
  );
}