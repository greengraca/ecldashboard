"use client";

import { X, AlertTriangle } from "lucide-react";

interface DriveConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DriveConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: DriveConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.6)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border shadow-2xl"
        style={{
          background: "var(--bg-page)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="w-4 h-4"
              style={{ color: "var(--error)" }}
            />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {message}
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: "var(--bg-hover)",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: "var(--error)",
                color: "#fff",
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
