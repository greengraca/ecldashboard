const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
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
          <div className="skeleton h-8 w-24 rounded mb-2" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="skeleton h-9 w-36 rounded-lg" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
      </div>

      {/* 6 stat cards — grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
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

      {/* Turn Order Section (collapsible card) */}
      <div className="rounded-xl mb-8 overflow-hidden" style={surfaceCard}>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
          <div className="skeleton w-4 h-4 rounded" />
        </div>
      </div>

      {/* View mode toggle (Standings / Games pill) */}
      <div className="skeleton h-9 w-40 rounded-lg mb-6" />

      {/* Filter buttons row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-32 rounded-lg" />
        ))}
      </div>

      {/* Standings table */}
      <div className="rounded-xl overflow-hidden" style={surfaceCard}>
        {/* Table header */}
        <div
          className="flex gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
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
