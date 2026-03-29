"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { TaskpadTask, UserMapping } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

export default function TasksWidget() {
  const { data: tasksData, mutate: mutateTasks } = useSWR<{ data: TaskpadTask[] }>(
    "/api/taskpad",
    fetcher,
    { refreshInterval: 10000 }
  );
  const tasks = tasksData?.data;
  const { data: statusData } = useSWR<{ data: { connected: boolean } }>(
    "/api/taskpad/status",
    fetcher,
    { refreshInterval: 60000 }
  );
  const status = statusData?.data;
  const { data: mappingsData } = useSWR<{ data: UserMapping[] }>(
    "/api/user-mapping",
    fetcher
  );
  const mappings = mappingsData?.data;

  const [showInput, setShowInput] = useState(false);
  const [newText, setNewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const connected = status?.connected ?? false;

  const getMappingForUid = useCallback(
    (firebaseUid: string): UserMapping | undefined => {
      if (!mappings || !Array.isArray(mappings)) return undefined;
      return mappings.find((m) => m.firebase_uid === firebaseUid);
    },
    [mappings]
  );

  const handleToggle = useCallback(
    async (task: TaskpadTask) => {
      // Optimistic update
      mutateTasks(
        (prev) =>
          prev ? { data: prev.data.map((t) =>
            t.id === task.id ? { ...t, done: !t.done } : t
          ) } : prev,
        false
      );

      await fetch(`/api/taskpad/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });

      mutateTasks();
    },
    [mutateTasks]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      mutateTasks(
        (prev) => prev ? { data: prev.data.filter((t) => t.id !== taskId) } : prev,
        false
      );

      await fetch(`/api/taskpad/${taskId}`, { method: "DELETE" });
      mutateTasks();
    },
    [mutateTasks]
  );

  const handleAdd = useCallback(async () => {
    const text = newText.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    try {
      await fetch("/api/taskpad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setNewText("");
      setShowInput(false);
      mutateTasks();
    } finally {
      setSubmitting(false);
    }
  }, [newText, submitting, mutateTasks]);

  const handleClearDone = useCallback(async () => {
    const doneTasks = tasks?.filter((t) => t.done) || [];
    if (doneTasks.length === 0) return;

    mutateTasks(
      (prev) => prev ? { data: prev.data.filter((t) => !t.done) } : prev,
      false
    );

    await Promise.all(
      doneTasks.map((t) =>
        fetch(`/api/taskpad/${t.id}`, { method: "DELETE" })
      )
    );
    mutateTasks();
  }, [tasks, mutateTasks]);

  const hasDoneTasks = tasks?.some((t) => t.done) ?? false;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      } else if (e.key === "Escape") {
        setShowInput(false);
        setNewText("");
      }
    },
    [handleAdd]
  );

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col h-full group/tasks"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
        borderRadius: "12px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          Tasks
        </span>
        <div className="flex items-center gap-3">
          {hasDoneTasks && (
            <button
              onClick={handleClearDone}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              Clear done
            </button>
          )}
          <span
            className="flex items-center gap-1.5 text-[10px]"
            style={{
              fontFamily: "var(--font-mono)",
              color: connected ? "var(--success)" : "var(--text-tertiary)",
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: connected
                  ? "var(--success)"
                  : "var(--text-tertiary)",
                animation: connected ? "pulseDot 2s ease-in-out infinite" : "none",
              }}
            />
            {connected ? "Synced" : "Offline"}
          </span>
        </div>
      </div>

      {/* Task list */}
      <div
        className="overflow-y-auto px-2 py-1 flex-1 min-h-0"
      >
        {!tasks ? (
          // Loading skeleton
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 rounded skeleton"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="py-8 text-center text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            No tasks yet
          </div>
        ) : (
          tasks.map((task) => {
            const mapping = getMappingForUid(task.createdByUid);
            const assigneeColor = mapping?.color
              ? COLOR_MAP[mapping.color] || "var(--text-muted)"
              : "var(--text-muted)";

            return (
              <div
                key={task.id}
                className="group flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors"
                style={{
                  opacity: task.done ? 0.45 : 1,
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(task)}
                  className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-sm transition-all duration-150 flex items-center justify-center"
                  style={{
                    border: task.done
                      ? "1.5px solid var(--accent)"
                      : "1.5px solid rgba(255, 255, 255, 0.2)",
                    background: task.done
                      ? "rgba(251, 191, 36, 0.2)"
                      : "transparent",
                  }}
                >
                  {task.done && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                    >
                      <path
                        d="M2 5L4.5 7.5L8 3"
                        stroke="var(--accent)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs leading-snug break-words"
                    style={{
                      color: "var(--text-primary)",
                      textDecoration: task.done ? "line-through" : "none",
                    }}
                  >
                    {task.text}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {mapping && (
                      <span
                        className="text-[10px]"
                        style={{ color: assigneeColor }}
                      >
                        {mapping.display_name}
                      </span>
                    )}
                    {task.source_meeting_number != null && (
                      <span
                        className="text-[10px]"
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        from meeting #{task.source_meeting_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(task.id)}
                  className="mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add task — visible on hover or when input is open */}
      <div
        className={`px-3 transition-all duration-150 ${showInput ? "py-2" : "py-0 max-h-0 group-hover/tasks:py-2 group-hover/tasks:max-h-20"}`}
        style={{
          borderTop: showInput ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
          overflow: "hidden",
        }}
      >
        {showInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New task..."
              autoFocus
              disabled={submitting}
              className="flex-1 text-xs px-2 py-1.5 rounded-md outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={submitting || !newText.trim()}
              className="text-[10px] font-medium px-2 py-1.5 rounded-md transition-colors"
              style={{
                background: "rgba(251, 191, 36, 0.15)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
                opacity: submitting || !newText.trim() ? 0.5 : 1,
              }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1.5 w-full py-1.5 rounded-md text-xs transition-colors"
            style={{
              color: "var(--text-muted)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              background: "transparent",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            <Plus size={12} />
            Add task
          </button>
        )}
      </div>

      {/* Pulse animation */}
      <style jsx>{`
        @keyframes pulseDot {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
