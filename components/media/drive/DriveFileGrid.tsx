"use client";

import { useRef, useEffect } from "react";
import { Upload, Folder } from "lucide-react";
import type { MediaFile } from "@/lib/types";
import DriveFolderCard from "./DriveFolderCard";
import DriveFileCard from "./DriveFileCard";

interface DriveFileGridProps {
  items: MediaFile[];
  viewMode: "grid" | "list";
  loading: boolean;
  creatingFolder: boolean;
  editingId: string | null;
  onNavigateFolder: (folderId: string) => void;
  onFileClick: (item: MediaFile) => void;
  onMoveToFolder: (itemId: string, targetFolderId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onConfirmRename: (id: string, newName: string) => void;
  onCancelRename: () => void;
  onDelete: (id: string, name: string) => void;
  onUploadClick: () => void;
  onCreateFolder: () => void;
  onConfirmCreateFolder: (name: string) => void;
  onCancelCreateFolder: () => void;
}

function InlineNameInput({
  defaultValue,
  onConfirm,
  onCancel,
  viewMode,
}: {
  defaultValue: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  viewMode: "grid" | "list";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = inputRef.current?.value.trim();
      if (val) onConfirm(val);
      else onCancel();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  }

  function handleBlur() {
    const val = inputRef.current?.value.trim();
    if (val) onConfirm(val);
    else onCancel();
  }

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={defaultValue}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`border outline-none rounded ${viewMode === "grid" ? "text-xs text-center w-full px-1 py-0.5" : "text-sm px-2 py-1 flex-1"}`}
      style={{
        background: "var(--bg-page)",
        borderColor: "var(--accent)",
        color: "var(--text-primary)",
      }}
    />
  );
}

function NewFolderPlaceholder({
  viewMode,
  onConfirm,
  onCancel,
}: {
  viewMode: "grid" | "list";
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
        <Folder
          className="w-5 h-5 flex-shrink-0"
          style={{ color: "var(--accent)" }}
        />
        <InlineNameInput
          defaultValue="New Folder"
          onConfirm={onConfirm}
          onCancel={onCancel}
          viewMode="list"
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-4 rounded-xl border"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--accent)",
        minHeight: 120,
      }}
    >
      <Folder
        className="w-10 h-10 mb-2"
        style={{ color: "var(--accent)" }}
      />
      <InlineNameInput
        defaultValue="New Folder"
        onConfirm={onConfirm}
        onCancel={onCancel}
        viewMode="grid"
      />
    </div>
  );
}

export default function DriveFileGrid({
  items,
  viewMode,
  loading,
  creatingFolder,
  editingId,
  onNavigateFolder,
  onFileClick,
  onMoveToFolder,
  onRename,
  onConfirmRename,
  onCancelRename,
  onDelete,
  onUploadClick,
  onCreateFolder,
  onConfirmCreateFolder,
  onCancelCreateFolder,
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

  // Empty state (but still show new folder placeholder if creating)
  if (items.length === 0 && !creatingFolder) {
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
        {creatingFolder && (
          <NewFolderPlaceholder
            viewMode="list"
            onConfirm={onConfirmCreateFolder}
            onCancel={onCancelCreateFolder}
          />
        )}
        {folders.map((item) => (
          <DriveFolderCard
            key={item._id}
            item={item}
            viewMode="list"
            editing={editingId === item._id}
            onNavigate={onNavigateFolder}
            onDrop={onMoveToFolder}
            onRename={onRename}
            onConfirmRename={onConfirmRename}
            onCancelRename={onCancelRename}
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
      {creatingFolder && (
        <NewFolderPlaceholder
          viewMode="grid"
          onConfirm={onConfirmCreateFolder}
          onCancel={onCancelCreateFolder}
        />
      )}
      {folders.map((item) => (
        <DriveFolderCard
          key={item._id}
          item={item}
          viewMode="grid"
          editing={editingId === item._id}
          onNavigate={onNavigateFolder}
          onDrop={onMoveToFolder}
          onRename={onRename}
          onConfirmRename={onConfirmRename}
          onCancelRename={onCancelRename}
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
