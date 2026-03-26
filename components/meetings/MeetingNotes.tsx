"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import type { MeetingNote } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

interface MeetingNotesProps {
  meetingId: string;
  notes: MeetingNote[];
  onNoteAdded: () => void;
}

export default function MeetingNotes({
  meetingId,
  notes,
  onNoteAdded,
}: MeetingNotesProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(notes.length);

  // Auto-scroll to bottom on new notes
  useEffect(() => {
    if (notes.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = notes.length;
  }, [notes.length]);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setContent("");
        onNoteAdded();
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function formatTime(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
        height: "100%",
        minHeight: "400px",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h3
          className="text-sm font-semibold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "11px",
          }}
        >
          Notes
        </h3>
      </div>

      {/* Notes list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: "calc(100vh - 360px)" }}
      >
        {notes.length === 0 && (
          <p
            className="text-center py-8"
            style={{ color: "var(--text-muted)", fontSize: "13px" }}
          >
            No notes yet. Start the conversation.
          </p>
        )}

        {notes.map((note) => {
          const color = COLOR_MAP[note.author_color] || COLOR_MAP.amber;
          return (
            <div
              key={String(note._id)}
              className="pl-3"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold"
                  style={{ color }}
                >
                  {note.author_name}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatTime(note.timestamp)}
                </span>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {note.content}
              </p>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div
        className="p-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note..."
            rows={1}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--bg-page)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || sending}
            className="p-2 rounded-lg transition-all"
            style={{
              background: content.trim()
                ? "rgba(251,191,36,0.15)"
                : "transparent",
              color: content.trim()
                ? "var(--accent)"
                : "var(--text-muted)",
              border: content.trim()
                ? "1px solid var(--accent-border)"
                : "1px solid var(--border)",
              opacity: sending ? 0.5 : 1,
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
