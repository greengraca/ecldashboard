const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

export default function SubscribersLoading() {
  return (
    <div className="animate-pulse">
      {/* Header row — title+subtitle left, MonthPicker right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-8 w-44 rounded mb-2" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* Stat cards grid — grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 (no manually-paid col in skeleton) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3 sm:p-5 rounded-xl" style={surfaceCard}>
            <div className="flex items-start justify-between mb-1.5 sm:mb-3">
              <div className="skeleton h-3 w-16 sm:w-20 rounded" />
              <div className="skeleton w-8 h-8 rounded-lg hidden sm:block" />
            </div>
            <div className="skeleton h-5 sm:h-7 w-10 sm:w-14 rounded mb-1" />
          </div>
        ))}
      </div>

      {/* Data health warnings placeholder (mb-8 spacer) */}
      <div className="mb-8" />

      {/* Subscriber table */}
      <div className="rounded-xl overflow-hidden" style={surfaceCard}>
        {/* Table header */}
        <div
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="skeleton w-7 h-3 rounded" style={{ flexShrink: 0 }} />
          <div className="skeleton h-3 rounded" style={{ width: "35%" }} />
          <div className="skeleton h-3 rounded" style={{ width: "15%" }} />
          <div className="skeleton h-3 rounded" style={{ width: "15%" }} />
          <div className="skeleton h-3 rounded" style={{ width: "20%" }} />
        </div>
        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />
            <div className="skeleton h-4 rounded" style={{ width: "35%" }} />
            <div className="skeleton h-5 w-16 rounded-full" style={{ flexShrink: 0 }} />
            <div className="skeleton h-4 w-20 rounded" style={{ flexShrink: 0 }} />
            <div className="skeleton h-4 w-16 rounded" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
