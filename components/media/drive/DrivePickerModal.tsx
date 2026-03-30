"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Folder, FolderOpen, ChevronRight, Loader2, ImageIcon } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import { fetcher } from "@/lib/fetcher";
import type { MediaFile, MediaFileCardMeta } from "@/lib/types";

export interface DrivePickerResult {
  previewUrl: string;
  r2Key: string;
  name: string;
  size: number;
  mimeType: string;
  cardMeta?: MediaFileCardMeta;
}

interface DrivePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: DrivePickerResult) => void;
  /** Root-level folder name to open into automatically (e.g. "Prizes") */
  initialFolder?: string;
}

export default function DrivePickerModal({ open, onClose, onSelect, initialFolder }: DrivePickerModalProps) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [resolvedInitial, setResolvedInitial] = useState(false);

  const { data, isLoading } = useSWR<{ data: MediaFile[]; breadcrumbs: { _id: string; name: string }[] }>(
    open ? `/api/media/drive?parentId=${folderId || ""}` : null,
    fetcher
  );

  const items = data?.data;
  const breadcrumbs = data?.breadcrumbs || [];

  // Reset when opening
  useEffect(() => {
    if (open) {
      setFolderId(null);
      setSelecting(null);
      setResolvedInitial(false);
    }
  }, [open]);

  // Auto-navigate into initialFolder once root listing loads
  useEffect(() => {
    if (!open || resolvedInitial || !initialFolder || !items || folderId !== null) return;
    const match = items.find((i) => i.type === "folder" && i.name === initialFolder);
    if (match) {
      setFolderId(match._id);
    }
    setResolvedInitial(true);
  }, [open, resolvedInitial, initialFolder, items, folderId]);

  const folders = items?.filter((i) => i.type === "folder") || [];
  const images = items?.filter((i) => i.type === "file" && i.mimeType?.startsWith("image/")) || [];

  const handleSelect = useCallback(async (file: MediaFile) => {
    if (!file.r2Key) return;
    setSelecting(file._id);
    const base = {
      r2Key: file.r2Key,
      name: file.name,
      size: file.size || 0,
      mimeType: file.mimeType || "image/png",
      cardMeta: file.cardMeta,
    };
    try {
      // Get full-size presigned URL
      const res = await fetch(`/api/media/drive/${file._id}/preview`);
      if (!res.ok) throw new Error("Failed to get preview URL");
      const { data: previewData } = await res.json();
      onSelect({ ...base, previewUrl: previewData.previewUrl });
      onClose();
    } catch {
      // Fallback to thumbnail URL
      if (file.previewUrl) {
        onSelect({ ...base, previewUrl: file.previewUrl });
        onClose();
      }
    } finally {
      setSelecting(null);
    }
  }, [onSelect, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Choose from Drive" maxWidth="max-w-lg">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 mb-3 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
        <button
          onClick={() => setFolderId(null)}
          className="hover:underline"
          style={{ color: folderId ? "var(--accent)" : "var(--text-primary)" }}
        >
          Drive
        </button>
        {breadcrumbs.map((bc) => (
          <span key={bc._id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            <button
              onClick={() => setFolderId(bc._id)}
              className="hover:underline"
              style={{ color: bc._id === folderId ? "var(--text-primary)" : "var(--accent)" }}
            >
              {bc.name}
            </button>
          </span>
        ))}
      </div>

      {/* Content */}
      <div
        className="rounded-lg border overflow-y-auto"
        style={{
          background: "var(--bg-page)",
          borderColor: "var(--border)",
          maxHeight: "400px",
          minHeight: "200px",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : folders.length === 0 && images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <ImageIcon className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No images in this folder</p>
          </div>
        ) : (
          <div className="p-2">
            {/* Folders */}
            {folders.length > 0 && (
              <div className="mb-2">
                {folders.map((folder) => (
                  <button
                    key={folder._id}
                    onClick={() => setFolderId(folder._id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {folder.folderPreviews?.length ? (
                      <FolderOpen className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                    ) : (
                      <Folder className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                    )}
                    <span className="text-sm truncate">{folder.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "var(--text-muted)" }} />
                  </button>
                ))}
              </div>
            )}

            {/* Images grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((file) => (
                  <button
                    key={file._id}
                    onClick={() => handleSelect(file)}
                    disabled={selecting !== null}
                    className="relative rounded-lg overflow-hidden cursor-pointer group"
                    style={{
                      aspectRatio: "1",
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--border)",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-border)";
                      e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {file.previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <ImageIcon className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                    {/* Hover overlay with name */}
                    <div
                      className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(transparent 40%, rgba(0,0,0,0.8))" }}
                    >
                      <p className="text-[10px] p-1.5 truncate w-full" style={{ color: "#fff" }}>
                        {file.name}
                      </p>
                    </div>
                    {/* Loading spinner when selecting this file */}
                    {selecting === file._id && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
