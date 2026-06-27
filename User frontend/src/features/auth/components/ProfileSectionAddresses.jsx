import { MapPin, Plus, Edit2, Trash2 } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import Select from "react-select";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { Country, State, City } from "country-state-city";
import {
  validatePhone,
  validatePostalCode,
  validateAddress,
  validateCountry,
  validateState,
  validateCity,
  validateTitle,
  validateFullName,
} from "@/shared/utils/addressValidation";

const EMPTY_FORM = {
  title: "",
  fullName: "",
  phoneNumber: "",
  countryCode: "",
  country: "",
  state: "",
  stateCode: "",
  city: "",
  postalCode: "",
  addressLine1: "",
  addressLine2: "",
  isDefault: false,
};

const isFormDirty = (current, original) => {
  const fields = [
    "title",
    "fullName",
    "phoneNumber",
    "country",
    "countryCode",
    "state",
    "stateCode",
    "city",
    "postalCode",
    "addressLine1",
    "addressLine2",
    "isDefault",
  ];
  return fields.some((key) => {
    const valCurrent = current[key] === undefined || current[key] === null ? "" : current[key];
    const valOriginal = original[key] === undefined || original[key] === null ? "" : original[key];
    return valCurrent.toString().trim() !== valOriginal.toString().trim();
  });
};

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#fff',
    borderColor: state.isFocused ? '#c8b896' : '#e8e0d6',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(200, 184, 150, 0.12)' : 'none',
    '&:hover': {
      borderColor: '#c8b896',
    },
    borderRadius: '6px',
    minHeight: '40px',
    fontFamily: '"Montserrat", sans-serif',
    fontSize: '14px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#111' : state.isFocused ? '#f5f0eb' : '#fff',
    color: state.isSelected ? '#fff' : '#111',
    fontFamily: '"Montserrat", sans-serif',
    fontSize: '14px',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#111',
      color: '#fff',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#111',
    fontFamily: '"Montserrat", sans-serif',
    fontSize: '14px',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#bbb',
    fontFamily: '"Montserrat", sans-serif',
    fontSize: '14px',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e8e0d6',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    zIndex: 9999,
  }),
};

const ProfileSectionAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const { user } = useAuth();
  const toast = useToast();

  const loadAddresses = useCallback(() => {
    setLoading(true);
    try {
      // 1. Fallback / Default: use user.addresses if available
      let loaded = user?.addresses || [];

      // 2. Load from localStorage (Demo Mode persistence for postponed CRUD routes)
      const localKey = user?.email ? `loft_addresses_${user.email}` : "loft_addresses_guest";
      const stored = localStorage.getItem(localKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Merge to avoid duplicates
            loaded = [
              ...loaded,
              ...parsed.filter((p) => !loaded.some((l) => l._id === p._id)),
            ];
          }
        } catch (e) {
          console.error("Error parsing stored addresses:", e);
        }
      }

      // 3. Backward Compatibility: Support legacy address format from user model
      if (user?.address || user?.city || user?.pincode) {
        const legacyId = "legacy-address-id";
        const hasLegacy = loaded.some((addr) => addr._id === legacyId);
        if (!hasLegacy) {
          loaded.unshift({
            _id: legacyId,
            title: "Legacy Primary Address",
            fullName: user.name || "",
            phoneNumber: user.phone || "",
            country: "India", // Default legacy
            countryCode: "IN",
            state: "",
            stateCode: "",
            city: user.city || "",
            postalCode: user.pincode || "",
            addressLine1: user.address || "",
            addressLine2: "",
            isLegacy: true,
            isDefault: false,
          });
        }
      }

      // Ensure at least one address is default if any exist
      if (loaded.length > 0 && !loaded.some((a) => a.isDefault)) {
        loaded[0].isDefault = true;
      }

      setAddresses(loaded);
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [user, loadAddresses]);

  const handleAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr._id);
    setForm({
      title: addr.title || "",
      fullName: addr.fullName || "",
      phoneNumber: addr.phoneNumber || "",
      country: addr.country || "",
      countryCode: addr.countryCode || "",
      state: addr.state || "",
      stateCode: addr.stateCode || "",
      city: addr.city || "",
      postalCode: addr.postalCode || "",
      addressLine1: addr.addressLine1 || addr.address || "",
      addressLine2: addr.addressLine2 || "",
      isDefault: addr.isDefault || false,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    const originalAddr = editingId
      ? addresses.find((a) => a._id === editingId)
      : EMPTY_FORM;

    const normalizedOriginal = {
      ...EMPTY_FORM,
      ...originalAddr,
      addressLine1: originalAddr ? (originalAddr.addressLine1 || originalAddr.address || "") : "",
    };

    if (isFormDirty(form, normalizedOriginal)) {
      if (!window.confirm("You have unsaved changes. Discard them?")) {
        return;
      }
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  // Country Change: India -> Rajasthan -> Jaipur. Reset State, City, Postal Code.
  const handleCountryChange = (selectedOption) => {
    if (selectedOption) {
      setForm((prev) => ({
        ...prev,
        country: selectedOption.label,
        countryCode: selectedOption.value,
        state: "",
        stateCode: "",
        city: "",
        postalCode: "",
      }));
      setFormErrors((prev) => ({
        ...prev,
        country: "",
        state: "",
        city: "",
        postalCode: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        country: "",
        countryCode: "",
        state: "",
        stateCode: "",
        city: "",
        postalCode: "",
      }));
    }
  };

  // State Change: Rajasthan -> Maharashtra. Reset City, Postal Code.
  const handleStateChange = (selectedOption) => {
    if (selectedOption) {
      setForm((prev) => ({
        ...prev,
        state: selectedOption.label,
        stateCode: selectedOption.value,
        city: "",
        postalCode: "",
      }));
      setFormErrors((prev) => ({
        ...prev,
        state: "",
        city: "",
        postalCode: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        state: "",
        stateCode: "",
        city: "",
        postalCode: "",
      }));
    }
  };

  const handleCityChange = (selectedOption) => {
    if (selectedOption) {
      setForm((prev) => ({
        ...prev,
        city: selectedOption.value,
      }));
      setFormErrors((prev) => ({
        ...prev,
        city: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        city: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Field-level validation
    const errors = {};
    if (!validateTitle(form.title)) {
      errors.title = "Title must be 2-30 characters (alphanumeric, spaces, dashes/parentheses only).";
    }
    if (!validateFullName(form.fullName)) {
      errors.fullName = "Full name must be 2-70 characters (letters and spaces/hyphens/apostrophes only).";
    }
    
    if (!validatePhone(form.phoneNumber, form.countryCode)) {
      errors.phoneNumber = "Please enter a valid international phone number.";
    }
    
    if (!validateCountry(form.country)) errors.country = "Country is required";
    if (!validateState(form.state)) errors.state = "State is required";
    if (!validateCity(form.city)) errors.city = "City is required";
    
    if (!validateAddress(form.addressLine1)) {
      errors.addressLine1 = "Address must be between 5 and 120 characters, without repeated punctuation.";
    }
    
    if (!validatePostalCode(form.postalCode, form.countryCode)) {
      errors.postalCode = "Invalid postal code for the selected country.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please resolve the errors in the address form.");
      return;
    }

    setFormErrors({});

    const payload = {
      _id: editingId || `addr_${Date.now()}`,
      title: form.title.trim(),
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      countryCode: form.countryCode,
      country: form.country,
      state: form.state,
      stateCode: form.stateCode,
      city: form.city,
      postalCode: form.postalCode.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      isDefault: form.isDefault || false,
    };

    // Save to LocalStorage to mock backend persistence (CRUD endpoints postponed)
    // Backend integration point:
    // Create: POST /api/addresses
    // Update: PUT /api/addresses/:id
    try {
      const localKey = user?.email ? `loft_addresses_${user.email}` : "loft_addresses_guest";
      let updatedList = [];
      const hasDefault = addresses.some((a) => a.isDefault && a._id !== editingId);
      const isFirst = addresses.length === 0;
      const willBeDefault = form.isDefault || isFirst || !hasDefault;

      if (editingId) {
        updatedList = addresses.map((addr) => {
          if (addr._id === editingId) {
            return { ...payload, isDefault: willBeDefault };
          }
          return willBeDefault ? { ...addr, isDefault: false } : addr;
        });
        toast.success("Address updated successfully.");
      } else {
        const newAddress = { ...payload, isDefault: willBeDefault };
        updatedList = willBeDefault
          ? [...addresses.map((a) => ({ ...a, isDefault: false })), newAddress]
          : [...addresses, newAddress];
        toast.success("Address added successfully.");
      }

      // Filter legacy ID so we do not write it to localStorage
      const demoOnlyList = updatedList.filter((a) => a._id !== "legacy-address-id");
      localStorage.setItem(localKey, JSON.stringify(demoOnlyList));

      setAddresses(updatedList);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      // Dispatch event to keep other pages (like Checkout) synced
      window.dispatchEvent(new Event("addresses:updated"));
    } catch (err) {
      console.error("Address save error:", err);
      toast.error("Failed to save address.");
    }
  };

  const handleDelete = (id) => {
    if (id === "legacy-address-id") {
      toast.error("Cannot delete legacy profile primary address.");
      return;
    }
    if (!window.confirm("Delete this address?")) return;

    // Delete locally and mock API call
    // Backend integration point: DELETE /api/addresses/:id
    try {
      const localKey = user?.email ? `loft_addresses_${user.email}` : "loft_addresses_guest";
      const targetAddr = addresses.find((addr) => addr._id === id);
      const wasDefault = targetAddr ? targetAddr.isDefault : false;

      let updatedList = addresses.filter((addr) => addr._id !== id);

      // Promote another address if the deleted one was default
      if (wasDefault && updatedList.length > 0) {
        updatedList[0].isDefault = true;
      }

      const demoOnlyList = updatedList.filter((a) => a._id !== "legacy-address-id");
      localStorage.setItem(localKey, JSON.stringify(demoOnlyList));

      setAddresses(updatedList);
      window.dispatchEvent(new Event("addresses:updated"));
      toast.success("Address deleted successfully.");
    } catch (err) {
      console.error("Address delete error:", err);
      toast.error("Failed to delete address.");
    }
  };

  const handleSetDefault = (id) => {
    try {
      const localKey = user?.email ? `loft_addresses_${user.email}` : "loft_addresses_guest";
      const updatedList = addresses.map((addr) => ({
        ...addr,
        isDefault: addr._id === id,
      }));

      const demoOnlyList = updatedList.filter((a) => a._id !== "legacy-address-id");
      localStorage.setItem(localKey, JSON.stringify(demoOnlyList));

      setAddresses(updatedList);
      window.dispatchEvent(new Event("addresses:updated"));
      toast.success("Default address updated.");
    } catch (err) {
      console.error("Set default error:", err);
    }
  };

  // Setup options list with memoization to prevent unnecessary recomputations
  const countriesOptions = useMemo(() => Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
  })), []);

  const statesList = useMemo(() => form.countryCode ? State.getStatesOfCountry(form.countryCode) : [], [form.countryCode]);
  const statesOptions = useMemo(() => statesList.map((s) => ({
    value: s.isoCode,
    label: s.name,
  })), [statesList]);
  const hasStates = statesList.length > 0;

  const citiesList = useMemo(() =>
    form.countryCode && form.stateCode
      ? City.getCitiesOfState(form.countryCode, form.stateCode)
      : [], [form.countryCode, form.stateCode]);
  const citiesOptions = useMemo(() => citiesList.map((c) => ({
    value: c.name,
    label: c.name,
  })), [citiesList]);
  const hasCities = citiesList.length > 0;

  const currentCountryValue = useMemo(() => form.countryCode
    ? { value: form.countryCode, label: form.country }
    : null, [form.countryCode, form.country]);

  const currentStateValue = useMemo(() => form.stateCode
    ? { value: form.stateCode, label: form.state }
    : form.state
    ? { value: "", label: form.state }
    : null, [form.stateCode, form.state]);

  const currentCityValue = useMemo(() => form.city
    ? { value: form.city, label: form.city }
    : null, [form.city]);

  return (
    <div className="profile-section-addresses">
      <div className="profile-section-header">
        <h2 className="profile-section-title">Saved Addresses</h2>
        {!showForm && (
          <button className="profile-add-address-btn" onClick={handleAdd}>
            <Plus size={16} />
            Add New Address
          </button>
        )}
      </div>

      {showForm && (
        <div className="address-modal-backdrop">
          <div className="address-modal">
            <h3>{editingId ? "Edit Address" : "Add Address"}</h3>
            <form onSubmit={handleSubmit} noValidate>
              
              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label htmlFor="address-title">Address Title (e.g. Home, Work)</label>
                <input
                  id="address-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Home, Office, etc."
                  required
                />
                {formErrors.title && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.title}</span>}
              </div>

              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label htmlFor="address-fullName">Receiver Full Name</label>
                <input
                  id="address-fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
                {formErrors.fullName && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.fullName}</span>}
              </div>

              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label htmlFor="address-phone">Phone Number</label>
                <div className="react-phone-input-container">
                  <PhoneInput
                    defaultCountry="in"
                    value={form.phoneNumber}
                    onChange={(val) => setForm({ ...form, phoneNumber: val })}
                    inputProps={{
                      id: "address-phone",
                      autoComplete: "tel",
                      inputMode: "tel",
                    }}
                  />
                </div>
                {formErrors.phoneNumber && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.phoneNumber}</span>}
              </div>

              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label id="address-country-label" htmlFor="address-country">Country</label>
                <div className="react-select-container">
                  <Select
                    instanceId="profile-country-select"
                    inputId="address-country"
                    aria-labelledby="address-country-label"
                    options={countriesOptions}
                    value={currentCountryValue}
                    onChange={handleCountryChange}
                    styles={customSelectStyles}
                    placeholder="Select Country"
                    isSearchable
                  />
                </div>
                {formErrors.country && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.country}</span>}
              </div>

              {/* Autocomplete Target Area (Future Google Places/Mapbox/OpenStreetMap autocomplete binding) */}
              <div className="form-group-accessible form-group-full" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="address-line1">Address Line 1 (Street details)</label>
                <input
                  id="address-line1"
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                  placeholder="123 Main St, Apartment, Suite"
                  required
                />
                {formErrors.addressLine1 && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.addressLine1}</span>}
              </div>

              <div className="form-group-accessible form-group-full" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="address-line2">Address Line 2 (Apartment, Suite, Unit - Optional)</label>
                <input
                  id="address-line2"
                  type="text"
                  value={form.addressLine2}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                  placeholder="Apt 4B, Suite 10, etc. (optional)"
                />
              </div>

              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label id="address-state-label" htmlFor="address-state">State / Province</label>
                {hasStates ? (
                  <div className="react-select-container">
                    <Select
                      instanceId="profile-state-select"
                      inputId="address-state"
                      aria-labelledby="address-state-label"
                      options={statesOptions}
                      value={currentStateValue}
                      onChange={handleStateChange}
                      styles={customSelectStyles}
                      placeholder="Select State"
                      isSearchable
                    />
                  </div>
                ) : (
                  <input
                    id="address-state"
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value, stateCode: "" })}
                    placeholder="Enter state"
                    required
                  />
                )}
                {formErrors.state && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.state}</span>}
              </div>

              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label id="address-city-label" htmlFor="address-city">City</label>
                {hasCities ? (
                  <div className="react-select-container">
                    <Select
                      instanceId="profile-city-select"
                      inputId="address-city"
                      aria-labelledby="address-city-label"
                      options={citiesOptions}
                      value={currentCityValue}
                      onChange={handleCityChange}
                      styles={customSelectStyles}
                      placeholder="Select City"
                      isSearchable
                    />
                  </div>
                ) : (
                  <input
                    id="address-city"
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Enter city"
                    required
                  />
                )}
                {formErrors.city && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.city}</span>}
              </div>

              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label htmlFor="address-postalCode">Postal / ZIP Code</label>
                <input
                  id="address-postalCode"
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="Enter postal code"
                  required
                />
                {formErrors.postalCode && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.postalCode}</span>}
              </div>

              <div className="form-group-accessible form-group-full" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                <input
                  id="address-isDefault"
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  style={{ width: "auto", height: "auto", margin: 0, cursor: "pointer" }}
                />
                <label htmlFor="address-isDefault" style={{ cursor: "pointer", marginBottom: 0, userSelect: "none" }}>Set as default address</label>
              </div>

              <div className="address-modal-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  {editingId ? "Save Changes" : "Add Address"}
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 className="profile-address-title">{addr.title}</h3>
                  {addr.isDefault && (
                    <span style={{ fontSize: "10px", background: "#111", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      DEFAULT
                    </span>
                  )}
                  {addr.isLegacy && (
                    <span style={{ fontSize: "10px", background: "#f5f0eb", color: "#a89968", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      LEGACY
                    </span>
                  )}
                </div>
                <p className="profile-address-text" style={{ fontWeight: 600, color: "#111", margin: "4px 0" }}>
                  {addr.fullName} ({addr.phoneNumber})
                </p>
                <p className="profile-address-text">
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                  <br />
                  {addr.city}, {addr.state ? `${addr.state}, ` : ""}{addr.postalCode}
                  <br />
                  {addr.country}
                </p>
              </div>
              <div className="profile-address-actions" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="profile-address-btn edit"
                    aria-label="Edit address"
                    onClick={() => openEdit(addr)}
                  >
                    <Edit2 size={16} />
                  </button>
                  {!addr.isLegacy && (
                    <button
                      className="profile-address-btn delete"
                      aria-label="Delete address"
                      onClick={() => handleDelete(addr._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr._id)}
                    style={{ fontSize: "11px", background: "none", border: "none", color: "#a89968", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                  >
                    Set as Default
                  </button>
                )}
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
