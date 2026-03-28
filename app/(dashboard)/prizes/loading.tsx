const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

const innerCard = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
};

export default function PrizesLoading() {
  return (
    <div className="animate-pulse">
      {/* Header + month picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-8 w-20 rounded mb-2" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* 4 stat cards — grid-cols-2 lg:grid-cols-4 gap-4 mb-8 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-xl" style={surfaceCard}>
            <div className="flex items-start justify-between mb-3">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton w-8 h-8 rounded-lg hidden sm:block" />
            </div>
            <div className="skeleton h-7 w-20 rounded mb-1" />
            <div className="skeleton h-3 w-16 rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Tab bar — border-b style with 4 tab buttons */}
      <div
        className="flex items-center gap-1 mb-6 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-32 rounded-t-md mx-0.5" />
        ))}
      </div>

      {/* Tab content — pods_monitor default: stat cards + pod chips */}
      <div className="space-y-4">
        {/* Per-type stat cards: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg p-3" style={innerCard}>
              <div className="skeleton h-3 w-24 rounded mb-2" />
              <div className="skeleton h-6 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div className="rounded-xl overflow-hidden" style={surfaceCard}>
          <div className="p-4">
            <div className="skeleton h-40 w-full rounded-lg" />
          </div>
        </div>

        {/* Pod chips row */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
