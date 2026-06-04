import { X, Upload, Camera } from "lucide-react";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

const ProfileAvatarModal = ({
  showAvatarModal,
  handleCloseAvatarModal,
  avatarPreview,
  uploadInputRef,
  cameraInputRef,
  handleAvatarFileSelect,
  handleSaveAvatar,
}) => {
  if (!showAvatarModal) return null;

  return (
    <div
      className="profile-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseAvatarModal();
      }}
    >
      <div className="profile-modal profile-avatar-modal">
        <div className="profile-modal-header">
          <h2 className="profile-modal-title">Update Profile Photo</h2>
          <button
            className="profile-modal-close"
            onClick={handleCloseAvatarModal}
            aria-label="Close photo editor"
          >
            <X />
          </button>
        </div>

        <div className="profile-modal-content profile-avatar-modal-content">
          <div className="profile-avatar-preview-area">
            <div className="profile-avatar-preview-frame">
              <OptimizedImage
                src={avatarPreview}
                alt="Profile photo preview"
              />
            </div>
            <p className="profile-avatar-preview-note">
              Choose a new picture from your device or use the camera on
              your phone.
            </p>
          </div>

          <div className="profile-avatar-source-grid">
            <button
              type="button"
              className="profile-avatar-source-btn"
              onClick={() => uploadInputRef.current?.click()}
            >
              <Upload />
              Upload from device
            </button>
            <button
              type="button"
              className="profile-avatar-source-btn secondary"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera />
              Take a photo
            </button>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFileSelect}
            className="profile-avatar-hidden-input"
            aria-label="Upload profile photo from device"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleAvatarFileSelect}
            className="profile-avatar-hidden-input"
            aria-label="Take a new profile photo"
          />
        </div>

        <div className="profile-modal-footer">
          <button
            className="profile-modal-btn cancel"
            onClick={handleCloseAvatarModal}
          >
            Cancel
          </button>
          <button
            className="profile-modal-btn save"
            onClick={handleSaveAvatar}
          >
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileAvatarModal;
