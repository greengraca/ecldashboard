"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { MediaFile } from "@/lib/types";

interface DrivePreviewModalProps {
  item: MediaFile;
  previewUrl: string | null;
  allFiles: MediaFile[];
  onClose: () => void;
  onNavigate: (item: MediaFile) => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DrivePreviewModal({
  item,
  previewUrl,
  allFiles,
  onClose,
  onNavigate,
}: DrivePreviewModalProps) {
  const [zoomed, setZoomed] = useState(false);
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");

  // Fetch preview URL for items that don't have one (videos, non-images)
  useEffect(() => {
    setFetchedUrl(null);
    if (previewUrl || (!isImage && !isVideo)) return;
    fetch(`/api/media/drive/${item._id}/preview`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.previewUrl) setFetchedUrl(d.data.previewUrl);
      })
      .catch(() => {});
  }, [item._id, previewUrl, isImage, isVideo]);

  const resolvedUrl = previewUrl || fetchedUrl;

  const currentIndex = allFiles.findIndex((f) => f._id === item._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev)
        onNavigate(allFiles[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext)
        onNavigate(allFiles[currentIndex + 1]);
    },
    [onClose, onNavigate, allFiles, currentIndex, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.9)" }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {item.name}
          </span>
          <span
            className="text-xs flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            {formatSize(item.size)}
            {item.uploadedBy && ` · ${item.uploadedBy}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isImage && (
            <button
              onClick={() => setZoomed(!zoomed)}
              className="p-2 rounded-lg"
              style={{
                color: "var(--text-secondary)",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              {zoomed ? (
                <ZoomOut className="w-5 h-5" />
              ) : (
                <ZoomIn className="w-5 h-5" />
              )}
            </button>
          )}
          <a
            href={`/api/media/drive/${item._id}/download`}
            className="p-2 rounded-lg"
            style={{
              color: "var(--text-secondary)",
              transition: "background 0.15s, color 0.15s",
            }}
            title="Download"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg"
            style={{
              color: "var(--text-secondary)",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full z-10"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            backdropFilter: "blur(8px)",
            transition:
              "background 0.15s, transform 0.15s, box-shadow 0.15s",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(allFiles[currentIndex - 1]);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform =
              "translateY(-50%) scale(1.1)";
            e.currentTarget.style.boxShadow =
              "0 4px 20px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.transform =
              "translateY(-50%) scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {hasNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full z-10"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            backdropFilter: "blur(8px)",
            transition:
              "background 0.15s, transform 0.15s, box-shadow 0.15s",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(allFiles[currentIndex + 1]);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform =
              "translateY(-50%) scale(1.1)";
            e.currentTarget.style.boxShadow =
              "0 4px 20px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.transform =
              "translateY(-50%) scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Content */}
      <div
        className="max-w-[90vw] max-h-[80vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && resolvedUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolvedUrl}
            alt={item.name}
            className="rounded-lg transition-transform"
            style={{
              maxWidth: zoomed ? "none" : "90vw",
              maxHeight: zoomed ? "none" : "80vh",
              objectFit: "contain",
              cursor: zoomed ? "zoom-out" : "zoom-in",
            }}
            onClick={() => setZoomed(!zoomed)}
          />
        ) : isVideo && resolvedUrl ? (
          <video
            src={resolvedUrl}
            controls
            autoPlay
            className="rounded-lg"
            style={{ maxWidth: "90vw", maxHeight: "80vh" }}
          />
        ) : (
          <div
            className="flex flex-col items-center gap-3 p-8 rounded-xl"
            style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
          >
            <p
              className="text-lg font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {item.name}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {item.mimeType || "Unknown type"} · {formatSize(item.size)}
            </p>
            <a
              href={`/api/media/drive/${item._id}/download`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm mt-2"
              style={{
                background: "rgba(251, 191, 36, 0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(251, 191, 36, 0.35)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
