"use client";

import { TEMPLATES } from "./template-registry";

interface TemplateSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {TEMPLATES.map((t) => {
        const isActive = selected === t.id;
        const aspectLabel =
          t.dimensions.width === t.dimensions.height ? "1:1" : "9:16";

        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="p-4 rounded-xl text-left transition-all"
            style={{
              background: isActive ? "var(--accent-light)" : "var(--surface-gradient)",
              backdropFilter: isActive ? undefined : "var(--surface-blur)",
              border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
              boxShadow: isActive ? undefined : "var(--surface-shadow)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--bg-hover)",
                  color: "var(--text-muted)",
                }}
              >
                {aspectLabel}
              </span>
            </div>
            <h3
              className="text-sm font-semibold mb-1"
              style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
            >
              {t.label}
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {t.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
