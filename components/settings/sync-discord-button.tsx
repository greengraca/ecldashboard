"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { RefreshCw } from "lucide-react";

export default function SyncDiscordButton() {
  const { mutate: globalMutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/subscribers/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const json = await res.json();
      const { member_count, changes } = json.data;
      let msg = `Synced ${member_count} members`;
      if (changes && !changes.already_detected) {
        if (changes.joined > 0 || changes.left > 0) {
          const parts: string[] = [];
          if (changes.joined > 0) parts.push(`${changes.joined} new`);
          if (changes.left > 0) parts.push(`${changes.left} left`);
          msg += ` — ${parts.join(", ")}`;
        } else {
          msg += " — no subscriber changes";
        }
      }
      setResult(msg);
      // Invalidate pages that depend on Discord member / subscriber data
      globalMutate((key: string) =>
        typeof key === "string" &&
        (/^\/api\/(subscribers|players|discord|finance\/su)/.test(key)),
        undefined, { revalidate: true }
      );
    } catch (err) {
      console.error("Sync error:", err);
      setResult("Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={loading}
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
          {loading ? "Syncing..." : "Sync Discord Members"}
        </button>
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {loading
          ? "Clearing cache and re-fetching from Discord..."
          : result
            ? result
            : "Clears the 5-minute Discord member cache and re-fetches all members."}
      </p>
    </div>
  );
}
