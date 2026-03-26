"use client";

import { Check, Pencil, X } from "lucide-react";
import type { MeetingItem } from "@/lib/types";

const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  task: { label: "Task", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  deadline: { label: "Deadline", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  prize: { label: "Prize", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
};

interface MeetingItemCardProps {
  item: MeetingItem;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function MeetingItemCard({
  item,
  onAccept,
  onDismiss,
  onEdit,
}: MeetingItemCardProps) {
  const id = String(item._id);
  const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.task;
  const isDone = item.status !== "pending";

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border)",
        opacity: isDone ? 0.5 : 1,
      }}
    >
      {/* Top row: type badge + status */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="px-2 py-0.5 rounded-md text-xs font-semibold"
          style={{
            background: typeStyle.bg,
            color: typeStyle.color,
          }}
        >
          {typeStyle.label}
        </span>
        {item.status !== "pending" && (
          <span
            className="text-xs"
            style={{
              color: item.status === "accepted"
                ? "var(--success)"
                : "var(--text-muted)",
            }}
          >
            {item.status === "accepted" ? "Accepted" : "Dismissed"}
          </span>
        )}
      </div>

      {/* Title */}
      <p
        className="text-sm font-medium mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {item.title}
      </p>

      {/* Metadata line */}
      {item.metadata && (
        <div
          className="flex items-center gap-3 mb-2 flex-wrap"
          style={{ fontSize: "11px", color: "var(--text-muted)" }}
        >
          {item.metadata.assignee_name && (
            <span>Assignee: {item.metadata.assignee_name}</span>
          )}
          {(item.metadata.due_date || item.metadata.date) && (
            <span>Date: {item.metadata.due_date || item.metadata.date}</span>
          )}
          {item.metadata.budget !== undefined && (
            <span>Budget: {item.metadata.budget}</span>
          )}
        </div>
      )}

      {/* Source quote */}
      {item.source_quote && (
        <p
          className="text-xs italic pl-3 mb-3"
          style={{
            color: "var(--text-muted)",
            borderLeft: "2px solid var(--border)",
          }}
        >
          &ldquo;{item.source_quote}&rdquo;
        </p>
      )}

      {/* Action buttons */}
      {item.status === "pending" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAccept(id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(52,211,153,0.12)",
              color: "var(--success)",
              border: "1px solid rgba(52,211,153,0.25)",
            }}
          >
            <Check className="w-3 h-3" />
            Accept
          </button>
          <button
            onClick={() => onEdit(id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(251,191,36,0.12)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
            }}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => onDismiss(id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
