/*
 * Handover note: Admin dashboard screen.
 * Fetches summary data from protected backend endpoints and presents quick operational status for catalog/order management.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// const API = (path) =>
//   fetch(path, {
//     headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//   }).then((r) => r.json());

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const API = async (path) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const token = userInfo?.token || localStorage.getItem("token");

  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return res.json();
};

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "24px",
        cursor: onClick ? "pointer" : "default",
        border: `1px solid ${color}22`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "80px",
          height: "80px",
          background: `${color}10`,
          borderRadius: "0 16px 0 80px",
        }}
      />
      <p
        style={{
          color: "#64748b",
          fontSize: "13px",
          fontWeight: "500",
          marginBottom: "8px",
          fontFamily: "'Outfit',sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </p>
      <h2
        style={{
          color: "#0f172a",
          fontSize: "32px",
          fontWeight: "700",
          fontFamily: "'Outfit',sans-serif",
          margin: 0,
        }}
      >
        {value}
      </h2>
      {sub && (
        <p
          style={{
            color,
            fontSize: "12px",
            marginTop: "6px",
            fontWeight: "500",
          }}
        >
          {sub}
        </p>
      )}
      {onClick && (
        <p style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>
          Click to view →
        </p>
      )}
    </div>
  );
}

function MiniBar({ label, value, max, color, prefix = "₹", suffix = "" }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: "#334155",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#0f172a",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {prefix}{value?.toLocaleString()}{suffix}
        </span>
      </div>
      <div
        style={{
          height: "6px",
          background: "#f1f5f9",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min((value / max) * 100, 100)}%`,
            background: color,
            borderRadius: "99px",
            transition: "width 0.6s",
          }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState(null); // { index, x, revenue, month }

  useEffect(() => {
    Promise.all([
      API("/api/category/all"),
      API("/api/subCategory/all"),
      API("/api/product/all"),
      API("/api/orders?limit=all")
    ]).then(([cat, sub, prod, orderData]) => {
      setCategories(cat.data || []);
      setSubCategories(sub.data || []);
      setProducts(prod.data || []);
      setOrders(orderData.orders || []);
      setLoading(false);
    });
  }, []);

  const totalRevenue = orders
    .filter((o) => o.orderStatus !== "Cancelled")
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const activeProducts = products.filter((p) => p.status === "Active").length;

  const pendingOrders = orders.filter((o) => o.orderStatus === "Pending").length;

  const completedOrders = orders.filter(
    (o) => o.orderStatus === "Delivered",
  ).length;

  // Real monthly revenue data based on orders of the current year
  const currentYear = new Date().getFullYear();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthlyRevenue = Array(12).fill(0);
  orders.forEach((o) => {
    if (o.orderStatus !== "Cancelled") {
      const d = new Date(o.createdAt);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlyRevenue[m] += (o.totalPrice || 0);
      }
    }
  });

  const chartData = months.map((m, i) => ({
    month: m,
    revenue: Math.floor(monthlyRevenue[i]),
  }));

  const maxRev = Math.max(...chartData.map((d) => d.revenue), 1);

  // Top selling products (real data from orders)
  const productSales = {};
  orders.forEach((o) => {
    if (o.orderStatus !== "Cancelled" && o.orderItems) {
      o.orderItems.forEach((item) => {
        const pId = item.product?._id || item.product;
        if (pId) {
          productSales[pId] = (productSales[pId] || 0) + (item.qty || 1);
        }
      });
    }
  });

  const topProducts = [...products]
    .map(p => ({ ...p, totalSold: productSales[p._id] || 0 }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 6);

  const maxTopSold = topProducts[0]?.totalSold || 1;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #6366f1",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "#64748b", fontFamily: "'Outfit',sans-serif" }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            color: "#0f172a",
            fontWeight: "700",
            fontSize: "26px",
            margin: 0,
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
          Welcome back, Admin
        </p>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <StatCard
          label="Total Orders"
          value={orders.length || 0}
          color="#6366f1"
          sub={`Pending: ${pendingOrders} • Completed: ${completedOrders}`}
          onClick={() => navigate("/admin/orders")}
        />
        <StatCard
          label="Total Products"
          value={products.length}
          color="#8b5cf6"
          sub={`${activeProducts} active`}
          onClick={() => navigate("/admin/products")}
        />
        <StatCard
          label="Categories"
          value={categories.length}
          color="#06b6d4"
        />
        <StatCard
          label="SubCategories"
          value={subCategories.length}
          color="#10b981"
        />
        <StatCard
          label="Est. Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          color="#f59e0b"
        />
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {/* Revenue Chart */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              color: "#0f172a",
              fontWeight: "600",
              margin: "0 0 20px",
              fontSize: "16px",
            }}
          >
            Revenue Growth
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "6px",
              height: "140px",
              position: "relative",
            }}
          >
            {/* Tooltip */}
            {hoveredBar !== null && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `calc(${(hoveredBar.index / chartData.length) * 100}% + ${(1 / chartData.length) * 50}%)`,
                  transform: "translateX(-50%)",
                  background: "#0f172a",
                  color: "white",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "2px" }}>
                  {hoveredBar.month} {new Date().getFullYear()}
                </div>
                ₹{hoveredBar.revenue.toLocaleString()}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-5px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "5px solid #0f172a",
                  }}
                />
              </div>
            )}

            {chartData.map((d, i) => (
              <div
                key={d.month}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredBar({ index: i, month: d.month, revenue: d.revenue })}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div
                  style={{
                    width: "100%",
                    borderRadius: "4px 4px 0 0",
                    height: `${Math.max((d.revenue / maxRev) * 120, 4)}px`,
                    background:
                      hoveredBar?.index === i
                        ? "linear-gradient(180deg,#4f46e5,#7c3aed)"
                        : i === new Date().getMonth()
                          ? "linear-gradient(180deg,#6366f1,#8b5cf6)"
                          : "#e0e7ff",
                    transition: "height 0.5s, background 0.15s",
                    transform: hoveredBar?.index === i ? "scaleY(1.04)" : "scaleY(1)",
                    transformOrigin: "bottom",
                  }}
                />
                <span
                  style={{
                    fontSize: "9px",
                    color: hoveredBar?.index === i ? "#6366f1" : "#94a3b8",
                    fontWeight: hoveredBar?.index === i ? "700" : "400",
                    transition: "color 0.15s",
                  }}
                >
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{
              color: "#0f172a",
              fontWeight: "600",
              margin: "0 0 20px",
              fontSize: "16px",
            }}
          >
            Top Products by Volume
          </h3>
          {topProducts.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>
              No products found.
            </p>
          ) : (
            topProducts.map((p, i) => (
              <MiniBar
                key={p._id}
                label={p.name}
                value={p.totalSold}
                max={maxTopSold}
                color={COLORS[i % COLORS.length]}
                prefix=""
                suffix=" sold"
              />
            ))
          )}
        </div>
      </div>

      {/* Products Quick Table */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontWeight: "600",
              fontSize: "16px",
              color: "#0f172a",
            }}
          >
            Recent Products
          </h3>
          <button
            onClick={() => navigate("/admin/products")}
            style={{
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "7px 16px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            View All
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                {["Product", "Category", "Brand", "Price", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        color: "#64748b",
                        fontWeight: "600",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 8).map((p) => (
                <tr key={p._id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "#0f172a",
                      fontWeight: "500",
                    }}
                  >
                    {p.name}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>
                    {p.subCategory?.parentCategory?.name || "-"}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>
                    {p.brand}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#0f172a" }}>
                    ₹{p.discountPrice || p.price}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "99px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background:
                          p.status === "Active" ? "#dcfce7" : "#fef2f2",
                        color: p.status === "Active" ? "#166534" : "#991b1b",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}