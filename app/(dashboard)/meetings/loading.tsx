const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

const tableRow = {
  borderRadius: 0,
  borderTop: "1px solid var(--border-subtle)",
};

export default function MeetingsLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="skeleton h-7 w-36 rounded" />
        </div>
        <div className="skeleton h-4 w-56 rounded mt-2" />
      </div>

      {/* 2-column layout: list + content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: meeting list */}
        <div className="lg:col-span-1 rounded-xl overflow-hidden" style={surfaceCard}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="skeleton h-4 w-28 rounded" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3" style={tableRow}>
              <div className="skeleton w-2 h-2 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Right: meeting content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active meeting / lobby panel */}
          <div className="rounded-xl p-5" style={surfaceCard}>
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="skeleton h-5 w-40 rounded" />
                <div className="skeleton h-3 w-28 rounded" />
              </div>
              <div className="skeleton h-8 w-24 rounded-lg flex-shrink-0" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2" style={tableRow}>
                  <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />
                  <div className="flex-1 skeleton h-4 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Notes / history area */}
          <div className="rounded-xl p-5" style={surfaceCard}>
            <div className="skeleton h-4 w-24 rounded mb-4" />
            <div className="skeleton h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
