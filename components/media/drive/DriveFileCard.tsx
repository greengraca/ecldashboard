"use client";

import { useState } from "react";
import {
  FileImage,
  FileVideo,
  File,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import type { MediaFile } from "@/lib/types";

interface DriveFileCardProps {
  item: MediaFile;
  viewMode: "grid" | "list";
  onClick: (item: MediaFile) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string, name: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function FileIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.startsWith("image/"))
    return (
      <FileImage className="w-5 h-5" style={{ color: "var(--accent)" }} />
    );
  if (mimeType?.startsWith("video/"))
    return <FileVideo className="w-5 h-5" style={{ color: "#a78bfa" }} />;
  return <File className="w-5 h-5" style={{ color: "var(--text-muted)" }} />;
}

export default function DriveFileCard({
  item,
  viewMode,
  onClick,
  onRename,
  onDelete,
}: DriveFileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isImage = item.mimeType?.startsWith("image/");

  function handleDragStart(e: React.DragEvent) {
    // For move within drive
    e.dataTransfer.setData("application/x-drive-move", item._id);
    // For drag-to-template-editor
    if (item.previewUrl) {
      e.dataTransfer.setData(
        "application/x-drive-asset",
        JSON.stringify({
          id: item._id,
          previewUrl: item.previewUrl,
          name: item.name,
        })
      );
    }
    e.dataTransfer.effectAllowed = "copyMove";
  }

  if (viewMode === "list") {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={() => onClick(item)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group"
        style={{ background: "transparent" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        {isImage && item.previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-8 h-8 rounded object-cover flex-shrink-0"
          />
        ) : (
          <FileIcon mimeType={item.mimeType} />
        )}
        <span
          className="flex-1 text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {item.size ? formatSize(item.size) : "—"}
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
            <FileContextMenu
              itemId={item._id}
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

  // Grid view
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onClick(item)}
      className="flex flex-col rounded-xl border cursor-pointer transition-all group relative overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border)")
      }
    >
      {/* Thumbnail area */}
      <div
        className="flex items-center justify-center h-24 overflow-hidden"
        style={{ background: "var(--bg-page)" }}
      >
        {isImage && item.previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileIcon mimeType={item.mimeType} />
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p
          className="text-xs truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </p>
        <p
          className="text-[10px] mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {item.size ? formatSize(item.size) : "—"}
        </p>
      </div>

      {/* Menu button */}
      <div className="absolute top-1 right-1">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              color: "var(--text-muted)",
              background: "rgba(0,0,0,0.5)",
            }}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <FileContextMenu
              itemId={item._id}
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

function FileContextMenu({
  itemId,
  onRename,
  onDelete,
  onClose,
}: {
  itemId: string;
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
        <a
          href={`/api/media/drive/${itemId}/download`}
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80"
          style={{ color: "var(--text-primary)" }}
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
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
