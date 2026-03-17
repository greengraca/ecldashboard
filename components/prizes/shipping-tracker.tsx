"use client";

import { useState } from "react";
import { Package, Check, Truck } from "lucide-react";
import type { Prize } from "@/lib/types";
import ShippingForm from "./shipping-form";

const SHIPPING_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

interface ShippingTrackerProps {
  prizes: Prize[];
  onUpdateShipping: (
    id: string,
    data: {
      shipping_status: string;
      tracking_number?: string | null;
      shipping_date?: string | null;
      delivery_date?: string | null;
      shipping_notes?: string | null;
    }
  ) => Promise<void>;
}

export default function ShippingTracker({ prizes, onUpdateShipping }: ShippingTrackerProps) {
  const [filter, setFilter] = useState("all");
  const [shippingFormPrize, setShippingFormPrize] = useState<Prize | null>(null);

  const shippable = prizes.filter((p) => p.shipping_status !== "not_applicable");
  const filtered = filter === "all" ? shippable : shippable.filter((p) => p.shipping_status === filter);

  async function handleMarkDelivered(prize: Prize) {
    await onUpdateShipping(String(prize._id), {
      shipping_status: "delivered",
      delivery_date: new Date().toISOString().substring(0, 10),
    });
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {SHIPPING_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: filter === f.value ? "var(--accent-light)" : "transparent",
              color: filter === f.value ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-60">
                ({shippable.filter((p) => p.shipping_status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-12 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No prizes to ship
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((prize) => (
            <div
              key={String(prize._id)}
              className="rounded-lg border p-4 flex items-center gap-4"
              style={{
                background: "var(--surface-gradient)",
                backdropFilter: "var(--surface-blur)",
                border: "1.5px solid rgba(255, 255, 255, 0.10)",
                boxShadow: "var(--surface-shadow)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background:
                    prize.shipping_status === "delivered"
                      ? "rgba(34, 197, 94, 0.15)"
                      : prize.shipping_status === "shipped"
                        ? "rgba(59, 130, 246, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                }}
              >
                {prize.shipping_status === "delivered" ? (
                  <Check className="w-5 h-5" style={{ color: "#22c55e" }} />
                ) : prize.shipping_status === "shipped" ? (
                  <Truck className="w-5 h-5" style={{ color: "#3b82f6" }} />
                ) : (
                  <Package className="w-5 h-5" style={{ color: "#f59e0b" }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                  {prize.name}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {prize.recipient_name}
                  {prize.tracking_number && ` · ${prize.tracking_number}`}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {prize.shipping_status === "pending" && (
                  <button
                    onClick={() => setShippingFormPrize(prize)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#3b82f6",
                    }}
                  >
                    Mark Shipped
                  </button>
                )}
                {prize.shipping_status === "shipped" && (
                  <button
                    onClick={() => handleMarkDelivered(prize)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "rgba(34, 197, 94, 0.15)",
                      color: "#22c55e",
                    }}
                  >
                    Mark Delivered
                  </button>
                )}
                {prize.shipping_status === "delivered" && (
                  <span className="text-xs font-medium" style={{ color: "#22c55e" }}>
                    {prize.delivery_date || "Delivered"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shipping form modal */}
      {shippingFormPrize && (
        <ShippingForm
          prize={shippingFormPrize}
          open={!!shippingFormPrize}
          onClose={() => setShippingFormPrize(null)}
          onSubmit={async (data) => {
            await onUpdateShipping(String(shippingFormPrize._id), data);
            setShippingFormPrize(null);
          }}
        />
      )}
    </div>
  );
}
