"use client";

import { Upload } from "lucide-react";
import type { MediaFile } from "@/lib/types";
import DriveFolderCard from "./DriveFolderCard";
import DriveFileCard from "./DriveFileCard";

interface DriveFileGridProps {
  items: MediaFile[];
  viewMode: "grid" | "list";
  loading: boolean;
  onNavigateFolder: (folderId: string) => void;
  onFileClick: (item: MediaFile) => void;
  onMoveToFolder: (itemId: string, targetFolderId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
  onUploadClick: () => void;
  onCreateFolder: () => void;
}

export default function DriveFileGrid({
  items,
  viewMode,
  loading,
  onNavigateFolder,
  onFileClick,
  onMoveToFolder,
  onRename,
  onDelete,
  onUploadClick,
  onCreateFolder,
}: DriveFileGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--accent)",
          }}
        />
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Upload
          className="w-10 h-10 mb-3"
          style={{ color: "var(--accent)" }}
        />
        <p
          className="text-sm font-medium mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          Drop files here or click to upload
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onUploadClick}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
            }}
          >
            Upload Files
          </button>
          <button
            onClick={onCreateFolder}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
          >
            Create Folder
          </button>
        </div>
      </div>
    );
  }

  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type === "file");

  if (viewMode === "list") {
    return (
      <div className="space-y-0.5">
        {folders.map((item) => (
          <DriveFolderCard
            key={item._id}
            item={item}
            viewMode="list"
            onNavigate={onNavigateFolder}
            onDrop={onMoveToFolder}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
        {files.map((item) => (
          <DriveFileCard
            key={item._id}
            item={item}
            viewMode="list"
            onClick={onFileClick}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
      {folders.map((item) => (
        <DriveFolderCard
          key={item._id}
          item={item}
          viewMode="grid"
          onNavigate={onNavigateFolder}
          onDrop={onMoveToFolder}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
      {files.map((item) => (
        <DriveFileCard
          key={item._id}
          item={item}
          viewMode="grid"
          onClick={onFileClick}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
