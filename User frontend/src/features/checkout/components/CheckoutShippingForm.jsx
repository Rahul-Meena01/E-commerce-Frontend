import { Truck, ChevronRight } from "lucide-react";
import { formatPrice } from "../../../utils/pricing";
import Select from "react-select";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { Country, State, City } from "country-state-city";
import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

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
  const [savedAddresses, setSavedAddresses] = useState([]);
  const phoneInputRef = useRef(null);

  // Load saved addresses for quick selection during checkout
  useEffect(() => {
    try {
      let loaded = user?.addresses || [];
      const localKey = user?.email ? `loft_addresses_${user.email}` : "loft_addresses_guest";
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          loaded = [
            ...loaded,
            ...parsed.filter((p) => !loaded.some((l) => l._id === p._id)),
          ];
        }
      }

      // Check legacy primary address
      if (user?.address || user?.city || user?.pincode) {
        const legacyId = "legacy-address-id";
        const hasLegacy = loaded.some((addr) => addr._id === legacyId);
        if (!hasLegacy) {
          loaded.unshift({
            _id: legacyId,
            title: "Legacy Primary Address",
            fullName: user.name || "",
            phoneNumber: user.phone || "",
            country: "India",
            countryCode: "IN",
            state: "",
            stateCode: "",
            city: user.city || "",
            postalCode: user.pincode || "",
            addressLine1: user.address || "",
            addressLine2: "",
            isLegacy: true,
          });
        }
      }
      // Ensure at least one default address is selected
      if (loaded.length > 0 && !loaded.some((a) => a.isDefault)) {
        loaded[0].isDefault = true;
      }
      setSavedAddresses(loaded);
    } catch (e) {
      console.error("Failed to load saved addresses for checkout:", e);
    }
  }, [user]);

  // Sync PhoneInput country with formData.countryCode
  useEffect(() => {
    if (phoneInputRef.current && formData.countryCode) {
      phoneInputRef.current.setCountry(formData.countryCode.toLowerCase());
    }
  }, [formData.countryCode]);

  const defaultAddress = useMemo(() => {
    return savedAddresses.find((a) => a.isDefault);
  }, [savedAddresses]);

  // Safely auto-prefill default address if form is empty and untouched
  useEffect(() => {
    if (defaultAddress) {
      const isEmpty =
        !formData.fullName &&
        !formData.street &&
        !formData.city &&
        !formData.postalCode &&
        !formData.phone;

      if (isEmpty) {
        setFormData((prev) => ({
          ...prev,
          fullName: defaultAddress.fullName || prev.fullName || "",
          phone: defaultAddress.phoneNumber || prev.phone || "",
          country: defaultAddress.country || "",
          countryCode: defaultAddress.countryCode || "",
          street: defaultAddress.addressLine1 || defaultAddress.address || "",
          apartment: defaultAddress.addressLine2 || "",
          state: defaultAddress.state || "",
          stateCode: defaultAddress.stateCode || "",
          city: defaultAddress.city || "",
          postalCode: defaultAddress.postalCode || "",
        }));
      }
    }
  }, [defaultAddress, setFormData, formData.fullName, formData.street, formData.city, formData.postalCode, formData.phone]);

  const handleSavedAddressSelect = (selectedOption) => {
    if (!selectedOption) return;
    const addr = savedAddresses.find((a) => a._id === selectedOption.value);
    if (addr) {
      setFormData((prev) => ({
        ...prev,
        fullName: addr.fullName || prev.fullName || "",
        phone: addr.phoneNumber || prev.phone || "",
        country: addr.country || "",
        countryCode: addr.countryCode || "",
        street: addr.addressLine1 || addr.address || "",
        apartment: addr.addressLine2 || "",
        state: addr.state || "",
        stateCode: addr.stateCode || "",
        city: addr.city || "",
        postalCode: addr.postalCode || "",
      }));
    }
  };

  const handleCountryChange = (selectedOption) => {
    if (selectedOption) {
      setFormData((prev) => ({
        ...prev,
        country: selectedOption.label,
        countryCode: selectedOption.value,
        state: "",
        stateCode: "",
        city: "",
        postalCode: "", // country change resets state, city, postal code
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
    if (selectedOption) {
      setFormData((prev) => ({
        ...prev,
        state: selectedOption.label,
        stateCode: selectedOption.value,
        city: "",
        postalCode: "", // state change resets city, postal code
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

  // Setup options list with memoization to prevent unnecessary recomputations
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

  const addressQuickOptions = useMemo(() => savedAddresses.map((a) => ({
    value: a._id,
    label: `${a.title}: ${a.fullName}, ${a.addressLine1 || a.address}, ${a.city}`,
  })), [savedAddresses]);

  return (
    <form onSubmit={handleShippingSubmit} className="checkout-step-form" noValidate>
      {orderError && (
        <div className="checkout-error" role="alert" aria-live="assertive">
          {orderError}
        </div>
      )}
      <div className="checkout-section">
        <h2 className="checkout-section-title">Shipping Information</h2>

        {addressQuickOptions.length > 0 && (
          <div className="ds-field checkout-form-group-full" style={{ marginBottom: "20px" }}>
            <label id="quick-address-select-label" htmlFor="quick-address-select" className="ds-label">
              Use a Saved Address
            </label>
            <div className="react-select-container">
              <Select
                instanceId="checkout-quick-address-select"
                inputId="quick-address-select"
                aria-labelledby="quick-address-select-label"
                options={addressQuickOptions}
                onChange={handleSavedAddressSelect}
                styles={customSelectStyles}
                placeholder="Select a saved address..."
                isClearable
              />
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
              onChange={handleInputChange}
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
              onChange={handleInputChange}
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
                onChange={(phone, meta) => {
                  setFormData((prev) => {
                    const next = { ...prev, phone };
                    if (meta?.country?.iso2 && meta.country.iso2 !== prev.countryCode?.toLowerCase()) {
                      next.countryCode = meta.country.iso2.toUpperCase();
                      next.country = meta.country.name;
                    }
                    return next;
                  });
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

          {/* Autocomplete Target Area (Future Google Places/Mapbox/OpenStreetMap autocomplete binding) */}
          <div className="ds-field checkout-form-group-full">
            <label htmlFor="street" className="ds-label">
              Street Address
            </label>
            <input
              id="street"
              type="text"
              name="street"
              value={formData.street}
              onChange={handleInputChange}
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
              onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
              onChange={handleInputChange}
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
