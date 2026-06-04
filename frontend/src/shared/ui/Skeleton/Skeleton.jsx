export function Skeleton({ className = "", height, radius, style, width = "100%" }) {
  return (
    <span
      aria-hidden="true"
      className={`ds-skeleton ${className}`.trim()}
      style={{ display: "block", height, width, borderRadius: radius, ...style }}
    />
  );
}

export function ProductSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-grid" aria-label="Loading products">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <Skeleton className="skeleton-media" />
          <Skeleton height={14} width="62%" />
          <Skeleton height={14} width="82%" />
          <Skeleton height={14} width="42%" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ display: "grid", gap: "20px" }} aria-label="Loading dashboard">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} height={118} radius="16px" />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
        <Skeleton height={220} radius="16px" />
        <Skeleton height={220} radius="16px" />
      </div>
      <Skeleton height={300} radius="16px" />
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: "24px" }} aria-label="Loading checkout">
      <Skeleton height={520} radius="16px" />
      <Skeleton height={420} radius="16px" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div style={{ display: "grid", gap: "20px" }} aria-label="Loading profile">
      <Skeleton height={220} radius="16px" />
      <Skeleton height={56} radius="12px" />
      <Skeleton height={360} radius="16px" />
    </div>
  );
}
