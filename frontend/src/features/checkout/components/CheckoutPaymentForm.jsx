import { ShieldCheck, Lock, CreditCard } from "lucide-react";

const CheckoutPaymentForm = ({ handlePaymentSubmit }) => {
  return (
    <form onSubmit={handlePaymentSubmit} className="checkout-step-form">
      <div className="checkout-section">
        <h2 className="checkout-section-title">Payment Method</h2>
        <p className="checkout-section-desc-light">
          All transactions are secured, encrypted, and processed through our verified gateway.
        </p>

        <div className="checkout-payment-methods-list">
          {/* Active Razorpay Card Option */}
          <div className="checkout-payment-method-card active">
            <div className="payment-method-card-header">
              <div className="payment-method-radio-group">
                <div className="payment-method-custom-radio checked">
                  <div className="radio-inner-dot"></div>
                </div>
                <div className="payment-method-title-wrap">
                  <span className="payment-method-name">Razorpay Secure Gateway</span>
                  <span className="payment-method-subtitle">Cards, UPI, Netbanking, Wallets</span>
                </div>
              </div>
              <ShieldCheck size={18} className="payment-method-shield-icon" />
            </div>

            <div className="payment-method-card-body">
              <p className="payment-method-explanation">
                Upon clicking "Place Order & Pay" in the next step, you will transact through Razorpay's secure modal. Credit/debit card numbers, UPI PINs, and banking credentials are never processed or stored by LOFT.
              </p>
              <div className="payment-method-gateways-row">
                <span className="gateway-badge">CARDS</span>
                <span className="gateway-badge">UPI / GPAY</span>
                <span className="gateway-badge">NETBANKING</span>
                <span className="gateway-badge">WALLETS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="checkout-features-compact">
          <div className="checkout-feature-item-compact">
            <Lock size={13} className="promise-icon-gold" />
            <span>Signature Verified Encryption</span>
          </div>
          <div className="checkout-feature-item-compact">
            <ShieldCheck size={13} className="promise-icon-gold" />
            <span>Zero Card Storage (PCI Compliant)</span>
          </div>
        </div>
      </div>

      <button type="submit" className="checkout-continue-btn">
        CONTINUE TO REVIEW
      </button>
    </form>
  );
};

export default CheckoutPaymentForm;
