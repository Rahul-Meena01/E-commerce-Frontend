import { MapPin, Plus, Edit2, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import Select from "react-select";
import { Country, State, City } from "country-state-city";
import {
  validatePostalCode,
  validateAddress,
  validateCountry,
  validateCity,
  validateTitle,
} from "@/shared/utils/addressValidation";
import {
  useAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} from "../hooks/useAddressesQuery";

const EMPTY_FORM = {
  title: "",
  country: "",
  countryCode: "",
  state: "",
  stateCode: "",
  city: "",
  postalCode: "",
  address: "",
};

const isFormDirty = (current, original) => {
  const fields = [
    "title",
    "country",
    "countryCode",
    "state",
    "stateCode",
    "city",
    "postalCode",
    "address",
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const { user } = useAuth();
  const toast = useToast();

  const { data: dbAddresses = [], isLoading: loading } = useAddressesQuery(!!user);
  const createMutation = useCreateAddressMutation();
  const updateMutation = useUpdateAddressMutation();
  const deleteMutation = useDeleteAddressMutation();

  // Combine DB addresses and user model legacy address
  const addresses = useMemo(() => {
    let list = [...dbAddresses];
    if (user?.address || user?.city || user?.pincode) {
      const legacyId = "legacy-address-id";
      const hasLegacy = list.some((addr) => addr._id === legacyId);
      if (!hasLegacy) {
        list.unshift({
          _id: legacyId,
          title: "Legacy Primary Address",
          country: "India",
          countryCode: "IN",
          city: user.city || "",
          postalCode: user.pincode || "",
          address: user.address || "",
          isLegacy: true,
        });
      }
    }
    return list;
  }, [dbAddresses, user]);

  const handleAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr._id);
    const countryObj = Country.getAllCountries().find((c) => c.name === addr.country);
    const countryCode = countryObj ? countryObj.isoCode : "";
    setForm({
      title: addr.title || "",
      country: addr.country || "",
      countryCode: countryCode,
      state: "",
      stateCode: "",
      city: addr.city || "",
      postalCode: addr.postalCode || "",
      address: addr.address || "",
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

    const errors = {};
    if (!validateTitle(form.title)) {
      errors.title = "Title must be 2-30 characters.";
    }
    if (!validateCountry(form.country)) errors.country = "Country is required";
    if (!validateCity(form.city)) errors.city = "City is required";
    if (!validateAddress(form.address)) {
      errors.address = "Address must be between 5 and 120 characters.";
    }
    if (!validatePostalCode(form.postalCode, form.countryCode)) {
      errors.postalCode = "Invalid postal code.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please resolve the errors in the address form.");
      return;
    }

    setFormErrors({});

    const payload = {
      title: form.title.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
        toast.success("Address updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Address added successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Address save error:", err);
      toast.error(err.message || "Failed to save address.");
    }
  };

  const handleDelete = async (id) => {
    if (id === "legacy-address-id") {
      toast.error("Cannot delete legacy profile primary address.");
      return;
    }
    if (!window.confirm("Delete this address?")) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Address deleted successfully.");
    } catch (err) {
      console.error("Address delete error:", err);
      toast.error(err.message || "Failed to delete address.");
    }
  };

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

              <div className="form-group-accessible form-group-full" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="address-street">Street Address</label>
                <input
                  id="address-street"
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, Apartment, Suite"
                  required
                />
                {formErrors.address && <span style={{ color: "#c53030", fontSize: "12px", marginTop: "4px" }}>{formErrors.address}</span>}
              </div>

              <div className="form-group-accessible" style={{ gridColumn: "span 1" }}>
                <label id="address-state-label" htmlFor="address-state">State / Province (To Filter City)</label>
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
                  {addr.isLegacy && (
                    <span style={{ fontSize: "10px", background: "#f5f0eb", color: "#a89968", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      LEGACY
                    </span>
                  )}
                </div>
                <p className="profile-address-text" style={{ fontWeight: 600, color: "#111", margin: "4px 0" }}>
                  Recipient: {user?.name} {user?.phone ? `(${user.phone})` : ""}
                </p>
                <p className="profile-address-text">
                  {addr.address}
                  <br />
                  {addr.city}, {addr.postalCode}
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
