const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="mb-8">
        <div className="skeleton h-8 w-40 rounded mb-2" />
        <div className="skeleton h-4 w-56 rounded" />
      </div>

      {/* 4 stat cards — grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-full p-3 sm:p-5 rounded-xl" style={surfaceCard}>
            <div className="flex items-start justify-between mb-1.5 sm:mb-3">
              <div className="skeleton h-3 w-20 sm:w-24 rounded" />
              <div className="skeleton w-8 h-8 rounded-lg hidden sm:block" />
            </div>
            <div className="skeleton h-5 sm:h-7 w-16 sm:w-20 rounded mb-1" />
            <div className="skeleton h-3 w-14 sm:w-16 rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Calendar + Tasks — lg:grid-cols-4, calendar takes 3, tasks takes 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <div className="lg:col-span-3 rounded-xl p-6" style={surfaceCard}>
          <div className="skeleton h-4 w-32 rounded mb-4" />
          <div className="grid grid-cols-7 gap-1 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton h-3 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="skeleton h-9 rounded" />
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

      {/* Finance Overview section */}
      <div className="mb-8">
        <div className="rounded-xl p-5 sm:p-6" style={surfaceCard}>
          <div className="flex items-center gap-2 mb-4">
            <div className="skeleton w-4 h-4 rounded" />
            <div className="skeleton h-4 w-40 rounded" />
          </div>
          <div className="skeleton h-48 w-full rounded-lg" />
        </div>
      </div>

      {/* Profit Split Table section */}
      <div className="mb-8">
        <div className="rounded-xl p-5 sm:p-6" style={surfaceCard}>
          <div className="flex items-center gap-2 mb-4">
            <div className="skeleton h-4 w-36 rounded" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <div className="skeleton h-3 w-24 rounded" />
                <div className="flex-1 skeleton h-3 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-col bottom grid: Recent Activity + Pending Reimbursements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="p-4 sm:p-6 rounded-xl" style={surfaceCard}>
          <div className="skeleton h-3 w-32 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2"
                style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined }}
              >
                <div className="skeleton w-1.5 h-1.5 rounded-full flex-shrink-0" />
                <div className="flex-1 skeleton h-4 rounded" />
                <div className="skeleton h-3 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Pending Reimbursements */}
        <div className="p-4 sm:p-6 rounded-xl" style={surfaceCard}>
          <div className="flex items-center justify-between mb-4">
            <div className="skeleton h-3 w-48 rounded" />
            <div className="skeleton w-7 h-7 rounded-lg" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2"
                style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined }}
              >
                <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="skeleton h-4 w-full rounded mb-1" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
                <div className="skeleton h-4 w-14 rounded flex-shrink-0" />
                <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
