"use client";

import { ArrowRight } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export default function StatusCard({
  title,
  value,
  subtitle,
  action,
}: StatusCardProps) {
  return (
    <div
      className="h-full p-5 rounded-xl flex flex-col"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider mb-3"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {title}
      </p>
      <p
        className="text-2xl font-bold mb-1"
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-auto pt-3 flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80 self-start"
          style={{ color: "var(--accent)" }}
        >
          {action.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
