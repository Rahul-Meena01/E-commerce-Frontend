import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { X, Upload, Trash2 } from "lucide-react";
import { useToast } from "../../../context/ToastContext";

const ReturnOrderModal = ({ isOpen, onClose, onConfirm, orderId }) => {
  const toast = useToast();
  const [reason, setReason] = useState("Wrong Size");
  const [comments, setComments] = useState("");
  const [images, setImages] = useState([]); // Array of base64 image strings
  
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus Trapping and Restore Focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      
      const focusTimer = setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length > 0) {
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

  // File Upload Handlers
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 images.");
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        return;
      }

      // Max file size 3MB for base64 storage limits
      if (file.size > 3 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 3MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input so same file can be uploaded if deleted
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comments.trim()) {
      toast.error("Please provide details in the comments section.");
      return;
    }
    onConfirm(orderId, {
      reason,
      comments,
      images,
    });
    onClose();
  };

  if (!isOpen) return null;

  const reasons = [
    "Wrong Size",
    "Defective Product",
    "Damaged Item",
    "Not As Expected",
    "Wrong Item Received",
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
        className="loft-modal return-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-modal-title"
        aria-describedby="return-modal-desc"
      >
        <button
          onClick={onClose}
          className="loft-modal-close-btn"
          aria-label="Close return modal"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="loft-modal-header">
            <span className="loft-modal-eyebrow">ORDER ID: {orderId}</span>
            <h2 id="return-modal-title" className="loft-modal-title">
              Request a Return
            </h2>
            <p id="return-modal-desc" className="loft-modal-desc">
              Please specify the reason for the return. Returns are processed within 3-5 business days.
            </p>
          </div>

          <div className="loft-modal-body">
            {/* Reason selector */}
            <div className="loft-form-group">
              <label htmlFor="return-reason-select" className="loft-field-label">
                Reason for Return
              </label>
              <select
                id="return-reason-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="loft-select"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Comments */}
            <div className="loft-form-group">
              <label htmlFor="return-comments" className="loft-field-label">
                Explain the issue in detail
              </label>
              <textarea
                id="return-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please provide details about the fit, defect, or damage..."
                className="loft-textarea"
                rows={4}
                required
              />
            </div>

            {/* Image upload area */}
            <div className="loft-form-group">
              <span className="loft-field-label">
                Upload Images (Max 5)
              </span>
              <p className="loft-field-help">
                Please upload clear photos showing the issue or tags for faster approval. (JPG, PNG. Max 3MB each).
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                style={{ display: "none" }}
                aria-label="Image uploader"
              />

              <div className="loft-image-uploader-grid">
                {images.map((img, idx) => (
                  <div key={idx} className="loft-image-preview-card">
                    <img src={img} alt={`Preview ${idx + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="loft-image-remove-btn"
                      aria-label={`Remove image ${idx + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={triggerFileUpload}
                    className="loft-image-uploader-trigger"
                    aria-label="Upload a photo"
                  >
                    <Upload size={20} />
                    <span>Upload Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="loft-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="loft-btn loft-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="loft-btn loft-btn-primary"
              disabled={!comments.trim()}
            >
              Submit Return Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

ReturnOrderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  orderId: PropTypes.string.isRequired,
};

export default ReturnOrderModal;
