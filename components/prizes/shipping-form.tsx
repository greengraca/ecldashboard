"use client";

import { useState } from "react";
import Modal from "@/components/dashboard/modal";
import type { Prize } from "@/lib/types";

interface ShippingFormProps {
  prize: Prize;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    shipping_status: string;
    tracking_number: string | null;
    shipping_date: string | null;
    shipping_notes: string | null;
  }) => Promise<void>;
}

export default function ShippingForm({ prize, open, onClose, onSubmit }: ShippingFormProps) {
  const [trackingNumber, setTrackingNumber] = useState(prize.tracking_number || "");
  const [shippingDate, setShippingDate] = useState(
    prize.shipping_date || new Date().toISOString().substring(0, 10)
  );
  const [notes, setNotes] = useState(prize.shipping_notes || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        shipping_status: "shipped",
        tracking_number: trackingNumber || null,
        shipping_date: shippingDate || null,
        shipping_notes: notes || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--bg-page)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <Modal open={open} onClose={onClose} title={`Ship: ${prize.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Tracking Number
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Shipping Date
          </label>
          <input
            type="date"
            value={shippingDate}
            onChange={(e) => setShippingDate(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
            style={inputStyle}
            placeholder="Shipping notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
            }}
          >
            {submitting ? "Saving..." : "Mark as Shipped"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
