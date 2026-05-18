"use client";

interface ContentCardProps {
  children: React.ReactNode;
  padding?: "none" | "default";
  className?: string;
}

export default function ContentCard({
  children,
  padding = "default",
  className = "",
}: ContentCardProps) {
  return (
    <div
      className={`rounded-xl ${padding === "default" ? "p-6" : ""} ${className}`}
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {children}
    </div>
  );
}
