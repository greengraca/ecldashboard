const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

export default function MediaLoading() {
  return (
    <div className="animate-pulse">
      {/* Header — title+subtitle left, MonthPicker right, matches flex justify-between mb-8 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-7 w-20 rounded mb-1" />
          <div className="skeleton h-4 w-52 rounded mt-1" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* Asset Drive section — mb-6 */}
      <div className="mb-6">
        <div className="rounded-xl overflow-hidden" style={surfaceCard}>
          {/* Toolbar row */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-4 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-8 w-24 rounded-lg" />
              <div className="skeleton h-8 w-8 rounded-lg" />
              <div className="skeleton h-8 w-8 rounded-lg" />
            </div>
          </div>
          {/* File grid — 6 skeleton tiles */}
          <div className="p-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton rounded-lg w-full aspect-square" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Template selector — grid-cols-2 sm:grid-cols-3 lg:grid-cols-5, 7 templates, mb-8 */}
      <div className="mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl"
              style={surfaceCard}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="skeleton h-4 w-8 rounded" />
              </div>
              <div className="skeleton h-4 w-28 rounded mb-1" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-3/4 rounded mt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Empty state — shown when no template selected (initial load) */}
      <div
        className="flex items-center justify-center rounded-xl h-64"
        style={surfaceCard}
      >
        <div className="skeleton h-4 w-56 rounded" />
      </div>
    </div>
  );
}
