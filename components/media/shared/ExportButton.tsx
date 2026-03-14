"use client";

import { useState, useCallback } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
}

export default function ExportButton({ targetRef, filename }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!targetRef.current || typeof window === "undefined") return;

    setExporting(true);
    setError(null);
    try {
      const { toPng } = await import("html-to-image");
      // Double-render: first call warms up font/image loading, second captures clean
      await toPng(targetRef.current, { pixelRatio: 1, cacheBust: true });
      const dataUrl = await toPng(targetRef.current, { pixelRatio: 1, cacheBust: true });

      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      setError("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }, [targetRef, filename]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          background: "var(--accent)",
          color: "var(--accent-text)",
        }}
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {exporting ? "Exporting..." : "Download PNG"}
      </button>
      {error && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--error)" }}>
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
