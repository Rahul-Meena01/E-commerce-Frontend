const VariantProductDeleteModal = ({ deleteTarget, setDeleteTarget, handleDelete }) => {
  if (!deleteTarget) return null;

  return (
    <div className="vp-modal-overlay">
      <div className="vp-delete-modal">
        <h3>Delete Variant Product</h3>
        <p>
          Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
        </p>
        <div className="vp-delete-actions">
          <button onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default VariantProductDeleteModal;
