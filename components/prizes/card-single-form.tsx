"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import Select from "@/components/dashboard/select";
import CardImage from "@/components/media/shared/CardImage";
import type { Prize, ShippingStatus, PrizeStatus } from "@/lib/types";
import type { PrizeFormData } from "./prize-form";

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

interface CardSingleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PrizeFormData) => Promise<void>;
  prize?: Prize;
  defaultMonth: string;
}

export default function CardSingleForm({
  open,
  onClose,
  onSubmit,
  prize,
  defaultMonth,
}: CardSingleFormProps) {
  const [cardName, setCardName] = useState(prize?.name || "");
  const [scryfallUrl, setScryfallUrl] = useState<string | null>(prize?.image_url || null);
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null);
  const [uploadedR2Key, setUploadedR2Key] = useState<string | null>(prize?.r2_key || null);
  const [value, setValue] = useState(prize?.value?.toString() || "");
  const [description, setDescription] = useState(prize?.description || "");
  const [recipientName, setRecipientName] = useState(prize?.recipient_name || "");
  const [recipientUid, setRecipientUid] = useState(prize?.recipient_uid || "");
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>(prize?.shipping_status || "pending");
  const [status, setStatus] = useState<PrizeStatus>(prize?.status || "planned");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCardChange = useCallback((name: string, imageUrl: string | null) => {
    setCardName(name);
    setScryfallUrl(imageUrl);
  }, []);

  const handleOverride = useCallback((url: string | null) => {
    setOverrideUrl(url);
    if (!url) {
      setUploadedR2Key(null);
    }
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    setOverrideUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prefix", "prizes");

      const res = await fetch("/api/media/drive/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { data } = await res.json();
      setUploadedR2Key(data.r2Key);
    } catch {
      setOverrideUrl(null);
      setUploadedR2Key(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalImageUrl = overrideUrl && uploadedR2Key
        ? null // Will use r2_key for image resolution
        : scryfallUrl || null;

      await onSubmit({
        month: defaultMonth,
        category: "mtg_single",
        name: cardName,
        description,
        image_url: finalImageUrl,
        r2_key: uploadedR2Key || null,
        value: Number(value) || 0,
        recipient_type: "custom",
        placement: null,
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

  const displayUrl = overrideUrl || scryfallUrl;

  const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--bg-page)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={prize ? "Edit Card Single" : "Add Card Single"}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Scryfall search */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Card Name
          </label>
          <CardImage
            value={cardName}
            imageUrl={scryfallUrl}
            overrideUrl={overrideUrl}
            onChange={handleCardChange}
            onOverride={handleOverride}
            placeholder="Search Scryfall for a card..."
            hidePreview
          />
        </div>

        {/* Card image preview + upload */}
        <div
          className="rounded-lg p-4 flex flex-col items-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
        >
          {displayUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={cardName || "Card"}
                className="rounded-lg"
                style={{ maxHeight: 200, width: "auto" }}
              />
              {overrideUrl && (
                <button
                  type="button"
                  onClick={() => { setOverrideUrl(null); setUploadedR2Key(null); }}
                  className="absolute -top-2 -right-2 p-1 rounded-full"
                  style={{ background: "var(--error)", color: "#fff" }}
                  title="Remove uploaded image"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              )}
            </div>
          ) : (
            <div
              className="w-full py-8 text-center rounded-lg border border-dashed"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <p className="text-xs">Search for a card above or upload an image</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload Custom Image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Value + Status */}
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

        {/* Description */}
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
            placeholder="Optional details about the card..."
          />
        </div>

        {/* Recipient */}
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

        {/* Shipping */}
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

        {/* Actions */}
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
            disabled={submitting || uploading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
            }}
          >
            {submitting ? "Saving..." : prize ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
