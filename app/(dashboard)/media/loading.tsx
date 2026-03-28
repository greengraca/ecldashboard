const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

export default function MediaLoading() {
  return (
    <div className="animate-pulse">
      {/* Header + month picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-7 w-28 rounded mb-2" />
          <div className="skeleton h-4 w-60 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* 2-column layout: template selector + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: template selector */}
        <div className="lg:col-span-1 rounded-xl p-4" style={surfaceCard}>
          <div className="skeleton h-4 w-32 rounded mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={surfaceCard}>
                <div className="skeleton w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: preview + editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Preview canvas */}
          <div className="rounded-xl overflow-hidden" style={surfaceCard}>
            <div className="p-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="skeleton h-4 w-28 rounded" />
            </div>
            {/* Story-ratio placeholder */}
            <div className="flex items-center justify-center p-6">
              <div className="skeleton rounded-xl" style={{ width: "260px", height: "460px" }} />
            </div>
          </div>

          {/* Editor fields */}
          <div className="rounded-xl p-5" style={surfaceCard}>
            <div className="skeleton h-4 w-24 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton h-3 w-20 rounded mb-1.5" />
                  <div className="skeleton h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
