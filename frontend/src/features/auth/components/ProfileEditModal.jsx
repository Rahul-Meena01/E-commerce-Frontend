import { X } from "lucide-react";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

const ProfileEditModal = ({
  showEditModal,
  handleModalOverlayClick,
  handleCloseModal,
  formData,
  handleFormChange,
  formErrors,
  handleImageUpload,
  handleSaveProfile,
  isSaving,
}) => {
  if (!showEditModal) return null;

  return (
    <div className="profile-modal-overlay" onClick={handleModalOverlayClick}>
      <div className="profile-modal">
        <div className="profile-modal-header">
          <h2 className="profile-modal-title">Edit Profile</h2>
          <button
            className="profile-modal-close"
            onClick={handleCloseModal}
            aria-label="Close modal"
          >
            <X />
          </button>
        </div>

        <div className="profile-modal-content">
          <div className="profile-modal-image-section">
            <div className="profile-modal-image-preview">
              <OptimizedImage src={formData.image} alt="Profile preview" />
            </div>
          </div>

          <div className="profile-modal-form">
            <div className="profile-form-group">
              <label className="profile-form-label">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Enter your full name"
                className={`profile-form-input ${formErrors.name ? "error" : ""}`}
              />
              {formErrors.name && (
                <span className="profile-form-error">{formErrors.name}</span>
              )}
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="Enter your email address"
                className={`profile-form-input ${formErrors.email ? "error" : ""}`}
              />
              {formErrors.email && (
                <span className="profile-form-error">{formErrors.email}</span>
              )}
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                placeholder="Enter your phone number"
                className={`profile-form-input ${formErrors.phone ? "error" : ""}`}
              />
              {formErrors.phone && (
                <span className="profile-form-error">{formErrors.phone}</span>
              )}
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                placeholder="Enter your location"
                className={`profile-form-input ${formErrors.location ? "error" : ""}`}
              />
              {formErrors.location && (
                <span className="profile-form-error">
                  {formErrors.location}
                </span>
              )}
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">Bio/About</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleFormChange}
                placeholder="Tell us about yourself"
                className="profile-form-textarea"
                rows="3"
              />
            </div>

            <div className="profile-form-group">
              <label className="profile-form-label">Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="profile-file-input"
                aria-label="Upload profile photo"
              />
              <span className="profile-file-hint">
                JPG, PNG or GIF up to 5MB
              </span>
            </div>
          </div>
        </div>

        <div className="profile-modal-footer">
          <button className="profile-modal-btn cancel" onClick={handleCloseModal}>
            Cancel
          </button>
          <button
            className="profile-modal-btn save"
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;
