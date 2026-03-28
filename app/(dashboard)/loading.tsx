const surfaceCard = {
  background: "var(--surface-gradient)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
};

const tableRow = {
  borderRadius: 0,
  borderTop: "1px solid var(--border-subtle)",
};

export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="mb-8">
        <div className="skeleton h-7 w-40 rounded mb-2" />
        <div className="skeleton h-4 w-56 rounded" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-xl" style={surfaceCard}>
            <div className="flex items-start justify-between mb-3">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton w-8 h-8 rounded-lg hidden sm:block" />
            </div>
            <div className="skeleton h-7 w-20 rounded mb-1" />
            <div className="skeleton h-3 w-16 rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Calendar + Tasks row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <div className="lg:col-span-3 rounded-xl p-6" style={surfaceCard}>
          <div className="skeleton h-4 w-32 rounded mb-4" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="skeleton h-8 rounded" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1 rounded-xl p-6" style={surfaceCard}>
          <div className="skeleton h-4 w-20 rounded mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-8 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* 2 bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-6 rounded-xl" style={surfaceCard}>
            <div className="skeleton h-4 w-36 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2" style={tableRow}>
                  <div className="skeleton w-2 h-2 rounded-full flex-shrink-0" />
                  <div className="flex-1 skeleton h-4 rounded" />
                  <div className="skeleton h-3 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
