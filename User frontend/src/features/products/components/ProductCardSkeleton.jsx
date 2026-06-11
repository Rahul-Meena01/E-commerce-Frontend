const ProductCardSkeleton = () => (
  <div className="pc-card">
    <div className="pc-media ds-skeleton" style={{ aspectRatio: "3/4" }} />
    <div className="pc-body">
      <div
        className="ds-skeleton"
        style={{
          height: "12px",
          width: "45%",
          marginBottom: "8px",
        }}
      />
      <div
        className="ds-skeleton"
        style={{
          height: "18px",
          width: "80%",
          marginBottom: "8px",
        }}
      />
      <div
        className="ds-skeleton"
        style={{
          height: "16px",
          width: "28%",
        }}
      />
      <div
        className="ds-skeleton"
        style={{
          height: "36px",
          width: "100%",
          marginTop: "12px",
        }}
      />
    </div>
  </div>
);

export default ProductCardSkeleton;
