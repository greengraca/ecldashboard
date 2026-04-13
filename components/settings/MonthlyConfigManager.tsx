"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Trophy, CheckCircle, AlertCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth, getNextMonth } from "@/lib/utils";
import type { EclMonthlyConfig } from "@/lib/types";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function FlipStatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;

  const styles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    pending: {
      bg: "rgba(251, 191, 36, 0.12)",
      color: "var(--accent)",
      icon: <Clock className="w-3 h-3" />,
    },
    completed: {
      bg: "var(--success-light, rgba(52, 211, 153, 0.12))",
      color: "var(--success)",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    failed: {
      bg: "var(--error-light, rgba(252, 165, 165, 0.12))",
      color: "var(--error)",
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };

  const s = styles[status] || styles.pending;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function MonthlyConfigManager() {
  const currentMonth = getCurrentMonth();
  const nextMonth = getNextMonth();
  const [saving, setSaving] = useState(false);

  const [currentBracketId, setCurrentBracketId] = useState("");
  const [currentValidating, setCurrentValidating] = useState(false);
  const [currentValidationResult, setCurrentValidationResult] = useState<"valid" | "invalid" | null>(null);
  const [currentBracketDirty, setCurrentBracketDirty] = useState(false);
  const [currentSaving, setCurrentSaving] = useState(false);

  const [nextBracketId, setNextBracketId] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"valid" | "invalid" | null>(null);
  const [bracketDirty, setBracketDirty] = useState(false);

  const [joinChannelId, setJoinChannelId] = useState("");
  const [channelDirty, setChannelDirty] = useState(false);

  const { data: currentData, mutate: mutateCurrent } = useSWR<{ data: EclMonthlyConfig | null }>(
    `/api/league/config?month=${currentMonth}`,
    fetcher
  );
  const { data: nextData, mutate: mutateNext } = useSWR<{ data: EclMonthlyConfig | null }>(
    `/api/league/config?month=${nextMonth}`,
    fetcher
  );

  const currentConfig = currentData?.data ?? null;
  const nextConfig = nextData?.data ?? null;

  useEffect(() => {
    setCurrentBracketId(currentConfig?.bracket_id || "");
    setCurrentBracketDirty(false);
    setCurrentValidationResult(null);
  }, [currentConfig]);

  useEffect(() => {
    setNextBracketId(nextConfig?.bracket_id || "");
    setBracketDirty(false);
    setValidationResult(null);
  }, [nextConfig]);

  useEffect(() => {
    const channelId = nextConfig?.join_channel_id || currentConfig?.join_channel_id || "";
    setJoinChannelId(channelId);
    setChannelDirty(false);
  }, [nextConfig, currentConfig]);

  const validateCurrentBracket = async () => {
    if (!currentBracketId.trim()) return;
    setCurrentValidating(true);
    try {
      const res = await fetch(`/api/league/validate-bracket?id=${currentBracketId.trim()}`);
      const json = await res.json();
      setCurrentValidationResult(json.data?.valid ? "valid" : "invalid");
    } catch {
      setCurrentValidationResult("invalid");
    } finally {
      setCurrentValidating(false);
    }
  };

  const handleSaveCurrentBracket = async () => {
    if (!currentBracketDirty || !currentBracketId.trim()) return;
    setCurrentSaving(true);
    try {
      const res = await fetch("/api/league/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, bracket_id: currentBracketId.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save");
        return;
      }
      mutateCurrent();
      setCurrentBracketDirty(false);
    } catch {
      alert("Failed to save bracket ID");
    } finally {
      setCurrentSaving(false);
    }
  };

  const validateBracket = async () => {
    if (!nextBracketId.trim()) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/league/validate-bracket?id=${nextBracketId.trim()}`);
      const json = await res.json();
      setValidationResult(json.data?.valid ? "valid" : "invalid");
    } catch {
      setValidationResult("invalid");
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    const updates: Record<string, string> = {};
    if (bracketDirty && nextBracketId.trim()) updates.bracket_id = nextBracketId.trim();
    if (channelDirty && joinChannelId.trim()) updates.join_channel_id = joinChannelId.trim();
    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/league/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: nextMonth, ...updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save");
        return;
      }
      mutateNext();
      setBracketDirty(false);
      setChannelDirty(false);
    } catch {
      alert("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const dirty = bracketDirty || channelDirty;
  const flipSteps = currentConfig?.flip_steps_completed || [];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Trophy className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2
          className="text-sm font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          League Monthly Config
        </h2>
      </div>

      <div className="p-5 space-y-5">
        {/* Current month header */}
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Current month
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {monthLabel(currentMonth)}
            </p>
          </div>
          <div className="text-right">
            <FlipStatusBadge status={currentConfig?.flip_status} />
          </div>
        </div>

        {/* Current month bracket ID — editable */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Current bracket ID — {monthLabel(currentMonth)}
            </label>
            {currentConfig?.bracket_id && (
              <a
                href={`https://topdeck.gg/bracket/${currentConfig.bracket_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono inline-flex items-center gap-1 hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                View on TopDeck <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentBracketId}
              onChange={(e) => {
                setCurrentBracketId(e.target.value);
                setCurrentBracketDirty(true);
                setCurrentValidationResult(null);
              }}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors font-mono"
              style={{
                background: "var(--bg-page)",
                borderColor: currentValidationResult === "valid"
                  ? "var(--success)"
                  : currentValidationResult === "invalid"
                  ? "var(--error)"
                  : "var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="e.g. 4stOkmGciCsdxU9p2yVS"
            />
            <button
              onClick={validateCurrentBracket}
              disabled={!currentBracketId.trim() || currentValidating}
              className="rounded-lg px-3 py-2 text-xs font-medium transition-colors shrink-0"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: !currentBracketId.trim() || currentValidating ? 0.5 : 1,
              }}
            >
              {currentValidating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Validate"
              )}
            </button>
          </div>
          {currentValidationResult === "valid" && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--success)" }}>
              <CheckCircle className="w-3 h-3" /> Bracket found on TopDeck
            </p>
          )}
          {currentValidationResult === "invalid" && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--error)" }}>
              <AlertCircle className="w-3 h-3" /> Bracket not found
            </p>
          )}
          {currentBracketDirty && (
            <button
              onClick={handleSaveCurrentBracket}
              disabled={currentSaving || !currentBracketId.trim()}
              className="mt-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "rgba(251, 191, 36, 0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(251, 191, 36, 0.35)",
                opacity: currentSaving ? 0.5 : 1,
              }}
            >
              {currentSaving ? "Saving..." : "Save current bracket"}
            </button>
          )}
        </div>

        {/* Flip steps from current month */}
        {flipSteps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {flipSteps.map((step) => (
              <span
                key={step}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                style={{
                  background: "var(--success-light, rgba(52, 211, 153, 0.12))",
                  color: "var(--success)",
                }}
              >
                <CheckCircle className="w-3 h-3" />
                {step.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

        {/* Next month bracket ID */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Next month bracket ID — {monthLabel(nextMonth)}
            </label>
            {nextConfig?.bracket_id_set_by && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                set by {nextConfig.bracket_id_set_by.replace("dashboard:", "")}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nextBracketId}
              onChange={(e) => {
                setNextBracketId(e.target.value);
                setBracketDirty(true);
                setValidationResult(null);
              }}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors font-mono"
              style={{
                background: "var(--bg-page)",
                borderColor: validationResult === "valid"
                  ? "var(--success)"
                  : validationResult === "invalid"
                  ? "var(--error)"
                  : "var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="e.g. 4stOkmGciCsdxU9p2yVS"
            />
            <button
              onClick={validateBracket}
              disabled={!nextBracketId.trim() || validating}
              className="rounded-lg px-3 py-2 text-xs font-medium transition-colors shrink-0"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: !nextBracketId.trim() || validating ? 0.5 : 1,
              }}
            >
              {validating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Validate"
              )}
            </button>
          </div>
          {validationResult === "valid" && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--success)" }}>
              <CheckCircle className="w-3 h-3" /> Bracket found on TopDeck
            </p>
          )}
          {validationResult === "invalid" && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--error)" }}>
              <AlertCircle className="w-3 h-3" /> Bracket not found
            </p>
          )}
        </div>

        {/* Join Channel ID */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Join channel ID
          </label>
          <input
            type="text"
            value={joinChannelId}
            onChange={(e) => {
              setJoinChannelId(e.target.value);
              setChannelDirty(true);
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors font-mono"
            style={{
              background: "var(--bg-page)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
            placeholder="Discord channel snowflake (set once)"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            The bot renames this channel on flip (e.g. #join-april-league). Set once — carries forward.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: dirty ? "rgba(251, 191, 36, 0.15)" : "rgba(255, 255, 255, 0.04)",
            color: dirty ? "var(--accent)" : "var(--text-muted)",
            border: dirty ? "1px solid rgba(251, 191, 36, 0.35)" : "1px solid var(--border)",
            backdropFilter: "blur(8px)",
            opacity: !dirty || saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div
        className="px-5 py-3 border-t text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-muted)",
        }}
      >
        Set the bracket ID before the last day of the month. Most games image auto-pulls from prizes.
        TopDeck <code>/unlink</code> and <code>/link</code> must still be run manually.
      </div>
    </div>
  );
}
