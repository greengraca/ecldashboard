"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";

interface CacheStatus {
  last_refresh: number;
  cooldown_remaining_ms: number;
  can_refresh: boolean;
}

function formatTimeAgo(timestamp: number): string {
  if (timestamp === 0) return "Never";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function TopDeckRefreshButton() {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/topdeck/cache-status");
      if (res.ok) {
        const json = await res.json();
        setStatus(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Tick down cooldown every second
  useEffect(() => {
    if (!status || status.can_refresh) return;
    const interval = setInterval(() => {
      setStatus((prev) => {
        if (!prev) return prev;
        const remaining = Math.max(0, prev.cooldown_remaining_ms - 1000);
        return { ...prev, cooldown_remaining_ms: remaining, can_refresh: remaining === 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status?.can_refresh]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/topdeck/refresh", { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        console.error("Refresh failed:", json.error);
      }
      await fetchStatus();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setLoading(false);
    }
  }

  const canRefresh = status?.can_refresh ?? true;
  const disabled = loading || !canRefresh;

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleRefresh}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
          }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Refreshing..." : "Refresh TopDeck Data"}
        </button>
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {loading
          ? "Clearing caches and re-fetching..."
          : !canRefresh && status
            ? `Available in ${formatCooldown(status.cooldown_remaining_ms)}`
            : status
              ? `Last refreshed: ${formatTimeAgo(status.last_refresh)}`
              : "Loading..."}
      </p>
    </div>
  );
}
