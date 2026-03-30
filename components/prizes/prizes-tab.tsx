"use client";

import { Plus } from "lucide-react";
import type { Prize, PrizeBudget, PrizeBudgetAllocations } from "@/lib/types";
import type { CardGroup } from "./card-single-form";
import { prizeToGroup } from "./card-single-form";

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

const GROUP_HEADER: Record<CardGroup, { label: string; color: string; bg: string; border: string }> = {
  top4: { label: "Top 4", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)" },
  most_games: { label: "Most Games", color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)" },
  custom: { label: "Other", color: "var(--text-muted)", bg: "rgba(255,255,255,0.03)", border: "var(--border)" },
};

interface PrizesTabProps {
  prizes: Prize[];
  budget: PrizeBudget | null;
  month: string;
  isLoading: boolean;
  onRefreshAll: () => void;
  onAddCard: (group?: CardGroup) => void;
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
  isLoading,
  onAddCard,
  onAddPrize,
  onPrizeClick,
}: PrizesTabProps) {
  // Group card singles by group
  const cardSingles = prizes.filter((p) => p.category === "mtg_single");
  const cardsByGroup: Record<CardGroup, Prize[]> = { top4: [], most_games: [], custom: [] };
  for (const card of cardSingles) {
    cardsByGroup[prizeToGroup(card)].push(card);
  }
  const totalCardValue = cardSingles.reduce((sum, p) => sum + p.value, 0);
  const nonCardPrizes = prizes.filter((p) => p.category !== "mtg_single");

  if (isLoading) {
    return <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Card singles grouped gallery */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Card Singles
          </h3>
          {totalCardValue > 0 && (
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              Total: €{totalCardValue.toFixed(2)}
            </span>
          )}
        </div>

        {(["top4", "most_games", "custom"] as CardGroup[]).map((grp) => {
          const cards = cardsByGroup[grp];
          const header = GROUP_HEADER[grp];
          if (cards.length === 0 && grp === "custom") return null;

          return (
            <div key={grp} className="mb-4">
              {/* Group header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ color: header.color, background: header.bg, border: `1px solid ${header.border}` }}
                  >
                    {header.label}
                  </span>
                  {cards.length > 0 && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {cards.length} card{cards.length !== 1 ? "s" : ""}
                      {" — "}€{cards.reduce((s, c) => s + c.value, 0).toFixed(2)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onAddCard(grp)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors hover:brightness-125"
                  style={{ color: header.color, background: header.bg, border: `1px solid ${header.border}` }}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              {/* Cards grid */}
              {cards.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
                  {cards.map((card) => (
                    <button
                      key={String(card._id)}
                      onClick={() => onPrizeClick(card)}
                      className="w-full p-0 rounded-lg overflow-hidden text-left transition-transform hover:scale-[1.02]"
                      style={{ background: "var(--surface-gradient)", border: `1px solid ${header.border}` }}
                    >
                      {card.image_url ? (
                        <div style={{ aspectRatio: "488/680", position: "relative", overflow: "hidden" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={card.image_url}
                            alt={card.name}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "fill" }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center" style={{ aspectRatio: "488/680", background: "rgba(255,255,255,0.03)" }}>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No image</span>
                        </div>
                      )}
                      <div className="p-1.5">
                        <div className="text-[10px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {card.name}{card.condition ? ` (${card.condition})` : ""}
                        </div>
                        {card.set_name && (
                          <div className="text-[9px] truncate" style={{ color: "var(--text-muted)" }}>{card.set_name}</div>
                        )}
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>€{card.value.toFixed(2)}</span>
                          {card.card_language && card.card_language !== "en" && (
                            <span className="text-[9px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>{card.card_language}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-lg border border-dashed py-6 text-center cursor-pointer transition-colors hover:brightness-125"
                  style={{ borderColor: header.border, background: header.bg }}
                  onClick={() => onAddCard(grp)}
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" style={{ color: header.color, opacity: 0.5 }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add a card for {header.label}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Other prizes */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Other Prizes
        </h3>

        <div className="flex flex-col gap-2">
          {nonCardPrizes.map((prize) => (
            <button
              key={String(prize._id)}
              onClick={() => onPrizeClick(prize)}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:opacity-90"
              style={{ background: "var(--surface-gradient)", border: "1px solid var(--border)" }}
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

          {/* Add prize card */}
          <div
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-4 cursor-pointer transition-colors hover:brightness-125 border border-dashed"
            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.02)" }}
            onClick={() => onAddPrize()}
          >
            <Plus className="w-4 h-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Add a new prize</span>
          </div>
        </div>
      </div>
    </div>
  );
}
