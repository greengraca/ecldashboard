"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { UserMapping, TeamMemberColor } from "@/lib/types";

const COLORS: { value: TeamMemberColor; label: string; hex: string }[] = [
  { value: "amber", label: "Amber", hex: "#fbbf24" },
  { value: "blue", label: "Blue", hex: "#60a5fa" },
  { value: "green", label: "Green", hex: "#34d399" },
  { value: "purple", label: "Purple", hex: "#a855f7" },
  { value: "red", label: "Red", hex: "#fca5a5" },
];

function getColorHex(color: string): string {
  return COLORS.find((c) => c.value === color)?.hex || "#fbbf24";
}

export default function TeamMemberManager() {
  const { data, mutate } = useSWR<{ data: UserMapping[] }>(
    "/api/user-mapping",
    fetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    discord_id: "",
    discord_username: "",
    firebase_uid: "",
    display_name: "",
    color: "amber" as TeamMemberColor,
  });
  const [saving, setSaving] = useState(false);

  const mappings = data?.data || [];

  const resetForm = () => {
    setForm({
      discord_id: "",
      discord_username: "",
      firebase_uid: "",
      display_name: "",
      color: "amber",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/user-mapping/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discord_username: form.discord_username,
            firebase_uid: form.firebase_uid,
            display_name: form.display_name,
            color: form.color,
          }),
        });
      } else {
        await fetch("/api/user-mapping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      await mutate();
      resetForm();
    } catch (err) {
      console.error("Failed to save mapping:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m: UserMapping) => {
    setForm({
      discord_id: m.discord_id,
      discord_username: m.discord_username,
      firebase_uid: m.firebase_uid,
      display_name: m.display_name,
      color: m.color,
    });
    setEditingId(String(m._id));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/user-mapping/${id}`, { method: "DELETE" });
      await mutate();
    } catch (err) {
      console.error("Failed to delete mapping:", err);
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
        <span
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Discord ↔ Taskpad mapping
        </span>
      </div>

      <div className="px-5 py-4">
        {/* Member list */}
        {mappings.length === 0 && !showForm && (
          <p
            className="text-center py-4"
            style={{ color: "var(--text-muted)", fontSize: "13px" }}
          >
            No team members configured. Add your first member to enable Taskpad sync and Meeting Room.
          </p>
        )}

        <div className="space-y-2">
          {mappings.map((m) => {
            const hex = getColorHex(m.color);
            return (
              <div
                key={String(m._id)}
                className="flex items-center gap-3 py-2 px-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: `rgba(${hexToRgb(hex)}, 0.15)`,
                    border: `2px solid ${hex}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: hex,
                    flexShrink: 0,
                  }}
                >
                  {m.display_name.charAt(0).toUpperCase()}
                </div>
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
                    {m.discord_username} · {m.firebase_uid.substring(0, 12)}...
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(m)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.background = "var(--accent-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(String(m._id))}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--error)";
                    e.currentTarget.style.background = "var(--error-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div
            className="mt-3 p-4 rounded-lg space-y-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs mb-1"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Display Name
                </label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="Kakah"
                />
              </div>
              <div>
                <label
                  className="block text-xs mb-1"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Color
                </label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm({ ...form, color: c.value })}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: form.color === c.value
                          ? c.hex
                          : `rgba(${hexToRgb(c.hex)}, 0.15)`,
                        border: `2px solid ${c.hex}`,
                        transition: "all 0.15s",
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Discord ID
              </label>
              <input
                type="text"
                value={form.discord_id}
                onChange={(e) =>
                  setForm({ ...form, discord_id: e.target.value })
                }
                disabled={!!editingId}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--card-inner-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  opacity: editingId ? 0.5 : 1,
                }}
                placeholder="123456789012345678"
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Discord Username
              </label>
              <input
                type="text"
                value={form.discord_username}
                onChange={(e) =>
                  setForm({ ...form, discord_username: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--card-inner-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                placeholder="kakah"
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Firebase UID (from Taskpad)
              </label>
              <input
                type="text"
                value={form.firebase_uid}
                onChange={(e) =>
                  setForm({ ...form, firebase_uid: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--card-inner-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                placeholder="abc123def456"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={resetForm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{
                  color: "var(--text-muted)",
                  background: "transparent",
                  border: "1px solid var(--border)",
                }}
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.display_name || !form.discord_id || !form.firebase_uid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: "rgba(251,191,36,0.12)",
                  color: "var(--accent)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  opacity: saving || !form.display_name || !form.discord_id || !form.firebase_uid ? 0.5 : 1,
                }}
              >
                <Check className="w-3.5 h-3.5" />
                {editingId ? "Update" : "Add Member"}
              </button>
            </div>
          </div>
        )}

        {/* Add button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all"
            style={{
              border: "1px dashed var(--border)",
              color: "var(--text-muted)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-border)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Plus className="w-4 h-4" />
            Add Team Member
          </button>
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
