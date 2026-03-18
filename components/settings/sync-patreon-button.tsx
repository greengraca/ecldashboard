"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import MonthPicker from "@/components/dashboard/month-picker";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonth(): string {
  const now = new Date();
  const m = now.getMonth(); // 0-based
  const y = now.getFullYear();
  const pm = m === 0 ? 12 : m;
  const py = m === 0 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface SnapshotStatus {
  month: string;
  last_synced_at: string | null;
  is_stale: boolean;
}

export default function SyncPatreonButton() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [staleness, setStaleness] = useState<SnapshotStatus | null>(null);
  const [stalenessLoading, setStalenessLoading] = useState(false);

  const isDisabledMonth = month === "2025-11" || month === "2025-12";

  const fetchStaleness = useCallback(async (targetMonth: string) => {
    setStalenessLoading(true);
    try {
      const res = await fetch(`/api/patreon/snapshot-status?month=${targetMonth}`);
      if (res.ok) {
        const json = await res.json();
        setStaleness(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setStalenessLoading(false);
    }
  }, []);

  // On mount, fetch staleness for previous month
  useEffect(() => {
    fetchStaleness(getPreviousMonth());
  }, [fetchStaleness]);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/patreon/sync?month=${month}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        setResult(err.error || "Sync failed");
        return;
      }
      const json = await res.json();
      const count = json.data?.snapshot_count ?? json.data?.count;
      setResult(count != null ? `Synced ${count} members` : "Sync complete");
      // Re-fetch staleness for previous month in case this sync resolved it
      fetchStaleness(getPreviousMonth());
    } catch {
      setResult("Sync failed");
    } finally {
      setLoading(false);
    }
  }

  const stalenessWarning = staleness?.is_stale && !stalenessLoading;
  const prevMonthLabel = formatMonthLabel(staleness?.month || getPreviousMonth());

  return (
    <div className="py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      {/* Staleness warning */}
      {stalenessWarning && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-3 text-sm"
          style={{
            background: "rgba(251, 191, 36, 0.10)",
            border: "1px solid rgba(251, 191, 36, 0.30)",
            color: "var(--warning, #fbbf24)",
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {staleness.last_synced_at
              ? `${prevMonthLabel} snapshot last synced on ${new Date(staleness.last_synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2014 re-sync to capture the full month`
              : `No snapshot for ${prevMonthLabel}`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={loading || isDisabledMonth}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "rgba(251, 191, 36, 0.15)",
            color: "var(--accent)",
            border: "1px solid rgba(251, 191, 36, 0.35)",
            backdropFilter: "blur(8px)",
          }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Syncing..." : "Sync Patreon"}
        </button>
        <MonthPicker
          value={month}
          onChange={setMonth}
          minMonth="2026-01"
          maxMonth={getCurrentMonth()}
        />
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {isDisabledMonth
          ? "Sync disabled for setup months (Nov/Dec 2025)."
          : loading
            ? "Fetching Patreon members and saving snapshot..."
            : result
              ? result
              : "Pulls current Patreon member data and saves a snapshot for the selected month."}
      </p>
    </div>
  );
}
