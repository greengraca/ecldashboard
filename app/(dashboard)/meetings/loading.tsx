const surfaceCard = {
  background: "var(--surface-gradient)",
  backdropFilter: "var(--surface-blur)",
  border: "1.5px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "var(--surface-shadow)",
};

export default function MeetingsLoading() {
  return (
    <div className="animate-pulse">
      {/* Header — icon badge + title + subtitle, matches mb-8 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" />
          <div>
            <div className="skeleton h-7 w-36 rounded" />
            <div className="skeleton h-4 w-56 rounded mt-1" />
          </div>
        </div>
      </div>

      {/* Lobby layout — grid-cols-1 md:grid-cols-[300px_1fr] gap-6 */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-[300px_1fr]">

        {/* Left: MeetingTable — rounded-2xl with oval table visual */}
        <div className="rounded-2xl p-4 sm:p-8" style={surfaceCard}>
          {/* Oval table placeholder — 320:380 aspect ratio, max-w-320 */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "320px",
              aspectRatio: "320 / 380",
              margin: "0 auto",
            }}
          >
            {/* Table ellipse */}
            <div
              className="skeleton"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "40%",
                height: "47%",
                borderRadius: "50%",
              }}
            />
            {/* Seat dots distributed around the ellipse — 5 positions */}
            {[
              { top: "2%", left: "50%", transform: "translateX(-50%)" },
              { top: "22%", left: "88%" },
              { top: "65%", left: "82%" },
              { top: "65%", left: "8%" },
              { top: "22%", left: "2%" },
            ].map((pos, i) => (
              <div
                key={i}
                className="skeleton rounded-full"
                style={{
                  position: "absolute",
                  width: "32px",
                  height: "32px",
                  ...pos,
                }}
              />
            ))}
          </div>

          {/* Start/Join button below the table */}
          <div className="flex justify-center mt-4">
            <div className="skeleton h-9 w-36 rounded-lg" />
          </div>
        </div>

        {/* Right: MeetingHistory — rounded-2xl with header + list rows */}
        <div className="rounded-2xl" style={surfaceCard}>
          {/* Header */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="skeleton h-3 w-24 rounded" />
          </div>

          {/* History rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center gap-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {/* Meeting number */}
              <div className="skeleton h-4 w-10 rounded flex-shrink-0" />
              {/* Date + title */}
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-4 w-36 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
              {/* Avatar dots */}
              <div className="flex -space-x-1 flex-shrink-0">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="skeleton w-6 h-6 rounded-full" />
                ))}
              </div>
              {/* Duration badge */}
              <div className="skeleton h-5 w-12 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
