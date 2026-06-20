import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";

const CancelOrderModal = ({ isOpen, onClose, onConfirm, orderId }) => {
  const [reason, setReason] = useState("Ordered by mistake");
  const [customReason, setCustomReason] = useState("");
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus Trapping and Restore Focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      
      // Delay slightly to allow element to render
      const focusTimer = setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length > 0) {
            // Focus the close button or first radio button
            focusableElements[0].focus();
          }
        }
      }, 50);

      document.body.style.overflow = "hidden";
      
      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = "unset";
      };
    } else {
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus();
      }
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  // Keyboard navigation & Escape-to-close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.disabled);
        
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = reason === "Other" ? `Other: ${customReason}` : reason;
    onConfirm(orderId, finalReason);
    onClose();
  };

  if (!isOpen) return null;

  const reasons = [
    "Ordered by mistake",
    "Found cheaper elsewhere",
    "Delivery taking too long",
    "Changed my mind",
    "Other",
  ];

  return (
    <div
      className="loft-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="loft-modal cancel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        aria-describedby="cancel-modal-desc"
      >
        <button
          onClick={onClose}
          className="loft-modal-close-btn"
          aria-label="Close cancellation modal"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="loft-modal-header">
            <span className="loft-modal-eyebrow">ORDER ID: {orderId}</span>
            <h2 id="cancel-modal-title" className="loft-modal-title">
              Cancel Your Order
            </h2>
            <p id="cancel-modal-desc" className="loft-modal-desc">
              Please select a reason for cancellation. Once cancelled, this action cannot be undone.
            </p>
          </div>

          <div className="loft-modal-body">
            <div className="cancel-reasons-list" role="radiogroup" aria-label="Cancellation reasons">
              {reasons.map((r) => (
                <label key={r} className="cancel-reason-option">
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className="loft-radio-input"
                  />
                  <span className="loft-radio-label">{r}</span>
                </label>
              ))}
            </div>

            {reason === "Other" && (
              <div className="custom-reason-container">
                <label htmlFor="custom-reason-textarea" className="loft-field-label">
                  Explain your reason (optional)
                </label>
                <textarea
                  id="custom-reason-textarea"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Tell us why you would like to cancel this order..."
                  className="loft-textarea"
                  rows={3}
                  required
                />
              </div>
            )}
          </div>

          <div className="loft-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="loft-btn loft-btn-secondary"
            >
              Keep Order
            </button>
            <button
              type="submit"
              className="loft-btn loft-btn-danger"
              disabled={reason === "Other" && !customReason.trim()}
            >
              Confirm Cancellation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CancelOrderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  orderId: PropTypes.string.isRequired,
};

export default CancelOrderModal;
