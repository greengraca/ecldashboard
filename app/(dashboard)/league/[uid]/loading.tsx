const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

const tableRow = {
  borderRadius: 0,
  borderTop: "1px solid var(--border-subtle)",
};

export default function PlayerDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Back link */}
      <div className="skeleton h-4 w-28 rounded mb-6" />

      {/* Avatar + name header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="skeleton w-14 h-14 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-3 w-56 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl" style={surfaceCard}>
            <div className="skeleton h-3 w-16 rounded mb-2" />
            <div className="skeleton h-6 w-12 rounded mb-1" />
            <div className="skeleton h-3 w-14 rounded" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl p-5 mb-8" style={surfaceCard}>
        <div className="skeleton h-4 w-36 rounded mb-4" />
        <div className="skeleton h-40 w-full rounded-lg" />
      </div>

      {/* History table */}
      <div className="rounded-xl overflow-hidden" style={surfaceCard}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3" style={tableRow}>
            <div className="skeleton h-4 w-20 rounded flex-shrink-0" />
            <div className="flex-1 skeleton h-4 rounded" />
            <div className="skeleton h-4 w-12 rounded flex-shrink-0" />
            <div className="skeleton h-4 w-12 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
