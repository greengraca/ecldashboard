"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";

interface AssetCheck {
  key: string;
  label: string;
  path: string;
  exists: boolean;
  source?: "repo" | "drive" | null;
}

export default function AssetWarningBar() {
  const { data, isLoading } = useSWR("/api/media/drive/asset-status", fetcher);
  const [expanded, setExpanded] = useState(false);

  const assets: AssetCheck[] = data?.data || [];
  const missing = assets.filter((a) => !a.exists);
  const allGood = missing.length === 0 && !isLoading;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
          ) : allGood ? (
            <CheckCircle
              className="w-4 h-4"
              style={{ color: "rgb(34, 197, 94)" }}
            />
          ) : (
            <AlertCircle
              className="w-4 h-4"
              style={{ color: "rgb(234, 179, 8)" }}
            />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Brand Assets
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isLoading
              ? "Checking..."
              : allGood
                ? "All assets in drive"
                : `${missing.length} missing — upload to drive`}
          </span>
        </div>
        {expanded ? (
          <ChevronUp
            className="w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
        ) : (
          <ChevronDown
            className="w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
        )}
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 space-y-2 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="text-xs mt-3 mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Upload these brand assets to the drive for templates to detect them.
          </p>
          {assets.map((asset) => (
            <div
              key={asset.key}
              className="flex items-center gap-2 text-xs py-1"
            >
              {asset.exists ? (
                <CheckCircle
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: "rgb(34, 197, 94)" }}
                />
              ) : (
                <AlertCircle
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: "rgb(234, 179, 8)" }}
                />
              )}
              <span
                style={{
                  color: asset.exists
                    ? "var(--text-secondary)"
                    : "var(--text-primary)",
                }}
              >
                {asset.label}
              </span>
              {asset.source && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: asset.source === "repo" ? "rgba(99,102,241,0.15)" : "var(--accent-light)",
                    color: asset.source === "repo" ? "#818cf8" : "var(--accent)",
                  }}
                >
                  {asset.source}
                </span>
              )}
              <span
                className="ml-auto"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                  fontSize: 10,
                }}
              >
                {asset.path.split("/").pop()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
