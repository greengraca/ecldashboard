"use client";

import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import type { MediaFile } from "@/lib/types";
import AssetWarningBar from "./AssetWarningBar";
import DriveToolbar from "./DriveToolbar";
import DriveDropZone from "./DriveDropZone";
import DriveFileGrid from "./DriveFileGrid";
import DrivePreviewModal from "./DrivePreviewModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AssetDrive() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewItem, setPreviewItem] = useState<MediaFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryParam = currentFolderId ? `?parentId=${currentFolderId}` : "";
  const { data, isLoading, mutate } = useSWR(
    `/api/media/drive${queryParam}`,
    fetcher
  );

  const items: MediaFile[] = data?.data || [];
  const breadcrumbs: { _id: string; name: string }[] =
    data?.breadcrumbs || [];
  const files = items.filter((i) => i.type === "file");

  // Navigation — breadcrumbs auto-update via SWR when currentFolderId changes
  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
  }, []);

  // Upload files (handles both small and large)
  const handleUploadFiles = useCallback(
    async (fileList: FileList) => {
      setUploading(true);
      try {
        for (const file of Array.from(fileList)) {
          if (file.size < 4 * 1024 * 1024) {
            // Small file: direct upload
            const formData = new FormData();
            formData.append("file", file);
            if (currentFolderId) formData.append("parentId", currentFolderId);
            await fetch("/api/media/drive/upload", {
              method: "POST",
              body: formData,
            });
          } else {
            // Large file: presigned URL flow
            const urlRes = await fetch("/api/media/drive/upload-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: file.name,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
              }),
            });
            const { data: urlData } = await urlRes.json();
            if (!urlData?.uploadUrl) continue;

            // Upload directly to R2
            await fetch(urlData.uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": file.type || "application/octet-stream",
              },
              body: file,
            });

            // Confirm upload
            await fetch("/api/media/drive/upload-confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                r2Key: urlData.r2Key,
                name: file.name,
                parentId: currentFolderId,
                size: file.size,
                mimeType: file.type || "application/octet-stream",
              }),
            });
          }
        }
      } finally {
        setUploading(false);
        mutate();
      }
    },
    [currentFolderId, mutate]
  );

  // Create folder
  const handleCreateFolder = useCallback(async () => {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    await fetch("/api/media/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId: currentFolderId }),
    });
    mutate();
  }, [currentFolderId, mutate]);

  // Move item to folder
  const handleMoveToFolder = useCallback(
    async (itemId: string, targetFolderId: string | null) => {
      await fetch(`/api/media/drive/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: targetFolderId }),
      });
      mutate();
    },
    [mutate]
  );

  // Rename
  const handleRename = useCallback(
    async (id: string, currentName: string) => {
      const newName = prompt("New name:", currentName);
      if (!newName?.trim() || newName.trim() === currentName) return;
      await fetch(`/api/media/drive/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      mutate();
    },
    [mutate]
  );

  // Delete
  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
      await fetch(`/api/media/drive/${id}`, { method: "DELETE" });
      mutate();
    },
    [mutate]
  );

  // Preview
  const handleFileClick = useCallback((item: MediaFile) => {
    setPreviewItem(item);
  }, []);

  const handlePreviewNavigate = useCallback((item: MediaFile) => {
    setPreviewItem(item);
  }, []);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Asset warnings */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <AssetWarningBar />
      </div>

      {/* Drive content */}
      <div className="p-4">
        <DriveToolbar
          breadcrumbs={breadcrumbs}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigate={handleNavigate}
          onCreateFolder={handleCreateFolder}
          onUploadFiles={handleUploadFiles}
          onMoveToFolder={handleMoveToFolder}
        />

        {uploading && (
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
            }}
          >
            <div
              className="w-3 h-3 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
            Uploading...
          </div>
        )}

        <DriveDropZone onDropFiles={handleUploadFiles}>
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            <DriveFileGrid
              items={items}
              viewMode={viewMode}
              loading={isLoading}
              onNavigateFolder={(id) => handleNavigate(id)}
              onFileClick={handleFileClick}
              onMoveToFolder={handleMoveToFolder}
              onRename={handleRename}
              onDelete={handleDelete}
              onUploadClick={() => fileInputRef.current?.click()}
              onCreateFolder={handleCreateFolder}
            />
          </div>
        </DriveDropZone>
      </div>

      {/* Hidden file input for empty state upload button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUploadFiles(e.target.files);
          if (e.target) e.target.value = "";
        }}
      />

      {/* Preview modal */}
      {previewItem && (
        <DrivePreviewModal
          item={previewItem}
          previewUrl={previewItem.previewUrl || null}
          allFiles={files}
          onClose={() => setPreviewItem(null)}
          onNavigate={handlePreviewNavigate}
        />
      )}
    </div>
  );
}
