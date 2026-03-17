"use client";

import { useState, useRef, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FolderInput,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type { MediaFile } from "@/lib/types";

// Track which item is currently being dragged (module-level so all cards can read it)
let currentDragId: string | null = null;

interface DriveFolderCardProps {
  item: MediaFile;
  viewMode: "grid" | "list";
  editing: boolean;
  onNavigate: (folderId: string) => void;
  onDrop: (itemId: string, targetFolderId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onConfirmRename: (id: string, newName: string) => void;
  onCancelRename: () => void;
  onDelete: (id: string, name: string) => void;
}

function InlineRenameInput({
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
      if (val && val !== defaultValue) onConfirm(val);
      else onCancel();
    }
    if (e.key === "Escape") onCancel();
  }

  function handleBlur() {
    const val = inputRef.current?.value.trim();
    if (val && val !== defaultValue) onConfirm(val);
    else onCancel();
  }

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={defaultValue}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
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

export default function DriveFolderCard({
  item,
  viewMode,
  editing,
  onNavigate,
  onDrop,
  onRename,
  onConfirmRename,
  onCancelRename,
  onDelete,
}: DriveFolderCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(false);
  const previews = item.folderPreviews || [];
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragCounterRef = useRef(0);

  function handleDragStart(e: React.DragEvent) {
    if (editing) return;
    currentDragId = item._id;
    e.dataTransfer.setData("application/x-drive-move", item._id);
    e.dataTransfer.setData(
      "application/x-drive-reorder",
      JSON.stringify({ id: item._id, type: "folder" })
    );
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("application/x-drive-move")) return;
    if (currentDragId === item._id) return;
    e.preventDefault();
    dragCounterRef.current++;
    // Start delay timer on first enter
    if (dragCounterRef.current === 1 && !dragTimerRef.current) {
      dragTimerRef.current = setTimeout(() => {
        setDragOver(true);
        dragTimerRef.current = null;
      }, 200);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("application/x-drive-move")) return;
    if (currentDragId === item._id) return;
    e.preventDefault();
  }

  function handleDragLeave() {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      setDragOver(false);
    }
  }

  function handleDropOnFolder(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    // Keep dragOver true — the list re-render from the move will reset it
    const itemId = e.dataTransfer.getData("application/x-drive-move");
    if (itemId && itemId !== item._id) {
      onDrop(itemId, item._id);
    }
  }

  if (viewMode === "list") {
    return (
      <div
        draggable={!editing}
        onDragStart={handleDragStart}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnFolder}
        onClick={() => !editing && onNavigate(item._id)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group relative"
        style={{
          background: dragOver ? "var(--accent-light)" : "transparent",
          transition: "background 0.15s, padding-left 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!dragOver)
            e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.paddingLeft = "16px";
        }}
        onMouseLeave={(e) => {
          if (!dragOver)
            e.currentTarget.style.background = "transparent";
          e.currentTarget.style.paddingLeft = "12px";
        }}
      >
        <div className="flex-shrink-0 relative" style={{ width: 20, height: 20 }}>
          <Folder
            className="w-5 h-5 absolute inset-0"
            style={{
              color: "var(--accent)",
              opacity: dragOver ? 0 : 1,
              transform: dragOver ? "scale(0.7)" : "scale(1)",
              transition: "opacity 0.2s, transform 0.2s",
            }}
          />
          <FolderInput
            className="w-5 h-5 absolute inset-0"
            style={{
              color: "var(--accent)",
              opacity: dragOver ? 1 : 0,
              transform: dragOver ? "scale(1)" : "scale(0.7)",
              transition: "opacity 0.2s, transform 0.2s",
            }}
          />
        </div>
        {editing ? (
          <InlineRenameInput
            defaultValue={item.name}
            onConfirm={(name) => onConfirmRename(item._id, name)}
            onCancel={onCancelRename}
            viewMode="list"
          />
        ) : (
          <span
            className="flex-1 text-sm truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {item.name}
          </span>
        )}
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Folder
        </span>
        {!editing && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <ContextMenu
                onRename={() => {
                  setShowMenu(false);
                  onRename(item._id, item.name);
                }}
                onDelete={() => {
                  setShowMenu(false);
                  onDelete(item._id, item.name);
                }}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  const hasPreviews = previews.length > 0;

  // Fan-out positions for each thumbnail (translate + rotate)
  // Thumbnails start stacked in center, spread on hover like scattered photos
  const fanPositions: { x: number; y: number; rot: number }[] = [
    { x: -18, y: -8, rot: -12 },
    { x: 16, y: -6, rot: 10 },
    { x: -8, y: 10, rot: 6 },
    { x: 14, y: 12, rot: -8 },
  ];

  return (
    <div
      draggable={!editing}
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropOnFolder}
      onClick={() => !editing && onNavigate(item._id)}
      className="flex flex-col rounded-xl border cursor-pointer group relative"
      style={{
        background: dragOver ? "var(--accent-light)" : "var(--bg-card)",
        borderColor: dragOver
          ? "var(--accent)"
          : editing
            ? "var(--accent)"
            : "var(--border)",
        width: 120,
        height: 120,
        transition:
          "border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s",
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        if (!dragOver && !editing) {
          e.currentTarget.style.borderColor = "var(--accent-border)";
          e.currentTarget.style.boxShadow =
            "0 4px 20px rgba(212, 160, 23, 0.08)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        if (!dragOver && !editing) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Icon / Preview area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Folder icon — shrinks when previews fan out, swaps to FolderInput on drag over */}
        <div
          className="relative"
          style={{ width: 40, height: 40 }}
        >
          <Folder
            className="w-10 h-10 absolute inset-0"
            style={{
              color: "var(--accent)",
              opacity: dragOver || (hovered && hasPreviews) ? 0 : 1,
              transform: dragOver || (hovered && hasPreviews) ? "scale(0.5)" : "scale(1)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          />
          <FolderInput
            className="w-10 h-10 absolute inset-0"
            style={{
              color: "var(--accent)",
              opacity: dragOver ? 1 : 0,
              transform: dragOver ? "scale(1)" : "scale(0.5)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
            }}
          />
        </div>

        {/* Floating photo stack — small thumbnails that fan out from center */}
        {hasPreviews &&
          previews.map((url, i) => {
            const pos = fanPositions[i];
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={url}
                alt=""
                className="absolute rounded-lg object-cover pointer-events-none"
                style={{
                  width: 36,
                  height: 36,
                  border: "1.5px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: hovered
                    ? `0 ${4 + i * 2}px ${12 + i * 4}px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)`
                    : "none",
                  backdropFilter: "blur(2px)",
                  opacity: hovered ? 1 : 0,
                  transform: hovered
                    ? `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rot}deg) scale(1)`
                    : "translate(0, 0) rotate(0deg) scale(0.4)",
                  transition: `opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s, box-shadow 0.3s ease ${i * 0.05}s`,
                  zIndex: i + 1,
                }}
              />
            );
          })}
      </div>

      {/* Name area */}
      <div className="px-2 pb-2 pt-1 text-center">
        {editing ? (
          <InlineRenameInput
            defaultValue={item.name}
            onConfirm={(name) => onConfirmRename(item._id, name)}
            onCancel={onCancelRename}
            viewMode="grid"
          />
        ) : (
          <span
            className="text-xs truncate block"
            style={{ color: "var(--text-primary)" }}
          >
            {item.name}
          </span>
        )}
      </div>

      {/* Invisible overlay during drag — prevents children from stealing dragLeave */}
      {currentDragId && currentDragId !== item._id && (
        <div className="absolute inset-0 z-20" />
      )}

      {/* Menu button */}
      {!editing && (
        <div className="absolute top-2 right-2 z-10">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100"
              style={{
                color: "var(--text-muted)",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                transition: "opacity 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.7)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.5)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <ContextMenu
                onRename={() => {
                  setShowMenu(false);
                  onRename(item._id, item.name);
                }}
                onDelete={() => {
                  setShowMenu(false);
                  onDelete(item._id, item.name);
                }}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ContextMenu({
  onRename,
  onDelete,
  onClose,
}: {
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-1 z-50 rounded-lg border py-1 min-w-[140px]"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(12px)",
          animation: "menuSlideIn 0.15s ease-out",
        }}
      >
        <button
          onClick={onRename}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md"
          style={{
            color: "var(--text-primary)",
            transition: "background 0.12s, padding-left 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.paddingLeft = "14px";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.paddingLeft = "12px";
          }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Rename
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md"
          style={{
            color: "var(--error)",
            transition: "background 0.12s, padding-left 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--error-light)";
            e.currentTarget.style.paddingLeft = "14px";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.paddingLeft = "12px";
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </>
  );
}
