"use client";

import { useState, useMemo } from "react";
import { Plus, Package, CheckCircle, Truck, Clock } from "lucide-react";
import type { Prize, ShippingStatus } from "@/lib/types";

const SHIPPING_FILTERS: { key: ShippingStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const SHIPPING_BADGE: Record<string, { label: string; color: string; bg: string; icon: typeof Package }> = {
  not_applicable: { label: "N/A", color: "var(--text-muted)", bg: "rgba(255,255,255,0.05)", icon: Package },
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: Clock },
  shipped: { label: "Shipped", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: Truck },
  delivered: { label: "Delivered", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
};

interface CardGalleryProps {
  prizes: Prize[];
  isLoading: boolean;
  onAddCard: () => void;
  onCardClick: (prize: Prize) => void;
}

export default function CardGallery({ prizes, isLoading, onAddCard, onCardClick }: CardGalleryProps) {
  const [filter, setFilter] = useState<ShippingStatus | "all">("all");

  const cards = useMemo(() => {
    const mtgCards = prizes.filter((p) => p.category === "mtg_single");
    if (filter === "all") return mtgCards;
    return mtgCards.filter((p) => p.shipping_status === filter);
  }, [prizes, filter]);

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{
          background: "var(--surface-gradient)",
          backdropFilter: "var(--surface-blur)",
          border: "1.5px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "var(--surface-shadow)",
        }}
      >
        <div
          className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
        <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>Loading cards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter pills */}
        <div className="flex items-center gap-1">
          {SHIPPING_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: filter === f.key ? "rgba(251,191,36,0.15)" : "transparent",
                color: filter === f.key ? "var(--accent)" : "var(--text-muted)",
                border: filter === f.key ? "1px solid rgba(251,191,36,0.35)" : "1px solid transparent",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={onAddCard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Card
        </button>
      </div>

      {/* Gallery grid */}
      {cards.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {filter === "all" ? "No card singles yet. Add one to get started." : `No ${filter} cards.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {cards.map((card) => {
            const shipping = SHIPPING_BADGE[card.shipping_status] || SHIPPING_BADGE.pending;
            const ShipIcon = shipping.icon;

            return (
              <button
                key={String(card._id)}
                onClick={() => onCardClick(card)}
                className="rounded-xl overflow-hidden text-left transition-all group"
                style={{
                  background: "var(--surface-gradient)",
                  backdropFilter: "var(--surface-blur)",
                  border: "1.5px solid rgba(255, 255, 255, 0.10)",
                  boxShadow: "var(--surface-shadow)",
                }}
              >
                {/* Card image */}
                <div
                  className="aspect-[5/7] w-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  {card.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={card.image_url}
                      alt={card.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}
                </div>

                {/* Card info */}
                <div className="p-3 space-y-2">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {card.name}
                  </p>

                  <div className="flex items-center justify-between">
                    {card.value > 0 && (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--accent)" }}
                      >
                        &euro;{card.value.toFixed(2)}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: shipping.bg, color: shipping.color }}
                    >
                      <ShipIcon className="w-3 h-3" />
                      {shipping.label}
                    </span>
                  </div>

                  {card.recipient_name && (
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {card.recipient_name}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
