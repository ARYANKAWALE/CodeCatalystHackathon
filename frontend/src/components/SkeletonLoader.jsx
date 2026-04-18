/**
 * SkeletonLoader — shimmer placeholders for loading states.
 * Variants: 'stat-cards', 'table', 'card', 'text'
 */

function SkeletonPulse({ width, height = '1rem', borderRadius = '6px', style }) {
  return (
    <div
      className="skeleton-pulse"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonStatCards({ count = 6 }) {
  return (
    <div className="row g-3 mb-4">
      {Array.from({ length: count }).map((_, i) => (
        <div className="col-6 col-md-4 col-xl-2" key={i}>
          <div className="skeleton-card" style={{ animationDelay: `${i * 0.08}s` }}>
            <SkeletonPulse width="48px" height="48px" borderRadius="var(--radius-sm)" />
            <SkeletonPulse width="60%" height="1.75rem" style={{ marginTop: '0.75rem' }} />
            <SkeletonPulse width="80%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="table-container">
      <div className="skeleton-table-head">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse key={i} width={`${60 + Math.random() * 40}%`} height="0.7rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          className="skeleton-table-row"
          key={r}
          style={{ animationDelay: `${r * 0.06}s` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonPulse key={c} width={`${50 + Math.random() * 40}%`} height="0.85rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card skeleton-card--large">
      <SkeletonPulse width="40%" height="1.2rem" />
      <SkeletonPulse width="100%" height="0.85rem" style={{ marginTop: '1rem' }} />
      <SkeletonPulse width="75%" height="0.85rem" style={{ marginTop: '0.5rem' }} />
      <SkeletonPulse width="90%" height="0.85rem" style={{ marginTop: '0.5rem' }} />
    </div>
  );
}

export default function SkeletonLoader({ variant = 'stat-cards', ...props }) {
  switch (variant) {
    case 'stat-cards':
      return <SkeletonStatCards {...props} />;
    case 'table':
      return <SkeletonTable {...props} />;
    case 'card':
      return <SkeletonCard />;
    default:
      return <SkeletonStatCards {...props} />;
  }
}
