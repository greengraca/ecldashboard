"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users, Check, Link2, UserPlus, X, AlertTriangle, Pencil } from "lucide-react";
import { SensitiveBlock } from "@/components/dashboard/sensitive";
import { useSensitiveData } from "@/contexts/SensitiveDataContext";
import Select from "@/components/dashboard/select";
import { fetcher } from "@/lib/fetcher";
import type { UserMapping, TeamMemberColor, DiscordMember } from "@/lib/types";

interface DriftEntry {
  id: string;
  name: string;
  group: "cedhpt" | "ca";
}

const COLOR_OPTIONS: TeamMemberColor[] = ["amber", "blue", "green", "purple", "red"];

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
  const { data: driftData, mutate: mutateDrift } = useSWR<{ data: DriftEntry[] }>(
    "/api/team-members/drift",
    fetcher
  );
  const { data: membersData } = useSWR<{ data: DiscordMember[] }>(
    "/api/discord/members",
    fetcher
  );
  const { hidden } = useSensitiveData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uidValue, setUidValue] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline add-mapping form state (one form open at a time)
  const [addingFor, setAddingFor] = useState<DriftEntry | null>(null);
  const [addDiscordId, setAddDiscordId] = useState("");
  const [addColor, setAddColor] = useState<TeamMemberColor>("amber");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addFirebaseUid, setAddFirebaseUid] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const mappings = data?.data || [];
  const drift = driftData?.data || [];
  const guildMembers = membersData?.data || [];

  function startAdd(entry: DriftEntry) {
    setAddingFor(entry);
    setAddDiscordId("");
    setAddColor("amber");
    setAddDisplayName(entry.name);
    setAddFirebaseUid("");
    setCreateError(null);
  }

  function cancelAdd() {
    setAddingFor(null);
    setCreateError(null);
  }

  async function submitAdd() {
    if (!addingFor || !addDiscordId.trim() || !addDisplayName.trim()) return;
    const picked = guildMembers.find((m) => m.id === addDiscordId);
    if (!picked) {
      setCreateError("Pick a Discord user from the list");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/user-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_id: picked.id,
          discord_username: picked.username,
          firebase_uid: addFirebaseUid.trim(),
          display_name: addDisplayName.trim(),
          color: addColor,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setCreateError(body?.error || `Create failed (${res.status})`);
        return;
      }
      await Promise.all([mutate(), mutateDrift()]);
      cancelAdd();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  const startEdit = (m: UserMapping) => {
    setEditingId(String(m._id));
    setUidValue(m.firebase_uid || "");
    setNameValue(m.display_name || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setUidValue("");
    setNameValue("");
  };

  const saveEdit = async () => {
    if (!editingId || !nameValue.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/user-mapping/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: nameValue.trim(),
          firebase_uid: uidValue.trim(),
        }),
      });
      await Promise.all([mutate(), mutateDrift()]);
      cancelEdit();
    } catch (err) {
      console.error("Failed to save mapping:", err);
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
        {/* Drift detection: finance team members missing user mappings */}
        {drift.length > 0 && (
          <div
            className="mb-4 rounded-lg p-3"
            style={{
              background: "rgba(251, 191, 36, 0.06)",
              border: "1px solid var(--accent-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                Missing user mappings
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                — {drift.length} finance member{drift.length === 1 ? "" : "s"} not linked to a Discord account yet
              </span>
            </div>
            <div className="space-y-2">
              {drift.map((entry) => {
                const isAdding = addingFor?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="rounded-md"
                    style={{
                      background: "rgba(0,0,0,0.15)",
                      border: isAdding ? "1px solid var(--accent-border)" : "1px solid transparent",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {entry.name}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded uppercase"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {entry.group}
                        </span>
                      </div>
                      {!isAdding && (
                        <button
                          onClick={() => startAdd(entry)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                          style={{
                            background: "rgba(251,191,36,0.12)",
                            color: "var(--accent)",
                            border: "1px solid var(--accent-border)",
                          }}
                        >
                          <UserPlus className="w-3 h-3" />
                          Add mapping
                        </button>
                      )}
                    </div>

                    {isAdding && (
                      <div
                        className="px-3 pb-3 pt-1 space-y-2"
                        style={{ borderTop: "1px solid var(--border-subtle)" }}
                      >
                        {/* Discord user */}
                        <div>
                          <label
                            className="text-[10px] uppercase tracking-wider"
                            style={{
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Discord user
                          </label>
                          <Select
                            value={addDiscordId}
                            onChange={setAddDiscordId}
                            options={guildMembers.map((m) => ({
                              value: m.id,
                              label: `${m.display_name} (@${m.username})`,
                            }))}
                            placeholder={
                              guildMembers.length === 0
                                ? "Loading Discord members..."
                                : "Type to search Discord users"
                            }
                            size="sm"
                            searchable
                          />
                        </div>

                        {/* Display name */}
                        <div>
                          <label
                            className="text-[10px] uppercase tracking-wider"
                            style={{
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Display name
                          </label>
                          <input
                            type="text"
                            value={addDisplayName}
                            onChange={(e) => setAddDisplayName(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none"
                            style={{
                              background: "var(--card-inner-bg)",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                            }}
                          />
                        </div>

                        {/* Color */}
                        <div>
                          <label
                            className="text-[10px] uppercase tracking-wider block mb-1"
                            style={{
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Color
                          </label>
                          <div className="flex gap-1.5">
                            {COLOR_OPTIONS.map((c) => {
                              const hex = COLORS[c];
                              const isSelected = addColor === c;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setAddColor(c)}
                                  className="w-6 h-6 rounded-full transition-transform"
                                  style={{
                                    background: `rgba(${hexToRgb(hex)}, 0.4)`,
                                    border: `2px solid ${isSelected ? hex : "transparent"}`,
                                    transform: isSelected ? "scale(1.1)" : "scale(1)",
                                  }}
                                  aria-label={c}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Firebase UID (optional) */}
                        <div>
                          <label
                            className="text-[10px] uppercase tracking-wider"
                            style={{
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Firebase UID <span style={{ opacity: 0.6 }}>(optional — can link later)</span>
                          </label>
                          <input
                            type="text"
                            value={addFirebaseUid}
                            onChange={(e) => setAddFirebaseUid(e.target.value)}
                            placeholder="Leave empty to link later"
                            className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none"
                            style={{
                              background: "var(--card-inner-bg)",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                              fontFamily: "var(--font-mono)",
                            }}
                          />
                        </div>

                        {createError && (
                          <p
                            className="text-xs"
                            style={{ color: "var(--error)" }}
                          >
                            {createError}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={submitAdd}
                            disabled={creating || !addDiscordId || !addDisplayName.trim()}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
                            style={{
                              background: "rgba(52,211,153,0.12)",
                              color: "var(--success)",
                              border: "1px solid rgba(52,211,153,0.2)",
                              opacity: creating || !addDiscordId || !addDisplayName.trim() ? 0.5 : 1,
                            }}
                          >
                            <Check className="w-3 h-3" />
                            {creating ? "Creating..." : "Create mapping"}
                          </button>
                          <button
                            onClick={cancelAdd}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
                            style={{
                              color: "var(--text-muted)",
                              background: "transparent",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                          <Pencil className="w-3 h-3" />
                          Edit
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

                {/* Edit inline — display name + Firebase UID */}
                {isEditing && (
                  <div className="px-3 pb-3 space-y-2">
                    {/* Display name */}
                    <div className="flex items-center gap-2">
                      <label
                        className="text-xs flex-shrink-0"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          minWidth: "88px",
                        }}
                      >
                        Display name
                      </label>
                      <input
                        type="text"
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                        style={{
                          background: "var(--card-inner-bg)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>
                    {/* Firebase UID */}
                    <div className="flex items-center gap-2">
                      <label
                        className="text-xs flex-shrink-0"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          minWidth: "88px",
                        }}
                      >
                        Firebase UID
                      </label>
                      <input
                        type="text"
                        value={uidValue}
                        onChange={(e) => setUidValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                        style={{
                          background: "var(--card-inner-bg)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-mono)",
                        }}
                        placeholder="Optional — Firebase UID for Taskpad sync"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
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
                      <button
                        onClick={saveEdit}
                        disabled={saving || !nameValue.trim()}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: "rgba(52,211,153,0.12)",
                          color: "var(--success)",
                          border: "1px solid rgba(52,211,153,0.2)",
                          opacity: saving || !nameValue.trim() ? 0.5 : 1,
                        }}
                      >
                        <Check className="w-3 h-3" />
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
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
