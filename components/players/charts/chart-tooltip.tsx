"use client";

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface PlayerChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number, name: string) => string;
}

export default function PlayerChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: PlayerChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter && label != null ? labelFormatter(label) : label;

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs border"
      style={{
        background: "var(--bg-page)",
        borderColor: "var(--border)",
      }}
    >
      {displayLabel != null && (
        <p
          className="font-medium mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {displayLabel}
        </p>
      )}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{" "}
          {valueFormatter
            ? valueFormatter(entry.value, entry.name)
            : entry.value}
        </p>
      ))}
    </div>
  );
}
