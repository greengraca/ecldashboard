const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

const tableRow = {
  borderRadius: 0,
  borderTop: "1px solid var(--border-subtle)",
};

export default function SubscribersLoading() {
  return (
    <div className="animate-pulse">
      {/* Header + month picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-7 w-44 rounded mb-2" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* 6 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl" style={surfaceCard}>
            <div className="skeleton h-3 w-16 rounded mb-2" />
            <div className="skeleton h-6 w-10 rounded mb-1" />
            <div className="skeleton h-3 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* Filter buttons row */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={surfaceCard}>
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {[40, 24, 16, 16].map((w, i) => (
            <div key={i} className={`skeleton h-3 w-${w} rounded`} style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3" style={tableRow}>
            <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 skeleton h-4 rounded" />
            <div className="skeleton h-5 w-16 rounded-full" style={{ flexShrink: 0 }} />
            <div className="skeleton h-4 w-20 rounded" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
