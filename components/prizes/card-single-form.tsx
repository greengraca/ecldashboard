"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Loader2, X, Sparkles, FolderOpen } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import Select from "@/components/dashboard/select";
import CardImage from "@/components/media/shared/CardImage";
import DrivePickerModal, { type DrivePickerResult } from "@/components/media/drive/DrivePickerModal";
import type { Prize, RecipientType } from "@/lib/types";
import type { PrizeFormData } from "./prize-form";

const CONDITION_OPTIONS = [
  { value: "NM", label: "NM — Near Mint" },
  { value: "EX", label: "EX — Excellent" },
  { value: "GD", label: "GD — Good" },
  { value: "LP", label: "LP — Lightly Played" },
  { value: "PL", label: "PL — Played" },
  { value: "PO", label: "PO — Poor" },
];

export type CardGroup = "top4" | "most_games" | "custom";

export const CARD_GROUP_OPTIONS: { value: CardGroup; label: string }[] = [
  { value: "top4", label: "Top 4" },
  { value: "most_games", label: "Most Games" },
  { value: "custom", label: "Other" },
];

function groupToRecipient(group: CardGroup): { recipient_type: RecipientType; placement: number | null } {
  switch (group) {
    case "top4": return { recipient_type: "placement", placement: null };
    case "most_games": return { recipient_type: "most_games", placement: null };
    default: return { recipient_type: "custom", placement: null };
  }
}

export function prizeToGroup(prize: Prize): CardGroup {
  if (prize.recipient_type === "placement") return "top4";
  if (prize.recipient_type === "most_games") return "most_games";
  return "custom";
}

interface CardSingleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PrizeFormData) => Promise<void>;
  prize?: Prize;
  defaultMonth: string;
  defaultGroup?: CardGroup;
}

export default function CardSingleForm({
  open,
  onClose,
  onSubmit,
  prize,
  defaultMonth,
  defaultGroup,
}: CardSingleFormProps) {
  const [group, setGroup] = useState<CardGroup>(prize ? prizeToGroup(prize) : defaultGroup || "top4");
  const [cardName, setCardName] = useState(prize?.name || "");
  const [scryfallUrl, setScryfallUrl] = useState<string | null>(prize?.image_url || null);
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null);
  const [uploadedR2Key, setUploadedR2Key] = useState<string | null>(prize?.r2_key || null);
  const [value, setValue] = useState(prize?.value?.toString() || "");
  const [condition, setCondition] = useState(prize?.condition || "NM");
  const [cardLanguage, setCardLanguage] = useState(prize?.card_language || "en");
  const [setName, setSetName] = useState(prize?.set_name || "");
  const [description, setDescription] = useState(prize?.description || "");
  const [recipientName, setRecipientName] = useState(prize?.recipient_name || "");
  const [recipientUid, setRecipientUid] = useState(prize?.recipient_uid || "");
  const [foil, setFoil] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{ name: string; size: number; mimeType: string; thumbR2Key?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (open) {
      setGroup(prize ? prizeToGroup(prize) : defaultGroup || "top4");
      setCardName(prize?.name || "");
      setScryfallUrl(prize?.image_url || null);
      setOverrideUrl(null);
      setUploadedR2Key(prize?.r2_key || null);
      setValue(prize?.value?.toString() || "");
      setCondition(prize?.condition || "NM");
      setCardLanguage(prize?.card_language || "en");
      setSetName(prize?.set_name || "");
      setDescription(prize?.description || "");
      setRecipientName(prize?.recipient_name || "");
      setRecipientUid(prize?.recipient_uid || "");
      setFoil(false);
      setUploadMeta(null);
    }
  }, [open, prize, defaultGroup]);

  const handleCardChange = useCallback((name: string, imageUrl: string | null) => {
    setCardName(name);
    setScryfallUrl(imageUrl);
  }, []);

  const handleEditionChange = useCallback((sName: string | null, lang: string) => {
    if (sName) setSetName(sName);
    setCardLanguage(lang);
  }, []);

  const handlePriceChange = useCallback((price: number | null) => {
    if (price != null) {
      setValue(Math.round(price).toString());
    }
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

    setOverrideUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "Prizes");
      formData.append("skipMetadata", "true");

      const res = await fetch("/api/media/drive/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { data } = await res.json();
      setUploadedR2Key(data.r2Key);
      setUploadMeta({ name: data.name, size: data.size, mimeType: data.mimeType, thumbR2Key: data.thumbR2Key });
    } catch {
      setOverrideUrl(null);
      setUploadedR2Key(null);
      setUploadMeta(null);
    } finally {
      setUploading(false);
    }
  }

  function handleDriveSelect(file: DrivePickerResult) {
    setOverrideUrl(file.previewUrl);
    setUploadedR2Key(file.r2Key);
    setUploadMeta({ name: file.name, size: file.size, mimeType: file.mimeType });
    // Auto-fill card fields from stored metadata
    if (file.cardMeta) {
      if (file.cardMeta.cardName) setCardName(file.cardMeta.cardName);
      if (file.cardMeta.setName) setSetName(file.cardMeta.setName);
      if (file.cardMeta.cardLanguage) setCardLanguage(file.cardMeta.cardLanguage);
      if (file.cardMeta.condition) setCondition(file.cardMeta.condition);
      if (file.cardMeta.value != null) setValue(file.cardMeta.value.toString());
    }
  }

  type UploadResult = { r2Key: string; meta: { name: string; size: number; mimeType: string; thumbR2Key?: string } };

  /** Composite card + foil overlay on a canvas and upload the result */
  async function compositeFoilImage(): Promise<UploadResult | null> {
    const imgEl = cardImgRef.current;
    if (!imgEl) return null;

    // Load the card image onto a canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Wait for card image to be fully loaded
    const cardImg = new Image();
    cardImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      cardImg.onload = () => resolve();
      cardImg.onerror = () => reject(new Error("Failed to load card image"));
      cardImg.src = imgEl.src;
    });

    canvas.width = cardImg.naturalWidth;
    canvas.height = cardImg.naturalHeight;

    // Draw card
    ctx.drawImage(cardImg, 0, 0);

    // Load and draw foil overlay
    const foilImg = new Image();
    await new Promise<void>((resolve, reject) => {
      foilImg.onload = () => resolve();
      foilImg.onerror = () => reject(new Error("Failed to load foil overlay"));
      foilImg.src = "/media/assets/foil-overlay.png";
    });

    ctx.drawImage(foilImg, 0, 0, canvas.width, canvas.height);

    // Export as blob and upload
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) return null;

    const foilName = `${cardName || "card"}-foil.png`;
    const formData = new FormData();
    formData.append("file", blob, foilName);
    formData.append("folder", "Prizes");
    formData.append("skipMetadata", "true");

    const res = await fetch("/api/media/drive/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;
    const { data } = await res.json();
    const meta = { name: data.name || foilName, size: data.size || blob.size, mimeType: "image/png", thumbR2Key: data.thumbR2Key };
    setUploadMeta(meta);
    return { r2Key: data.r2Key, meta };
  }

  /** Download a proxied image and upload to R2 */
  async function uploadImageToR2(imageUrl: string, fileName: string): Promise<UploadResult | null> {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();

      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("folder", "Prizes");
      formData.append("skipMetadata", "true");

      const uploadRes = await fetch("/api/media/drive/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) return null;
      const { data } = await uploadRes.json();
      const meta = { name: data.name || fileName, size: data.size || blob.size, mimeType: blob.type || "image/png", thumbR2Key: data.thumbR2Key };
      setUploadMeta(meta);
      return { r2Key: data.r2Key, meta };
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalR2Key = uploadedR2Key || null;
      let finalMeta = uploadMeta;

      if (foil && displayUrl) {
        // Foil composite: canvas merge + upload
        const result = await compositeFoilImage();
        if (result) { finalR2Key = result.r2Key; finalMeta = result.meta; }
      } else if (!finalR2Key && scryfallUrl) {
        // Plain Scryfall image: download and upload to R2
        const fileName = `${cardName || "card"}.png`;
        const result = await uploadImageToR2(scryfallUrl, fileName);
        if (result) { finalR2Key = result.r2Key; finalMeta = result.meta; }
      }

      const { recipient_type, placement } = groupToRecipient(group);

      await onSubmit({
        month: defaultMonth,
        category: "mtg_single",
        name: cardName,
        description,
        image_url: null,
        r2_key: finalR2Key,
        r2_upload_meta: finalR2Key && finalMeta ? finalMeta : null,
        value: Number(value) || 0,
        condition,
        card_language: cardLanguage,
        set_name: setName || null,
        recipient_type,
        placement,
        recipient_uid: recipientUid || null,
        recipient_name: recipientName,
        recipient_discord_id: null,
        shipping_status: "pending",
        status: "confirmed",
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
      disableBackdropClose
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
            showEditionPicker
            onPriceChange={handlePriceChange}
            onEditionChange={handleEditionChange}
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
                ref={cardImgRef}
                src={displayUrl}
                alt={cardName || "Card"}
                className="rounded-lg"
                style={{ maxHeight: 200, width: "auto" }}
              />
              {/* Foil overlay */}
              {foil && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/media/assets/foil-overlay.png"
                  alt=""
                  className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                />
              )}
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

          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => setDrivePickerOpen(true)}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
            >
              <FolderOpen className="w-3 h-3" />
              From Drive
            </button>
            {displayUrl && (
              <button
                type="button"
                onClick={() => setFoil(!foil)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: foil ? "rgba(251, 191, 36, 0.2)" : "var(--bg-hover)",
                  color: foil ? "var(--accent)" : "var(--text-secondary)",
                  border: foil ? "1px solid rgba(251, 191, 36, 0.35)" : "1px solid transparent",
                }}
              >
                <Sparkles className="w-3 h-3" />
                Foil
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Card Group */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            For
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CARD_GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGroup(opt.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: group === opt.value ? "rgba(251, 191, 36, 0.2)" : "rgba(255,255,255,0.05)",
                  color: group === opt.value ? "var(--accent)" : "var(--text-muted)",
                  border: `1px solid ${group === opt.value ? "rgba(251, 191, 36, 0.35)" : "var(--border)"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Value + Condition */}
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
              Condition
            </label>
            <Select
              value={condition}
              onChange={(v) => setCondition(v)}
              options={CONDITION_OPTIONS}
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

        {/* Recipient (optional — filled when winner is known) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Recipient Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="TBD (filled when winner is known)"
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
      <DrivePickerModal
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelect={handleDriveSelect}
        initialFolder="Prizes"
      />
    </Modal>
  );
}
