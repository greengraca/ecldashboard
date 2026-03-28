const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

export default function FinanceLoading() {
  return (
    <div className="animate-pulse">
      {/* Header — title+subtitle left, MonthPicker right (no Add button in skeleton since it's inside the section) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-8 w-32 rounded mb-2" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* Category Breakdown chart (single column — subscription income card only shows if data loaded) */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="rounded-xl p-5 sm:p-6" style={surfaceCard}>
          <div className="skeleton h-4 w-48 rounded mb-4" />
          <div className="skeleton h-52 w-full rounded-lg" />
        </div>
      </div>

      {/* Balance Cards */}
      <div className="mb-8">
        <div className="rounded-xl p-5 sm:p-6" style={surfaceCard}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton h-3 w-20 rounded mb-2" />
                <div className="skeleton h-7 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton h-7 w-16 rounded-lg" />
        </div>
        <div className="rounded-xl overflow-hidden" style={surfaceCard}>
          {/* Table header */}
          <div
            className="flex items-center gap-4 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="skeleton h-3 w-20 rounded flex-shrink-0" />
            <div className="skeleton h-3 rounded" style={{ width: "35%" }} />
            <div className="skeleton h-3 w-16 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-14 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-16 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-10 rounded flex-shrink-0" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <div className="skeleton h-4 w-20 rounded flex-shrink-0" />
              <div className="flex-1 skeleton h-4 rounded" />
              <div className="skeleton h-5 w-16 rounded-full flex-shrink-0" />
              <div className="skeleton h-4 w-16 rounded flex-shrink-0" />
              <div className="skeleton h-6 w-12 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Costs section */}
      <div className="mb-8">
        <div className="skeleton h-3 w-28 rounded mb-4" />
        <div className="rounded-xl overflow-hidden" style={surfaceCard}>
          <div
            className="flex items-center gap-4 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="skeleton h-3 rounded" style={{ width: "40%" }} />
            <div className="skeleton h-3 w-16 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-20 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-12 rounded flex-shrink-0" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <div className="flex-1 skeleton h-4 rounded" />
              <div className="skeleton h-5 w-16 rounded-full flex-shrink-0" />
              <div className="skeleton h-4 w-20 rounded flex-shrink-0" />
              <div className="skeleton h-6 w-14 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Team Split section */}
      <div className="mb-8">
        <div className="skeleton h-3 w-24 rounded mb-4" />
        <div className="rounded-xl p-5 sm:p-6" style={surfaceCard}>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-2"
                style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined }}
              >
                <div className="skeleton h-4 w-24 rounded" />
                <div className="flex-1 skeleton h-4 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
