"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users, Check, Link2 } from "lucide-react";
import { SensitiveBlock } from "@/components/dashboard/sensitive";
import { useSensitiveData } from "@/contexts/SensitiveDataContext";
import { fetcher } from "@/lib/fetcher";
import type { UserMapping } from "@/lib/types";

const COLORS: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function TeamMemberManager() {
  const { data, mutate } = useSWR<{ data: UserMapping[] }>(
    "/api/user-mapping",
    fetcher
  );
  const { hidden } = useSensitiveData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uidValue, setUidValue] = useState("");
  const [saving, setSaving] = useState(false);

  const mappings = data?.data || [];

  const startEdit = (m: UserMapping) => {
    setEditingId(String(m._id));
    setUidValue(m.firebase_uid || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setUidValue("");
  };

  const saveUid = async () => {
    if (!editingId || !uidValue.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/user-mapping/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebase_uid: uidValue.trim() }),
      });
      await mutate();
      cancelEdit();
    } catch (err) {
      console.error("Failed to save Firebase UID:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div
        className="px-5 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-primary)",
          }}
        >
          Team Members
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Link Firebase UID for Taskpad sync
        </span>
      </div>

      {hidden ? (
        <SensitiveBlock message="Team members hidden in privacy mode" height={120} />
      ) : (
      <div className="px-5 py-4">
        {mappings.length === 0 && (
          <p
            className="text-center py-4"
            style={{ color: "var(--text-muted)", fontSize: "13px" }}
          >
            No team members configured.
          </p>
        )}

        <div className="space-y-2">
          {mappings.map((m) => {
            const hex = COLORS[m.color] || COLORS.amber;
            const isEditing = editingId === String(m._id);
            const hasUid = !!m.firebase_uid;

            return (
              <div
                key={String(m._id)}
                className="rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: isEditing ? "1px solid var(--accent-border)" : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-3 py-2.5 px-3">
                  {/* Avatar */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: `rgba(${hexToRgb(hex)}, 0.15)`,
                      border: `2px solid ${hex}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: hex,
                      flexShrink: 0,
                    }}
                  >
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {m.display_name}
                    </div>
                    <div
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      @{m.discord_username}
                    </div>
                  </div>

                  {/* Firebase UID status */}
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(m)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                      style={{
                        background: hasUid ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)",
                        color: hasUid ? "var(--success)" : "var(--accent)",
                        border: hasUid
                          ? "1px solid rgba(52,211,153,0.15)"
                          : "1px solid var(--accent-border)",
                      }}
                    >
                      {hasUid ? (
                        <>
                          <Link2 className="w-3 h-3" />
                          Linked
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3 h-3" />
                          Link UID
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Edit Firebase UID inline */}
                {isEditing && (
                  <div className="px-3 pb-3 flex items-center gap-2">
                    <label
                      className="text-xs flex-shrink-0"
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Firebase UID
                    </label>
                    <input
                      type="text"
                      value={uidValue}
                      onChange={(e) => setUidValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveUid();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                      style={{
                        background: "var(--card-inner-bg)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}
                      placeholder="Paste Firebase UID here..."
                    />
                    <button
                      onClick={saveUid}
                      disabled={saving || !uidValue.trim()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: "rgba(52,211,153,0.12)",
                        color: "var(--success)",
                        border: "1px solid rgba(52,211,153,0.2)",
                        opacity: saving || !uidValue.trim() ? 0.5 : 1,
                      }}
                    >
                      <Check className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{
                        color: "var(--text-muted)",
                        background: "transparent",
                        border: "1px solid var(--border)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
