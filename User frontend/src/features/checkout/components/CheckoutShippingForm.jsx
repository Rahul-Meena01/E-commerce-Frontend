import { Truck, ChevronRight } from "lucide-react";
import { formatPrice } from "../../../utils/pricing";
import Select from "react-select";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { Country, State, City } from "country-state-city";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAddressesQuery } from "@/features/auth/hooks/useAddressesQuery";

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--ds-color-surface, #fff)',
    borderColor: state.isFocused ? 'var(--ds-color-brand, #C9A96E)' : 'var(--ds-color-border-strong, #D1D1D1)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--ds-color-brand, #C9A96E)' : 'none',
    '&:hover': {
      borderColor: 'var(--ds-color-brand, #C9A96E)',
    },
    borderRadius: 'var(--ds-radius-md, 4px)',
    minHeight: '42px',
    fontFamily: 'var(--ds-font-sans, "Jost", sans-serif)',
    fontSize: 'var(--ds-text-sm, 14px)',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'var(--ds-color-brand, #C9A96E)' 
      : state.isFocused 
        ? 'var(--ds-color-surface-hover, #f5f0eb)' 
        : 'var(--ds-color-surface, #fff)',
    color: state.isSelected ? '#fff' : 'var(--ds-color-text, #1A1A1A)',
    fontFamily: 'var(--ds-font-sans, "Jost", sans-serif)',
    fontSize: 'var(--ds-text-sm, 14px)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--ds-color-brand, #C9A96E)',
      color: '#fff',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--ds-color-text, #1A1A1A)',
    fontFamily: 'var(--ds-font-sans, "Jost", sans-serif)',
    fontSize: 'var(--ds-text-sm, 14px)',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--ds-color-text-muted, #aaa)',
    fontFamily: 'var(--ds-font-sans, "Jost", sans-serif)',
    fontSize: 'var(--ds-text-sm, 14px)',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--ds-color-surface, #fff)',
    borderRadius: 'var(--ds-radius-md, 4px)',
    border: '1px solid var(--ds-color-border-strong, #D1D1D1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    zIndex: 9999,
  }),
};

const CheckoutShippingForm = ({
  formData,
  setFormData,
  handleInputChange,
  handleShippingSubmit,
  shippingMethod,
  setShippingMethod,
  orderError,
}) => {
  const { user } = useAuth();
  const phoneInputRef = useRef(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Fetch addresses using React Query
  const { data: dbAddresses = [] } = useAddressesQuery(!!user);

  // Combine DB addresses and user model legacy address
  const savedAddresses = useMemo(() => {
    let list = [...dbAddresses];
    if (user?.address || user?.city || user?.pincode) {
      const legacyId = "legacy-address-id";
      const hasLegacy = list.some((addr) => addr._id === legacyId);
      if (!hasLegacy) {
        list.unshift({
          _id: legacyId,
          title: "Legacy Primary Address",
          country: "India",
          city: user.city || "",
          postalCode: user.pincode || "",
          address: user.address || "",
          isLegacy: true,
        });
      }
    }
    return list;
  }, [dbAddresses, user]);

  const populateAddressForm = useCallback((addr) => {
    if (!addr) return;
    const countryObj = Country.getAllCountries().find((c) => c.name === addr.country);
    const countryCode = countryObj ? countryObj.isoCode : "";
    
    // Try to find the state of the city to prefill it for validation convenience
    let derivedState = "";
    let derivedStateCode = "";
    if (countryCode && addr.city) {
      const states = State.getStatesOfCountry(countryCode);
      for (const s of states) {
        const cities = City.getCitiesOfState(countryCode, s.isoCode);
        if (cities.some((c) => c.name.toLowerCase() === addr.city.toLowerCase())) {
          derivedState = s.name;
          derivedStateCode = s.isoCode;
          break;
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      country: addr.country || "",
      countryCode: countryCode,
      street: addr.address || "",
      apartment: "",
      state: derivedState,
      stateCode: derivedStateCode,
      city: addr.city || "",
      postalCode: addr.postalCode || "",
      fullName: prev.fullName || user?.name || "",
      phone: prev.phone || user?.phone || "",
    }));
  }, [user, setFormData]);

  // Auto-preselect first address on load
  useEffect(() => {
    if (savedAddresses.length > 0 && selectedAddressId === null) {
      const firstAddr = savedAddresses[0];
      setSelectedAddressId(firstAddr._id);
      populateAddressForm(firstAddr);
    }
  }, [savedAddresses, selectedAddressId, populateAddressForm]);

  // Sync PhoneInput country with formData.countryCode
  useEffect(() => {
    if (phoneInputRef.current && formData.countryCode) {
      const currentPhone = formData.phone || "";
      if (currentPhone === "" || currentPhone === "+" || currentPhone.length < 5) {
        phoneInputRef.current.setCountry(formData.countryCode.toLowerCase());
      }
    }
  }, [formData.countryCode, formData.phone]);

  const handleFormInputChange = (e) => {
    const { name } = e.target;
    // Clear card selection if manual input changes the address fields
    if (["street", "apartment", "city", "state", "postalCode", "country"].includes(name)) {
      setSelectedAddressId(null);
    }
    handleInputChange(e);
  };

  const handleCountryChange = (selectedOption) => {
    setSelectedAddressId(null);
    if (selectedOption) {
      setFormData((prev) => ({
        ...prev,
        country: selectedOption.label,
        countryCode: selectedOption.value,
        state: "",
        stateCode: "",
        city: "",
        postalCode: "",
      }));
    } else {
      setFormData((prev) => ({
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
    setSelectedAddressId(null);
    if (selectedOption) {
      setFormData((prev) => ({
        ...prev,
        state: selectedOption.label,
        stateCode: selectedOption.value,
        city: "",
        postalCode: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        state: "",
        stateCode: "",
        city: "",
        postalCode: "",
      }));
    }
  };

  const handleCityChange = (selectedOption) => {
    setSelectedAddressId(null);
    if (selectedOption) {
      setFormData((prev) => ({
        ...prev,
        city: selectedOption.value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        city: "",
      }));
    }
  };

  const countriesOptions = useMemo(() => Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
  })), []);

  const statesList = useMemo(() => formData.countryCode ? State.getStatesOfCountry(formData.countryCode) : [], [formData.countryCode]);
  const statesOptions = useMemo(() => statesList.map((s) => ({
    value: s.isoCode,
    label: s.name,
  })), [statesList]);
  const hasStates = statesList.length > 0;

  const citiesList = useMemo(() =>
    formData.countryCode && formData.stateCode
      ? City.getCitiesOfState(formData.countryCode, formData.stateCode)
      : [], [formData.countryCode, formData.stateCode]);
  const citiesOptions = useMemo(() => citiesList.map((c) => ({
    value: c.name,
    label: c.name,
  })), [citiesList]);
  const hasCities = citiesList.length > 0;

  const currentCountryValue = useMemo(() => formData.countryCode
    ? { value: formData.countryCode, label: formData.country }
    : null, [formData.countryCode, formData.country]);

  const currentStateValue = useMemo(() => formData.stateCode
    ? { value: formData.stateCode, label: formData.state }
    : formData.state
    ? { value: "", label: formData.state }
    : null, [formData.stateCode, formData.state]);

  const currentCityValue = useMemo(() => formData.city
    ? { value: formData.city, label: formData.city }
    : null, [formData.city]);

  return (
    <form onSubmit={handleShippingSubmit} className="checkout-step-form" noValidate>
      {orderError && (
        <div className="checkout-error" role="alert" aria-live="assertive">
          {orderError}
        </div>
      )}
      <div className="checkout-section">
        <h2 className="checkout-section-title">Shipping Information</h2>

        {/* Premium Saved Addresses Selector Section */}
        {savedAddresses.length > 0 && (
          <div className="saved-addresses-selector" style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "15px", fontFamily: 'var(--ds-font-sans, "Jost", sans-serif)' }}>
              Use a Saved Address
            </h3>
            <div className="checkout-address-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "15px", marginBottom: "20px" }}>
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr._id;
                return (
                  <div
                    key={addr._id}
                    onClick={() => {
                      setSelectedAddressId(addr._id);
                      populateAddressForm(addr);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedAddressId(addr._id);
                        populateAddressForm(addr);
                      }
                    }}
                    tabIndex={0}
                    className={`checkout-address-card ${isSelected ? "active" : ""}`}
                    style={{
                      border: isSelected ? "2px solid var(--ds-color-brand, #C9A96E)" : "1px solid var(--ds-color-border-strong, #D1D1D1)",
                      borderRadius: "var(--ds-radius-md, 6px)",
                      padding: "15px",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "var(--ds-color-surface-hover, #fdfbfa)" : "var(--ds-color-surface, #fff)",
                      transition: "all 0.2s ease",
                      outline: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={isSelected}
                        onChange={() => {}} // click event handled on parent container
                        style={{ cursor: "pointer", margin: 0 }}
                      />
                      <span style={{ fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{addr.title}</span>
                      {addr.isLegacy && (
                        <span style={{ fontSize: "9px", background: "#f5f0eb", color: "#a89968", padding: "2px 6px", borderRadius: "3px", fontWeight: "bold" }}>
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "var(--ds-color-text-muted, #777)" }}>
                      <strong>Recipient:</strong> {user?.name} {user?.phone ? `(${user.phone})` : ""}
                    </p>
                    <p style={{ margin: "0", fontSize: "13px", color: "var(--ds-color-text, #1A1A1A)", lineHeight: "1.4" }}>
                      {addr.address}
                      <br />
                      {addr.city}, {addr.postalCode}
                      <br />
                      {addr.country}
                    </p>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedAddressId(null);
                  setFormData((prev) => ({
                    ...prev,
                    country: "",
                    countryCode: "",
                    street: "",
                    apartment: "",
                    city: "",
                    state: "",
                    stateCode: "",
                    postalCode: "",
                  }));
                }}
                className="btn secondary sm"
                style={{ fontSize: "12px", padding: "6px 12px", minHeight: "32px", display: "inline-flex", alignItems: "center" }}
              >
                Clear & Enter New Address
              </button>
            </div>
          </div>
        )}

        <div className="checkout-form-grid">
          <div className="ds-field checkout-form-group">
            <label htmlFor="fullName" className="ds-label">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleFormInputChange}
              placeholder="Enter your full name"
              className="ds-input"
              required
            />
          </div>

          <div className="ds-field checkout-form-group">
            <label htmlFor="email" className="ds-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormInputChange}
              placeholder="Enter your email address"
              className="ds-input"
              required
            />
          </div>

          <div className="ds-field checkout-form-group">
            <label htmlFor="phone" className="ds-label">
              Phone Number
            </label>
            <div className="react-phone-input-container">
              <PhoneInput
                ref={phoneInputRef}
                defaultCountry="in"
                value={formData.phone}
                onChange={(phone) => {
                  setSelectedAddressId(null); // Clear selection if phone changes
                  setFormData((prev) => ({ ...prev, phone }));
                }}
                inputProps={{
                  id: "phone",
                  autoComplete: "tel",
                  inputMode: "tel",
                }}
              />
            </div>
          </div>

          <div className="ds-field checkout-form-group">
            <label id="country-label" htmlFor="country" className="ds-label">
              Country / Region
            </label>
            <div className="react-select-container">
              <Select
                instanceId="checkout-country-select"
                inputId="country"
                aria-labelledby="country-label"
                options={countriesOptions}
                value={currentCountryValue}
                onChange={handleCountryChange}
                styles={customSelectStyles}
                placeholder="Select Country"
                isSearchable
              />
            </div>
          </div>

          <div className="ds-field checkout-form-group-full">
            <label htmlFor="street" className="ds-label">
              Street Address
            </label>
            <input
              id="street"
              type="text"
              name="street"
              value={formData.street}
              onChange={handleFormInputChange}
              placeholder="Enter your street address"
              className="ds-input"
              required
            />
          </div>

          <div className="ds-field checkout-form-group-full">
            <label htmlFor="apartment" className="ds-label">
              Apartment, suite, unit, etc. (optional)
            </label>
            <input
              id="apartment"
              type="text"
              name="apartment"
              value={formData.apartment}
              onChange={handleFormInputChange}
              placeholder="Apartment, suite, unit, etc. (optional)"
              className="ds-input"
            />
          </div>

          <div className="ds-field checkout-form-group">
            <label id="state-label" htmlFor="state" className="ds-label">State / Province</label>
            {hasStates ? (
              <div className="react-select-container">
                <Select
                  instanceId="checkout-state-select"
                  inputId="state"
                  aria-labelledby="state-label"
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
                id="state"
                type="text"
                name="state"
                value={formData.state}
                onChange={handleFormInputChange}
                placeholder="State / Province / Region"
                className="ds-input"
                required
              />
            )}
          </div>

          <div className="ds-field checkout-form-group">
            <label id="city-label" htmlFor="city" className="ds-label">City</label>
            {hasCities ? (
              <div className="react-select-container">
                <Select
                  instanceId="checkout-city-select"
                  inputId="city"
                  aria-labelledby="city-label"
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
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleFormInputChange}
                placeholder="Enter your city"
                className="ds-input"
                required
              />
            )}
          </div>

          <div className="ds-field checkout-form-group">
            <label htmlFor="postalCode" className="ds-label">Postal Code</label>
            <input
              id="postalCode"
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleFormInputChange}
              placeholder="Enter postal code"
              className="ds-input"
              required
            />
          </div>
        </div>
      </div>

      <div className="checkout-section">
        <h3 className="checkout-section-subtitle">Shipping Method</h3>

        <div className="checkout-shipping-options">
          <label className="checkout-shipping-option">
            <input
              type="radio"
              name="shipping"
              value="standard"
              checked={shippingMethod === "standard"}
              onChange={(e) => setShippingMethod(e.target.value)}
              className="checkout-radio"
            />
            <div className="checkout-shipping-content">
              <div className="checkout-shipping-header">
                <Truck size={20} />
                <div className="checkout-shipping-info">
                  <span className="checkout-shipping-name">
                    Standard Shipping
                  </span>
                  <span className="checkout-shipping-time">
                    Delivery in 3-7 business days
                  </span>
                </div>
              </div>
            </div>
            <span className="checkout-shipping-price">{formatPrice(99)} (Free over {formatPrice(1000)})</span>
          </label>
        </div>
      </div>

      <button type="submit" className="checkout-continue-btn">
        CONTINUE TO PAYMENT
        <ChevronRight size={18} />
      </button>
    </form>
  );
};

export default CheckoutShippingForm;
