import { Truck, ChevronRight } from "lucide-react";
import { CURRENCY } from "../../../constants/currency";

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
          <div className="checkout-form-group">
            <label htmlFor="fullName" className="checkout-label">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              className="checkout-input"
              required
            />
          </div>

          <div className="checkout-form-group">
            <label htmlFor="email" className="checkout-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email address"
              className="checkout-input"
              required
            />
          </div>

          <div className="checkout-form-group">
            <label htmlFor="phone" className="checkout-label">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              className="checkout-input"
            />
          </div>

          <div className="checkout-form-group">
            <label htmlFor="country" className="checkout-label">
              Country / Region
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="checkout-select"
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

          <div className="checkout-form-group-full">
            <label htmlFor="street" className="checkout-label">
              Street Address
            </label>
            <input
              id="street"
              type="text"
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              placeholder="Enter your street address"
              className="checkout-input"
              required
            />
          </div>

          <div className="checkout-form-group-full">
            <label className="checkout-label">
              Apartment, suite, unit, etc. (optional)
            </label>
            <input
              type="text"
              name="apartment"
              value={formData.apartment}
              onChange={handleInputChange}
              placeholder="Apartment, suite, unit, etc. (optional)"
              className="checkout-input"
            />
          </div>

          <div className="checkout-form-group">
            <label className="checkout-label">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Enter your city"
              className="checkout-input"
              required
            />
          </div>

          <div className="checkout-form-group">
            <label className="checkout-label" htmlFor="state">State / Province</label>
            <input
              id="state"
              type="text"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="State / Province / Region"
              className="checkout-input"
              required
            />
          </div>

          <div className="checkout-form-group">
            <label className="checkout-label">Postal Code</label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleInputChange}
              placeholder="Enter postal code"
              className="checkout-input"
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
            <span className="checkout-shipping-price">{CURRENCY.symbol}99 (Free over {CURRENCY.symbol}1000)</span>
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
