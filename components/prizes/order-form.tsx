"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import Select from "@/components/dashboard/select";
import CardImage from "@/components/media/shared/CardImage";
import type { CardOrder } from "@/lib/types";

const CONDITION_OPTIONS = [
  { value: "NM", label: "NM — Near Mint" },
  { value: "EX", label: "EX — Excellent" },
  { value: "GD", label: "GD — Good" },
  { value: "LP", label: "LP — Lightly Played" },
  { value: "PL", label: "PL — Played" },
  { value: "PO", label: "PO — Poor" },
];

interface CardRow {
  id: string;
  name: string;
  price: string;
  condition: string;
  card_language: string;
  set_name: string;
  image_url: string | null;
  scryfall_id: string | null;
}

function emptyCard(): CardRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: "",
    condition: "NM",
    card_language: "en",
    set_name: "",
    image_url: null,
    scryfall_id: null,
  };
}

interface OrderFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  order?: CardOrder;
}

const inputClass = "w-full rounded px-3 py-2 text-sm outline-none transition-colors";
const inputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
};

export default function OrderForm({ open, onClose, onSaved, order }: OrderFormProps) {
  const isEdit = !!order;

  const [date, setDate] = useState("");
  const [seller, setSeller] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [notes, setNotes] = useState("");
  const [cards, setCards] = useState<CardRow[]>([emptyCard()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (order) {
        setDate(order.date);
        setSeller(order.seller);
        setShippingCost(order.shipping_cost.toString());
        setNotes(order.notes || "");
        setCards([emptyCard()]);
      } else {
        setDate(new Date().toISOString().substring(0, 10));
        setSeller("");
        setShippingCost("0");
        setNotes("");
        setCards([emptyCard()]);
      }
      setError(null);
    }
  }, [open, order]);

  const updateCard = useCallback((id: string, updates: Partial<CardRow>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const totalCards = cards.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);
  const shipping = parseFloat(shippingCost) || 0;
  const perCardShipping = cards.length > 0 ? shipping / cards.length : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        const res = await fetch(`/api/prizes/inventory/orders/${order._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            seller,
            shipping_cost: shipping,
            notes: notes || null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Update failed");
        }
      } else {
        const cardData = cards.map((c) => ({
          name: c.name,
          price: parseFloat(c.price) || 0,
          condition: c.condition || null,
          card_language: c.card_language || null,
          set_name: c.set_name || null,
          image_url: c.image_url || null,
          scryfall_id: c.scryfall_id || null,
        }));

        const res = await fetch("/api/prizes/inventory/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            seller,
            shipping_cost: shipping,
            notes: notes || null,
            cards: cardData,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Create failed");
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Order" : "New Card Order"}
      maxWidth="max-w-2xl"
      disableBackdropClose
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Seller
            </label>
            <input
              type="text"
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="Cardmarket, LGS..."
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Shipping Cost (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Card rows (create mode only) */}
        {!isEdit && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Cards
              </label>
              <button
                type="button"
                onClick={() => setCards((prev) => [...prev, emptyCard()])}
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors hover:brightness-125"
                style={{
                  background: "rgba(251,191,36,0.12)",
                  color: "var(--accent)",
                  border: "1px solid rgba(251,191,36,0.25)",
                }}
              >
                <Plus className="w-3 h-3" /> Add Card
              </button>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {cards.map((card, idx) => (
                <CardRowForm
                  key={card.id}
                  card={card}
                  index={idx}
                  onUpdate={updateCard}
                  onRemove={cards.length > 1 ? () => removeCard(card.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer totals */}
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
        >
          <div className="flex gap-4">
            <span style={{ color: "var(--text-muted)" }}>
              Cards: <strong style={{ color: "var(--text-primary)" }}>€{totalCards.toFixed(2)}</strong>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Shipping: <strong style={{ color: "var(--text-primary)" }}>€{shipping.toFixed(2)}</strong>
            </span>
            {cards.length > 0 && (
              <span style={{ color: "var(--text-muted)" }}>
                Per card: <strong style={{ color: "var(--text-primary)" }}>€{perCardShipping.toFixed(2)}</strong>
              </span>
            )}
          </div>
          <span className="font-medium" style={{ color: "var(--accent)" }}>
            Total: €{(totalCards + shipping).toFixed(2)}
          </span>
        </div>

        {error && (
          <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>
        )}

        {/* Submit */}
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
            type="submit"
            disabled={submitting || (!isEdit && cards.every((c) => !c.name))}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors hover:brightness-110 disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "var(--bg-primary)",
            }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Update Order" : "Create Order"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Single card row in the order form ───

function CardRowForm({
  card,
  index,
  onUpdate,
  onRemove,
}: {
  card: CardRow;
  index: number;
  onUpdate: (id: string, updates: Partial<CardRow>) => void;
  onRemove?: () => void;
}) {
  const handleCardChange = useCallback(
    (name: string, imageUrl: string | null) => {
      onUpdate(card.id, { name, image_url: imageUrl });
    },
    [card.id, onUpdate]
  );

  const handleEditionChange = useCallback(
    (setName: string | null, lang: string) => {
      onUpdate(card.id, { set_name: setName || "", card_language: lang });
    },
    [card.id, onUpdate]
  );

  const handlePriceChange = useCallback(
    (price: number | null) => {
      if (price != null) {
        onUpdate(card.id, { price: price.toString() });
      }
    },
    [card.id, onUpdate]
  );

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          Card {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-0.5 rounded transition-colors hover:brightness-125"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Scryfall search */}
      <CardImage
        value={card.name}
        imageUrl={card.image_url}
        overrideUrl={null}
        onChange={handleCardChange}
        onOverride={() => {}}
        onPriceChange={handlePriceChange}
        onEditionChange={handleEditionChange}
        hidePreview
        showEditionPicker
      />

      {/* Price + condition row */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <label className="block text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Price (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={card.price}
            onChange={(e) => onUpdate(card.id, { price: e.target.value })}
            className={inputClass}
            style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px" }}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Condition</label>
          <Select
            value={card.condition}
            onChange={(v) => onUpdate(card.id, { condition: v })}
            options={CONDITION_OPTIONS}
            size="sm"
          />
        </div>
        <div>
          <label className="block text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Language</label>
          <input
            type="text"
            value={card.card_language}
            onChange={(e) => onUpdate(card.id, { card_language: e.target.value })}
            className={inputClass}
            style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px" }}
            placeholder="en"
          />
        </div>
      </div>
    </div>
  );
}
