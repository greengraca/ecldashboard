"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";

interface DriveDropZoneProps {
  children: React.ReactNode;
  onDropFiles: (files: FileList) => void;
}

export default function DriveDropZone({
  children,
  onDropFiles,
}: DriveDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    // Only show the upload overlay for file drops from OS, not internal moves
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Upload overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl border-2 border-dashed"
          style={{
            background: "rgba(10, 15, 20, 0.88)",
            borderColor: "var(--accent)",
            boxShadow:
              "inset 0 0 40px rgba(212, 160, 23, 0.12), 0 0 0 1px rgba(212, 160, 23, 0.05)",
            backdropFilter: "blur(4px)",
            animation: "dropZonePulse 1.5s ease-in-out infinite",
          }}
        >
          <div
            style={{
              animation: "dropZoneBounce 1.5s ease-in-out infinite",
            }}
          >
            <Upload
              className="w-10 h-10 mb-2"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            Drop files to upload
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Files will be added to the current folder
          </p>
        </div>
      )}
    </div>
  );
}
