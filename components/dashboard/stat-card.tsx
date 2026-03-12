"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  active?: boolean;
  trend?: {
    value: number;
    label: string;
  };
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  active,
  trend,
}: StatCardProps) {
  return (
    <div
      className="h-full p-5 rounded-xl border transition-colors"
      style={{
        background: "var(--bg-card)",
        borderColor: active ? "var(--accent)" : "var(--border)",
        boxShadow: active ? "0 0 0 1px var(--accent)" : "none",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {title}
        </p>
        {icon && (
          <div
            className="p-2 rounded-lg"
            style={{ background: "var(--accent-light)" }}
          >
            {icon}
          </div>
        )}
      </div>
      <p
        className="text-2xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {(subtitle || trend) && (
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className="text-xs font-medium"
              style={{
                color:
                  trend.value >= 0 ? "var(--success)" : "var(--error)",
              }}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
