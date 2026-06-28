import { useState, useEffect } from "react";
import API from "../../utils/api";
import "./GiftCards.css";
import StatCard from "../../components/admin/StatCard";
import AdminButton from "../../components/admin/AdminButton";
import Pagination from "../../components/Pagination";
import { Edit2, Trash2, Plus } from "lucide-react";
const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const FilterIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="16"
    height="16"
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
    width="16"
    height="16"
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
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ─── Modal Component ───────────────────────────────────────────────────────────
const GiftCardModal = ({ isOpen, onClose, onSave, editingCard }) => {
  const [formData, setFormData] = useState({
    code: "",
    assignedTo: "",
    giftedBy: "",
    value: "",
    expiryDate: "",
    status: "active",
    description: "",
  });

  useEffect(() => {
    if (editingCard) {
      setFormData({
        _id: editingCard._id,
        code: editingCard.code,
        assignedTo: editingCard.receiverName,
        giftedBy: editingCard.senderName,
        value: editingCard.giftCardValue,
        expiryDate: editingCard.expiryDate
          ? new Date(editingCard.expiryDate).toISOString().split("T")[0]
          : "",
        status: editingCard.status === "inactive" ? "used" : editingCard.status,
        description: editingCard.description || "",
      });
    } else {
      setFormData({
        code: "",
        assignedTo: "",
        giftedBy: "",
        value: "",
        expiryDate: "",
        status: "active",
        description: "",
      });
    }
  }, [editingCard, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="gc-modal-backdrop">
      <div className="gc-modal">
        <div className="gc-modal-header">
          <h2>{editingCard ? "Edit Gift Card" : "Create New Gift Card"}</h2>
          <button onClick={onClose} className="gc-modal-close-btn">
            ✕
          </button>
        </div>

        <div className="gc-modal-body">
          <div className="gc-modal-form-group">
            <label className="gc-form-label">Assigned Person Name *</label>
            <input
              type="text"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              placeholder="Enter assigned person name"
              className="gc-form-input"
            />
          </div>

          <div className="gc-modal-form-group">
            <label className="gc-form-label">Gifted By Person Name *</label>
            <input
              type="text"
              name="giftedBy"
              value={formData.giftedBy}
              onChange={handleChange}
              placeholder="Enter gifted by person name"
              className="gc-form-input"
            />
          </div>

          <div className="gc-form-grid-2">
            <div className="gc-modal-form-group">
              <label className="gc-form-label">Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="GC-2024-001"
                className="gc-form-input"
              />
            </div>
            <div className="gc-modal-form-group">
              <label className="gc-form-label">Value / Discount *</label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                placeholder="500"
                className="gc-form-input"
              />
            </div>
          </div>

          <div className="gc-form-grid-2">
            <div className="gc-modal-form-group">
              <label className="gc-form-label">Expiry Date *</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="gc-form-input"
              />
            </div>
            <div className="gc-modal-form-group">
              <label className="gc-form-label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="gc-form-select"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>

          <div className="gc-modal-form-group">
            <label className="gc-form-label">Description / Message</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter gift card description or message"
              className="gc-form-textarea"
            />
          </div>
        </div>

        <div className="gc-modal-footer">
          <button onClick={onClose} className="gc-btn-cancel">
            Cancel
          </button>
          <button onClick={handleSave} className="gc-btn-save">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Gift Card Grid Card ───────────────────────────────────────────────────────
const GiftCardGridCard = ({ card, onEdit, onDelete }) => {
  const displayStatus = card.status === "inactive" ? "used" : card.status;

  const getStatusClassName = (status) => {
    switch (status) {
      case "active":
        return "gc-status-active";
      case "expired":
        return "gc-status-expired";
      case "used":
      case "inactive":
        return "gc-status-used";
      default:
        return "gc-status-active";
    }
  };

  return (
    <div className="gc-card">
      <div className="gc-card-header">
        <div className="gc-card-code">
          <p className="gc-card-code-label">Code</p>
          <p className="gc-card-code-text">{card.code}</p>
        </div>
        <span
          className={`gc-status-badge ${getStatusClassName(displayStatus)}`}
        >
          {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
        </span>
      </div>

      <div className="gc-card-field">
        <p className="gc-card-field-label">Expiry Date</p>
        <p className="gc-card-field-value">
          {new Date(card.expiryDate).toLocaleDateString()}
        </p>
      </div>

      <div className="gc-card-field">
        <p className="gc-card-field-label">User Name</p>
        <p className="gc-card-field-value">{card.receiverName}</p>
      </div>

      <div className="gc-card-field">
        <p className="gc-card-field-label">Gift Card Value</p>
        <p className="gc-card-field-value gc-value">₹{card.giftCardValue}</p>
      </div>

      <div className="gc-card-field">
        <p className="gc-card-field-label">Description</p>
        <p className="gc-card-field-value gc-description">{card.description}</p>
      </div>

      <div className="gc-card-actions" style={{ display: "flex", gap: "8px" }}>
        <AdminButton variant="secondary" icon={Edit2} onClick={() => onEdit(card)} title="Edit" />
        <AdminButton variant="danger" icon={Trash2} onClick={() => onDelete(card._id)} title="Delete" />
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function GiftCards() {
  const [giftCards, setGiftCards] = useState([]);
  const [totalCards, setTotalCards] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const itemsPerPage = 10;

  const API_BASE_URL = "http://localhost:3000/api/giftCard";

  const fetchGiftCards = async () => {
    try {
      let mappedStatus = filterStatus === "all" ? "" : filterStatus;
      if (mappedStatus === "used") mappedStatus = "inactive";

      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        status: mappedStatus,
      });

      const data = await API(`/api/giftCard/list?${queryParams}`);

      if (data.success) {
        setGiftCards(data.data);
        setTotalCards(data.totalGiftCards);
        setTotalPages(data.totalPages);

        // Fetch active/inactive stats (only once per general fetch for the dashboard feel)
        if (filterStatus === "all" && searchQuery === "") {
           Promise.all([
             API(`/api/giftCard/list?limit=1&status=active`),
             API(`/api/giftCard/list?limit=1&status=inactive`)
           ]).then(([activeRes, inactiveRes]) => {
             setStats({
                active: activeRes.success ? activeRes.totalGiftCards : 0,
                inactive: inactiveRes.success ? inactiveRes.totalGiftCards : 0
             });
           }).catch(err => console.error("Stats fetch error:", err));
        }
      }
    } catch (error) {
      console.error("Error fetching gift cards:", error);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchGiftCards();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filterStatus, currentPage]);

  const handleOpenModal = () => {
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleSaveCard = async (formData) => {
    const payload = {
      receiverName: formData.assignedTo,
      senderName: formData.giftedBy,
      code: formData.code,
      giftCardValue: Number(formData.value),
      expiryDate: formData.expiryDate,
      description: formData.description,
      status: formData.status === "used" ? "inactive" : formData.status,
    };

    try {
      let data;
      
      if (formData._id) {
        data = await API(`/api/giftCard/update/${formData._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        data = await API(`/api/giftCard/create`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (data.success) {
        setIsModalOpen(false);
        fetchGiftCards();
      } else {
        alert(data.message || "Failed to save gift card.");
      }
    } catch (error) {
      console.error("Error saving gift card:", error);
      alert("An error occurred while saving the gift card.");
    }
  };

  const handleDeleteCard = async (id) => {
    if (window.confirm("Are you sure you want to delete this gift card?")) {
      try {
        const data = await API(`/api/giftCard/delete/${id}`, {
          method: "DELETE",
        });

        if (data.success) {
          if (giftCards.length === 1 && currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
          } else {
            fetchGiftCards();
          }
        } else {
          alert(data.message || "Failed to delete gift card.");
        }
      } catch (error) {
        console.error("Error deleting gift card:", error);
      }
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px", color: "#0f172a", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Gift Cards</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "15px" }}>Manage and create gift cards for your customers</p>
        </div>
        <AdminButton icon={Plus} onClick={handleOpenModal}>
          Create New
        </AdminButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <StatCard label="Total Gift Cards" value={totalCards} color="#6366f1" />
        <StatCard label="Active Cards" value={stats.active || 0} color="#10b981" />
        <StatCard label="Inactive Cards" value={stats.inactive || 0} color="#f43f5e" />
      </div>

      <div className="gc-controls">
        <div className="gc-controls-wrapper">
          <div className="gc-search-wrap">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search by user name or code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="gc-search"
            />
          </div>

          <div className="gc-filter-wrap">
            <FilterIcon />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="gc-filter"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>
      </div>

      <div className="gc-results-info">
        Showing{" "}
        {giftCards.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
        {Math.min(currentPage * itemsPerPage, totalCards)} of {totalCards} gift
        cards
      </div>

      {giftCards.length > 0 ? (
        <div className="gc-grid">
          {giftCards.map((card) => (
            <GiftCardGridCard
              key={card._id}
              card={card}
              onEdit={handleEditCard}
              onDelete={handleDeleteCard}
            />
          ))}
        </div>
      ) : (
        <div className="gc-empty-state">
          <p>No gift cards found.</p>
        </div>
      )}

      <Pagination page={currentPage} pages={totalPages} onPageChange={setCurrentPage} />

      <GiftCardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
        editingCard={editingCard}
      />
    </div>
  );
}
