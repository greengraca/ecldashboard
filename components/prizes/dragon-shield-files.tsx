"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import type { DragonShieldMonth, DragonShieldFile } from "@/lib/types";

interface DragonShieldFilesProps {
  data: DragonShieldMonth | null;
  month: string;
  onRefresh: () => void;
}

interface FileSlot {
  fileType: "sleeve" | "playmat";
  tier: string;
  label: string;
}

const SLEEVE_SLOTS: FileSlot[] = [
  { fileType: "sleeve", tier: "champion", label: "Champion Sleeve" },
  { fileType: "sleeve", tier: "top4", label: "Top 4 Sleeve" },
  { fileType: "sleeve", tier: "top16", label: "Top 16 Sleeve" },
];

const PLAYMAT_SLOTS: FileSlot[] = [
  { fileType: "playmat", tier: "champion", label: "Champion Playmat" },
  { fileType: "playmat", tier: "top4", label: "Top 4 Playmat" },
];

function getFile(data: DragonShieldMonth | null, fileType: string, tier: string): DragonShieldFile | null {
  if (!data) return null;
  if (fileType === "sleeve") {
    return data.sleeve_files[tier as keyof typeof data.sleeve_files] || null;
  }
  return data.playmat_files[tier as keyof typeof data.playmat_files] || null;
}

export default function DragonShieldFiles({ data, month, onRefresh }: DragonShieldFilesProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleUpload(slot: FileSlot, file: File) {
    const key = `${slot.fileType}-${slot.tier}`;
    setUploading(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", month);
      formData.append("fileType", slot.fileType);
      formData.append("tier", slot.tier);

      const res = await fetch("/api/prizes/dragon-shield/files", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showMsg("success", `${slot.label} uploaded`);
      onRefresh();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setUploading(null);
    }
  }

  function renderSlot(slot: FileSlot) {
    const slotKey = `${slot.fileType}-${slot.tier}`;
    const file = getFile(data, slot.fileType, slot.tier);
    const isUploading = uploading === slotKey;

    return (
      <div
        key={slotKey}
        className="rounded-lg p-3 flex flex-col items-center gap-2"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {slot.label}
        </div>

        {file ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div
              className="w-full rounded flex items-center justify-center"
              style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.03)", overflow: "hidden" }}
            >
              <ImageIcon className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="text-[10px] truncate w-full text-center" style={{ color: "var(--text-muted)" }}>
              {file.filename}
            </div>
            <button
              onClick={() => fileInputRefs.current[slotKey]?.click()}
              className="text-[10px] px-2 py-1 rounded"
              style={{ color: "var(--accent)" }}
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRefs.current[slotKey]?.click()}
            disabled={isUploading}
            className="w-full rounded-lg flex flex-col items-center justify-center gap-1 py-6 transition-colors"
            style={{
              border: "2px dashed var(--border)",
              color: "var(--text-muted)",
              opacity: isUploading ? 0.5 : 1,
            }}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span className="text-[10px]">Upload</span>
          </button>
        )}

        <input
          ref={(el) => { fileInputRefs.current[slotKey] = el; }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(slot, f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div
          className="text-xs px-3 py-2 rounded-lg mb-3"
          style={{
            background: message.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: message.type === "success" ? "#22c55e" : "#ef4444",
          }}
        >
          {message.text}
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Sleeve Designs</h4>
        <div className="grid grid-cols-3 gap-3">
          {SLEEVE_SLOTS.map(renderSlot)}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Playmat Designs</h4>
        <div className="grid grid-cols-2 gap-3">
          {PLAYMAT_SLOTS.map(renderSlot)}
        </div>
      </div>
    </div>
  );
}
