"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Plus, Trash2, Copy, CheckCircle, Save, Loader2 } from "lucide-react";
import type { TreasurePodMonthlyConfig, TreasurePodTypeConfig } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth, getNextMonth } from "@/lib/utils";

interface TreasurePodConfigProps {
  month: string;
}

const BRING_A_FRIEND_IMAGE = "https://i.ibb.co/sph1YjFr/c4eb2988-cc01-48b1-aa8a-faf899b76fe6.png";

const PRESET_DEFAULTS: Record<string, { title: string; description: string; image_url: string | null; count: number }> = {
  bring_a_friend: {
    title: "Bring a Friend Treasure Pod!",
    description: "**Congratulations!** This game is a **Treasure Pod**!\n\nThe **winner** receives **free ECL access** for an unregistered friend!\n\nIf you won, please **open a ticket** to claim your prize! 🍀",
    image_url: BRING_A_FRIEND_IMAGE,
    count: 10,
  },
  card_prize: {
    title: "Card Prize Treasure Pod!",
    description: "**Congratulations!** This game is a **Treasure Pod**!\n\nThe **winner** receives a special card as a prize!\n\nIf you won, please **open a ticket** to claim your prize! 🍀",
    image_url: null,
    count: 1,
  },
};

const DEFAULT_POD_TYPE: TreasurePodTypeConfig = {
  type: "bring_a_friend",
  ...PRESET_DEFAULTS.bring_a_friend,
};

const POD_TYPE_PRESETS: { value: string; label: string }[] = [
  { value: "bring_a_friend", label: "Bring a Friend" },
  { value: "card_prize", label: "Card Prize" },
  { value: "custom", label: "Custom" },
];

export default function TreasurePodConfig({ month }: TreasurePodConfigProps) {
  const currentMonth = getCurrentMonth();
  const nextMonth = getNextMonth();
  const isNextMonth = month === nextMonth;

  const { mutate: globalMutate } = useSWRConfig();
  const { data, mutate } = useSWR<{ data: TreasurePodMonthlyConfig | null }>(
    `/api/prizes/treasure-pod-config?month=${month}`,
    fetcher
  );

  const config = data?.data ?? null;

  const [podTypes, setPodTypes] = useState<TreasurePodTypeConfig[]>([{ ...DEFAULT_POD_TYPE }]);
  const [gamesPerPlayer, setGamesPerPlayer] = useState("2.75");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (config) {
      setPodTypes(config.pod_types.length > 0 ? config.pod_types : [{ ...DEFAULT_POD_TYPE }]);
      setGamesPerPlayer(config.games_per_player.toString());
      setNotes(config.notes || "");
    } else {
      setPodTypes([{ ...DEFAULT_POD_TYPE }]);
      setGamesPerPlayer("4");
      setNotes("");
    }
  }, [config]);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  function updatePodType(index: number, field: keyof TreasurePodTypeConfig, value: string | number | null) {
    setPodTypes((prev) =>
      prev.map((pt, i) => {
        if (i !== index) return pt;
        if (field === "type" && typeof value === "string" && value in PRESET_DEFAULTS) {
          const preset = PRESET_DEFAULTS[value];
          return { ...pt, type: value, ...preset };
        }
        if (field === "type") {
          // Custom type — clear preset values
          return { ...pt, type: value as string, title: "", description: "", image_url: null, count: 1 };
        }
        return { ...pt, [field]: value };
      })
    );
  }

  function addPodType() {
    setPodTypes((prev) => [...prev, { ...DEFAULT_POD_TYPE, type: "bring_a_friend" }]);
  }

  function removePodType(index: number) {
    setPodTypes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/prizes/treasure-pod-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          pod_types: podTypes,
          games_per_player: Number(gamesPerPlayer) || 2.75,
          notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      mutate();
      globalMutate(`/api/prizes/planning-status?month=${currentMonth}`);
      showMessage("success", "Config saved as draft");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (!confirm("Activate this config? The bot will use it for the month flip.")) return;
    setActivating(true);
    try {
      const res = await fetch("/api/prizes/treasure-pod-config/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Activation failed");
      }
      mutate();
      globalMutate(`/api/prizes/planning-status?month=${currentMonth}`);
      showMessage("success", "Config activated");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Activation failed");
    } finally {
      setActivating(false);
    }
  }

  async function handleCopyFromPrevious() {
    setCopying(true);
    try {
      const res = await fetch("/api/prizes/treasure-pod-config/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_month: currentMonth, target_month: month }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Copy failed");
      }
      mutate();
      globalMutate(`/api/prizes/planning-status?month=${currentMonth}`);
      showMessage("success", "Copied from current month");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "No config found for current month");
    } finally {
      setCopying(false);
    }
  }

  const totalPods = podTypes.reduce((s, pt) => s + (pt.count || 0), 0);
  const isActive = config?.status === "active";

  const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--bg-page)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };
  const secondaryInputStyle = {
    background: "var(--bg-page)",
    borderColor: "rgba(255,255,255,0.04)",
    color: "var(--text-secondary)",
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {isNextMonth && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{
            background: "rgba(251, 191, 36, 0.08)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            color: "var(--accent)",
          }}
        >
          <span className="text-base">&#9888;</span>
          This is next month&apos;s config &mdash; the bot will use it at the month flip.
        </div>
      )}

      {isActive && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.25)",
            color: "var(--success)",
          }}
        >
          <CheckCircle className="w-4 h-4" />
          This config is active &mdash; the bot will use these settings.
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: message.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            color: message.type === "success" ? "var(--success)" : "var(--error)",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Pod Types */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--surface-gradient)",
          backdropFilter: "var(--surface-blur)",
          border: "1.5px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "var(--surface-shadow)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Pod Types
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {totalPods} total pods configured
            </p>
          </div>
          <button
            onClick={addPodType}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:brightness-125"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Type
          </button>
        </div>

        <div className="space-y-4">
          {podTypes.map((pt, i) => (
            <div
              key={i}
              className="rounded-lg p-4 relative"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border)",
              }}
            >
              {podTypes.length > 1 && (
                <button
                  onClick={() => removePodType(i)}
                  className="absolute top-3 right-3 p-1 rounded-md transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {/* Type */}
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                    Type
                  </label>
                  <select
                    value={POD_TYPE_PRESETS.some((p) => p.value === pt.type) ? pt.type : "custom"}
                    onChange={(e) => {
                      const v = e.target.value;
                      updatePodType(i, "type", v === "custom" ? "" : v);
                    }}
                    className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
                    style={inputStyle}
                  >
                    {POD_TYPE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {!POD_TYPE_PRESETS.some((p) => p.value === pt.type) && (
                    <input
                      type="text"
                      value={pt.type}
                      onChange={(e) => updatePodType(i, "type", e.target.value)}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none mt-1"
                      style={inputStyle}
                      placeholder="Custom type name"
                    />
                  )}
                </div>

                {/* Count */}
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                    Count
                  </label>
                  <input
                    type="number"
                    value={pt.count}
                    onChange={(e) => updatePodType(i, "count", Number(e.target.value) || 0)}
                    min="0"
                    className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={pt.image_url || ""}
                    onChange={(e) => updatePodType(i, "image_url", e.target.value || null)}
                    className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Title */}
              <div className="mb-3">
                <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={pt.title}
                  onChange={(e) => updatePodType(i, "title", e.target.value)}
                  className={inputClass}
                  style={secondaryInputStyle}
                  placeholder="Treasure Pod title for Discord embed"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  Description
                </label>
                <textarea
                  value={pt.description}
                  onChange={(e) => updatePodType(i, "description", e.target.value)}
                  rows={5}
                  className={inputClass}
                  style={secondaryInputStyle}
                  placeholder="Discord embed description (supports markdown)"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--surface-gradient)",
          backdropFilter: "var(--surface-blur)",
          border: "1.5px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "var(--surface-shadow)",
        }}
      >
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Games per Player (estimate)
            </label>
            <input
              type="number"
              value={gamesPerPlayer}
              onChange={(e) => setGamesPerPlayer(e.target.value)}
              step="0.25"
              min="0"
              className={inputClass}
              style={inputStyle}
              placeholder="2.75"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
            style={inputStyle}
            placeholder="Config notes..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 hover:brightness-125"
          style={{
            background: "rgba(251, 191, 36, 0.15)",
            color: "var(--accent)",
            border: "1px solid rgba(251, 191, 36, 0.35)",
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Draft
        </button>

        {config && !isActive && (
          <button
            onClick={handleActivate}
            disabled={activating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "rgba(34, 197, 94, 0.15)",
              color: "var(--success)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
            }}
          >
            {activating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Activate
          </button>
        )}

        <button
          onClick={handleCopyFromPrevious}
          disabled={copying}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 hover:brightness-125"
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          Copy from Current Month
        </button>
      </div>
    </div>
  );
}
