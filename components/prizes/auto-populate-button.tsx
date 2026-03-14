"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";

interface AutoPopulateButtonProps {
  month: string;
  onComplete: () => void;
}

export default function AutoPopulateButton({ month, onComplete }: AutoPopulateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/prizes/auto-populate?month=${month}`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        const count = json.data?.created || 0;
        setMessage(count > 0 ? `Created ${count} prize stub${count > 1 ? "s" : ""}` : "No new stubs to create");
        onComplete();
      } else {
        setMessage(json.error || "Failed to auto-populate");
      }
    } catch {
      setMessage("Failed to auto-populate");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{
          background: "var(--accent-light)",
          color: "var(--accent)",
        }}
      >
        <Wand2 className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Populating..." : "Auto-populate"}
      </button>
      {message && (
        <span
          className="absolute top-full mt-1 left-0 text-[10px] whitespace-nowrap"
          style={{ color: "var(--text-muted)" }}
        >
          {message}
        </span>
      )}
    </div>
  );
}
