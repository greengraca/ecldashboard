"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Trophy, CheckCircle, AlertCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth, monthRange } from "@/lib/utils";
import type { EclMonthlyConfig } from "@/lib/types";

// How many months beyond the current one you can pre-set.
const UPCOMING_COUNT = 6;

type RowConfig = Partial<EclMonthlyConfig> & { month: string };
type Validation = "valid" | "invalid" | null;

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

/** One bracket-ID input row: label · mono input (validation-colored) · Validate. */
function BracketMonthRow({
  label,
  value,
  onChange,
  validation,
  onValidate,
  validating,
  rightSlot,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  validation: Validation;
  onValidate: () => void;
  validating: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
        {rightSlot}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors font-mono"
          style={{
            background: "var(--bg-page)",
            borderColor:
              validation === "valid"
                ? "var(--success)"
                : validation === "invalid"
                ? "var(--error)"
                : "var(--border)",
            color: "var(--text-primary)",
          }}
          placeholder="e.g. 4stOkmGciCsdxU9p2yVS"
        />
        <button
          onClick={onValidate}
          disabled={!value.trim() || validating}
          className="rounded-lg px-3 py-2 text-xs font-medium transition-colors shrink-0"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            opacity: !value.trim() || validating ? 0.5 : 1,
          }}
        >
          {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Validate"}
        </button>
      </div>
      {validation === "valid" && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--success)" }}>
          <CheckCircle className="w-3 h-3" /> Bracket found on TopDeck
        </p>
      )}
      {validation === "invalid" && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--error)" }}>
          <AlertCircle className="w-3 h-3" /> Bracket not found
        </p>
      )}
    </div>
  );
}

export default function MonthlyConfigManager() {
  const currentMonth = getCurrentMonth();
  const months = monthRange(currentMonth, 1 + UPCOMING_COUNT); // current + next 6
  const upcomingMonths = months.slice(1);

  const { data, mutate } = useSWR<{ data: RowConfig[] }>(
    `/api/league/config?count=${1 + UPCOMING_COUNT}`,
    fetcher
  );
  const configs = data?.data ?? [];
  const byMonth = new Map(configs.map((c) => [c.month, c]));
  const currentConfig = byMonth.get(currentMonth) ?? null;

  // Current month (own save, like before)
  const [currentBracketId, setCurrentBracketId] = useState("");
  const [currentBracketDirty, setCurrentBracketDirty] = useState(false);
  const [currentSaving, setCurrentSaving] = useState(false);

  // Upcoming months
  const [upcomingValues, setUpcomingValues] = useState<Record<string, string>>({});
  const [upcomingDirty, setUpcomingDirty] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Shared validation state, keyed by month
  const [validation, setValidation] = useState<Record<string, Validation>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});

  // Join channel (own save)
  const [joinChannelId, setJoinChannelId] = useState("");
  const [channelDirty, setChannelDirty] = useState(false);
  const [channelSaving, setChannelSaving] = useState(false);

  // Seed local inputs from fetched configs, without clobbering in-progress edits.
  useEffect(() => {
    if (!data) return;
    const map = new Map((data.data ?? []).map((c) => [c.month, c]));
    if (!currentBracketDirty) setCurrentBracketId(map.get(currentMonth)?.bracket_id || "");
    setUpcomingValues((prev) => {
      const next = { ...prev };
      for (const m of upcomingMonths) {
        if (!upcomingDirty[m]) next[m] = map.get(m)?.bracket_id || "";
      }
      return next;
    });
    if (!channelDirty) setJoinChannelId(map.get(currentMonth)?.join_channel_id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const validateBracket = async (month: string, value: string) => {
    if (!value.trim()) return;
    setValidating((v) => ({ ...v, [month]: true }));
    try {
      const res = await fetch(`/api/league/validate-bracket?id=${value.trim()}`);
      const json = await res.json();
      setValidation((v) => ({ ...v, [month]: json.data?.valid ? "valid" : "invalid" }));
    } catch {
      setValidation((v) => ({ ...v, [month]: "invalid" }));
    } finally {
      setValidating((v) => ({ ...v, [month]: false }));
    }
  };

  const putConfig = async (month: string, body: Record<string, string>) => {
    const res = await fetch("/api/league/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, ...body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to save ${month}`);
    }
  };

  const handleSaveCurrent = async () => {
    if (!currentBracketDirty || !currentBracketId.trim()) return;
    setCurrentSaving(true);
    try {
      await putConfig(currentMonth, { bracket_id: currentBracketId.trim() });
      setCurrentBracketDirty(false);
      mutate();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCurrentSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const toSave = upcomingMonths.filter(
      (m) => upcomingDirty[m] && (upcomingValues[m] || "").trim()
    );
    if (toSave.length === 0) return;
    setSavingAll(true);
    setSaveError(null);
    const failed: string[] = [];
    for (const m of toSave) {
      try {
        await putConfig(m, { bracket_id: upcomingValues[m].trim() });
        setUpcomingDirty((d) => ({ ...d, [m]: false }));
      } catch {
        failed.push(monthLabel(m));
      }
    }
    setSavingAll(false);
    if (failed.length) setSaveError(`Failed to save: ${failed.join(", ")}`);
    mutate();
  };

  const handleSaveChannel = async () => {
    if (!channelDirty || !joinChannelId.trim()) return;
    setChannelSaving(true);
    try {
      await putConfig(currentMonth, { join_channel_id: joinChannelId.trim() });
      setChannelDirty(false);
      mutate();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setChannelSaving(false);
    }
  };

  const anyUpcomingDirty = upcomingMonths.some((m) => upcomingDirty[m]);
  const flipSteps = currentConfig?.flip_steps_completed || [];

  const saveBtnStyle = (active: boolean, busy: boolean) => ({
    background: active ? "rgba(251, 191, 36, 0.15)" : "rgba(255, 255, 255, 0.04)",
    color: active ? "var(--accent)" : "var(--text-muted)",
    border: active ? "1px solid rgba(251, 191, 36, 0.35)" : "1px solid var(--border)",
    opacity: !active || busy ? 0.5 : 1,
  });

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
          <BracketMonthRow
            label={`Current bracket ID — ${monthLabel(currentMonth)}`}
            value={currentBracketId}
            onChange={(v) => {
              setCurrentBracketId(v);
              setCurrentBracketDirty(true);
              setValidation((s) => ({ ...s, [currentMonth]: null }));
            }}
            validation={validation[currentMonth] ?? null}
            onValidate={() => validateBracket(currentMonth, currentBracketId)}
            validating={!!validating[currentMonth]}
            rightSlot={
              currentConfig?.bracket_id ? (
                <a
                  href={`https://topdeck.gg/bracket/${currentConfig.bracket_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono inline-flex items-center gap-1 hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  View on TopDeck <ExternalLink className="w-3 h-3" />
                </a>
              ) : undefined
            }
          />
          {currentBracketDirty && (
            <button
              onClick={handleSaveCurrent}
              disabled={currentSaving || !currentBracketId.trim()}
              className="mt-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
              style={saveBtnStyle(true, currentSaving)}
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

        {/* Upcoming brackets — next 6 months */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Upcoming brackets
            </h3>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              next {UPCOMING_COUNT} months
            </span>
          </div>

          {upcomingMonths.map((m) => (
            <BracketMonthRow
              key={m}
              label={monthLabel(m)}
              value={upcomingValues[m] ?? ""}
              onChange={(v) => {
                setUpcomingValues((s) => ({ ...s, [m]: v }));
                setUpcomingDirty((d) => ({ ...d, [m]: true }));
                setValidation((s) => ({ ...s, [m]: null }));
              }}
              validation={validation[m] ?? null}
              onValidate={() => validateBracket(m, upcomingValues[m] ?? "")}
              validating={!!validating[m]}
              rightSlot={
                byMonth.get(m)?.bracket_id_set_by ? (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    set by {byMonth.get(m)!.bracket_id_set_by!.replace("dashboard:", "")}
                  </span>
                ) : undefined
              }
            />
          ))}

          {saveError && (
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--error)" }}>
              <AlertCircle className="w-3 h-3" /> {saveError}
            </p>
          )}

          <button
            onClick={handleSaveAll}
            disabled={!anyUpcomingDirty || savingAll}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ ...saveBtnStyle(anyUpcomingDirty, savingAll), backdropFilter: "blur(8px)" }}
          >
            {savingAll ? "Saving..." : "Save all changed"}
          </button>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

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
            The static #join-the-league channel. Set once — carries forward.
          </p>
          {channelDirty && (
            <button
              onClick={handleSaveChannel}
              disabled={channelSaving || !joinChannelId.trim()}
              className="mt-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
              style={saveBtnStyle(true, channelSaving)}
            >
              {channelSaving ? "Saving..." : "Save channel"}
            </button>
          )}
        </div>
      </div>

      <div
        className="px-5 py-3 border-t text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-muted)",
        }}
      >
        Set each month&apos;s bracket ID before that month starts — the bot switches automatically.
        TopDeck <code>/unlink</code> and <code>/link</code> must still be run manually.
      </div>
    </div>
  );
}
