"use client";

import { Clock, Users, Trash2 } from "lucide-react";
import { Sensitive } from "@/components/dashboard/sensitive";
import type { Meeting, UserMapping } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

interface MeetingHistoryProps {
  meetings: Meeting[];
  allMembers: UserMapping[];
  onSelectMeeting: (id: string) => void;
  onDeleteMeeting: (id: string) => void;
}

function formatDuration(startedAt: string, endedAt?: string): string {
  if (!endedAt) return "ongoing";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MeetingHistory({
  meetings,
  allMembers,
  onSelectMeeting,
  onDeleteMeeting,
}: MeetingHistoryProps) {
  const ended = meetings.filter((m) => m.status === "ended");

  // Enrich attendees with avatars from user mappings
  function enrichAvatar(attendee: Meeting["attendees"][0]) {
    if (attendee.avatar_url) return attendee;
    const mapping = allMembers.find((m) => m.discord_id === attendee.discord_id);
    return { ...attendee, avatar_url: mapping?.avatar_url || null };
  }

  return (
    <div
      className="rounded-2xl"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h3
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          Past Sessions
        </h3>
      </div>

      {/* List */}
      <div className="p-2">
        {ended.length === 0 && (
          <p
            className="text-center py-6"
            style={{ color: "var(--text-muted)", fontSize: "13px" }}
          >
            No past meetings yet
          </p>
        )}

        {ended.map((meeting) => (
          <button
            key={String(meeting._id)}
            onClick={() => onSelectMeeting(String(meeting._id))}
            className="w-full text-left px-3 py-3 rounded-lg transition-all mb-1"
            style={{
              background: "transparent",
              border: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--accent-dim)",
                  fontWeight: 600,
                }}
              >
                #{meeting.number}
              </span>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  {formatDate(meeting.date)}
                </span>
                <span
                  className="p-1 rounded transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMeeting(String(meeting._id));
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--error)";
                    e.currentTarget.style.background = "var(--error-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              </div>
            </div>

            <p
              className="text-sm mb-2 truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {meeting.title}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: "11px", color: "var(--text-muted)" }}
                >
                  <Clock className="w-3 h-3" />
                  {formatDuration(meeting.started_at, meeting.ended_at)}
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: "11px", color: "var(--text-muted)" }}
                >
                  <Users className="w-3 h-3" />
                  {meeting.attendees.length}
                </span>
              </div>

              {/* Stacked avatars */}
              <div className="flex" style={{ marginLeft: "auto" }}>
                {meeting.attendees.slice(0, 5).map((raw, i) => {
                  const attendee = enrichAvatar(raw);
                  const color = COLOR_MAP[attendee.color] || COLOR_MAP.amber;
                  return (
                    <Sensitive key={attendee.discord_id} placeholder="">
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "9px",
                          fontWeight: 700,
                          color,
                          background: attendee.avatar_url
                            ? `url(${attendee.avatar_url}) center/cover`
                            : `rgba(${hexToRgb(color)}, 0.15)`,
                          border: `1.5px solid ${color}`,
                          marginLeft: i > 0 ? "-6px" : "0",
                          zIndex: 5 - i,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {!attendee.avatar_url && attendee.display_name.charAt(0).toUpperCase()}
                      </div>
                    </Sensitive>
                  );
                })}
              </div>
            </div>
          </button>
        ))}
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
