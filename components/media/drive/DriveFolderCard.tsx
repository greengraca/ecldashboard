"use client";

import { useState, useRef, useEffect } from "react";
import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { MediaFile } from "@/lib/types";

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

  function handleDragStart(e: React.DragEvent) {
    if (editing) return;
    e.dataTransfer.setData("application/x-drive-move", item._id);
    e.dataTransfer.setData(
      "application/x-drive-reorder",
      JSON.stringify({ id: item._id, type: "folder" })
    );
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-move")) {
      e.preventDefault();
      setDragOver(true);
    }
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDropOnFolder(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnFolder}
        onClick={() => !editing && onNavigate(item._id)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group"
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
        <Folder
          className="w-5 h-5 flex-shrink-0"
          style={{ color: "var(--accent)" }}
        />
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

  return (
    <div
      draggable={!editing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropOnFolder}
      onDoubleClick={() => !editing && onNavigate(item._id)}
      className="flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer group relative"
      style={{
        background: dragOver ? "var(--accent-light)" : "var(--bg-card)",
        borderColor: dragOver
          ? "var(--accent)"
          : editing
            ? "var(--accent)"
            : "var(--border)",
        minHeight: 120,
        transition:
          "border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!dragOver && !editing) {
          e.currentTarget.style.borderColor = "var(--accent-border)";
          e.currentTarget.style.boxShadow =
            "0 4px 20px rgba(212, 160, 23, 0.08)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!dragOver && !editing) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      <Folder
        className="w-10 h-10 mb-2"
        style={{
          color: "var(--accent)",
          transition: "transform 0.2s",
        }}
      />
      {editing ? (
        <InlineRenameInput
          defaultValue={item.name}
          onConfirm={(name) => onConfirmRename(item._id, name)}
          onCancel={onCancelRename}
          viewMode="grid"
        />
      ) : (
        <span
          className="text-xs text-center truncate w-full"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </span>
      )}
      {!editing && (
        <div className="absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
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
