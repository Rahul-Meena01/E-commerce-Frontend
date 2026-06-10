import { MapPin, Plus, Edit2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import authFetch from "@/shared/utils/http";

const EMPTY_FORM = {
  title: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

const ProfileSectionAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/addresses");
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.addresses || []);
      }
    } catch (err) {
      void err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr._id);
    setForm({
      title: addr.title || "",
      address: addr.address || "",
      city: addr.city || "",
      postalCode: addr.postalCode || "",
      country: addr.country || "",
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title,
      address: form.address,
      city: form.city,
      postalCode: form.postalCode,
      country: form.country,
    };

    try {
      if (editingId) {
        const res = await authFetch(`/api/addresses/${editingId}`, {
          method: "PUT",
          body: payload,
        });

        if (res.ok) {
          const json = await res.json();
          setAddresses((prev) =>
            prev.map((addr) => (addr._id === editingId ? json.address : addr)),
          );
        }
      } else {
        const res = await authFetch("/api/addresses", {
          method: "POST",
          body: payload,
        });

        if (res.ok) {
          const json = await res.json();
          setAddresses((prev) => [...prev, json.address]);
        }
      }
    } catch (err) {
      void err;
    } finally {
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this address?")) return;

    try {
      const res = await authFetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAddresses((prev) => prev.filter((addr) => addr._id !== id));
      }
    } catch (err) {
      void err;
    }
  };

  return (
    <div className="profile-section-addresses">
      <div className="profile-section-header">
        <h2 className="profile-section-title">Saved Addresses</h2>
        <button className="profile-add-address-btn" onClick={handleAdd}>
          <Plus size={16} />
          Add New Address
        </button>
      </div>

      {showForm && (
        <div className="address-modal-backdrop">
          <div className="address-modal">
            <h3>{editingId ? "Edit Address" : "Add Address"}</h3>
            <form onSubmit={handleSubmit}>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </label>
              <label>
                Address
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                City
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </label>
              <label>
                Postal Code
                <input
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm({ ...form, postalCode: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Country
                <input
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  required
                />
              </label>
              <div className="address-modal-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  {editingId ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading addresses...</p>
      ) : addresses.length > 0 ? (
        <div className="profile-addresses-list">
          {addresses.map((addr) => (
            <div key={addr._id} className="profile-address-card">
              <div className="profile-address-content">
                <h3 className="profile-address-title">{addr.title}</h3>
                <p className="profile-address-text">
                  {addr.address}, {addr.city} {addr.postalCode} {addr.country}
                </p>
              </div>
              <div className="profile-address-actions">
                <button
                  className="profile-address-btn edit"
                  aria-label="Edit address"
                  onClick={() => openEdit(addr)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="profile-address-btn delete"
                  aria-label="Delete address"
                  onClick={() => handleDelete(addr._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="profile-empty-state">
          <MapPin size={48} color="#d0d0d0" />
          <h3>No saved addresses</h3>
          <p>Add a delivery address when you’re ready to place an order.</p>
          <button className="profile-cta-btn" onClick={handleAdd}>
            Add New Address
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSectionAddresses;
