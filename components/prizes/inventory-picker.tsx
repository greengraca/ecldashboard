"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Loader2, Package } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import Select from "@/components/dashboard/select";
import { fetcher } from "@/lib/fetcher";
import type { InventoryCard } from "@/lib/types";
import type { CardGroup } from "./card-single-form";

const CARD_GROUP_OPTIONS: { value: CardGroup; label: string }[] = [
  { value: "top4", label: "Top 4" },
  { value: "most_games", label: "Most Games" },
  { value: "custom", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "awarded", label: "Awarded" },
];

function groupToRecipient(group: CardGroup): { recipient_type: string; placement: number | null } {
  switch (group) {
    case "top4": return { recipient_type: "placement", placement: null };
    case "most_games": return { recipient_type: "most_games", placement: null };
    default: return { recipient_type: "custom", placement: null };
  }
}

interface InventoryPickerProps {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  card: InventoryCard | null;
  month: string;
  defaultGroup?: CardGroup;
}

export default function InventoryPicker({
  open,
  onClose,
  onAssigned,
  card: initialCard,
  month,
  defaultGroup,
}: InventoryPickerProps) {
  const [selectedCard, setSelectedCard] = useState<InventoryCard | null>(null);
  const [group, setGroup] = useState<CardGroup>(defaultGroup || "top4");
  const [placement, setPlacement] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientUid, setRecipientUid] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, mutate } = useSWR<{ data: InventoryCard[] }>(
    open && !initialCard ? "/api/prizes/inventory?status=in_stock" : null,
    fetcher
  );

  const availableCards = data?.data || [];
  const activeCard = initialCard || selectedCard;
  const showPicker = !activeCard;

  useEffect(() => {
    if (open) {
      setSelectedCard(null);
      setGroup(defaultGroup || "top4");
      setPlacement("");
      setRecipientName("");
      setRecipientUid("");
      setStatus("confirmed");
      setError(null);
    }
  }, [open, defaultGroup]);

  async function handleAssign() {
    if (!activeCard) return;
    setSubmitting(true);
    setError(null);

    const { recipient_type } = groupToRecipient(group);

    try {
      const res = await fetch(`/api/prizes/inventory/${activeCard._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          recipient_type,
          placement: group === "top4" && placement ? parseInt(placement, 10) : null,
          recipient_name: recipientName,
          recipient_uid: recipientUid || null,
          status,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Assignment failed");
        if (body?.error?.includes("not available")) {
          mutate();
        }
        setSubmitting(false);
        return;
      }

      onAssigned();
      onClose();
    } catch {
      setError("Assignment failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={showPicker ? "Select Card from Inventory" : "Assign to Prize"}
      maxWidth="max-w-xl"
    >
      {/* Step 1: Card picker */}
      {showPicker && (
        <>
          {availableCards.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No cards available in inventory</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
              {availableCards.map((card) => (
                <button
                  key={String(card._id)}
                  onClick={() => setSelectedCard(card)}
                  className="w-full p-0 rounded-lg overflow-hidden text-left transition-transform hover:scale-[1.03]"
                  style={{
                    background: "var(--surface-gradient)",
                    border: "1px solid rgba(34,197,94,0.25)",
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
                      {card.name}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                      €{card.computed_cost.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step 2: Assignment details */}
      {activeCard && (
        <div className="space-y-4">
          {/* Card preview */}
          <div
            className="flex gap-3 rounded-lg p-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
          >
            {activeCard.image_url && (
              <div className="w-20 shrink-0 rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeCard.image_url}
                  alt={activeCard.name}
                  className="w-full"
                  style={{ aspectRatio: "488/680", objectFit: "fill" }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{activeCard.name}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {[activeCard.set_name, activeCard.condition, activeCard.card_language !== "en" ? activeCard.card_language : null].filter(Boolean).join(" · ")}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: "var(--accent)" }}>
                €{activeCard.computed_cost.toFixed(2)}
              </div>
            </div>
            {!initialCard && (
              <button
                onClick={() => setSelectedCard(null)}
                className="text-[10px] self-start px-2 py-1 rounded"
                style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
              >
                Change
              </button>
            )}
          </div>

          {/* Group selector */}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Group
            </label>
            <div className="flex gap-1">
              {CARD_GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGroup(opt.value)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded transition-colors"
                  style={{
                    background: group === opt.value ? "rgba(251,191,36,0.12)" : "transparent",
                    color: group === opt.value ? "var(--accent)" : "var(--text-muted)",
                    border: group === opt.value ? "1px solid rgba(251,191,36,0.25)" : "1px solid transparent",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Placement (Top 4 only) */}
          {group === "top4" && (
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                Placement
              </label>
              <Select
                value={placement}
                onChange={setPlacement}
                options={[
                  { value: "1", label: "1st Place" },
                  { value: "2", label: "2nd Place" },
                  { value: "3", label: "3rd Place" },
                  { value: "4", label: "4th Place" },
                ]}
                placeholder="Select placement..."
                size="sm"
              />
            </div>
          )}

          {/* Recipient + status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="TBD"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                Status
              </label>
              <Select
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
                size="sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              TopDeck UID
            </label>
            <input
              type="text"
              value={recipientUid}
              onChange={(e) => setRecipientUid(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="Optional"
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm transition-colors"
              style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors hover:brightness-110 disabled:opacity-50"
              style={{
                background: "var(--accent)",
                color: "var(--bg-primary)",
              }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign to {month}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
