"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Upload, Folder, FileImage, FileVideo, File as FileIcon } from "lucide-react";
import type { MediaFile } from "@/lib/types";
import DriveFolderCard from "./DriveFolderCard";
import DriveFileCard from "./DriveFileCard";
import { ghostWrapperStyle, GHOST_CARD_STYLE, setCurrentDragId } from "./drag-utils";

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
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
        borderColor: "var(--accent)",
        width: 120,
        height: 120,
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

/**
 * Drop zone that sits in the gap between items.
 * In grid: a vertical line between cards.
 * In list: a horizontal line between rows.
 * Only one indicator is visible at a time (managed by parent via activeDropId).
 */
function GapDropZone({
  afterId,
  groupType,
  viewMode,
  isActive,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  afterId: string | null;
  groupType: "folder" | "file";
  viewMode: "grid" | "list";
  isActive: boolean;
  onDragOver: (afterId: string | null, groupType: "folder" | "file") => void;
  onDragLeave: () => void;
  onDrop: (
    e: React.DragEvent,
    afterId: string | null,
    groupType: "folder" | "file"
  ) => void;
}) {
  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-reorder")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      onDragOver(afterId, groupType);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    onDrop(e, afterId, groupType);
  }

  if (viewMode === "list") {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        className="relative"
        style={{
          height: 10,
          marginTop: -3,
          marginBottom: -3,
        }}
      >
        {isActive && (
          <div
            className="absolute inset-x-3 top-1/2 rounded-full"
            style={{
              height: 3,
              transform: "translateY(-50%)",
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent)",
            }}
          />
        )}
      </div>
    );
  }

  // Grid: vertical indicator in the gap — large hitbox, small visual
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      style={{
        width: 20,
        alignSelf: "stretch",
        position: "relative",
        marginLeft: -8,
        marginRight: -8,
        flexShrink: 0,
        zIndex: 5,
      }}
    >
      {isActive && (
        <div
          className="absolute top-3 bottom-3 left-1/2 rounded-full"
          style={{
            width: 3,
            transform: "translateX(-50%)",
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
          }}
        />
      )}
    </div>
  );
}

/**
 * Fills remaining space in a flex row. When something is dragged over it,
 * it activates the "after last item" indicator.
 */
function TrailingEmptyZone({
  lastId,
  groupType,
  isActive,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  lastId: string;
  groupType: "folder" | "file";
  isActive: boolean;
  onDragOver: (afterId: string | null, groupType: "folder" | "file") => void;
  onDragLeave: () => void;
  onDrop: (
    e: React.DragEvent,
    afterId: string | null,
    groupType: "folder" | "file"
  ) => void;
}) {
  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-reorder")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      onDragOver(lastId, groupType);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    onDrop(e, lastId, groupType);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      style={{
        flexGrow: 1,
        minWidth: 40,
        minHeight: 40,
        alignSelf: "stretch",
      }}
    />
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
  // --- Drag ghost state ---
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostSizeRef = useRef({ w: 120, h: 120 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Move ghost via DOM on document-level dragover — follows cursor everywhere
  useEffect(() => {
    function moveGhost(e: DragEvent) {
      if (ghostRef.current) {
        const { w, h } = ghostSizeRef.current;
        ghostRef.current.style.left = `${e.clientX - w / 2}px`;
        ghostRef.current.style.top = `${e.clientY - h / 2}px`;
      }
    }
    document.addEventListener("dragover", moveGhost);
    return () => document.removeEventListener("dragover", moveGhost);
  }, []);

  // Listen for dragstart on container to identify which item is being dragged
  const handleContainerDragStart = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const card = target.closest("[data-drive-id]") as HTMLElement | null;
    if (card?.dataset.driveId) {
      const id = card.dataset.driveId;
      const rect = card.getBoundingClientRect();
      ghostSizeRef.current = { w: rect.width, h: rect.height };
      requestAnimationFrame(() => setDraggingId(id));
    }
  }, []);

  // Clear drag state on any dragend or drop — covers all edge cases
  const clearDrag = useCallback(() => {
    setDraggingId(null);
    setActiveDrop(null);
    setCurrentDragId(null); // safety net — ensures module-level ID never lingers
  }, []);

  useEffect(() => {
    document.addEventListener("dragend", clearDrag);
    document.addEventListener("drop", clearDrag);
    return () => {
      document.removeEventListener("dragend", clearDrag);
      document.removeEventListener("drop", clearDrag);
    };
  }, [clearDrag]);

  const draggingItem = draggingId ? items.find(i => i._id === draggingId) : null;

  // Single active drop zone — only one indicator visible at a time
  const [activeDrop, setActiveDrop] = useState<{
    afterId: string | null;
    groupType: "folder" | "file";
  } | null>(null);

  function handleGapDragOver(
    afterId: string | null,
    groupType: "folder" | "file"
  ) {
    setActiveDrop((prev) => {
      if (prev && prev.afterId === afterId && prev.groupType === groupType) return prev;
      return { afterId, groupType };
    });
  }

  function handleGapDragLeave() {
    setActiveDrop(null);
  }

  function handleGapDrop(
    e: React.DragEvent,
    afterId: string | null,
    groupType: "folder" | "file"
  ) {
    setActiveDrop(null);
    setDraggingId(null);
    const data = e.dataTransfer.getData("application/x-drive-reorder");
    if (!data) return;
    const { id, type } = JSON.parse(data);
    if (type !== groupType) return;
    if (id === afterId) return;
    // Skip if dropping right before itself (no actual position change)
    const group = groupType === "folder" ? folders : files;
    const idx = group.findIndex((i) => i._id === id);
    if (afterId === null && idx === 0) return;
    if (idx > 0 && group[idx - 1]._id === afterId) return;
    onReorder(id, afterId);
  }

  function isGapActive(
    afterId: string | null,
    groupType: "folder" | "file"
  ) {
    return (
      activeDrop !== null &&
      activeDrop.afterId === afterId &&
      activeDrop.groupType === groupType
    );
  }

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
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              backdropFilter: "blur(8px)",
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

  // Ghost element rendered via portal — matches original card dimensions
  const isGhostImage = draggingItem?.mimeType?.startsWith("image/");
  const isGhostFolder = draggingItem?.type === "folder";
  const ghostThumb = isGhostImage ? (draggingItem?.previewUrl ?? null) : null;
  const isGhostGrid = viewMode === "grid";
  const { w: gw, h: gh } = ghostSizeRef.current;

  const ghostElement = draggingItem && typeof document !== "undefined" ? createPortal(
    <div ref={ghostRef} style={ghostWrapperStyle(-9999, -9999, gw, gh)}>
      <div style={{ ...GHOST_CARD_STYLE, height: "100%", display: "flex", flexDirection: "column", padding: 0 }}>
        {isGhostGrid && !isGhostFolder && (
          /* Thumbnail area — flex to fill space above name */
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.03)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}>
            {isGhostImage && ghostThumb ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ghostThumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : isGhostImage ? (
              <FileImage className="w-6 h-6" style={{ color: "var(--accent)", opacity: 0.6 }} />
            ) : draggingItem.mimeType?.startsWith("video/") ? (
              <FileVideo className="w-6 h-6" style={{ color: "#a78bfa", opacity: 0.6 }} />
            ) : (
              <FileIcon className="w-6 h-6" style={{ color: "var(--text-muted)", opacity: 0.6 }} />
            )}
          </div>
        )}
        {isGhostGrid && isGhostFolder && (
          /* Folder icon area */
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Folder className="w-10 h-10" style={{ color: "var(--accent)", opacity: 0.7 }} />
          </div>
        )}
        {/* Name area */}
        <div style={{
          padding: isGhostGrid ? "8px" : "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          {!isGhostGrid && (
            isGhostFolder ? (
              <Folder className="w-5 h-5" style={{ color: "var(--accent)" }} />
            ) : isGhostImage ? (
              <FileImage className="w-5 h-5" style={{ color: "var(--accent)" }} />
            ) : draggingItem.mimeType?.startsWith("video/") ? (
              <FileVideo className="w-5 h-5" style={{ color: "#a78bfa" }} />
            ) : (
              <FileIcon className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            )
          )}
          <span style={{
            fontSize: isGhostGrid ? 12 : 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: isGhostGrid ? "center" : undefined,
            width: isGhostGrid ? "100%" : undefined,
          }}>
            {draggingItem.name}
          </span>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  if (viewMode === "list") {
    return (
      <div ref={containerRef} onDragStartCapture={handleContainerDragStart}>
        {ghostElement}
        {creatingFolder && (
          <NewFolderPlaceholder
            viewMode="list"
            onConfirm={onConfirmCreateFolder}
            onCancel={onCancelCreateFolder}
          />
        )}
        {/* Folders */}
        {folders.length > 0 && (
          <div>
            <GapDropZone
              afterId={null}
              groupType="folder"
              viewMode="list"
              isActive={isGapActive(null, "folder")}
              onDragOver={handleGapDragOver}
              onDragLeave={handleGapDragLeave}
              onDrop={handleGapDrop}
            />
            {folders.map((item) => (
              <div key={item._id} data-drive-id={item._id}>
                <DriveFolderCard
                  item={item}
                  viewMode="list"
                  editing={editingId === item._id}
                  isDragging={draggingId === item._id}
                  onDragEnd={clearDrag}
                  onNavigate={onNavigateFolder}
                  onDrop={onMoveToFolder}
                  onRename={onRename}
                  onConfirmRename={onConfirmRename}
                  onCancelRename={onCancelRename}
                  onDelete={onDelete}
                />
                <GapDropZone
                  afterId={item._id}
                  groupType="folder"
                  viewMode="list"
                  isActive={isGapActive(item._id, "folder")}
                  onDragOver={handleGapDragOver}
                  onDragLeave={handleGapDragLeave}
                  onDrop={handleGapDrop}
                />
              </div>
            ))}
          </div>
        )}
        {/* Files */}
        {files.length > 0 && (
          <div>
            {folders.length > 0 && (
              <div
                className="my-1 mx-3"
                style={{ height: 1, background: "var(--border-subtle)" }}
              />
            )}
            <GapDropZone
              afterId={null}
              groupType="file"
              viewMode="list"
              isActive={isGapActive(null, "file")}
              onDragOver={handleGapDragOver}
              onDragLeave={handleGapDragLeave}
              onDrop={handleGapDrop}
            />
            {files.map((item) => (
              <div key={item._id} data-drive-id={item._id}>
                <DriveFileCard
                  item={item}
                  viewMode="list"
                  isDragging={draggingId === item._id}
                  onDragEnd={clearDrag}
                  onClick={onFileClick}
                  onRename={onRename}
                  onDelete={onDelete}
                />
                <GapDropZone
                  afterId={item._id}
                  groupType="file"
                  viewMode="list"
                  isActive={isGapActive(item._id, "file")}
                  onDragOver={handleGapDragOver}
                  onDragLeave={handleGapDragLeave}
                  onDrop={handleGapDrop}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div ref={containerRef} onDragStartCapture={handleContainerDragStart}>
      {ghostElement}
      {/* Folders */}
      {(folders.length > 0 || creatingFolder) && (
        <div className="flex flex-wrap items-stretch gap-y-3">
          {creatingFolder && (
            <NewFolderPlaceholder
              viewMode="grid"
              onConfirm={onConfirmCreateFolder}
              onCancel={onCancelCreateFolder}
            />
          )}
          {/* Leading drop zone (become first) */}
          <GapDropZone
            afterId={null}
            groupType="folder"
            viewMode="grid"
            isActive={isGapActive(null, "folder")}
            onDragOver={handleGapDragOver}
            onDragLeave={handleGapDragLeave}
            onDrop={handleGapDrop}
          />
          {folders.map((item) => (
            <div key={item._id} className="flex items-stretch" data-drive-id={item._id}>
              <DriveFolderCard
                item={item}
                viewMode="grid"
                editing={editingId === item._id}
                isDragging={draggingId === item._id}
                onDragEnd={clearDrag}
                onNavigate={onNavigateFolder}
                onDrop={onMoveToFolder}
                onRename={onRename}
                onConfirmRename={onConfirmRename}
                onCancelRename={onCancelRename}
                onDelete={onDelete}
              />
              {/* Trailing drop zone after each folder */}
              <GapDropZone
                afterId={item._id}
                groupType="folder"
                viewMode="grid"
                isActive={isGapActive(item._id, "folder")}
                onDragOver={handleGapDragOver}
                onDragLeave={handleGapDragLeave}
                onDrop={handleGapDrop}
              />
            </div>
          ))}
          {/* Empty space after last folder catches drag */}
          {folders.length > 0 && (
            <TrailingEmptyZone
              lastId={folders[folders.length - 1]._id}
              groupType="folder"
              isActive={isGapActive(folders[folders.length - 1]._id, "folder")}
              onDragOver={handleGapDragOver}
              onDragLeave={handleGapDragLeave}
              onDrop={handleGapDrop}
            />
          )}
        </div>
      )}
      {/* Separator */}
      {folders.length > 0 && files.length > 0 && (
        <div
          className="my-2 mx-1"
          style={{ height: 1, background: "var(--border-subtle)" }}
        />
      )}
      {/* Files */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-stretch gap-y-3">
          <GapDropZone
            afterId={null}
            groupType="file"
            viewMode="grid"
            isActive={isGapActive(null, "file")}
            onDragOver={handleGapDragOver}
            onDragLeave={handleGapDragLeave}
            onDrop={handleGapDrop}
          />
          {files.map((item) => (
            <div key={item._id} className="flex items-stretch" data-drive-id={item._id}>
              <DriveFileCard
                item={item}
                viewMode="grid"
                isDragging={draggingId === item._id}
                onDragEnd={clearDrag}
                onClick={onFileClick}
                onRename={onRename}
                onDelete={onDelete}
              />
              <GapDropZone
                afterId={item._id}
                groupType="file"
                viewMode="grid"
                isActive={isGapActive(item._id, "file")}
                onDragOver={handleGapDragOver}
                onDragLeave={handleGapDragLeave}
                onDrop={handleGapDrop}
              />
            </div>
          ))}
          {/* Empty space after last file catches drag */}
          {files.length > 0 && (
            <TrailingEmptyZone
              lastId={files[files.length - 1]._id}
              groupType="file"
              isActive={isGapActive(files[files.length - 1]._id, "file")}
              onDragOver={handleGapDragOver}
              onDragLeave={handleGapDragLeave}
              onDrop={handleGapDrop}
            />
          )}
        </div>
      )}
    </div>
  );
}
