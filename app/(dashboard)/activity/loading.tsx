const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

const tableRow = {
  borderRadius: 0,
  borderTop: "1px solid var(--border-subtle)",
};

export default function ActivityLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="skeleton h-7 w-32 rounded" />
        </div>
        <div className="skeleton h-4 w-64 rounded mt-2" />
      </div>

      {/* Filter bar */}
      <div className="rounded-xl p-4 mb-4" style={surfaceCard}>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-36 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Activity table */}
      <div className="rounded-xl overflow-hidden" style={surfaceCard}>
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
          <div className="flex-1 skeleton h-3 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3" style={tableRow}>
            <div className="skeleton h-4 w-28 rounded flex-shrink-0" />
            <div className="skeleton h-5 w-16 rounded-full flex-shrink-0" />
            <div className="flex-1 skeleton h-4 rounded" />
            <div className="skeleton h-3 w-20 rounded flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="skeleton h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
