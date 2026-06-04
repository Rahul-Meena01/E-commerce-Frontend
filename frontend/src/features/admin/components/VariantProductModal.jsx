const VariantProductModal = ({
  showModal,
  setShowModal,
  editingVariant,
  formData,
  setFormData,
  productSearch,
  setProductSearch,
  productsQuery,
  filteredProducts,
  renderImageBox,
  handleSubmit,
  saveMutation,
}) => {
  if (!showModal) return null;

  return (
    <div className="vp-modal-overlay">
      <div className="vp-modal">
        <div className="vp-modal-header">
          <h2>{editingVariant ? "Edit Variant" : "Create Variant"}</h2>
          <button onClick={() => setShowModal(false)}>×</button>
        </div>

        <div className="vp-modal-body">
          {renderImageBox("image", true)}
          <div className="vp-grid-images">
            {renderImageBox("image1")}
            {renderImageBox("image2")}
            {renderImageBox("image3")}
            {renderImageBox("image4")}
          </div>

          <input
            type="text"
            placeholder="Variant Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="vp-input"
          />

          <div className="vp-product-select">
            <input
              type="text"
              placeholder="Search Base Product..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="vp-input"
            />
            <div className="vp-product-list">
              {productsQuery.isLoading ? (
                <div className="vp-product-item">Loading products...</div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    className={`vp-product-item ${formData.parentProduct === product._id ? "vp-product-selected" : ""}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        parentProduct: product._id,
                      }))
                    }
                  >
                    {product.name}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="vp-row">
            <input
              type="text"
              placeholder="Brand"
              value={formData.brand}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, brand: e.target.value }))
              }
              className="vp-input"
            />
            <input
              type="number"
              placeholder="Price"
              value={formData.price}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, price: e.target.value }))
              }
              className="vp-input"
            />
          </div>

          <div className="vp-row">
            <input
              type="number"
              placeholder="Discount %"
              value={formData.discountPercent}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  discountPercent: e.target.value,
                }))
              }
              className="vp-input"
            />
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              className="vp-input"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="vp-modal-footer">
          <button
            className="vp-cancel-btn"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>
          <button
            className="vp-submit-btn"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? "Saving..."
              : editingVariant
                ? "Update Variant"
                : "Create Variant"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariantProductModal;
