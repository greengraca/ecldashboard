"use client";

import { Loader2 } from "lucide-react";
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
  if (count === 0) return [];

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
  allMembers?: UserMapping[];
  isActive: boolean;
  isInRoom: boolean;
  isLoading?: boolean;
  onStartSession?: () => void;
  onJoinSession?: () => void;
}

const GHOST_SEATS = [
  { key: "g1", initial: "G", name: "Graça" },
  { key: "g2", initial: "K", name: "Kakah" },
  { key: "g3", initial: "R", name: "Ruka" },
  { key: "g4", initial: "R", name: "Rodrigo" },
  { key: "g5", initial: "B", name: "Bezugas" },
];

export default function MeetingTable({
  attendees,
  allMembers,
  isActive,
  isInRoom,
  isLoading,
  onStartSession,
  onJoinSession,
}: MeetingTableProps) {
  // Ghost mode: no active session, show 5 hardcoded silhouettes
  const showGhosts = !isActive && !isInRoom && attendees.length === 0;
  const seatCount = showGhosts ? GHOST_SEATS.length : attendees.length;
  const positions = getSeatPositions(seatCount);

  return (
    <div
      className="rounded-2xl p-4 sm:p-8"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
        overflow: "visible",
      }}
    >
      <div className="flex flex-col items-center justify-center">
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
          {/* LIVE badge — top-right corner, shown in lobby when session is active */}
          {isActive && !isInRoom && (
            <div
              style={{
                position: "absolute",
                top: "0",
                right: "0",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "12px",
                background: "rgba(239,68,68,0.12)",
                color: "#ef4444",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                zIndex: 10,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  animation: "meeting-pulse 1.5s ease-in-out infinite",
                }}
              />
              LIVE
              <style>{`@keyframes meeting-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
            </div>
          )}

          {/* Table surface (centered within the larger container) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "40.6%",
              height: "47.4%",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02))",
              border: "1.5px solid rgba(251,191,36,0.15)",
              boxShadow: "inset 0 2px 20px rgba(251,191,36,0.04)",
            }}
          />

          {/* Ghost seats — hardcoded team silhouettes when no session */}
          {showGhosts && GHOST_SEATS.map((ghost, i) => {
            const pos = positions[i];
            return (
              <div
                key={ghost.key}
                style={{
                  position: "absolute",
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  opacity: 0.25,
                }}
              >
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
                      color: "var(--text-muted)",
                      background: "transparent",
                      border: "2px dashed var(--text-muted)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {ghost.initial}
                  </div>
                </Sensitive>
                <Sensitive placeholder="••••">
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ghost.name}
                  </span>
                </Sensitive>
              </div>
            );
          })}

          {/* Active seats — only present attendees */}
          {!showGhosts && attendees.map((attendee, i) => {
            const pos = positions[i];
            const hexColor = COLOR_MAP[attendee.color] || COLOR_MAP.amber;
            const initial = attendee.display_name ? attendee.display_name.charAt(0).toUpperCase() : "?";
            const rgbColor = hexToRgb(hexColor);

            return (
              <div
                key={attendee.discord_id}
                style={{
                  position: "absolute",
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
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
                      color: hexColor,
                      background: attendee.avatar_url
                        ? `url(${attendee.avatar_url}) center/cover`
                        : `rgba(${rgbColor}, 0.15)`,
                      border: `2px solid ${hexColor}`,
                      transition: "all 0.3s ease",
                      overflow: "hidden",
                    }}
                  >
                    {!attendee.avatar_url && initial}
                  </div>
                </Sensitive>
                {/* Status dot */}
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
                {/* Name */}
                <Sensitive placeholder="••••">
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      maxWidth: "70px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {attendee.display_name}
                  </span>
                </Sensitive>
              </div>
            );
          })}
        </div>

        {/* CTA below table */}
        {!isActive && onStartSession && (
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
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: "rgba(251,191,36,0.15)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isLoading ? "Starting..." : "Start Session"}
            </button>
          </div>
        )}

        {isActive && !isInRoom && onJoinSession && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Session in progress
            </p>
            <button
              onClick={onJoinSession}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
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
