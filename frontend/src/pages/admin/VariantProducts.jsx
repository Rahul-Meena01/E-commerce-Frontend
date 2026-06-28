/*
 * Handover note: Admin variant manager.
 * Loads products and variants, links each variant to a parent product, uploads variant images, and calls /api/variant CRUD endpoints.
 */
// import { useEffect, useMemo, useState } from "react";

// const API = {
//   variants: "/api/variant/all",
//   create: "/api/variant/create",
//   update: (id) => `/api/variant/update/${id}`,
//   delete: (id) => `/api/variant/delete/${id}`,
//   products: "/api/product/all",
// };

// const initialForm = {
//   parentProduct: "",
//   name: "",
//   brand: "",
//   price: "",
//   discountPercent: "",
//   status: "Active",
//   imageFile: null,
//   imagePreview: null,
// };

// const formatNumber = (value) => {
//   if (value == null || value === "") return "0";
//   const number = Number(value);
//   if (Number.isNaN(number)) return "0";
//   const formatted = number.toFixed(2);
//   if (formatted.endsWith(".00")) {
//     return String(Math.trunc(number));
//   }
//   if (formatted.endsWith("0")) {
//     return String(Number(number.toFixed(1)));
//   }
//   return formatted;
// };

// export default function VariantProducts() {
//   const [variants, setVariants] = useState([]);
//   const [productOptions, setProductOptions] = useState([]);
//   const [productQuery, setProductQuery] = useState("");
//   const [search, setSearch] = useState("");
//   const [filterStatus, setFilterStatus] = useState("all");
//   const [filterProduct, setFilterProduct] = useState("all");
//   const [showModal, setShowModal] = useState(false);
//   const [editingVariant, setEditingVariant] = useState(null);
//   const [form, setForm] = useState(initialForm);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     const loadInitialData = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");

//         const variantsRes = await fetch(API.variants, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         });

//         const variantsData = await variantsRes.json();
//         setVariants(variantsData.data || []);
//       } catch (error) {
//         console.error("Unable to load variant page data", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadInitialData();
//   }, []);

//   async function fetchVariants() {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       const query = [];
//       if (filterStatus && filterStatus !== "all") query.push(`status=${encodeURIComponent(filterStatus)}`);
//       if (filterProduct && filterProduct !== "all") query.push(`product=${encodeURIComponent(filterProduct)}`);
//       const q = query.length ? `?${query.join("&")}` : "";
//       const res = await fetch(`${API.variants}${q}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });
//       const data = await res.json();
//       setVariants(data.data || []);
//     } catch (error) {
//       console.error("Unable to load variant products", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function fetchProductOptions(query = "") {
//     try {
//       const token = localStorage.getItem("token");
//       const params = new URLSearchParams();
//       if (query) params.append("search", query);
//       params.append("limit", "5");
//       const res = await fetch(`${API.products}?${params.toString()}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });
//       const data = await res.json();
//       setProductOptions(data.data || []);
//     } catch (error) {
//       console.error("Unable to load base products", error);
//       setProductOptions([]);
//     }
//   }

//   useEffect(() => {
//     if (!showModal) return;
//     const timer = setTimeout(() => {
//       fetchProductOptions(productQuery);
//     }, 300);

//     return () => clearTimeout(timer);
//   }, [showModal, productQuery]);

//   function openCreateModal() {
//     setEditingVariant(null);
//     setForm(initialForm);
//     setProductQuery("");
//     setShowModal(true);
//   }

//   function openEditModal(variant) {
//     setEditingVariant(variant);
//     setForm({
//       parentProduct: variant.parentProduct?._id || "",
//       name: variant.name || "",
//       brand: variant.brand || "",
//       price: variant.price || "",
//       discountPercent: variant.discountPercent || "",
//       status: variant.status || "Active",
//       imageFile: null,
//       imagePreview: variant.image ? `http://localhost:3000${variant.image}` : null,
//     });
//     setProductQuery(variant.parentProduct?.name || "");
//     setShowModal(true);
//   }

//   function handleImageChange(event) {
//     const file = event.target.files?.[0];
//     if (!file) return;
//     setForm((prev) => ({
//       ...prev,
//       imageFile: file,
//       imagePreview: URL.createObjectURL(file),
//     }));
//   }

//   async function handleSubmit(event) {
//     event.preventDefault();

//     if (!form.parentProduct) {
//       return alert("Please choose a parent product for this variant.");
//     }
//     if (!form.name.trim()) {
//       return alert("Variant name is required.");
//     }
//     if (!form.brand.trim()) {
//       return alert("Brand is required.");
//     }
//     if (!form.price) {
//       return alert("Price is required.");
//     }

//     try {
//       setSaving(true);
//       const token = localStorage.getItem("token");
//       const payload = new FormData();
//       payload.append("parentProduct", form.parentProduct);
//       payload.append("name", form.name.trim());
//       payload.append("brand", form.brand.trim());
//       payload.append("price", form.price);
//       payload.append("discountPercent", form.discountPercent);
//       payload.append("status", form.status);
//       if (form.imageFile) payload.append("image", form.imageFile);

//       const url = editingVariant ? API.update(editingVariant._id) : API.create;
//       const method = editingVariant ? "PUT" : "POST";

//       const res = await fetch(url, {
//         method,
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         body: payload,
//       });

//       const data = await res.json();
//       if (!res.ok) {
//         throw new Error(data.message || "Unable to save variant");
//       }

//       setShowModal(false);
//       fetchVariants();
//     } catch (error) {
//       console.error(error);
//       alert(error.message || "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDelete(id) {
//     if (!window.confirm("Delete this variant product permanently?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch(API.delete(id), {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message || "Delete failed");
//       fetchVariants();
//     } catch (error) {
//       console.error(error);
//       alert(error.message || "Delete failed");
//     }
//   }

//   const filteredVariants = useMemo(() => {
//     return variants.filter((variant) => {
//       const text = search.trim().toLowerCase();
//       if (text) {
//         const productName = variant.parentProduct?.name?.toLowerCase() || "";
//         const variantName = variant.name?.toLowerCase() || "";
//         const brand = variant.brand?.toLowerCase() || "";
//         if (!productName.includes(text) && !variantName.includes(text) && !brand.includes(text)) {
//           return false;
//         }
//       }
//       return true;
//     });
//   }, [variants, search]);

//   const stats = {
//     total: variants.length,
//     active: variants.filter((item) => item.status === "Active").length,
//     inactive: variants.filter((item) => item.status === "Inactive").length,
//   };

//   const parentProductOptions = productOptions.map((product) => ({
//     value: product._id,
//     label: product.name,
//   }));

//   const filterProductOptions = useMemo(() => {
//     const map = {};
//     variants.forEach((variant) => {
//       const product = variant.parentProduct;
//       if (product && !map[product._id]) {
//         map[product._id] = product.name;
//       }
//     });
//     return Object.entries(map).map(([value, label]) => ({ value, label }));
//   }, [variants]);

//   const visibleVariants = filteredVariants.filter((variant) => {
//     if (filterStatus !== "all" && variant.status !== filterStatus) return false;
//     if (filterProduct !== "all" && variant.parentProduct?._id !== filterProduct) return false;
//     return true;
//   });

//   return (
//     <div style={styles.page}>
//       <div style={styles.topBar}>
//         <div>
//           <h1 style={styles.heading}>Variant Products</h1>
//           <p style={styles.subheading}>
//             Manage variant products linked to base products, with search, filters and quick actions.
//           </p>
//         </div>
//         <button style={styles.button} onClick={openCreateModal}>
//           + Create New Variant
//         </button>
//       </div>

//       <div style={styles.statRow}>
//         <StatCard label="Total Variants" value={stats.total} color="#6366f1" />
//         <StatCard label="Active" value={stats.active} color="#10b981" />
//         <StatCard label="Inactive" value={stats.inactive} color="#ef4444" />
//       </div>

//       <div style={styles.filterRow}>
//         <div style={styles.searchWrap}>
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search variant or base product..."
//             style={styles.searchInput}
//           />
//         </div>

//         <select
//           value={filterStatus}
//           onChange={(e) => setFilterStatus(e.target.value)}
//           style={styles.select}
//         >
//           <option value="all">All Status</option>
//           <option value="Active">Active</option>
//           <option value="Inactive">Inactive</option>
//         </select>

//         <select
//           value={filterProduct}
//           onChange={(e) => setFilterProduct(e.target.value)}
//           style={styles.select}
//         >
//           <option value="all">All Base Products</option>
//           {filterProductOptions.map((option) => (
//             <option key={option.value} value={option.value}>
//               {option.label}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div style={styles.tableWrapper}>
//         <table style={styles.table}>
//           <thead>
//             <tr>
//               <th style={styles.th}>Image</th>
//               <th style={styles.th}>Variant</th>
//               <th style={styles.th}>Base Product</th>
//               <th style={styles.th}>Brand</th>
//               <th style={styles.th}>Price</th>
//               <th style={styles.th}>Discount</th>
//               <th style={styles.th}>Final Price</th>
//               <th style={styles.th}>Status</th>
//               <th style={styles.th}>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan="9" style={styles.loadingCell}>
//                   Loading variant products...
//                 </td>
//               </tr>
//             ) : visibleVariants.length === 0 ? (
//               <tr>
//                 <td colSpan="9" style={styles.emptyCell}>
//                   No variant products found.
//                 </td>
//               </tr>
//             ) : (
//               visibleVariants.map((variant) => {
//                 const finalPrice = variant.discountPercent
//                   ? Number(variant.price) -
//                     (Number(variant.price) * Number(variant.discountPercent)) / 100
//                   : Number(variant.price);
//                 return (
//                   <tr key={variant._id}>
//                     <td style={styles.td}>
//                       {variant.image ? (
//                         <img
//                           src={`http://localhost:3000${variant.image}`}
//                           alt={variant.name}
//                           style={styles.thumb}
//                         />
//                       ) : (
//                         <div style={styles.noImage}>No image</div>
//                       )}
//                     </td>
//                     <td style={styles.td}>{variant.name}</td>
//                     <td style={styles.td}>{variant.parentProduct?.name || "—"}</td>
//                     <td style={styles.td}>{variant.brand}</td>
//                     <td style={styles.td}>₹{formatNumber(variant.price)}</td>
//                     <td style={styles.td}>
//                       {variant.discountPercent ? `${formatNumber(variant.discountPercent)}%` : "—"}
//                     </td>
//                     <td style={styles.td}>₹{formatNumber(finalPrice)}</td>
//                     <td style={styles.td}>
//                       <span
//                         style={{
//                           ...styles.statusBadge,
//                           background:
//                             variant.status === "Active"
//                               ? "#dcfce7"
//                               : "#fee2e2",
//                           color:
//                             variant.status === "Active"
//                               ? "#166534"
//                               : "#991b1b",
//                         }}
//                       >
//                         {variant.status}
//                       </span>
//                     </td>
//                     <td style={styles.td}>
//                       <div style={styles.actionRow}>
//                         <button
//                           style={styles.editButton}
//                           onClick={() => openEditModal(variant)}
//                         >
//                           Edit
//                         </button>
//                         <button
//                           style={styles.deleteButton}
//                           onClick={() => handleDelete(variant._id)}
//                         >
//                           Delete
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>

//       {showModal && (
//         <div style={styles.modalOverlay}>
//           <div style={styles.modal}>
//             <div style={styles.modalHeader}>
//               <div>
//                 <h2 style={styles.modalTitle}>
//                   {editingVariant ? "Update Variant" : "Create Variant"}
//                 </h2>
//                 <p style={styles.modalSubtitle}>
//                   Link a new variant to an existing product and save the complete details.
//                 </p>
//               </div>
//               <button
//                 onClick={() => setShowModal(false)}
//                 style={styles.closeButton}
//               >
//                 ×
//               </button>
//             </div>

//             <form onSubmit={handleSubmit}>
//               <div style={styles.formGrid}>
//                 <div style={{ gridColumn: "span 2" }}>
//                   <label style={styles.label}>Search Base Product</label>
//                   <input
//                     value={productQuery}
//                     onChange={(e) => setProductQuery(e.target.value)}
//                     placeholder="Search base product"
//                     style={styles.input}
//                   />
//                 </div>
//                 <div>
//                   <label style={styles.label}>Parent Product</label>
//                   <select
//                     value={form.parentProduct}
//                     onChange={(e) =>
//                       setForm((prev) => ({ ...prev, parentProduct: e.target.value }))
//                     }
//                     style={styles.input}
//                   >
//                     <option value="">Select base product</option>
//                     {parentProductOptions.map((option) => (
//                       <option key={option.value} value={option.value}>
//                         {option.label}
//                       </option>
//                     ))}
//                   </select>
//                   {productOptions.length === 0 && (
//                     <p style={styles.smallNote}>No base products found for this search.</p>
//                   )}
//                 </div>

//                 <div>
//                   <label style={styles.label}>Variant Name</label>
//                   <input
//                     value={form.name}
//                     onChange={(e) =>
//                       setForm((prev) => ({ ...prev, name: e.target.value }))
//                     }
//                     style={styles.input}
//                     placeholder="Example: Red XL"
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>Brand</label>
//                   <input
//                     value={form.brand}
//                     onChange={(e) =>
//                       setForm((prev) => ({ ...prev, brand: e.target.value }))
//                     }
//                     style={styles.input}
//                     placeholder="Example: Nike"
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>Price</label>
//                   <input
//                     type="number"
//                     value={form.price}
//                     onChange={(e) =>
//                       setForm((prev) => ({ ...prev, price: e.target.value }))
//                     }
//                     style={styles.input}
//                     placeholder="₹0"
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>Discount %</label>
//                   <input
//                     type="number"
//                     value={form.discountPercent}
//                     onChange={(e) =>
//                       setForm((prev) => ({ ...prev, discountPercent: e.target.value }))
//                     }
//                     style={styles.input}
//                     placeholder="10"
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>Status</label>
//                   <select
//                     value={form.status}
//                     onChange={(e) =>
//                       setForm((prev) => ({ ...prev, status: e.target.value }))
//                     }
//                     style={styles.input}
//                   >
//                     <option value="Active">Active</option>
//                     <option value="Inactive">Inactive</option>
//                   </select>
//                 </div>

//                 <div style={{ gridColumn: "span 2" }}>
//                   <label style={styles.label}>Image</label>
//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={handleImageChange}
//                     style={styles.input}
//                   />
//                 </div>

//                 {form.imagePreview && (
//                   <div style={{ gridColumn: "span 2" }}>
//                     <p style={{ marginBottom: "8px", fontWeight: 600 }}>Preview</p>
//                     <img
//                       src={form.imagePreview}
//                       alt="Variant preview"
//                       style={styles.previewImage}
//                     />
//                   </div>
//                 )}
//               </div>

//               <div style={styles.modalFooter}>
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(false)}
//                   style={styles.cancelButton}
//                 >
//                   Cancel
//                 </button>
//                 <button type="submit" disabled={saving} style={styles.saveButton}>
//                   {saving ? "Saving..." : editingVariant ? "Update Variant" : "Create Variant"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// function StatCard({ label, value, color }) {
//   return (
//     <div style={{ ...styles.statCard, borderColor: `${color}22` }}>
//       <p style={styles.statLabel}>{label}</p>
//       <p style={{ ...styles.statValue, color }}>{value}</p>
//     </div>
//   );
// }

// const styles = {
//   page: {
//     padding: "24px",
//     fontFamily: "'Outfit', sans-serif",
//   },
//   topBar: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     flexWrap: "wrap",
//     gap: "16px",
//     marginBottom: "24px",
//   },
//   heading: {
//     margin: 0,
//     fontSize: "28px",
//     fontWeight: "700",
//     color: "#0f172a",
//   },
//   subheading: {
//     marginTop: "8px",
//     color: "#64748b",
//     fontSize: "14px",
//   },
//   button: {
//     background: "#6366f1",
//     color: "white",
//     border: "none",
//     padding: "12px 20px",
//     borderRadius: "12px",
//     cursor: "pointer",
//     fontWeight: "600",
//   },
//   statRow: {
//     display: "flex",
//     gap: "16px",
//     flexWrap: "wrap",
//     marginBottom: "20px",
//   },
//   statCard: {
//     flex: "1 1 220px",
//     background: "white",
//     borderRadius: "16px",
//     padding: "18px 22px",
//     border: "1px solid",
//     boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
//   },
//   statLabel: {
//     margin: 0,
//     color: "#64748b",
//     fontSize: "12px",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//   },
//   statValue: {
//     margin: "10px 0 0",
//     fontSize: "28px",
//     fontWeight: "700",
//   },
//   filterRow: {
//     display: "flex",
//     gap: "16px",
//     flexWrap: "wrap",
//     marginBottom: "18px",
//   },
//   searchWrap: {
//     flex: "1 1 320px",
//     minWidth: "220px",
//   },
//   searchInput: {
//     width: "100%",
//     padding: "12px 16px",
//     borderRadius: "12px",
//     border: "1px solid #cbd5e1",
//     outline: "none",
//     fontSize: "14px",
//   },
//   select: {
//     minWidth: "180px",
//     padding: "12px 14px",
//     borderRadius: "12px",
//     border: "1px solid #cbd5e1",
//     background: "white",
//     outline: "none",
//     fontSize: "14px",
//   },
//   tableWrapper: {
//     background: "white",
//     borderRadius: "18px",
//     border: "1px solid #e2e8f0",
//     overflow: "hidden",
//     boxShadow: "0 16px 30px rgba(15, 23, 42, 0.04)",
//   },
//   table: {
//     width: "100%",
//     borderCollapse: "collapse",
//   },
//   th: {
//     background: "#f8fafc",
//     padding: "16px",
//     textAlign: "left",
//     fontSize: "13px",
//     color: "#475569",
//     borderBottom: "1px solid #e2e8f0",
//     whiteSpace: "nowrap",
//   },
//   td: {
//     padding: "16px",
//     borderBottom: "1px solid #f1f5f9",
//     fontSize: "14px",
//     color: "#0f172a",
//     verticalAlign: "middle",
//   },
//   loadingCell: {
//     padding: "40px",
//     textAlign: "center",
//     color: "#64748b",
//   },
//   emptyCell: {
//     padding: "40px",
//     textAlign: "center",
//     color: "#64748b",
//   },
//   thumb: {
//     width: "52px",
//     height: "52px",
//     objectFit: "cover",
//     borderRadius: "12px",
//     border: "1px solid #e2e8f0",
//   },
//   noImage: {
//     width: "52px",
//     height: "52px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     borderRadius: "12px",
//     background: "#f8fafc",
//     color: "#64748b",
//     fontSize: "12px",
//   },
//   statusBadge: {
//     display: "inline-flex",
//     padding: "6px 12px",
//     borderRadius: "999px",
//     fontSize: "12px",
//     fontWeight: "700",
//     textTransform: "capitalize",
//   },
//   actionRow: {
//     display: "flex",
//     gap: "10px",
//     flexWrap: "wrap",
//   },
//   editButton: {
//     padding: "10px 14px",
//     borderRadius: "10px",
//     border: "1px solid #c7d2fe",
//     background: "#eef2ff",
//     color: "#3730a3",
//     cursor: "pointer",
//     fontWeight: "600",
//   },
//   deleteButton: {
//     padding: "10px 14px",
//     borderRadius: "10px",
//     border: "1px solid #fecaca",
//     background: "#fef2f2",
//     color: "#b91c1c",
//     cursor: "pointer",
//     fontWeight: "600",
//   },
//   modalOverlay: {
//     position: "fixed",
//     inset: 0,
//     background: "rgba(0, 0, 0, 0.45)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: "20px",
//     zIndex: 9999,
//   },
//   modal: {
//     width: "100%",
//     maxWidth: "720px",
//     borderRadius: "20px",
//     background: "white",
//     padding: "28px",
//     boxShadow: "0 30px 80px rgba(15, 23, 42, 0.16)",
//     maxHeight: "90vh",
//     overflowY: "auto",
//   },
//   modalHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     gap: "16px",
//     marginBottom: "22px",
//   },
//   modalTitle: {
//     margin: 0,
//     fontSize: "24px",
//     color: "#0f172a",
//   },
//   modalSubtitle: {
//     margin: "8px 0 0",
//     color: "#64748b",
//     fontSize: "14px",
//   },
//   closeButton: {
//     border: "none",
//     background: "transparent",
//     fontSize: "28px",
//     cursor: "pointer",
//     lineHeight: 1,
//     color: "#475569",
//   },
//   formGrid: {
//     display: "grid",
//     gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
//     gap: "18px",
//   },
//   label: {
//     display: "block",
//     marginBottom: "8px",
//     fontWeight: "600",
//     color: "#334155",
//     fontSize: "14px",
//   },
//   input: {
//     width: "100%",
//     padding: "12px 14px",
//     borderRadius: "12px",
//     border: "1px solid #cbd5e1",
//     fontSize: "14px",
//     outline: "none",
//     background: "white",
//     boxSizing: "border-box",
//   },
//   previewImage: {
//     width: "100%",
//     maxHeight: "260px",
//     objectFit: "cover",
//     borderRadius: "16px",
//     border: "1px solid #e2e8f0",
//   },
//   modalFooter: {
//     display: "flex",
//     justifyContent: "flex-end",
//     gap: "12px",
//     marginTop: "26px",
//     flexWrap: "wrap",
//   },
//   cancelButton: {
//     padding: "12px 20px",
//     borderRadius: "12px",
//     border: "1px solid #cbd5e1",
//     background: "white",
//     color: "#475569",
//     cursor: "pointer",
//     fontWeight: "600",
//   },
//   saveButton: {
//     padding: "12px 20px",
//     borderRadius: "12px",
//     border: "none",
//     background: "#6366f1",
//     color: "white",
//     cursor: "pointer",
//     fontWeight: "600",
//   },
// };





import { useCallback, useEffect, useMemo, useState } from "react";
import "./VariantProduct.css";
import StatCard from "../../components/admin/StatCard";
import AdminButton from "../../components/admin/AdminButton";
import Pagination from "../../components/Pagination";
import { ToggleLeft, ToggleRight, Edit2, Trash2, Plus } from "lucide-react";
import API from "../../utils/api";

const API_URL = "http://localhost:3000";
const PAGE_SIZE = 10;


const calcFinalPrice = (price, discountPercent) => {
  if (!discountPercent) return Number(price || 0);

  return Math.round(
    Number(price) - (Number(price) * Number(discountPercent)) / 100,
  );
};

const createImageState = (existing = "") => ({
  file: null,
  existing,
});

function VariantProducts() {
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formData, setFormData] = useState({
    parentProduct: "",
    name: "",
    brand: "",
    price: "",
    discountPercent: "",
    status: "Active",
  });

  const [productSearch, setProductSearch] = useState("");

  const [images, setImages] = useState({
    image: createImageState(),
    image1: createImageState(),
    image2: createImageState(),
    image3: createImageState(),
    image4: createImageState(),
  });

  const [loading, setLoading] = useState(false);

  // LOAD DATA

  const loadData = useCallback(async () => {
    try {
      const [variantData, productData] = await Promise.all([
        API("/api/variant/all"),
        API("/api/product/all?limit=1000"),
      ]);

      setVariants(variantData.data || []);
      setProducts(productData.data || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // IMAGE PREVIEW

  const getPreview = (field) => {
    const current = images[field];

    if (current.file instanceof File) {
      return URL.createObjectURL(current.file);
    }

    if (current.existing) {
      return `${API_URL}${current.existing}`;
    }

    return "";
  };

  // IMAGE CHANGE

  const handleImageChange = (field, event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setImages((prev) => ({
      ...prev,
      [field]: {
        file,
        existing: "",
      },
    }));
  };

  // REMOVE IMAGE

  const removeImage = (field) => {
    setImages((prev) => ({
      ...prev,
      [field]: {
        file: null,
        existing: "",
      },
    }));
  };

  // OPEN CREATE

  const openCreateModal = () => {
    setEditingVariant(null);

    setFormData({
      parentProduct: "",
      name: "",
      brand: "",
      price: "",
      discountPercent: "",
      status: "Active",
    });

    setImages({
      image: createImageState(),
      image1: createImageState(),
      image2: createImageState(),
      image3: createImageState(),
      image4: createImageState(),
    });

    setShowModal(true);
  };

  // OPEN EDIT

  const openEditModal = (variant) => {
    setEditingVariant(variant);

    setFormData({
      parentProduct: variant.parentProduct?._id || "",
      name: variant.name || "",
      brand: variant.brand || "",
      price: variant.price || "",
      discountPercent: variant.discountPercent || "",
      status: variant.status || "Active",
    });

    setImages({
      image: createImageState(variant.image || ""),

      image1: createImageState(variant.image1 || ""),

      image2: createImageState(variant.image2 || ""),

      image3: createImageState(variant.image3 || ""),

      image4: createImageState(variant.image4 || ""),
    });

    setShowModal(true);
  };

  // SUBMIT

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const payload = new FormData();

      payload.append("parentProduct", formData.parentProduct);

      payload.append("name", formData.name);

      payload.append("brand", formData.brand);

      payload.append("price", formData.price);

      payload.append("discountPercent", formData.discountPercent);

      payload.append("status", formData.status);

      Object.keys(images).forEach((key) => {
        if (images[key].file instanceof File) {
          payload.append(key, images[key].file);
        } else if (images[key].existing) {
          payload.append(key, images[key].existing);
        }
      });

      const data = await API(
        editingVariant
          ? `/api/variant/update/${editingVariant._id}`
          : "/api/variant/create",
        {
          method: editingVariant ? "PUT" : "POST",
          body: payload,
        },
      );

      if (data.success) {
        loadData();
        setShowModal(false);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // DELETE

  const handleDelete = async () => {
    try {
      const data = await API(`/api/variant/delete/${deleteTarget._id}`, {
        method: "DELETE",
      });

      if (data.success) {
        loadData();
        setDeleteTarget(null);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleToggleStatus = async (variant) => {
    try {
      const newStatus = variant.status === "Active" ? "Inactive" : "Active";
      const payload = new FormData();
      payload.append("status", newStatus);

      const data = await API(`/api/variant/update/${variant._id}`, {
        method: "PUT",
        body: payload,
      });
      if (data.success) {
        loadData();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // PAGINATIONER

  const filteredVariants = useMemo(() => {
    return variants.filter((variant) => {
      const q = search.toLowerCase();

      const matchesSearch =
        !q ||
        variant.name?.toLowerCase().includes(q) ||
        variant.brand?.toLowerCase().includes(q) ||
        variant.parentProduct?.name?.toLowerCase().includes(q);

      const matchesStatus = !statusFilter || variant.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [variants, search, statusFilter]);

  // PAGINATION

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVariants.length / PAGE_SIZE),
  );

  const paginatedVariants = filteredVariants.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // PRODUCT SEARCH

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name?.toLowerCase().includes(productSearch.toLowerCase()),
    );
  }, [products, productSearch]);

  // IMAGE BOX

  const renderImageBox = (field, isHero = false) => {
    const preview = getPreview(field);

    return (
      <label
        className={`vp-upload-box ${
          isHero ? "vp-upload-hero" : "vp-upload-small"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageChange(field, e)}
        />

        {preview ? (
          <>
            <img src={preview} alt="preview" className="vp-preview-image" />

            <button
              type="button"
              className="vp-remove-btn"
              onClick={() => removeImage(field)}
            >
              ×
            </button>
          </>
        ) : (
          <div className="vp-upload-placeholder">
            <span>{isHero ? "Main Variant Image" : "Upload"}</span>
          </div>
        )}
      </label>
    );
  };

  const stats = useMemo(() => {
    return {
      total: variants.length,
      active: variants.filter((v) => v.status === "Active").length,
      inactive: variants.filter((v) => v.status === "Inactive").length,
    };
  }, [variants]);

  return (
    <div className="vp-container container">
      {/* HEADER */}

      <div className="vp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Variant Products</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b" }}>Manage all product variants</p>
        </div>

        <AdminButton icon={Plus} onClick={openCreateModal}>
          New Variant
        </AdminButton>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <StatCard label="Total Variants" value={stats.total} color="#6366f1" />
        <StatCard label="Active" value={stats.active} color="#10b981" />
        <StatCard label="Inactive" value={stats.inactive} color="#f43f5e" />
      </div>

      {/* FILTERS */}

      <div className="vp-toolbar">
        <input
          type="text"
          placeholder="Search variants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vp-search"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="vp-select"
        >
          <option value="">All Status</option>

          <option value="Active">Active</option>

          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* TABLE */}

      <div className="vp-table-wrapper">
        <table className="vp-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Variant</th>
              <th>Base Product</th>
              <th>Brand</th>
              <th>Price</th>
              <th>Discount</th>
              <th>Final Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedVariants.length === 0 ? (
              <tr>
                <td colSpan="10">No Variant Products Found</td>
              </tr>
            ) : (
              paginatedVariants.map((variant, index) => {
                const finalPrice = calcFinalPrice(
                  variant.price,
                  variant.discountPercent,
                );
                const displayId = (page - 1) * PAGE_SIZE + index + 1;

                return (
                  <tr key={variant._id}>
                    <td>{displayId}</td>
                    <td>
                      {variant.image ? (
                        <img
                          src={variant.image.startsWith("http") ? variant.image : `${API_URL}${variant.image}`}
                          alt={variant.name}
                          className="vp-table-image"
                        />
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>{variant.name}</td>

                    <td>{products.find(p => p._id === variant.parentProduct || p._id === variant.parentProduct?._id)?.name || variant.parentProduct?.name || "-"}</td>

                    <td>{variant.brand}</td>

                    <td>₹{variant.price}</td>

                    <td>
                      {variant.discountPercent
                        ? `${variant.discountPercent}%`
                        : "-"}
                    </td>

                    <td>₹{finalPrice}</td>

                    <td>
                      <span
                        className={`vp-status ${
                          variant.status === "Active"
                            ? "vp-active"
                            : "vp-inactive"
                        }`}
                      >
                        {variant.status}
                      </span>
                    </td>

                    <td>
                      <div className="vp-actions" style={{ display: "flex", gap: "8px" }}>
                        <AdminButton
                          variant="secondary"
                          icon={variant.status === "Active" ? ToggleRight : ToggleLeft}
                          onClick={() => handleToggleStatus(variant)}
                          title={variant.status === "Active" ? "Set Inactive" : "Set Active"}
                          style={{ color: variant.status === "Active" ? "#10b981" : "#94a3b8" }}
                        />
                        <AdminButton
                          variant="secondary"
                          icon={Edit2}
                          onClick={() => openEditModal(variant)}
                          title="Edit"
                        />
                        <AdminButton
                          variant="danger"
                          icon={Trash2}
                          onClick={() => setDeleteTarget(variant)}
                          title="Delete"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}

      <Pagination page={page} pages={totalPages} onPageChange={setPage} />

      {/* MODAL */}

      {showModal && (
        <div className="vp-modal-overlay">
          <div className="vp-modal">
            <div className="vp-modal-header">
              <h2>{editingVariant ? "Edit Variant" : "Create Variant"}</h2>

              <button onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="vp-modal-body">
              {/* MAIN IMAGE */}

              {renderImageBox("image", true)}

              {/* OTHER IMAGES */}

              <div className="vp-grid-images">
                {renderImageBox("image1")}
                {renderImageBox("image2")}
                {renderImageBox("image3")}
                {renderImageBox("image4")}
              </div>

              {/* NAME */}

              <input
                type="text"
                placeholder="Variant Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="vp-input"
              />

              {/* PRODUCT SELECT */}

              <div className="vp-product-select">
                <input
                  type="text"
                  placeholder="Search Base Product..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="vp-input"
                />

                <div className="vp-product-list">
                  {filteredProducts.map((product) => (
                    <div
                      key={product._id}
                      className={`vp-product-item ${
                        formData.parentProduct === product._id
                          ? "vp-product-selected"
                          : ""
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          parentProduct: product._id,
                        }))
                      }
                    >
                      {product.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* ROW 1 */}

              <div className="vp-row">
                <input
                  type="text"
                  placeholder="Brand"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      brand: e.target.value,
                    }))
                  }
                  className="vp-input"
                />

                <input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  className="vp-input"
                />
              </div>

              {/* ROW 2 */}

              <div className="vp-row">
                <input
                  type="number"
                  placeholder="Discount %"
                  value={formData.discountPercent}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discountPercent: e.target.value,
                    }))
                  }
                  className="vp-input"
                />

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="vp-input"
                >
                  <option value="Active">Active</option>

                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* FOOTER */}

            <div className="vp-modal-footer">
              <button
                className="vp-cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                className="vp-submit-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : editingVariant
                    ? "Update Variant"
                    : "Create Variant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}

      {deleteTarget && (
        <div className="vp-modal-overlay">
          <div className="vp-delete-modal">
            <h3>Delete Variant Product</h3>

            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>

            <div className="vp-delete-actions">
              <button onClick={() => setDeleteTarget(null)}>Cancel</button>

              <button onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VariantProducts;
