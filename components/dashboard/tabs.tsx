"use client";

import type { ComponentType } from "react";

interface TabItem {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  action?: React.ReactNode;
}

export default function Tabs({ items, active, onChange, action }: TabsProps) {
  return (
    <div
      className="flex items-center gap-1 border-b overflow-x-auto"
      style={{ borderColor: "var(--border)" }}
    >
      {items.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap"
            style={{
              color: isActive ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {tab.label}
            {isActive && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        );
      })}
      {action && (
        <>
          <div className="flex-1" />
          <div className="pr-2">{action}</div>
        </>
      )}
    </div>
  );
}
