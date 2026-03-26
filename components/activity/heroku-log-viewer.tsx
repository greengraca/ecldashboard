"use client";

import React, { useRef, useEffect } from "react";
import useSWR from "swr";
import { RefreshCw } from "lucide-react";
import Select from "@/components/dashboard/select";
import { useState } from "react";
import { useSensitiveData } from "@/contexts/SensitiveDataContext";
import { SensitiveBlock } from "@/components/dashboard/sensitive";
import { fetcher } from "@/lib/fetcher";

interface HerokuLogResponse {
  data?: { lines: string; fetchedAt: string };
  error?: string;
}

interface HerokuLogViewerProps {
  active: boolean;
}

const LINE_OPTIONS = [
  { value: "100", label: "100 lines" },
  { value: "500", label: "500 lines" },
  { value: "1500", label: "1500 lines" },
];

// ── ANSI escape code → CSS variable mapping ──
// Maps SGR codes to dashboard CSS variables so bot output looks like the real console
const ANSI_COLOR_MAP: Record<number, string> = {
  30: "var(--text-muted)",        // black
  31: "var(--error)",             // red
  32: "var(--success)",           // green
  33: "var(--warning)",           // yellow
  34: "var(--status-active)",     // blue
  35: "#c084fc",                  // magenta (purple-400)
  36: "#22d3ee",                  // cyan (cyan-400)
  37: "var(--text-secondary)",    // white
  90: "var(--text-muted)",        // bright black (gray)
  91: "var(--error)",             // bright red
  92: "var(--success)",           // bright green
  93: "var(--accent)",            // bright yellow → gold accent
  94: "var(--status-active)",     // bright blue
  95: "#c084fc",                  // bright magenta
  96: "#22d3ee",                  // bright cyan
  97: "var(--text-primary)",      // bright white
};

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[([0-9;]*)m/g;

/** Parse a string with ANSI codes into styled spans */
function parseAnsi(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let color: string | undefined;
  let bold = false;

  let match: RegExpExecArray | null;
  while ((match = ANSI_RE.exec(text)) !== null) {
    // Push text before this escape
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(
        <span key={lastIndex} style={{ color, fontWeight: bold ? 600 : undefined }}>
          {segment}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;

    // Parse SGR params
    const codes = match[1].split(";").map(Number);
    for (const code of codes) {
      if (code === 0) {
        color = undefined;
        bold = false;
      } else if (code === 1) {
        bold = true;
      } else if (ANSI_COLOR_MAP[code]) {
        color = ANSI_COLOR_MAP[code];
      }
    }
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex} style={{ color, fontWeight: bold ? 600 : undefined }}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

// Heroku log format: "2024-01-15T10:30:45.123456+00:00 app[web.1]: message"
const HEROKU_LINE_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+[+-]\d{2}:\d{2})\s+([\w.]+\[[\w.]+\]:?)\s*(.*)$/;

function renderLine(line: string): React.ReactNode {
  // Strip ANSI for structural matching, but use original for rendering
  // eslint-disable-next-line no-control-regex
  const stripped = line.replace(/\x1b\[[0-9;]*m/g, "");
  const match = stripped.match(HEROKU_LINE_RE);

  if (!match) {
    // No Heroku prefix — just parse ANSI colors from the raw line
    const hasAnsi = ANSI_RE.test(line);
    ANSI_RE.lastIndex = 0;
    if (hasAnsi) return <>{parseAnsi(line)}</>;

    const color = /error/i.test(line)
      ? "var(--error)"
      : /warn(ing)?/i.test(line)
        ? "var(--warning)"
        : "var(--text-muted)";
    return <span style={{ color }}>{line}</span>;
  }

  const [, timestamp, source] = match;

  // Find where the message starts in the original line (after source + colon + space)
  const sourceEnd = line.indexOf(source) + source.length;
  // eslint-disable-next-line no-control-regex
  const afterSource = line.slice(sourceEnd).replace(/^\x1b\[[0-9;]*m\s*/, " ");
  const messageRaw = afterSource.trimStart();

  // Source color: heroku platform = accent, app = blue
  let sourceColor = "var(--text-muted)";
  if (/^heroku\[/i.test(source)) {
    sourceColor = "var(--accent)";
  } else if (/^app\[/i.test(source)) {
    sourceColor = "var(--status-active)";
  }

  return (
    <>
      <span style={{ color: "var(--text-muted)" }}>{timestamp} </span>
      <span style={{ color: sourceColor, fontWeight: 500 }}>{source} </span>
      {parseAnsi(messageRaw)}
    </>
  );
}

export default function HerokuLogViewer({ active }: HerokuLogViewerProps) {
  const [lineCount, setLineCount] = useState("100");
  const scrollRef = useRef<HTMLPreElement>(null);
  const { hidden } = useSensitiveData();

  const { data, isLoading, mutate } = useSWR<HerokuLogResponse>(
    active ? `/api/heroku-logs?lines=${lineCount}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const isNotConfigured = data?.error && !data.data;
  const lines = data?.data?.lines?.split("\n") || [];

  // Auto-scroll to bottom when data loads
  useEffect(() => {
    if (scrollRef.current && lines.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  if (hidden) {
    return (
      <div className="p-4">
        <SensitiveBlock message="Heroku logs hidden in privacy mode" height={200} />
      </div>
    );
  }

  if (isNotConfigured) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Heroku not configured. Add <code className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)" }}>HEROKU_API_TOKEN</code> to your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-3 p-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Select
          value={lineCount}
          onChange={setLineCount}
          options={LINE_OPTIONS}
        />
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
          disabled={isLoading}
          onClick={() => mutate()}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {data?.data?.fetchedAt && (
          <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
            Fetched {new Date(data.data.fetchedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="p-4">
        {isLoading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-full" />
            ))}
          </div>
        ) : (
          <pre
            ref={scrollRef}
            className="text-xs font-mono leading-relaxed overflow-auto rounded-lg p-4"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              maxHeight: "500px",
              color: "var(--text-secondary)",
            }}
          >
            {lines.length > 0 ? (
              lines.map((line, i) => (
                <div key={i}>
                  {renderLine(line)}
                </div>
              ))
            ) : (
              <span style={{ color: "var(--text-muted)" }}>No logs available</span>
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
