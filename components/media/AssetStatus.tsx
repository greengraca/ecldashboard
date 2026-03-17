"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { REQUIRED_ASSETS } from "./shared/brand-constants";

interface AssetCheck {
  key: string;
  path: string;
  label: string;
  exists: boolean;
}

export default function AssetStatus() {
  const [assets, setAssets] = useState<AssetCheck[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAssets() {
      const results = await Promise.all(
        REQUIRED_ASSETS.map(async (asset) => {
          try {
            const res = await fetch(asset.path, { method: "HEAD" });
            return { ...asset, exists: res.ok };
          } catch {
            return { ...asset, exists: false };
          }
        })
      );
      setAssets(results);
      setChecking(false);
    }
    checkAssets();
  }, []);

  const missing = assets.filter((a) => !a.exists);
  const allGood = missing.length === 0 && !checking;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
        borderColor: allGood ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {checking ? (
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
            />
          ) : allGood ? (
            <CheckCircle className="w-4 h-4" style={{ color: "rgb(34, 197, 94)" }} />
          ) : (
            <AlertCircle className="w-4 h-4" style={{ color: "rgb(234, 179, 8)" }} />
          )}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Brand Assets
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {checking
              ? "Checking..."
              : allGood
                ? "All assets loaded"
                : `${missing.length} missing`}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        )}
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 space-y-2 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-xs mt-3 mb-2" style={{ color: "var(--text-muted)" }}>
            Place brand assets in <code style={{ color: "var(--text-secondary)" }}>public/media/assets/</code> for templates to use them.
          </p>
          {assets.map((asset) => (
            <div
              key={asset.key}
              className="flex items-center gap-2 text-xs py-1"
            >
              {asset.exists ? (
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgb(34, 197, 94)" }} />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgb(234, 179, 8)" }} />
              )}
              <span style={{ color: asset.exists ? "var(--text-secondary)" : "var(--text-primary)" }}>
                {asset.label}
              </span>
              <span className="ml-auto" style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 10 }}>
                {asset.path.split("/").pop()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
