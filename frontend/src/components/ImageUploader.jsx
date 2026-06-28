import React, { useState, useRef, useEffect } from "react";
import "./ImageUploader.css"; 

const ImageUploader = ({ 
  initialUrl = "", 
  onUploadSuccess, 
  onRemove, 
  label = "Image", 
  aspectRatio = "1/1",
  style = {},
  className = "",
  uploadUrl = "/api/upload"
}) => {
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setImageUrl(initialUrl);
  }, [initialUrl]);

  // Handle actual file upload to the server
  const uploadFile = async (file) => {
    // Validate format
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid format. Only JPG, PNG, and WebP are allowed.");
      return;
    }
    
    // Validate size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setImageUrl(data.url);
        if (onUploadSuccess) onUploadSuccess(data.url);
      } else {
        setError(data.message || "Upload failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handlePaste = (e) => {
    // Check if the pasted content is a file (image data)
    const items = e.clipboardData?.items;
    let imageFile = null;
    let hasString = false;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          imageFile = items[i].getAsFile();
        } else if (items[i].type === "text/plain") {
          hasString = true;
        }
      }
    }

    if (imageFile) {
      uploadFile(imageFile);
    } else if (hasString) {
      setError("Please copy an actual image, not a link.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    setImageUrl("");
    if (onRemove) onRemove();
    else if (onUploadSuccess) onUploadSuccess("");
  };

  return (
    <div className={`unified-image-uploader-wrapper ${className}`} style={style}>
      {label && <label className="unified-image-uploader-label">{label}</label>}
      <div 
        className={`unified-image-uploader-zone ${dragOver ? "drag-over" : ""} ${error ? "has-error" : ""}`}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{ aspectRatio }}
        tabIndex={0}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/jpeg, image/jpg, image/png, image/webp" 
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        
        {isUploading ? (
          <div className="uploader-state-loading">
            <div className="uploader-spinner"></div>
            <span>Uploading...</span>
          </div>
        ) : imageUrl ? (
          <div className="uploader-state-preview">
            <img src={imageUrl.startsWith('http') || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:') ? imageUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3000"}${imageUrl}`} alt="Preview" />
            <div className="uploader-preview-overlay">
              <button className="uploader-btn-remove" onClick={handleRemoveClick} title="Remove image">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="uploader-state-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span className="uploader-cta">Click to upload</span>
            <span className="uploader-hint">or paste image (Ctrl+V)</span>
          </div>
        )}
      </div>
      {error && <div className="uploader-error-message">{error}</div>}
    </div>
  );
};

export default ImageUploader;
