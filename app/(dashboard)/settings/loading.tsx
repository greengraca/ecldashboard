const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

function SectionSkeleton({ rows, hasActions }: { rows?: number; hasActions?: boolean }) {
  return (
    <div className="rounded-xl overflow-hidden" style={surfaceCard}>
      {/* Section header */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      {/* Body */}
      <div className="px-5 py-2">
        {hasActions ? (
          <div className="flex flex-wrap gap-3 py-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-9 w-40 rounded-lg" />
            ))}
          </div>
        ) : (
          Array.from({ length: rows ?? 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: i < (rows ?? 3) - 1 ? "1px solid var(--border-subtle)" : undefined }}
            >
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-4 w-36 rounded" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      {/* Header — icon + title block */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" />
          <div>
            <div className="skeleton h-8 w-28 rounded mb-1" />
            <div className="skeleton h-4 w-64 rounded" />
          </div>
        </div>
      </div>

      {/* Two-column grid matching lg:grid-cols-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="grid gap-6 content-start">
          {/* User Profile — avatar + name row */}
          <div className="rounded-xl overflow-hidden" style={surfaceCard}>
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
              <div className="skeleton h-3 w-28 rounded" />
            </div>
            <div className="px-5 py-2">
              <div className="flex items-center gap-4 py-3">
                <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                <div>
                  <div className="skeleton h-4 w-32 rounded mb-1.5" />
                  <div className="skeleton h-3 w-44 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Privacy — toggle row */}
          <div className="rounded-xl overflow-hidden" style={surfaceCard}>
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
            <div className="px-5 py-2">
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="skeleton h-4 w-36 rounded mb-1.5" />
                  <div className="skeleton h-3 w-56 rounded" />
                </div>
                <div className="skeleton w-11 h-6 rounded-full flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Subscription Rates — multiple rows */}
          <SectionSkeleton rows={4} />

          {/* Data & Caches — action buttons */}
          <SectionSkeleton hasActions />
        </div>

        {/* Right column */}
        <div className="grid gap-6 content-start">
          {/* Dashboard Info — 4 rows */}
          <SectionSkeleton rows={4} />

          {/* Environment — 4 rows */}
          <SectionSkeleton rows={4} />
        </div>

        {/* Team Members — spans full width via mb-8 div */}
        <div className="mb-8">
          <div className="rounded-xl overflow-hidden" style={surfaceCard}>
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
              <div className="skeleton h-3 w-28 rounded" />
            </div>
            <div className="px-5 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: i < 2 ? "1px solid var(--border-subtle)" : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="skeleton h-4 w-32 rounded" />
                  </div>
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
