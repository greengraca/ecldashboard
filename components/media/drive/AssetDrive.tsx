"use client";

import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import type { MediaFile } from "@/lib/types";
import AssetWarningBar from "./AssetWarningBar";
import DriveToolbar from "./DriveToolbar";
import DriveDropZone from "./DriveDropZone";
import DriveFileGrid from "./DriveFileGrid";
import DrivePreviewModal from "./DrivePreviewModal";
import DriveConfirmModal from "./DriveConfirmModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AssetDrive() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewItem, setPreviewItem] = useState<MediaFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
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

  // Navigation
  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setCreatingFolder(false);
    setEditingId(null);
  }, []);

  // Upload files (handles both small and large)
  const handleUploadFiles = useCallback(
    async (fileList: FileList) => {
      setUploading(true);
      try {
        for (const file of Array.from(fileList)) {
          if (file.size < 4 * 1024 * 1024) {
            const formData = new FormData();
            formData.append("file", file);
            if (currentFolderId) formData.append("parentId", currentFolderId);
            await fetch("/api/media/drive/upload", {
              method: "POST",
              body: formData,
            });
          } else {
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

            await fetch(urlData.uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": file.type || "application/octet-stream",
              },
              body: file,
            });

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

  // Create folder — show inline placeholder
  const handleCreateFolder = useCallback(() => {
    setCreatingFolder(true);
  }, []);

  const confirmCreateFolder = useCallback(
    async (name: string) => {
      setCreatingFolder(false);
      await fetch("/api/media/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: currentFolderId }),
      });
      mutate();
    },
    [currentFolderId, mutate]
  );

  const cancelCreateFolder = useCallback(() => {
    setCreatingFolder(false);
  }, []);

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

  // Reorder item within same folder
  const handleReorder = useCallback(
    async (itemId: string, afterId: string | null) => {
      await fetch(`/api/media/drive/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterId }),
      });
      mutate();
    },
    [mutate]
  );

  // Rename — switch to inline editing
  const handleRename = useCallback((id: string, _currentName: string) => {
    setEditingId(id);
  }, []);

  const confirmRename = useCallback(
    async (id: string, newName: string) => {
      setEditingId(null);
      await fetch(`/api/media/drive/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      mutate();
    },
    [mutate]
  );

  const cancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  // Delete — show confirm modal
  const handleDelete = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    await fetch(`/api/media/drive/${id}`, { method: "DELETE" });
    mutate();
  }, [deleteTarget, mutate]);

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
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs overflow-hidden relative"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
            }}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--accent), transparent)",
                animation: "shimmer 1.5s ease-in-out infinite",
                backgroundSize: "200% 100%",
              }}
            />
            <div
              className="w-3 h-3 border-2 rounded-full animate-spin relative"
              style={{
                borderColor: "var(--accent-border)",
                borderTopColor: "var(--accent)",
              }}
            />
            <span className="relative">Uploading...</span>
          </div>
        )}

        <DriveDropZone onDropFiles={handleUploadFiles}>
          <div className="overflow-y-auto pt-1 pb-1" style={{ maxHeight: 360 }}>
            <DriveFileGrid
              items={items}
              viewMode={viewMode}
              loading={isLoading}
              creatingFolder={creatingFolder}
              editingId={editingId}
              onNavigateFolder={(id) => handleNavigate(id)}
              onFileClick={handleFileClick}
              onMoveToFolder={handleMoveToFolder}
              onReorder={handleReorder}
              onRename={handleRename}
              onConfirmRename={confirmRename}
              onCancelRename={cancelRename}
              onDelete={handleDelete}
              onUploadClick={() => fileInputRef.current?.click()}
              onCreateFolder={handleCreateFolder}
              onConfirmCreateFolder={confirmCreateFolder}
              onCancelCreateFolder={cancelCreateFolder}
            />
          </div>
        </DriveDropZone>
      </div>

      {/* Hidden file input */}
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DriveConfirmModal
          title="Delete"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

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
