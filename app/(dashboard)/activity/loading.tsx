const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

export default function ActivityLoading() {
  return (
    <div className="animate-pulse">
      {/* Header — icon badge + title + subtitle, matches page mb-8 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" />
          <div>
            <div className="skeleton h-7 w-32 rounded" />
            <div className="skeleton h-4 w-64 rounded mt-1" />
          </div>
        </div>
      </div>

      {/* Outer card wrapper — matches the rounded-xl overflow-hidden container */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.015)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Filter bar — p-4 border-b */}
        <div
          className="p-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Action select */}
            <div className="skeleton h-9 w-36 rounded-lg" />
            {/* Entity type select */}
            <div className="skeleton h-9 w-36 rounded-lg" />
            {/* From date input */}
            <div className="skeleton h-9 w-36 rounded-lg" />
            {/* To date input */}
            <div className="skeleton h-9 w-36 rounded-lg" />
          </div>
        </div>

        {/* Activity table — p-4 */}
        <div className="p-4">
          {/* Table header row */}
          <div
            className="flex gap-4 px-2 py-2 mb-1"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
            <div className="flex-1 skeleton h-3 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          {/* 10 table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-2 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="skeleton h-4 w-28 rounded flex-shrink-0" />
              <div className="skeleton h-5 w-16 rounded-full flex-shrink-0" />
              <div className="flex-1 skeleton h-4 rounded" />
              <div className="skeleton h-3 w-20 rounded flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Pagination — matches flex justify-between px-4 py-3 border-t */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="skeleton h-3 w-44 rounded" />
          <div className="flex items-center gap-2">
            <div className="skeleton h-8 w-20 rounded-lg" />
            <div className="skeleton h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Heroku Logs accordion — mt-6 */}
      <div
        className="mt-6 rounded-xl px-4 py-3 flex items-center gap-3"
        style={surfaceCard}
      >
        <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
        <div className="skeleton h-4 w-48 rounded flex-1" />
        <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
      </div>

      {/* Dashboard Error Log accordion — mt-4 */}
      <div
        className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
        style={surfaceCard}
      >
        <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
        <div className="skeleton h-4 w-48 rounded flex-1" />
        <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
      </div>
    </div>
  );
}
