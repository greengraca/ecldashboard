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
      // Pre-convert all images to inline base64 to avoid html-to-image
      // caching/CORS issues that cause all images to render as the first one
      const imgs = targetRef.current.querySelectorAll("img");
      const originalSrcs = new Map<HTMLImageElement, string>();

      await Promise.all(
        Array.from(imgs).map(async (img) => {
          const src = img.src;
          if (!src || src.startsWith("data:")) return;
          try {
            const resp = await fetch(src);
            const blob = await resp.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            originalSrcs.set(img, src);
            img.src = dataUrl;
          } catch {
            // Leave original src if fetch fails
          }
        }),
      );

      const { toPng } = await import("html-to-image");
      const opts = {
        pixelRatio: 1,
        cacheBust: false,
        skipFonts: true,
        imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      };
      // Double-render: first call warms up font/image loading, second captures clean
      await toPng(targetRef.current, opts);
      const dataUrl = await toPng(targetRef.current, opts);

      // Restore original srcs
      for (const [img, src] of originalSrcs) {
        img.src = src;
      }

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
