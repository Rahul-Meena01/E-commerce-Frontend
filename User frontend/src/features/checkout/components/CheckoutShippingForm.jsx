import { Truck, ChevronRight } from "lucide-react";
import { formatPrice } from "../../../utils/pricing";

const CheckoutShippingForm = ({
  formData,
  handleInputChange,
  handleShippingSubmit,
  shippingMethod,
  setShippingMethod,
}) => {
  return (
    <form onSubmit={handleShippingSubmit} className="checkout-step-form">
      <div className="checkout-section">
        <h2 className="checkout-section-title">Shipping Information</h2>

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
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              className="ds-input"
            />
          </div>

          <div className="ds-field checkout-form-group">
            <label htmlFor="country" className="ds-label">
              Country / Region
            </label>
            <div className="ds-select-wrap">
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="ds-select"
                required
              >
                <option value="">Select your country</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
                <option value="India">India</option>
              </select>
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
              onChange={handleInputChange}
              placeholder="Enter your street address"
              className="ds-input"
              required
            />
          </div>

          <div className="ds-field checkout-form-group-full">
            <label className="ds-label">
              Apartment, suite, unit, etc. (optional)
            </label>
            <input
              type="text"
              name="apartment"
              value={formData.apartment}
              onChange={handleInputChange}
              placeholder="Apartment, suite, unit, etc. (optional)"
              className="ds-input"
            />
          </div>

          <div className="ds-field checkout-form-group">
            <label className="ds-label">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Enter your city"
              className="ds-input"
              required
            />
          </div>

          <div className="ds-field checkout-form-group">
            <label className="ds-label" htmlFor="state">State / Province</label>
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
          </div>

          <div className="ds-field checkout-form-group">
            <label className="ds-label">Postal Code</label>
            <input
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
