"use client";

import { useState, useRef, useEffect } from "react";
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
import { DRAG_PLACEHOLDER_STYLE, cacheThumbnail, setCurrentDragId } from "./drag-utils";

interface DriveFileCardProps {
  item: MediaFile;
  viewMode: "grid" | "list";
  isDragging?: boolean;
  onDragEnd?: () => void;
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
  isDragging = false,
  onDragEnd: onDragEndProp,
  onClick,
  onRename,
  onDelete,
}: DriveFileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [ghostOver, setGhostOver] = useState(false);
  const isImage = item.mimeType?.startsWith("image/");

  function handleDragStart(e: React.DragEvent) {
    setCurrentDragId(item._id);
    // For move within drive
    e.dataTransfer.setData("application/x-drive-move", item._id);
    // For reorder within same folder
    e.dataTransfer.setData(
      "application/x-drive-reorder",
      JSON.stringify({ id: item._id, type: "file" })
    );
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
    // Hide native ghost — we render our own via DriveFileGrid
    const blank = document.createElement("div");
    blank.style.width = "1px";
    blank.style.height = "1px";
    blank.style.opacity = "0.01";
    document.body.appendChild(blank);
    e.dataTransfer.setDragImage(blank, 0, 0);
    requestAnimationFrame(() => blank.remove());
  }

  function handleDragEnd() {
    setCurrentDragId(null);
    setGhostOver(false);
    onDragEndProp?.();
  }

  if (viewMode === "list") {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={isDragging ? () => setGhostOver(true) : undefined}
        onDragOver={isDragging ? (e) => e.preventDefault() : undefined}
        onDragLeave={isDragging ? () => setGhostOver(false) : undefined}
        onClick={() => onClick(item)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group"
        style={isDragging ? {
          ...DRAG_PLACEHOLDER_STYLE,
          opacity: ghostOver ? 0.7 : 0.4,
          transition: "opacity 0.15s, border 0.15s, background 0.15s",
        } : {
          background: "transparent",
          transition: "background 0.15s, padding-left 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.paddingLeft = "16px";
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.paddingLeft = "12px";
          }
        }}
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
      onDragEnd={handleDragEnd}
      onDragEnter={isDragging ? () => setGhostOver(true) : undefined}
      onDragOver={isDragging ? (e) => e.preventDefault() : undefined}
      onDragLeave={isDragging ? () => setGhostOver(false) : undefined}
      onClick={() => onClick(item)}
      className="flex flex-col rounded-xl cursor-pointer group relative overflow-hidden"
      style={isDragging ? {
        ...DRAG_PLACEHOLDER_STYLE,
        opacity: ghostOver ? 0.7 : 0.4,
        width: 120,
        height: 120,
        transition: "opacity 0.15s, border 0.15s, background 0.15s",
      } : {
        width: 120,
        height: 120,
        background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "var(--accent-border)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.2)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Thumbnail area — flex-1 to fill remaining space after info */}
      <div
        className="flex items-center justify-center flex-1 min-h-0 overflow-hidden"
        style={{ background: isDragging ? "transparent" : "var(--bg-page)" }}
      >
        {isDragging && isImage && item.previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            style={{ opacity: 0.4 }}
          />
        ) : isDragging ? (
          <FileIcon mimeType={item.mimeType} />
        ) : isImage && item.previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            style={{
              transition: "transform 0.3s ease",
            }}
            onLoad={(e) => cacheThumbnail(item._id, e.currentTarget)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ transition: "background 0.2s" }}
          >
            <FileIcon mimeType={item.mimeType} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p
          className="text-xs truncate"
          style={{ color: isDragging ? "var(--text-muted)" : "var(--text-primary)" }}
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
      {!isDragging && (
        <div className="absolute top-1 right-1">
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
      )}
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 rounded-md border py-0.5 min-w-[110px]"
      onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(12, 14, 18, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)",
          animation: "menuSlideIn 0.15s ease-out",
        }}
      >
        <a
          href={`/api/media/drive/${itemId}/download`}
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded mx-auto"
          style={{
            color: "var(--text-primary)",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Download className="w-3 h-3" />
          Download
        </a>
        <button
          onClick={onRename}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-left rounded"
          style={{
            color: "var(--text-primary)",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Pencil className="w-3 h-3" />
          Rename
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-left rounded"
          style={{
            color: "var(--error)",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--error-light)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
  );
}
