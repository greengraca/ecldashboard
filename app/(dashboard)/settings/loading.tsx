const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

const infoRow = {
  borderBottom: "1px solid var(--border-subtle)",
};

export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="skeleton h-7 w-28 rounded" />
        </div>
        <div className="skeleton h-4 w-52 rounded mt-2" />
      </div>

      {/* 3 settings cards */}
      <div className="space-y-6">
        {/* User profile card */}
        <div className="rounded-xl overflow-hidden" style={surfaceCard}>
          <div className="flex items-center gap-2 px-5 py-3" style={infoRow}>
            <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
          <div className="px-5 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3" style={infoRow}>
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-4 w-40 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Environment / database card */}
        <div className="rounded-xl overflow-hidden" style={surfaceCard}>
          <div className="flex items-center gap-2 px-5 py-3" style={infoRow}>
            <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
            <div className="skeleton h-4 w-32 rounded" />
          </div>
          <div className="px-5 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3" style={infoRow}>
                <div className="skeleton h-3 w-28 rounded" />
                <div className="skeleton h-4 w-36 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Actions / sync card */}
        <div className="rounded-xl overflow-hidden" style={surfaceCard}>
          <div className="flex items-center gap-2 px-5 py-3" style={infoRow}>
            <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-9 w-36 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
