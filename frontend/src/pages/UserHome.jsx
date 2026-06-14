/*
 * Handover note: User landing page.
 * Shows the post-login shopping/customer entry experience and uses localStorage user details for personalization and logout.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

function UserHome() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          padding: "36px",
        }}
      >
        <p
          style={{
            color: "#667eea",
            fontWeight: "700",
            fontSize: "13px",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          User Account
        </p>
        <h1 style={{ color: "#1a1a2e", marginBottom: "10px" }}>
          Welcome, {user?.name || "User"}
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "22px" }}>
          Your user login and registration flow is active. Admin users will be sent to
          the admin dashboard, and user accounts land here.
        </p>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "22px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div style={{ color: "#334155", fontSize: "14px" }}>
            <strong>Email:</strong> {user?.email || "-"}
          </div>
          <div style={{ color: "#334155", fontSize: "14px" }}>
            <strong>Role:</strong> {user?.role || "user"}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "10px",
            padding: "12px 16px",
            cursor: "pointer",
            color: "white",
            fontWeight: "600",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default UserHome;
