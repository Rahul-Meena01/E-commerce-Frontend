import { useEffect } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { Button } from "@/shared/ui";
import { siteContent } from "@/config/siteContent";
import "./SizeGuideModal.css";

const SizeGuideModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { sizeGuide } = siteContent;
  if (!sizeGuide) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("sgm-overlay")) {
      onClose();
    }
  };

  return (
    <div
      className="sgm-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sgm-title"
    >
      <div className="sgm-container">
        <Button
          variant="ghost"
          icon={<X size={20} />}
          className="sgm-close-btn"
          onClick={onClose}
          aria-label="Close size guide"
        />

        <div className="sgm-header">
          <h2 id="sgm-title" className="sgm-title">
            {sizeGuide.title}
          </h2>
          <p className="sgm-subtitle">{sizeGuide.subtitle}</p>
        </div>

        <div className="sgm-content">
          <table className="sgm-table">
            <thead>
              <tr>
                {sizeGuide.headers.map((header, idx) => (
                  <th key={idx}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizeGuide.rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="sgm-size-cell">{row.size}</td>
                  <td>{row.chest}</td>
                  <td>{row.waist}</td>
                  <td>{row.hips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sgm-footer">
          <p>
            * Measurements refer to body size, not garment dimensions. If you
            are between sizes, we recommend sizing up for a more relaxed fit.
          </p>
        </div>
      </div>
    </div>
  );
};

SizeGuideModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SizeGuideModal;
