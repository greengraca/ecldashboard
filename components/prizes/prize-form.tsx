"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
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
  r2_key?: string | null;
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
  const [uploadedR2Key, setUploadedR2Key] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [value, setValue] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("custom");
  const [placement, setPlacement] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientUid, setRecipientUid] = useState("");
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("pending");
  const [status, setStatus] = useState<PrizeStatus>("planned");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prize) {
      setCategory(prize.category);
      setName(prize.name);
      setDescription(prize.description);
      setImageUrl(prize.image_url || "");
      setUploadedR2Key(prize.r2_key || null);
      setPreviewUrl(prize.r2_key ? (prize.image_url || null) : null);
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
      setUploadedR2Key(null);
      setPreviewUrl(null);
      setValue("");
      setRecipientType("custom");
      setPlacement("");
      setRecipientName("");
      setRecipientUid("");
      setShippingStatus("pending");
      setStatus("planned");
    }
  }, [prize, open]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "Prizes");

      const res = await fetch("/api/media/drive/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { data } = await res.json();
      setUploadedR2Key(data.r2Key);
      setImageUrl("");
    } catch {
      setPreviewUrl(null);
      setUploadedR2Key(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleRemoveUpload() {
    setPreviewUrl(null);
    setUploadedR2Key(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalImageUrl = uploadedR2Key ? null : imageUrl || null;
      await onSubmit({
        month: defaultMonth,
        category,
        name,
        description,
        image_url: finalImageUrl,
        r2_key: uploadedR2Key || null,
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
              Image
            </label>
            <div
              className="rounded-lg p-3 flex flex-col items-center gap-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
            >
              {(previewUrl || (!uploadedR2Key && imageUrl)) ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl || imageUrl}
                    alt={name || "Prize"}
                    className="rounded-lg"
                    style={{ maxHeight: 120, width: "auto" }}
                  />
                  {uploadedR2Key && (
                    <button
                      type="button"
                      onClick={handleRemoveUpload}
                      className="absolute -top-2 -right-2 p-1 rounded-full"
                      style={{ background: "var(--error)", color: "#fff" }}
                      title="Remove uploaded image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="w-full py-4 text-center rounded-lg border border-dashed"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  <p className="text-xs">Upload an image or paste a URL below</p>
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
                Upload Image
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {!uploadedR2Key && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={inputClass}
                  style={{ ...inputStyle, fontSize: "0.75rem" }}
                  placeholder="Or paste URL: https://..."
                />
              )}
            </div>
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
            disabled={submitting || uploading}
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
