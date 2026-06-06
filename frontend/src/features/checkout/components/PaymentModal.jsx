import { ShieldCheck, Lock, ArrowRight, X } from "lucide-react";
import { formatPrice } from "@/utils/pricing";
import { motion, AnimatePresence } from "framer-motion";
import "@/styles/PaymentModal.css";

const PaymentModal = ({ isOpen, onClose, onPaymentSuccess, amount }) => {
  const handleConfirm = (e) => {
    e.preventDefault();
    onPaymentSuccess("Razorpay checkout");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="loft-pm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="loft-pm-modal"
            initial={{ opacity: 0, y: 25, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="loft-pm-header">
              <div className="loft-pm-title-group">
                <span className="loft-pm-brand">LOFT EXCLUSIVE</span>
                <h2 className="loft-pm-title">Secure Payment Handoff</h2>
              </div>
              <button
                className="loft-pm-close"
                onClick={onClose}
                aria-label="Close payment modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="loft-pm-body">
              <div className="loft-pm-amount-badge">
                <span className="loft-pm-amount-lbl">AUTHORIZED GRAND TOTAL</span>
                <span className="loft-pm-amount-val">
                  {formatPrice(amount)}
                </span>
              </div>

              <div className="loft-pm-sim-options">
                <span className="loft-pm-sim-title">Verified Encrypted Tunnel</span>
                <div className="loft-pm-upi-hint" style={{ marginBottom: 0 }}>
                  You are establishing a secure connection to the Razorpay checkout portal. All billing options (Credit Card, Netbanking, UPI, and local wallets) are processed off-site on signature-verified networks.
                </div>
              </div>

              <div className="loft-pm-wallet-grid">
                <div className="loft-pm-wallet-btn active">Cards / EMI</div>
                <div className="loft-pm-wallet-btn active">UPI / GPAY</div>
                <div className="loft-pm-wallet-btn active">Netbanking</div>
                <div className="loft-pm-wallet-btn active">Wallets</div>
              </div>

              <div className="loft-pm-security-lbl">
                <Lock size={12} className="card-icon-gold" />
                <span>Verified SSL Payment Gateway Handshake</span>
              </div>

              <form onSubmit={handleConfirm} className="loft-pm-form">
                <button type="submit" className="loft-pm-submit">
                  Proceed to payment
                  <ArrowRight size={14} style={{ marginLeft: 8 }} />
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
