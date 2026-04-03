"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import type { PlannerCard } from "@/lib/scryfall-server";

interface PlannerSlotPanelProps {
  slotKey: string;
  label: string;
  amount: number;
  onAmountChange: (amount: number) => void;
  suggestions: PlannerCard[];
  totalResults: number;
  onRefresh: () => Promise<PlannerCard[]>;
}

export default function PlannerSlotPanel({
  label,
  amount,
  onAmountChange,
  suggestions: initialSuggestions,
  totalResults,
  onRefresh,
}: PlannerSlotPanelProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [refreshing, setRefreshing] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const minEur = Math.max(1, Math.round(amount * 0.85 * 100) / 100);
  const maxEur = Math.round(amount * 1.15 * 100) / 100;

  // Sync suggestions when parent data changes (e.g. initial load)
  const [prevInitial, setPrevInitial] = useState(initialSuggestions);
  if (initialSuggestions !== prevInitial) {
    setPrevInitial(initialSuggestions);
    setSuggestions(initialSuggestions);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const newCards = await onRefresh();
      setSuggestions(newCards);
      setImgErrors(new Set());
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(251,191,36,0.1)",
              color: "var(--accent)",
            }}
          >
            {totalResults} cards
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {"\u20AC"}{minEur.toFixed(0)}-{maxEur.toFixed(0)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: "var(--text-secondary)" }}
            title="Refresh suggestions"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Budget input */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Budget
          </span>
          <div className="relative flex-1" style={{ maxWidth: 120 }}>
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {"\u20AC"}
            </span>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
              min="0"
              step="1"
              className="w-full rounded-lg border pl-7 pr-2 py-1.5 text-xs outline-none transition-colors"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Card suggestions strip */}
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
        {refreshing && suggestions.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 rounded-lg skeleton"
              style={{ width: 100, height: 140 }}
            />
          ))
        ) : suggestions.length === 0 ? (
          <div
            className="w-full py-6 text-center rounded-lg border border-dashed"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <p className="text-xs">No cards found in this price range</p>
          </div>
        ) : (
          suggestions.map((card) => (
            <div
              key={card.scryfall_id}
              className="shrink-0 rounded-lg overflow-hidden transition-all"
              style={{
                width: 100,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
              }}
            >
              {imgErrors.has(card.scryfall_id) ? (
                <div
                  className="flex items-center justify-center text-xs text-center p-2"
                  style={{ height: 140, color: "var(--text-muted)" }}
                >
                  {card.name}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/proxy?url=${encodeURIComponent(card.image_url)}`}
                  alt={card.name}
                  className="w-full object-cover"
                  style={{ height: 140 }}
                  onError={() =>
                    setImgErrors((prev) => new Set(prev).add(card.scryfall_id))
                  }
                />
              )}
              <div className="p-1.5">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                  title={card.name}
                >
                  {card.name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {card.set_name}
                </p>
                <p
                  className="text-xs font-semibold mt-0.5"
                  style={{ color: "var(--accent)" }}
                >
                  {"\u20AC"}{card.price_eur.toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
