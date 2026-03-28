const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
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
          <div className="flex items-center gap-2">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="skeleton h-3 w-32 rounded" />
        </div>
      </div>

      {/* Achievements section */}
      <div className="mb-8">
        <div className="skeleton h-3 w-28 rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          <div className="skeleton h-8 w-36 rounded-lg" />
          <div className="skeleton h-8 w-32 rounded-lg" />
          <div className="skeleton h-8 w-34 rounded-lg" />
        </div>
      </div>

      {/* Prizes placeholder card */}
      <div className="rounded-xl p-6 mb-8 text-center" style={surfaceCard}>
        <div className="skeleton w-6 h-6 rounded mx-auto mb-2" />
        <div className="skeleton h-4 w-32 rounded mx-auto" />
      </div>

      {/* Current Stats — grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 */}
      <div className="mb-8">
        <div className="skeleton h-3 w-28 rounded mb-3" />
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-2.5 sm:p-4 rounded-xl text-center" style={surfaceCard}>
              <div className="skeleton h-2.5 w-12 rounded mx-auto mb-1" />
              <div className="skeleton h-6 w-10 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Points Progression chart */}
      <div className="mb-8">
        <div className="skeleton h-3 w-36 rounded mb-3" />
        <div className="rounded-xl p-4 overflow-hidden" style={surfaceCard}>
          <div className="skeleton h-36 w-full rounded-lg" />
        </div>
      </div>

      {/* Monthly History table */}
      <div>
        <div className="skeleton h-3 w-32 rounded mb-3" />
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "rgba(255, 255, 255, 0.015)", border: "1px solid var(--border)" }}
        >
          {/* Table header */}
          <div
            className="h-10 px-4 flex items-center gap-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-3 flex-1 rounded" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 px-4 flex items-center gap-4"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="skeleton h-4 flex-1 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
