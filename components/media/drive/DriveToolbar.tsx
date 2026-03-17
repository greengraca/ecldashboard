"use client";

import { useRef } from "react";
import {
  FolderPlus,
  Upload,
  LayoutGrid,
  List,
  ChevronRight,
  Home,
} from "lucide-react";

interface Breadcrumb {
  _id: string;
  name: string;
}

interface DriveToolbarProps {
  breadcrumbs: Breadcrumb[];
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onNavigate: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onUploadFiles: (files: FileList) => void;
  onMoveToFolder: (itemId: string, targetFolderId: string | null) => void;
}

export default function DriveToolbar({
  breadcrumbs,
  viewMode,
  onViewModeChange,
  onNavigate,
  onCreateFolder,
  onUploadFiles,
  onMoveToFolder,
}: DriveToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-move")) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).style.outline =
        "1px solid var(--accent)";
      (e.currentTarget as HTMLElement).style.borderRadius = "6px";
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.outline = "none";
  }

  function handleDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.outline = "none";
    const itemId = e.dataTransfer.getData("application/x-drive-move");
    if (itemId) {
      onMoveToFolder(itemId, targetFolderId);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto">
        <button
          onClick={() => onNavigate(null)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className="flex items-center gap-1 px-2 py-1 rounded flex-shrink-0"
          style={{
            color:
              breadcrumbs.length === 0
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color =
              breadcrumbs.length === 0
                ? "var(--text-primary)"
                : "var(--text-secondary)";
          }}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Drive</span>
        </button>

        {breadcrumbs.map((crumb, i) => (
          <div
            key={crumb._id}
            className="flex items-center gap-1 flex-shrink-0"
          >
            <ChevronRight
              className="w-3 h-3"
              style={{ color: "var(--text-muted)" }}
            />
            <button
              onClick={() => onNavigate(crumb._id)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, crumb._id)}
              className="px-2 py-1 rounded"
              style={{
                color:
                  i === breadcrumbs.length - 1
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color =
                  i === breadcrumbs.length - 1
                    ? "var(--text-primary)"
                    : "var(--text-secondary)";
              }}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() =>
            onViewModeChange(viewMode === "grid" ? "list" : "grid")
          }
          className="p-2 rounded-lg"
          style={{
            color: "var(--text-secondary)",
            background: "var(--bg-hover)",
            transition: "background 0.15s, color 0.15s, transform 0.1s",
          }}
          title={
            viewMode === "grid" ? "Switch to list view" : "Switch to grid view"
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-card-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.93)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {viewMode === "grid" ? (
            <List className="w-4 h-4" />
          ) : (
            <LayoutGrid className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onCreateFolder}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
          style={{
            color: "var(--text-secondary)",
            background: "var(--bg-hover)",
            transition: "background 0.15s, color 0.15s, transform 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-card-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.95)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
            transition: "background 0.15s, box-shadow 0.2s, transform 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-hover)";
            e.currentTarget.style.boxShadow =
              "0 2px 12px rgba(212, 160, 23, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.95)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}
