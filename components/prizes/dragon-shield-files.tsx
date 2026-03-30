"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Upload, Loader2, Image as ImageIcon, X, Download } from "lucide-react";
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
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; driveId: string | null; filename: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function openPreview(file: DragonShieldFile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = file as any;
    const url = f.preview_url;
    if (url) {
      setPreviewFile({ url, driveId: f.drive_id || null, filename: file.filename });
    }
  }

  // Close on Escape
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setPreviewFile(null);
  }, []);
  useEffect(() => {
    if (!previewFile) return;
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [previewFile, handleEsc]);

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
    const isDragOver = dragOver === slotKey;

    return (
      <div
        key={slotKey}
        className="rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
        style={{
          background: isDragOver ? "rgba(251,191,36,0.12)" : file ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.03)",
          border: `1.5px solid ${isDragOver ? "rgba(251,191,36,0.4)" : file ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.10)"}`,
          boxShadow: "var(--surface-shadow)",
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDragOver(slotKey);
          }
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(null);
          const f = e.dataTransfer.files[0];
          if (f) handleUpload(slot, f);
        }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {slot.label}
        </div>

        {file ? (
          <div className="flex flex-col items-center gap-1.5 w-full flex-1">
            <div
              className="w-full rounded overflow-hidden"
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(file as any).preview_url ? (
                // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-explicit-any
                <img
                  src={(file as any).preview_url}
                  alt={file.filename}
                  className="w-full rounded cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => openPreview(file)}
                />
              ) : (
                <ImageIcon className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
              )}
            </div>
            <div className="text-[10px] truncate w-full text-center" style={{ color: "var(--text-muted)" }}>
              {file.filename}
            </div>
            <button
              onClick={() => fileInputRefs.current[slotKey]?.click()}
              className="text-[10px] px-2 py-1 rounded transition-colors hover:brightness-125"
              style={{ color: "var(--accent)" }}
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRefs.current[slotKey]?.click()}
            disabled={isUploading}
            className="w-full rounded-lg flex flex-col items-center justify-center gap-1 flex-1 transition-colors"
            style={{
              minHeight: 100,
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

      {/* Full-res lightbox */}
      {previewFile && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.9)" }}
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {previewFile.filename}
            </span>
            <div className="flex items-center gap-2">
              {previewFile.driveId && (
                <a
                  href={`/api/media/drive/${previewFile.driveId}/download`}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  title="Download original"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  <Download className="w-5 h-5" />
                </a>
              )}
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewFile.url}
              alt={previewFile.filename}
              className="rounded-lg"
              style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain" }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
