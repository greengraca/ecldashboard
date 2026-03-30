"use client";

import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import type { Prize, PrizeBudget, PrizeBudgetAllocations } from "@/lib/types";
import BudgetConfigurator from "./budget-configurator";
import AutoPopulateButton from "./auto-populate-button";

type CategoryFilter = "all" | "mtg_single" | "placement" | "most_games" | "treasure_pod" | "sponsor" | "other";

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mtg_single", label: "Card Singles" },
  { key: "placement", label: "Placements" },
  { key: "most_games", label: "Most Games" },
  { key: "treasure_pod", label: "Treasure Pod" },
  { key: "sponsor", label: "Sponsor" },
  { key: "other", label: "Other" },
];

const SHIPPING_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  not_applicable: { label: "N/A", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  shipped: { label: "Shipped", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  delivered: { label: "Delivered", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: "Planned", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  confirmed: { label: "Confirmed", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  awarded: { label: "Awarded", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

interface PrizesTabProps {
  prizes: Prize[];
  budget: PrizeBudget | null;
  month: string;
  isLoading: boolean;
  onRefreshAll: () => void;
  onAddCard: () => void;
  onAddPrize: () => void;
  onPrizeClick: (prize: Prize) => void;
  onSaveBudget: (data: {
    month: string;
    total_budget: number;
    allocations: PrizeBudgetAllocations;
    notes: string;
  }) => Promise<void>;
  initialFilter?: string;
}

export default function PrizesTab({
  prizes,
  budget,
  month,
  isLoading,
  onRefreshAll,
  onAddCard,
  onAddPrize,
  onPrizeClick,
  onSaveBudget,
  initialFilter,
}: PrizesTabProps) {
  const [filter, setFilter] = useState<CategoryFilter>(
    (initialFilter as CategoryFilter) || "all"
  );
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  const filtered = filter === "all"
    ? prizes
    : filter === "placement"
      ? prizes.filter((p) => p.recipient_type === "placement")
      : filter === "most_games"
        ? prizes.filter((p) => p.recipient_type === "most_games")
        : prizes.filter((p) => p.category === filter);

  const counts: Record<CategoryFilter, number> = {
    all: prizes.length,
    mtg_single: prizes.filter((p) => p.category === "mtg_single").length,
    placement: prizes.filter((p) => p.recipient_type === "placement").length,
    most_games: prizes.filter((p) => p.recipient_type === "most_games").length,
    treasure_pod: prizes.filter((p) => p.category === "treasure_pod").length,
    sponsor: prizes.filter((p) => p.category === "sponsor").length,
    other: prizes.filter(
      (p) =>
        !["mtg_single", "sponsor", "treasure_pod"].includes(p.category) &&
        !["placement", "most_games"].includes(p.recipient_type)
    ).length,
  };

  const totalValue = prizes.reduce((sum, p) => sum + p.value, 0);
  const budgetTotal = budget?.total_budget ?? 0;

  return (
    <div>
      {/* Filter chips + actions */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: filter === f.key ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.05)",
                color: filter === f.key ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${filter === f.key ? "rgba(168,85,247,0.3)" : "var(--border)"}`,
              }}
            >
              {f.label} {counts[f.key] > 0 && <span className="ml-1 opacity-60">{counts[f.key]}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {filter === "placement" && (
            <AutoPopulateButton month={month} onComplete={onRefreshAll} />
          )}
          <button
            onClick={() => setShowBudget(!showBudget)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Budget
          </button>
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add <ChevronDown className="w-3 h-3" />
            </button>
            {addMenuOpen && (
              <div
                className="absolute right-0 mt-1 rounded-lg shadow-lg py-1 z-10"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", minWidth: 140 }}
              >
                <button
                  onClick={() => { onAddCard(); setAddMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:opacity-80"
                  style={{ color: "var(--text-primary)" }}
                >
                  Card Single
                </button>
                <button
                  onClick={() => { onAddPrize(); setAddMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:opacity-80"
                  style={{ color: "var(--text-primary)" }}
                >
                  Other Prize
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget bar */}
      {budget && !showBudget && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Budget:</span>
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((totalValue / budgetTotal) * 100, 100)}%`,
                background: totalValue > budgetTotal ? "#ef4444" : "var(--accent)",
              }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: totalValue > budgetTotal ? "#ef4444" : "var(--text-primary)" }}>
            €{totalValue.toFixed(0)} / €{budgetTotal.toFixed(0)}
          </span>
        </div>
      )}

      {/* Budget configurator (expandable) */}
      {showBudget && (
        <div className="mb-4">
          <BudgetConfigurator
            budget={budget}
            month={month}
            totalSpent={totalValue}
            onSave={onSaveBudget}
          />
        </div>
      )}

      {/* Prize grid */}
      {isLoading ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          No prizes yet for this category.
        </div>
      ) : filter === "mtg_single" ? (
        /* Gallery view for card singles */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((prize) => (
            <button
              key={String(prize._id)}
              onClick={() => onPrizeClick(prize)}
              className="rounded-lg overflow-hidden text-left transition-transform hover:scale-[1.02]"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              {prize.image_url ? (
                <div style={{ aspectRatio: "5/7" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={prize.image_url} alt={prize.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="flex items-center justify-center" style={{ aspectRatio: "5/7", background: "rgba(255,255,255,0.03)" }}>
                  <span style={{ color: "var(--text-muted)" }}>No image</span>
                </div>
              )}
              <div className="p-2">
                <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{prize.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ color: "var(--accent)" }}>€{prize.value.toFixed(2)}</span>
                  {prize.shipping_status !== "not_applicable" && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: SHIPPING_BADGE[prize.shipping_status]?.bg,
                        color: SHIPPING_BADGE[prize.shipping_status]?.color,
                      }}
                    >
                      {SHIPPING_BADGE[prize.shipping_status]?.label}
                    </span>
                  )}
                </div>
                {prize.recipient_name && (
                  <div className="text-[10px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>{prize.recipient_name}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* List view for other prizes */
        <div className="flex flex-col gap-2">
          {filtered.map((prize) => (
            <button
              key={String(prize._id)}
              onClick={() => onPrizeClick(prize)}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:opacity-90"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              {prize.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prize.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{prize.name}</div>
                <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{prize.recipient_name || "Unassigned"}</div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded shrink-0"
                style={{ background: STATUS_BADGE[prize.status]?.bg, color: STATUS_BADGE[prize.status]?.color }}
              >
                {STATUS_BADGE[prize.status]?.label}
              </span>
              <span className="text-sm font-medium shrink-0" style={{ color: "var(--accent)" }}>€{prize.value.toFixed(2)}</span>
              {prize.shipping_status !== "not_applicable" && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: SHIPPING_BADGE[prize.shipping_status]?.bg,
                    color: SHIPPING_BADGE[prize.shipping_status]?.color,
                  }}
                >
                  {SHIPPING_BADGE[prize.shipping_status]?.label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
