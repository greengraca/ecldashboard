"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface SyncButtonProps {
  onSynced?: () => void;
}

export default function SyncButton({ onSynced }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribers/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      onSynced?.();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
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
      {loading ? "Syncing..." : "Sync Discord"}
    </button>
  );
}
