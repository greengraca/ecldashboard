"use client";

import { useRef, useEffect, useState } from "react";
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
  onReorder: (itemId: string, afterId: string | null) => void;
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
      className={`outline-none rounded ${viewMode === "grid" ? "text-xs text-center max-w-full px-1.5 py-0.5" : "text-sm px-2 py-0.5 flex-1"}`}
      style={{
        background: "transparent",
        border: "1px solid var(--border-hover)",
        color: "var(--text-primary)",
        width: viewMode === "grid" ? "auto" : undefined,
        minWidth: viewMode === "grid" ? "3ch" : undefined,
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

/** Thin drop indicator between items for reordering */
function DropIndicator({
  afterId,
  groupType,
  viewMode,
  onReorder,
}: {
  afterId: string | null;
  groupType: "folder" | "file";
  viewMode: "grid" | "list";
  onReorder: (itemId: string, afterId: string | null) => void;
}) {
  const [active, setActive] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-reorder")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setActive(true);
    }
  }

  function handleDragLeave() {
    setActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setActive(false);
    const data = e.dataTransfer.getData("application/x-drive-reorder");
    if (!data) return;
    const { id, type } = JSON.parse(data);
    // Only allow reordering within the same type group
    if (type !== groupType) return;
    if (id === afterId) return;
    onReorder(id, afterId);
  }

  if (viewMode === "list") {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative"
        style={{ height: active ? 3 : 1, transition: "height 0.1s" }}
      >
        {active && (
          <div
            className="absolute inset-x-2 top-0 rounded-full"
            style={{
              height: 3,
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent)",
            }}
          />
        )}
      </div>
    );
  }

  // Grid: vertical drop zone between columns
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
      style={{
        width: active ? 4 : 2,
        minHeight: 120,
        transition: "width 0.1s",
        marginLeft: -1,
        marginRight: -1,
      }}
    >
      {active && (
        <div
          className="absolute inset-y-2 left-0 rounded-full"
          style={{
            width: 3,
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
          }}
        />
      )}
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
  onReorder,
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
      <div className="space-y-0">
        {creatingFolder && (
          <NewFolderPlaceholder
            viewMode="list"
            onConfirm={onConfirmCreateFolder}
            onCancel={onCancelCreateFolder}
          />
        )}
        {/* Folders with drop indicators */}
        {folders.length > 0 && (
          <>
            <DropIndicator
              afterId={null}
              groupType="folder"
              viewMode="list"
              onReorder={onReorder}
            />
            {folders.map((item) => (
              <div key={item._id}>
                <DriveFolderCard
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
                <DropIndicator
                  afterId={item._id}
                  groupType="folder"
                  viewMode="list"
                  onReorder={onReorder}
                />
              </div>
            ))}
          </>
        )}
        {/* Files with drop indicators */}
        {files.length > 0 && (
          <>
            {folders.length > 0 && (
              <div
                className="my-1 mx-3"
                style={{
                  height: 1,
                  background: "var(--border-subtle)",
                }}
              />
            )}
            <DropIndicator
              afterId={null}
              groupType="file"
              viewMode="list"
              onReorder={onReorder}
            />
            {files.map((item) => (
              <div key={item._id}>
                <DriveFileCard
                  item={item}
                  viewMode="list"
                  onClick={onFileClick}
                  onRename={onRename}
                  onDelete={onDelete}
                />
                <DropIndicator
                  afterId={item._id}
                  groupType="file"
                  viewMode="list"
                  onReorder={onReorder}
                />
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Folders grid */}
      {(folders.length > 0 || creatingFolder) && (
        <div
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2"
          style={{ gridAutoRows: "min-content" }}
        >
          {creatingFolder && (
            <NewFolderPlaceholder
              viewMode="grid"
              onConfirm={onConfirmCreateFolder}
              onCancel={onCancelCreateFolder}
            />
          )}
          {folders.map((item, idx) => (
            <ReorderableGridItem
              key={item._id}
              item={item}
              prevId={idx === 0 ? null : folders[idx - 1]._id}
              groupType="folder"
              onReorder={onReorder}
            >
              <DriveFolderCard
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
            </ReorderableGridItem>
          ))}
        </div>
      )}
      {/* Separator between folders and files */}
      {folders.length > 0 && files.length > 0 && (
        <div
          className="my-2 mx-1"
          style={{
            height: 1,
            background: "var(--border-subtle)",
          }}
        />
      )}
      {/* Files grid */}
      {files.length > 0 && (
        <div
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2"
          style={{ gridAutoRows: "min-content" }}
        >
          {files.map((item, idx) => (
            <ReorderableGridItem
              key={item._id}
              item={item}
              prevId={idx === 0 ? null : files[idx - 1]._id}
              groupType="file"
              onReorder={onReorder}
            >
              <DriveFileCard
                item={item}
                viewMode="grid"
                onClick={onFileClick}
                onRename={onRename}
                onDelete={onDelete}
              />
            </ReorderableGridItem>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Wraps a grid item with left/right drop zones for reorder.
 * Detects which half the cursor is on and shows an indicator on that side.
 */
function ReorderableGridItem({
  item,
  prevId,
  groupType,
  onReorder,
  children,
}: {
  item: MediaFile;
  prevId: string | null;
  groupType: "folder" | "file";
  onReorder: (itemId: string, afterId: string | null) => void;
  children: React.ReactNode;
}) {
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("application/x-drive-reorder")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const midX = rect.left + rect.width / 2;
    setDropSide(e.clientX < midX ? "left" : "right");
  }

  function handleDragLeave() {
    setDropSide(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/x-drive-reorder");
    if (!data) { setDropSide(null); return; }
    const { id, type } = JSON.parse(data);
    if (type !== groupType) { setDropSide(null); return; }

    // Left side = place before this item (after prevId)
    // Right side = place after this item
    const afterId = dropSide === "left" ? prevId : item._id;
    setDropSide(null);
    if (id === item._id) return;
    onReorder(id, afterId);
  }

  return (
    <div
      ref={ref}
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {/* Left indicator */}
      {dropSide === "left" && (
        <div
          className="absolute left-0 top-2 bottom-2 rounded-full pointer-events-none"
          style={{
            width: 3,
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
            transform: "translateX(-3px)",
          }}
        />
      )}
      {/* Right indicator */}
      {dropSide === "right" && (
        <div
          className="absolute right-0 top-2 bottom-2 rounded-full pointer-events-none"
          style={{
            width: 3,
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
            transform: "translateX(3px)",
          }}
        />
      )}
    </div>
  );
}
