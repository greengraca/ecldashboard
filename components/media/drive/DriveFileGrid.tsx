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
  // Single active drop zone — only one indicator visible at a time
  const [activeDrop, setActiveDrop] = useState<{
    afterId: string | null;
    groupType: "folder" | "file";
  } | null>(null);

  function handleGapDragOver(
    afterId: string | null,
    groupType: "folder" | "file"
  ) {
    setActiveDrop({ afterId, groupType });
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
    const data = e.dataTransfer.getData("application/x-drive-reorder");
    if (!data) return;
    const { id, type } = JSON.parse(data);
    if (type !== groupType) return;
    if (id === afterId) return;
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
      <div>
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
              <div key={item._id}>
                <DriveFileCard
                  item={item}
                  viewMode="list"
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
    <div>
      {/* Folders */}
      {(folders.length > 0 || creatingFolder) && (
        <div className="flex flex-wrap items-stretch">
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
            <div key={item._id} className="flex items-stretch">
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
        <div className="flex flex-wrap items-stretch">
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
            <div key={item._id} className="flex items-stretch">
              <DriveFileCard
                item={item}
                viewMode="grid"
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
