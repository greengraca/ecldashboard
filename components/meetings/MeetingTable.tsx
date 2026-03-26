"use client";

import type { MeetingAttendee, UserMapping } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

// 5 seat positions around the oval (top, right, bottom, left-top, left-bottom)
const SEAT_POSITIONS: { top: string; left: string; transform: string }[] = [
  { top: "-18px", left: "50%", transform: "translateX(-50%)" },
  { top: "50%", left: "calc(100% + 18px)", transform: "translateY(-50%)" },
  { top: "calc(100% + 18px)", left: "50%", transform: "translateX(-50%)" },
  { top: "28%", left: "-18px", transform: "translate(-50%, -50%)" },
  { top: "72%", left: "-18px", transform: "translate(-50%, -50%)" },
];

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
  const attendeeIds = new Set(attendees.map((a) => a.discord_id));

  // Map each seat to either a member (present or absent) or empty
  const seats = allMembers.map((member) => {
    const attendee = attendees.find((a) => a.discord_id === member.discord_id);
    return {
      member,
      present: !!attendee,
      color: attendee?.color || member.color,
    };
  });

  // Pad to 5 if fewer members
  while (seats.length < 5) {
    seats.push({ member: null as unknown as UserMapping, present: false, color: "amber" });
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div className="flex flex-col items-center">
        {/* Oval table */}
        <div
          style={{
            position: "relative",
            width: "200px",
            height: "280px",
            margin: "40px auto",
          }}
        >
          {/* Table surface */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%/40%",
              background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02))",
              border: "1.5px solid rgba(251,191,36,0.15)",
              boxShadow: "inset 0 2px 20px rgba(251,191,36,0.04)",
            }}
          />

          {/* Seats */}
          {seats.slice(0, 5).map((seat, i) => {
            const pos = SEAT_POSITIONS[i];
            const hexColor = COLOR_MAP[seat.color] || COLOR_MAP.amber;
            const initial = seat.member?.display_name?.charAt(0)?.toUpperCase() || "?";
            const name = seat.member?.display_name || "";

            return (
              <div
                key={seat.member?.discord_id || `empty-${i}`}
                style={{
                  position: "absolute",
                  ...pos,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  opacity: seat.present ? 1 : 0.35,
                }}
              >
                {/* Avatar circle */}
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
                    background: seat.present
                      ? `rgba(${hexToRgb(hexColor)}, 0.15)`
                      : "transparent",
                    border: seat.present
                      ? `2px solid ${hexColor}`
                      : "2px dashed var(--text-muted)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {initial}
                </div>
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
              </div>
            );
          })}
        </div>

        {/* CTA below table */}
        {!isActive && !attendeeIds.size && onStartSession && (
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
