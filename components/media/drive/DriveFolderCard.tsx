"use client";

import { useState } from "react";
import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { MediaFile } from "@/lib/types";

interface DriveFolderCardProps {
  item: MediaFile;
  viewMode: "grid" | "list";
  onNavigate: (folderId: string) => void;
  onDrop: (itemId: string, targetFolderId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
}

export default function DriveFolderCard({
  item,
  viewMode,
  onNavigate,
  onDrop,
  onRename,
  onDelete,
}: DriveFolderCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/x-drive-move", item._id);
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
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnFolder}
        onClick={() => onNavigate(item._id)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group"
        style={{
          background: dragOver ? "var(--accent-light)" : "transparent",
        }}
      >
        <Folder
          className="w-5 h-5 flex-shrink-0"
          style={{ color: "var(--accent)" }}
        />
        <span
          className="flex-1 text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Folder
        </span>
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
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropOnFolder}
      onDoubleClick={() => onNavigate(item._id)}
      className="flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all group relative"
      style={{
        background: dragOver ? "var(--accent-light)" : "var(--bg-card)",
        borderColor: dragOver ? "var(--accent)" : "var(--border)",
        minHeight: 120,
      }}
    >
      <Folder
        className="w-10 h-10 mb-2"
        style={{ color: "var(--accent)" }}
      />
      <span
        className="text-xs text-center truncate w-full"
        style={{ color: "var(--text-primary)" }}
      >
        {item.name}
      </span>
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
        className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[140px]"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <button
          onClick={onRename}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80"
          style={{ color: "var(--text-primary)" }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Rename
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80"
          style={{ color: "var(--error)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </>
  );
}
