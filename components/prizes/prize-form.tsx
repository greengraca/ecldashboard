"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/dashboard/modal";
import Select from "@/components/dashboard/select";
import type { Prize, PrizeCategory, RecipientType, ShippingStatus, PrizeStatus } from "@/lib/types";

const CATEGORY_OPTIONS = [
  { value: "mtg_single", label: "MTG Single" },
  { value: "sponsor", label: "Sponsor" },
  { value: "treasure_pod", label: "Treasure Pod" },
  { value: "ticket", label: "Ticket" },
  { value: "ring", label: "Ring" },
  { value: "other", label: "Other" },
];

const RECIPIENT_TYPE_OPTIONS = [
  { value: "placement", label: "Placement" },
  { value: "most_games", label: "Most Games" },
  { value: "treasure_pod", label: "Treasure Pod" },
  { value: "top16", label: "Top 16" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "awarded", label: "Awarded" },
];

const SHIPPING_OPTIONS = [
  { value: "not_applicable", label: "Not Applicable" },
  { value: "pending", label: "Pending" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

interface PrizeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PrizeFormData) => Promise<void>;
  prize?: Prize;
  defaultMonth: string;
}

export interface PrizeFormData {
  month: string;
  category: PrizeCategory;
  name: string;
  description: string;
  image_url: string | null;
  value: number;
  recipient_type: RecipientType;
  placement: number | null;
  recipient_uid: string | null;
  recipient_name: string;
  recipient_discord_id: string | null;
  shipping_status: ShippingStatus;
  status: PrizeStatus;
}

export default function PrizeForm({
  open,
  onClose,
  onSubmit,
  prize,
  defaultMonth,
}: PrizeFormProps) {
  const [category, setCategory] = useState<PrizeCategory>("other");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [value, setValue] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("custom");
  const [placement, setPlacement] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientUid, setRecipientUid] = useState("");
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("pending");
  const [status, setStatus] = useState<PrizeStatus>("planned");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prize) {
      setCategory(prize.category);
      setName(prize.name);
      setDescription(prize.description);
      setImageUrl(prize.image_url || "");
      setValue(prize.value.toString());
      setRecipientType(prize.recipient_type);
      setPlacement(prize.placement?.toString() || "");
      setRecipientName(prize.recipient_name);
      setRecipientUid(prize.recipient_uid || "");
      setShippingStatus(prize.shipping_status);
      setStatus(prize.status);
    } else {
      setCategory("other");
      setName("");
      setDescription("");
      setImageUrl("");
      setValue("");
      setRecipientType("custom");
      setPlacement("");
      setRecipientName("");
      setRecipientUid("");
      setShippingStatus("pending");
      setStatus("planned");
    }
  }, [prize, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        month: defaultMonth,
        category,
        name,
        description,
        image_url: imageUrl || null,
        value: Number(value) || 0,
        recipient_type: recipientType,
        placement: recipientType === "placement" ? Number(placement) || null : null,
        recipient_uid: recipientUid || null,
        recipient_name: recipientName,
        recipient_discord_id: null,
        shipping_status: shippingStatus,
        status,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--bg-page)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={prize ? "Edit Prize" : "Add Prize"}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Category
            </label>
            <Select
              value={category}
              onChange={(v) => setCategory(v as PrizeCategory)}
              options={CATEGORY_OPTIONS}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Status
            </label>
            <Select
              value={status}
              onChange={(v) => setStatus(v as PrizeStatus)}
              options={STATUS_OPTIONS}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
            style={inputStyle}
            placeholder="e.g., Chrome Mox"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
            style={inputStyle}
            placeholder="Optional details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Value (EUR)
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min="0"
              step="0.01"
              className={inputClass}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Recipient Type
            </label>
            <Select
              value={recipientType}
              onChange={(v) => setRecipientType(v as RecipientType)}
              options={RECIPIENT_TYPE_OPTIONS}
              className="w-full"
            />
          </div>
          {recipientType === "placement" && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Placement
              </label>
              <input
                type="number"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                min="1"
                max="16"
                className={inputClass}
                style={inputStyle}
                placeholder="1-4"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Recipient Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
              placeholder="Player name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
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
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Shipping
          </label>
          <Select
            value={shippingStatus}
            onChange={(v) => setShippingStatus(v as ShippingStatus)}
            options={SHIPPING_OPTIONS}
            className="w-full"
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
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              backdropFilter: "blur(8px)",
            }}
          >
            {submitting ? "Saving..." : prize ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
