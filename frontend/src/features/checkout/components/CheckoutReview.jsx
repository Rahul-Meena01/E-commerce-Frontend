import { ChevronRight, MapPin, CreditCard, ShieldCheck } from "lucide-react";

const CheckoutReview = ({
  formData,
  orderError,
  isPending,
  handlePlaceOrder,
}) => {
  return (
    <div className="checkout-step-form">
      <div className="checkout-section">
        <h2 className="checkout-section-title">Review Your Order</h2>
        <p className="checkout-section-desc-light">
          Please confirm your delivery details and payment configuration before finalizing your order.
        </p>

        <div className="checkout-review-cards-grid">
          {/* Shipping Card */}
          <div className="checkout-review-premium-card">
            <div className="checkout-review-card-header">
              <div className="checkout-review-card-tag-group">
                <MapPin size={13} className="card-icon-gold" />
                <span className="checkout-review-card-tag">SHIPPING DETAILS</span>
              </div>
            </div>
            <div className="checkout-review-card-body">
              <p className="recipient-name">{formData.fullName}</p>
              <p className="address-line">
                {formData.street} {formData.apartment && `, ${formData.apartment}`}
              </p>
              <p className="address-line">
                {formData.city}, {formData.state} {formData.postalCode}
              </p>
              <p className="country-line">{formData.country}</p>
              {formData.phone && <p className="phone-line">T: {formData.phone}</p>}
            </div>
          </div>

          {/* Payment Card */}
          <div className="checkout-review-premium-card">
            <div className="checkout-review-card-header">
              <div className="checkout-review-card-tag-group">
                <CreditCard size={13} className="card-icon-gold" />
                <span className="checkout-review-card-tag">PAYMENT METHOD</span>
              </div>
            </div>
            <div className="checkout-review-card-body">
              <p className="method-name">Razorpay Secure Portal</p>
              <p className="method-desc">
                Your credentials are encrypted in transit. Card, UPI, and banking details are processed off-site via Razorpay's verified, low-PCI scope gateway.
              </p>
              <div className="method-badge">
                <ShieldCheck size={11} />
                <span>100% Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {orderError && (
        <div className="checkout-error" role="alert" aria-atomic="true">
          {orderError}
        </div>
      )}

      <div className="checkout-review-actions">
        <button
          onClick={handlePlaceOrder}
          className="checkout-continue-btn place-order-btn"
          disabled={isPending}
        >
          {isPending ? "CONNECTING..." : "PLACE ORDER & PAY"}
          {!isPending && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
};

export default CheckoutReview;
