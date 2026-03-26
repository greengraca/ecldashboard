"use client";

import { Clock, Users, FileText, CheckCircle, Trash2 } from "lucide-react";
import { Sensitive } from "@/components/dashboard/sensitive";
import MeetingItemCard from "./MeetingItemCard";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Meeting, MeetingItem, UserMapping } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

interface DetectionPanelProps {
  meeting: Meeting;
  items: MeetingItem[];
  onItemUpdate: (id: string, status: string) => void;
  onConfirm: () => void;
  onSaveAsDoc: () => void;
  onDiscard: () => void;
}

function formatDuration(startedAt: string, endedAt?: string): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const start = new Date(startedAt).getTime();
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

export default function DetectionPanel({
  meeting,
  items,
  onItemUpdate,
  onConfirm,
  onSaveAsDoc,
  onDiscard,
}: DetectionPanelProps) {
  // Enrich attendees with avatars from user mappings (in case stored data lacks avatar_url)
  const { data: mappingsData } = useSWR<{ data: UserMapping[] }>("/api/user-mapping", fetcher);
  const mappings = mappingsData?.data || [];
  const enrichedAttendees = meeting.attendees.map((a) => {
    if (a.avatar_url) return a;
    const mapping = mappings.find((m) => m.discord_id === a.discord_id);
    return { ...a, avatar_url: mapping?.avatar_url || null };
  });

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
      {/* Summary bar */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            Meeting #{meeting.number}
          </span>
          <span
            style={{ fontSize: "12px", color: "var(--text-muted)" }}
          >
            {formatDate(meeting.date)}
          </span>
          <span
            className="flex items-center gap-1"
            style={{ fontSize: "12px", color: "var(--text-muted)" }}
          >
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(meeting.started_at, meeting.ended_at)}
          </span>
        </div>

        {/* Attendee avatars */}
        <div className="flex items-center gap-2">
          <Users
            className="w-3.5 h-3.5"
            style={{ color: "var(--text-muted)" }}
          />
          <div className="flex">
            {enrichedAttendees.map((a, i) => {
              const color = COLOR_MAP[a.color] || COLOR_MAP.amber;
              return (
                <Sensitive key={a.discord_id} placeholder="">
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 700,
                      color,
                      background: a.avatar_url
                        ? `url(${a.avatar_url}) center/cover`
                        : `rgba(${hexToRgb(color)}, 0.15)`,
                      border: `1.5px solid ${color}`,
                      marginLeft: i > 0 ? "-5px" : "0",
                      zIndex: 5 - i,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {!a.avatar_url && a.display_name.charAt(0).toUpperCase()}
                  </div>
                </Sensitive>
              );
            })}
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="p-5 space-y-3">
        {items.length === 0 && (
          <p
            className="text-center py-8"
            style={{ color: "var(--text-muted)", fontSize: "13px" }}
          >
            No items detected. You can still save the meeting notes as a document.
          </p>
        )}

        {items.map((item) => (
          <MeetingItemCard
            key={String(item._id)}
            item={item}
            onAccept={(id) => onItemUpdate(id, "accepted")}
            onDismiss={(id) => onItemUpdate(id, "dismissed")}
            onEdit={(id) => onItemUpdate(id, "pending")}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div
        className="px-5 py-4 border-t flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={onDiscard}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "rgba(252,165,165,0.08)",
            color: "var(--error)",
            border: "1px solid rgba(252,165,165,0.2)",
          }}
        >
          <Trash2 className="w-4 h-4" />
          Discard Meeting
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onSaveAsDoc}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <FileText className="w-4 h-4" />
            Save as Document Only
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "rgba(52,211,153,0.12)",
              color: "var(--success)",
              border: "1px solid rgba(52,211,153,0.25)",
            }}
          >
            <CheckCircle className="w-4 h-4" />
            Confirm & Create
          </button>
        </div>
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
