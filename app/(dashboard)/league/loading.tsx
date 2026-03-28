const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

const tableRow = {
  borderRadius: 0,
  borderTop: "1px solid var(--border-subtle)",
};

export default function LeagueLoading() {
  return (
    <div className="animate-pulse">
      {/* Header + month picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-7 w-36 rounded mb-2" />
          <div className="skeleton h-4 w-52 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-xl" style={surfaceCard}>
            <div className="flex items-start justify-between mb-3">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton w-8 h-8 rounded-lg hidden sm:block" />
            </div>
            <div className="skeleton h-7 w-16 rounded mb-1" />
            <div className="skeleton h-3 w-14 rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Filter / tab buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Standings table */}
      <div className="rounded-xl overflow-hidden" style={surfaceCard}>
        {/* Header */}
        <div className="flex gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="skeleton h-3 w-8 rounded flex-shrink-0" />
          <div className="flex-1 skeleton h-3 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3" style={tableRow}>
            <div className="skeleton h-5 w-6 rounded flex-shrink-0" />
            <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 skeleton h-4 rounded" />
            <div className="skeleton h-4 w-12 rounded flex-shrink-0" />
            <div className="skeleton h-4 w-12 rounded flex-shrink-0" />
            <div className="skeleton h-4 w-12 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
