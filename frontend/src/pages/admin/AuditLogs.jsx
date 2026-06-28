import React, { useState, useEffect } from "react";
import API from "../../utils/api";
import StatCard from "../../components/admin/StatCard";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logsData, vendorsData] = await Promise.all([
           API("/api/admin/audit-logs"),
           API("/api/admin/vendors?limit=1000")
        ]);
        setLogs(logsData.data || []);
        // The /api/admin/vendors endpoint returns vendors in data.data or data.vendors depending on the response
        setVendors(vendorsData.data || vendorsData.vendors || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px", color: "#0f172a", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Commission Audit Logs</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "15px" }}>Track all changes to vendor commission rates.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <StatCard label="Total Logs" value={logs.length} color="#6366f1" />
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}
      
      {loading ? (
        <p style={{ color: "#64748b" }}>Loading audit logs...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: "#64748b", padding: 24, background: "#fff", borderRadius: 8 }}>No audit logs found.</p>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", textTransform: "uppercase", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "16px 20px" }}>ID</th>
                <th style={{ padding: "16px 20px" }}>Date</th>
                <th style={{ padding: "16px 20px" }}>Admin</th>
                <th style={{ padding: "16px 20px" }}>Vendor</th>
                <th style={{ padding: "16px 20px" }}>Old Commission</th>
                <th style={{ padding: "16px 20px" }}>New Commission</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const vendor = vendors.find(v => v._id === log.targetId);
                return (
                <tr key={log._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px 20px", color: "#334155", fontSize: 14 }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#334155", fontSize: 14 }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#334155", fontSize: 14 }}>
                    <div style={{ fontWeight: 600 }}>{log.adminId?.name || "Unknown"}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{log.adminId?.email || "Unknown"}</div>
                  </td>
                  <td style={{ padding: "16px 20px", color: "#334155", fontSize: 14 }}>
                    {vendor ? vendor.shopName : log.targetId || "Unknown"}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#64748b", fontSize: 14 }}>
                    {log.before?.commissionRate != null ? `${log.before.commissionRate}%` : "—"}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#16a34a", fontSize: 14, fontWeight: 600 }}>
                    {log.after?.commissionRate != null ? `${log.after.commissionRate}%` : "—"}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
