"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleCardProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}

export default function CollapsibleCard({
  title,
  icon,
  badge,
  defaultOpen = false,
  onToggle,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        onClick={toggle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <ChevronRight
          className="w-4 h-4 transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
        {icon && <span style={{ color: "var(--accent)" }}>{icon}</span>}
        <span
          className="text-sm font-medium flex-1"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
        {badge}
      </button>
      {open && (
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
