"use client";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <Icon
        className="w-10 h-10 mb-3"
        style={{ color: "var(--text-muted)" }}
      />
      <p
        className="text-sm font-medium mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
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
          className="mt-4 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
