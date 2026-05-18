"use client";

interface LoadingSurfaceProps {
  message?: string;
}

export default function LoadingSurface({ message }: LoadingSurfaceProps) {
  return (
    <div
      className="rounded-xl p-12 text-center"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div
        className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
        style={{
          borderColor: "var(--border)",
          borderTopColor: "var(--accent)",
        }}
      />
      {message && (
        <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
