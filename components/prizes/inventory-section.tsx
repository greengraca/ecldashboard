"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Package, ChevronDown, ShoppingCart, Pencil, Trash2, Loader2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { InventoryCard, CardOrder } from "@/lib/types";
import ConfirmModal from "@/components/dashboard/confirm-modal";

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  in_stock: { label: "In Stock", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  assigned: { label: "Assigned", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
};

type SubView = "cards" | "orders";
type StatusFilter = "in_stock" | "assigned" | "all";

interface InventorySectionProps {
  onAssignCard: (card: InventoryCard) => void;
  onNewOrder: () => void;
  refreshKey?: number;
}

export default function InventorySection({
  onAssignCard,
  onNewOrder,
  refreshKey,
}: InventorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [subView, setSubView] = useState<SubView>("cards");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<CardOrder | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: inventoryData,
    mutate: mutateInventory,
  } = useSWR<{ data: InventoryCard[]; summary: { in_stock: number; assigned: number; orders: number } }>(
    "/api/prizes/inventory",
    fetcher
  );

  const {
    data: ordersData,
    mutate: mutateOrders,
  } = useSWR<{ data: CardOrder[] }>(
    expanded ? "/api/prizes/inventory/orders" : null,
    fetcher
  );

  useEffect(() => {
    if (refreshKey) {
      mutateInventory();
      mutateOrders();
    }
  }, [refreshKey, mutateInventory, mutateOrders]);

  const cards = inventoryData?.data || [];
  const summary = inventoryData?.summary || { in_stock: 0, assigned: 0, orders: 0 };
  const orders = ordersData?.data || [];

  const filteredCards = statusFilter === "all"
    ? cards
    : cards.filter((c) => c.status === statusFilter);

  async function handleDeleteOrder() {
    if (!deleteOrder) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/prizes/inventory/orders/${deleteOrder._id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setDeleteError(body?.error || "Delete failed");
        setDeleting(false);
        return;
      }
      setDeleteOrder(null);
      mutateInventory();
      mutateOrders();
    } catch {
      setDeleteError("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        {/* Collapsed header bar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
          style={{
            background: "var(--surface-gradient)",
            border: "1px solid var(--surface-border)",
            backdropFilter: "var(--surface-blur)",
          }}
        >
          <Package className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Card Inventory
          </span>

          <div className="flex items-center gap-2 ml-auto mr-2">
            {summary.in_stock > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded font-medium"
                style={{ color: "#22c55e", background: "rgba(34,197,94,0.12)" }}
              >
                {summary.in_stock} in stock
              </span>
            )}
            {summary.assigned > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded font-medium"
                style={{ color: "#3b82f6", background: "rgba(59,130,246,0.12)" }}
              >
                {summary.assigned} assigned
              </span>
            )}
            {summary.orders > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded font-medium"
                style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
              >
                {summary.orders} order{summary.orders !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <ChevronDown
            className="w-4 h-4 shrink-0 transition-transform"
            style={{
              color: "var(--text-muted)",
              transform: expanded ? "rotate(180deg)" : undefined,
            }}
          />
        </button>

        {/* Expanded content */}
        {expanded && (
          <div
            className="mt-2 rounded-xl px-4 py-4"
            style={{
              background: "var(--surface-gradient)",
              border: "1px solid var(--surface-border)",
              backdropFilter: "var(--surface-blur)",
            }}
          >
            {/* Sub-view toggle + actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {(["cards", "orders"] as SubView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSubView(v)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded transition-colors"
                    style={{
                      background: subView === v ? "rgba(251,191,36,0.12)" : "transparent",
                      color: subView === v ? "var(--accent)" : "var(--text-muted)",
                      border: subView === v ? "1px solid rgba(251,191,36,0.25)" : "1px solid transparent",
                    }}
                  >
                    {v === "cards" ? "Cards" : "Orders"}
                  </button>
                ))}
              </div>

              <button
                onClick={onNewOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors hover:brightness-125"
                style={{
                  background: "rgba(251,191,36,0.12)",
                  color: "var(--accent)",
                  border: "1px solid rgba(251,191,36,0.25)",
                }}
              >
                <ShoppingCart className="w-3 h-3" /> New Order
              </button>
            </div>

            {/* Cards sub-view */}
            {subView === "cards" && (
              <>
                {/* Filter bar */}
                <div className="flex gap-1 mb-3">
                  {(["all", "in_stock", "assigned"] as StatusFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className="text-[10px] font-medium px-2.5 py-1 rounded transition-colors"
                      style={{
                        background: statusFilter === f ? "rgba(255,255,255,0.08)" : "transparent",
                        color: statusFilter === f ? "var(--text-primary)" : "var(--text-muted)",
                        border: statusFilter === f ? "1px solid var(--border)" : "1px solid transparent",
                      }}
                    >
                      {f === "all" ? "All" : f === "in_stock" ? "In Stock" : "Assigned"}
                    </button>
                  ))}
                </div>

                {filteredCards.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {cards.length === 0 ? "No cards in inventory yet" : "No cards match filter"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
                    {filteredCards.map((card) => (
                      <button
                        key={String(card._id)}
                        onClick={() => card.status === "in_stock" && onAssignCard(card)}
                        className="w-full p-0 rounded-lg overflow-hidden text-left transition-transform hover:scale-[1.02]"
                        style={{
                          background: "var(--surface-gradient)",
                          border: `1px solid ${card.status === "in_stock" ? "rgba(34,197,94,0.25)" : "rgba(59,130,246,0.25)"}`,
                          cursor: card.status === "in_stock" ? "pointer" : "default",
                          opacity: card.status === "assigned" ? 0.7 : 1,
                        }}
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
                            <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                              €{card.computed_cost.toFixed(2)}
                            </span>
                            <span
                              className="text-[8px] px-1 py-0.5 rounded"
                              style={{ color: STATUS_BADGE[card.status]?.color, background: STATUS_BADGE[card.status]?.bg }}
                            >
                              {STATUS_BADGE[card.status]?.label}
                            </span>
                          </div>
                          {card.status === "assigned" && card.assigned_month && (
                            <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                              {card.assigned_month}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Orders sub-view */}
            {subView === "orders" && (
              <>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>No orders yet</p>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                          {["Date", "Seller", "Cards", "Total", ""].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2"
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "var(--text-muted)",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const isExpanded = expandedOrderId === String(order._id);
                          return (
                            <OrderRow
                              key={String(order._id)}
                              order={order}
                              isExpanded={isExpanded}
                              onToggle={() => setExpandedOrderId(isExpanded ? null : String(order._id))}
                              onDelete={() => { setDeleteOrder(order); setDeleteError(null); }}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete order confirmation */}
      <ConfirmModal
        open={!!deleteOrder}
        onClose={() => setDeleteOrder(null)}
        onConfirm={handleDeleteOrder}
        title="Delete Order"
        message={deleteError || `Delete order from ${deleteOrder?.seller} (${deleteOrder?.card_count} cards, €${((deleteOrder?.total_cards_cost || 0) + (deleteOrder?.shipping_cost || 0)).toFixed(2)})?`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="danger"
      />
    </>
  );
}

// ─── Order Row with expandable card list ───

function OrderRow({
  order,
  isExpanded,
  onToggle,
  onDelete,
}: {
  order: CardOrder;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const total = order.total_cards_cost + order.shipping_cost;
  const hasAssigned = cards.some((c) => c.status === "assigned");

  useEffect(() => {
    if (isExpanded && cards.length === 0) {
      setLoadingCards(true);
      fetch(`/api/prizes/inventory?status=`)
        .then((r) => r.json())
        .then((res) => {
          const orderCards = (res.data as InventoryCard[]).filter(
            (c) => c.order_id === String(order._id)
          );
          setCards(orderCards);
        })
        .catch(() => {})
        .finally(() => setLoadingCards(false));
    }
  }, [isExpanded, cards.length, order._id]);

  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{ borderTop: "1px solid var(--border)" }}
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-xs" style={{ color: "var(--text-primary)" }}>{order.date}</td>
        <td className="px-3 py-2 text-xs" style={{ color: "var(--text-primary)" }}>{order.seller}</td>
        <td className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>{order.card_count}</td>
        <td className="px-3 py-2 text-xs font-medium" style={{ color: "var(--accent)" }}>€{total.toFixed(2)}</td>
        <td className="px-3 py-2 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded transition-colors hover:brightness-125"
            style={{ color: "var(--text-muted)" }}
            title={hasAssigned ? "Cannot delete: has assigned cards" : "Delete order"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-3 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
            {loadingCards ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : cards.length === 0 ? (
              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>No cards found</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {cards.map((card) => (
                  <div
                    key={String(card._id)}
                    className="rounded-lg overflow-hidden"
                    style={{
                      background: "var(--surface-gradient)",
                      border: `1px solid ${card.status === "in_stock" ? "rgba(34,197,94,0.25)" : "rgba(59,130,246,0.25)"}`,
                    }}
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
                        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>No img</span>
                      </div>
                    )}
                    <div className="p-1">
                      <div className="text-[9px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{card.name}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px]" style={{ color: "var(--accent)" }}>€{card.computed_cost.toFixed(2)}</span>
                        <span
                          className="text-[7px] px-1 rounded"
                          style={{ color: STATUS_BADGE[card.status]?.color, background: STATUS_BADGE[card.status]?.bg }}
                        >
                          {STATUS_BADGE[card.status]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {order.shipping_cost > 0 && (
              <div className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                Shipping: €{order.shipping_cost.toFixed(2)} (€{(order.shipping_cost / order.card_count).toFixed(2)}/card)
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
