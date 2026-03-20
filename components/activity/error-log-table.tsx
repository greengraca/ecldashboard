"use client";

import DataTable, { Column } from "@/components/dashboard/data-table";
import type { ErrorLogEntry, ErrorLogLevel } from "@/lib/types";

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const levelColors: Record<ErrorLogLevel, { bg: string; color: string }> = {
  error: { bg: "var(--error-light)", color: "var(--error)" },
  warn: { bg: "var(--warning-light)", color: "var(--warning)" },
  info: { bg: "var(--status-active-light)", color: "var(--status-active)" },
};

function LevelBadge({ level }: { level: ErrorLogLevel }) {
  const style = levelColors[level] || levelColors.info;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium uppercase"
      style={{ background: style.bg, color: style.color }}
    >
      {level}
    </span>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

interface ErrorLogTableProps {
  data: ErrorLogEntry[];
  loading?: boolean;
}

type Row = ErrorLogEntry & Record<string, unknown>;

export default function ErrorLogTable({ data, loading }: ErrorLogTableProps) {
  const columns: Column<Row>[] = [
    {
      key: "timestamp",
      label: "Time",
      render: (row) => (
        <span
          className="text-xs whitespace-nowrap"
          style={{ color: "var(--text-secondary)" }}
          title={row.timestamp as string}
        >
          {timeAgo(row.timestamp as string)}
        </span>
      ),
    },
    {
      key: "level",
      label: "Level",
      render: (row) => <LevelBadge level={row.level as ErrorLogLevel} />,
    },
    {
      key: "source",
      label: "Source",
      render: (row) => (
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            background: "var(--bg-hover)",
            color: "var(--text-tertiary)",
          }}
        >
          {row.source as string}
        </span>
      ),
    },
    {
      key: "message",
      label: "Message",
      render: (row) => (
        <span
          className="text-xs"
          style={{ color: "var(--text-primary)" }}
          title={row.message as string}
        >
          {truncate(row.message as string, 60)}
        </span>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (row) => {
        const details = row.details as Record<string, unknown> | null;
        if (!details) return <span style={{ color: "var(--text-muted)" }}>-</span>;
        const json = JSON.stringify(details);
        return (
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-muted)" }}
            title={json}
          >
            {truncate(json, 50)}
          </span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <DataTable<Row>
      columns={columns}
      data={data as Row[]}
      keyField="_id"
      emptyMessage="No error log entries"
      renderMobileCard={(row) => (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LevelBadge level={row.level as ErrorLogLevel} />
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}
              >
                {row.source as string}
              </span>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {timeAgo(row.timestamp as string)}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-primary)" }}>
            {truncate(row.message as string, 80)}
          </p>
        </div>
      )}
    />
  );
}
