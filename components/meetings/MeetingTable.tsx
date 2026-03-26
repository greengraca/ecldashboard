"use client";

import { Sensitive } from "@/components/dashboard/sensitive";
import type { MeetingAttendee, UserMapping } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

// Seats are distributed at equal arc-length intervals around the elliptical table,
// then offset outward along the ellipse normal so every seat is the same
// perpendicular distance from the table edge.
function getSeatPositions(count: number) {
  const containerW = 320;
  const containerH = 380;
  const tableA = 65;  // table horizontal semi-axis
  const tableB = 90;  // table vertical semi-axis
  const gap = 45;     // perpendicular distance from table edge to seat center
  const startAngle = -Math.PI / 2; // first seat at top

  // Build cumulative arc-length table (3600 samples = 0.1° resolution)
  const N = 3600;
  const step = (2 * Math.PI) / N;
  const cumArc: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const t = startAngle + i * step;
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    // ds/dt = √(a²sin²t + b²cos²t)
    const ds = Math.sqrt(tableA * tableA * sinT * sinT + tableB * tableB * cosT * cosT) * step;
    cumArc.push(cumArc[i - 1] + ds);
  }
  const totalArc = cumArc[N];

  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const targetArc = (i / count) * totalArc;
    // Binary search for the sample index closest to targetArc
    let lo = 0, hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumArc[mid] < targetArc) lo = mid + 1;
      else hi = mid;
    }
    const t = startAngle + lo * step;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    // Point on table edge
    const ex = tableA * cosT;
    const ey = tableB * sinT;
    // Outward normal of ellipse: ∝ (cosθ/a, sinθ/b)
    const nx = cosT / tableA;
    const ny = sinT / tableB;
    const nlen = Math.sqrt(nx * nx + ny * ny);
    // Seat = edge + gap along outward normal
    const sx = ex + (nx / nlen) * gap;
    const sy = ey + (ny / nlen) * gap;
    positions.push({
      x: 50 + (sx / containerW) * 100,
      y: 50 + (sy / containerH) * 100,
    });
  }
  return positions;
}

interface MeetingTableProps {
  attendees: MeetingAttendee[];
  allMembers: UserMapping[];
  isActive: boolean;
  onStartSession?: () => void;
  onJoinSession?: () => void;
}

export default function MeetingTable({
  attendees,
  allMembers,
  isActive,
  onStartSession,
  onJoinSession,
}: MeetingTableProps) {
  const mappedIds = new Set(allMembers.map((m) => m.discord_id));

  // Start with mapped members
  const seats = allMembers.map((member) => {
    const attendee = attendees.find((a) => a.discord_id === member.discord_id);
    return {
      id: member.discord_id,
      name: member.display_name,
      present: !!attendee,
      color: (attendee?.color || member.color) as string,
      avatar_url: member.avatar_url || attendee?.avatar_url || null,
    };
  });

  // Add attendees who aren't in user mappings (e.g. not yet configured)
  for (const attendee of attendees) {
    if (!mappedIds.has(attendee.discord_id)) {
      seats.push({
        id: attendee.discord_id,
        name: attendee.display_name,
        present: true,
        color: attendee.color || "amber",
        avatar_url: attendee.avatar_url || null,
      });
    }
  }

  // Pad to 5 if fewer seats
  while (seats.length < 5) {
    seats.push({ id: `empty-${seats.length}`, name: "", present: false, color: "amber", avatar_url: null });
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
        overflow: "visible",
        height: isActive ? "100%" : undefined,
      }}
    >
      <div className="flex flex-col items-center justify-center" style={{ minHeight: isActive ? "100%" : undefined }}>
        {/* Oval table with seats */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "320px",
            aspectRatio: "320 / 380",
            margin: "0 auto",
          }}
        >
          {/* Table surface (centered within the larger container) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "130px",
              height: "180px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02))",
              border: "1.5px solid rgba(251,191,36,0.15)",
              boxShadow: "inset 0 2px 20px rgba(251,191,36,0.04)",
            }}
          />

          {/* Seats — evenly distributed around the oval */}
          {(() => {
            const seatCount = Math.max(seats.length, 5);
            const positions = getSeatPositions(Math.min(seatCount, 5));
            return seats.slice(0, 5).map((seat, i) => {
              const pos = positions[i];
              const hexColor = COLOR_MAP[seat.color] || COLOR_MAP.amber;
              const initial = seat.name ? seat.name.charAt(0).toUpperCase() : "?";
              const name = seat.name;

              return (
                <div
                  key={seat.id}
                  style={{
                    position: "absolute",
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    opacity: seat.present ? 1 : 0.35,
                  }}
                >
                  {/* Avatar circle */}
                  <Sensitive placeholder="">
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: seat.present ? hexColor : "var(--text-muted)",
                        background: seat.present && seat.avatar_url
                          ? `url(${seat.avatar_url}) center/cover`
                          : seat.present
                          ? `rgba(${hexToRgb(hexColor)}, 0.15)`
                          : "transparent",
                        border: seat.present
                          ? `2px solid ${hexColor}`
                          : "2px dashed var(--text-muted)",
                        transition: "all 0.3s ease",
                        overflow: "hidden",
                      }}
                    >
                      {(!seat.present || !seat.avatar_url) && initial}
                    </div>
                  </Sensitive>
                  {/* Status dot */}
                  {seat.present && (
                    <div
                      style={{
                        position: "absolute",
                        top: "0px",
                        right: "0px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "var(--success)",
                        border: "2px solid var(--bg-page)",
                      }}
                    />
                  )}
                  {/* Name */}
                  <Sensitive placeholder="••••">
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        color: seat.present ? "var(--text-secondary)" : "var(--text-muted)",
                        whiteSpace: "nowrap",
                        maxWidth: "70px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {seat.present ? name : (name || "absent")}
                    </span>
                  </Sensitive>
                </div>
              );
            });
          })()}
        </div>

        {/* CTA below table */}
        {!isActive && attendees.length === 0 && onStartSession && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Take a seat
            </p>
            <button
              onClick={onStartSession}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: "rgba(251,191,36,0.15)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}
            >
              Start Session
            </button>
          </div>
        )}

        {isActive && onJoinSession && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
              }}
            >
              There&apos;s a meeting in progress
            </p>
            <button
              onClick={onJoinSession}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: "rgba(251,191,36,0.15)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}
            >
              Join Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
