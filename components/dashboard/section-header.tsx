"use client";

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export default function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h2>
      {action && <div>{action}</div>}
    </div>
  );
}
