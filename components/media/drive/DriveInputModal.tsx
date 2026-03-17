"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface DriveInputModalProps {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  confirmStyle?: "accent" | "danger";
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function DriveInputModal({
  title,
  placeholder,
  defaultValue = "",
  confirmLabel = "Create",
  confirmStyle = "accent",
  onConfirm,
  onCancel,
}: DriveInputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus and select the name (without extension for files)
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const dotIdx = defaultValue.lastIndexOf(".");
    if (dotIdx > 0) {
      input.setSelectionRange(0, dotIdx);
    } else {
      input.select();
    }
  }, [defaultValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) onConfirm(value.trim());
  }

  const isDanger = confirmStyle === "danger";

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
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
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
              type="submit"
              disabled={!value.trim()}
              className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40"
              style={{
                background: isDanger ? "var(--error)" : "var(--accent)",
                color: isDanger ? "#fff" : "var(--accent-text)",
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
