import { ShieldCheck, Lock, Truck } from "lucide-react";

const CheckoutPaymentForm = ({ handlePaymentSubmit, paymentMethod, setPaymentMethod, appliedGiftCard }) => {
  return (
    <form onSubmit={handlePaymentSubmit} className="checkout-step-form">
      <div className="checkout-section">
        <h2 className="checkout-section-title">Payment Method</h2>
        <p className="checkout-section-desc-light">
          All transactions are secured, encrypted, and processed through our verified gateway.
        </p>

        {appliedGiftCard && (
          <div className="payment-method-giftcard-warning" style={{
            marginBottom: "16px",
            padding: "12px 16px",
            backgroundColor: "rgba(180, 83, 9, 0.08)",
            border: "1px solid rgba(180, 83, 9, 0.2)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "var(--ds-color-accent, #a47551)",
            lineHeight: 1.5
          }}>
            <strong>Gift Card Applied:</strong> Online payment (Razorpay) is restricted to ensure payment integrity. Please select **Cash On Delivery (COD)** for the remaining balance. If the balance is ₹0, no payment is required.
          </div>
        )}

        <div className="checkout-payment-methods-list">
          {/* Active Razorpay Card Option */}
          <div
            className={`checkout-payment-method-card ${paymentMethod === "Razorpay" ? "active" : ""} ${appliedGiftCard ? "disabled" : ""}`}
            onClick={() => {
              if (!appliedGiftCard) {
                setPaymentMethod("Razorpay");
              }
            }}
            style={{ 
              cursor: appliedGiftCard ? "not-allowed" : "pointer",
              opacity: appliedGiftCard ? 0.5 : 1
            }}
          >
            <div className="payment-method-card-header">
              <div className="payment-method-radio-group">
                <div className={`payment-method-custom-radio ${paymentMethod === "Razorpay" && !appliedGiftCard ? "checked" : ""}`}>
                  {paymentMethod === "Razorpay" && !appliedGiftCard && <div className="radio-inner-dot"></div>}
                </div>
                <div className="payment-method-title-wrap">
                  <span className="payment-method-name">Razorpay Secure Gateway</span>
                  <span className="payment-method-subtitle">Cards, UPI, Netbanking, Wallets</span>
                </div>
              </div>
              <ShieldCheck size={18} className="payment-method-shield-icon" />
            </div>

            {paymentMethod === "Razorpay" && !appliedGiftCard && (
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
            )}
          </div>

          {/* Cash On Delivery Option */}
          <div
            className={`checkout-payment-method-card ${paymentMethod === "COD" ? "active" : ""}`}
            onClick={() => setPaymentMethod("COD")}
            style={{ cursor: "pointer", marginTop: "16px" }}
          >
            <div className="payment-method-card-header">
              <div className="payment-method-radio-group">
                <div className={`payment-method-custom-radio ${paymentMethod === "COD" ? "checked" : ""}`}>
                  {paymentMethod === "COD" && <div className="radio-inner-dot"></div>}
                </div>
                <div className="payment-method-title-wrap">
                  <span className="payment-method-name">Cash On Delivery (COD)</span>
                  <span className="payment-method-subtitle">Pay with cash upon delivery of your order</span>
                </div>
              </div>
              <Truck size={18} className="payment-method-shield-icon" style={{ color: "var(--ds-color-accent)" }} />
            </div>

            {paymentMethod === "COD" && (
              <div className="payment-method-card-body">
                <p className="payment-method-explanation">
                  Pay with cash directly to the courier agent when your order is delivered to your doorstep. Please ensure you have the exact amount ready to facilitate a smooth transaction.
                </p>
              </div>
            )}
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
