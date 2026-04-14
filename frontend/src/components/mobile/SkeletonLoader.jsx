export function SkeletonCard({ height = 80, width = '100%', style }) {
  return (
    <div className="skeleton-card" style={{ height, width, ...style }} />
  );
}

export function SkeletonRow({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(count, 2)}, 1fr)`, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={90} />
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 200 }) {
  return <SkeletonCard height={height} style={{ borderRadius: 16 }} />;
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} height={56} />
      ))}
    </div>
  );
}
