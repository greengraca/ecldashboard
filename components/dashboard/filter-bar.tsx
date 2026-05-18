"use client";

export interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  chips: FilterChip[];
  active: string;
  onChange: (key: string) => void;
  /** Label for the "All" chip. Defaults to "All". Pass null to hide the All chip. */
  allLabel?: string | null;
}

export default function FilterBar({
  chips,
  active,
  onChange,
  allLabel = "All",
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allLabel !== null && (
        <Chip
          label={allLabel}
          active={active === "all"}
          onClick={() => onChange("all")}
        />
      )}
      {chips.map((c) => (
        <Chip
          key={c.key}
          label={c.label}
          count={c.count}
          active={active === c.key}
          onClick={() => onChange(c.key)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent-light)" : "var(--bg-card)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{
            background: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
            color: active ? "var(--bg-page)" : "var(--text-muted)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
