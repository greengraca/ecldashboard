"use client";

import DataTable, { Column } from "@/components/dashboard/data-table";
import type { ActivityEntry, ActivityAction } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";

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
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

const actionColors: Record<ActivityAction, { bg: string; color: string }> = {
  create: { bg: "var(--success-light)", color: "var(--success)" },
  update: { bg: "var(--status-active-light)", color: "var(--status-active)" },
  delete: { bg: "var(--error-light)", color: "var(--error)" },
  sync: { bg: "var(--warning-light)", color: "var(--warning)" },
  join: { bg: "var(--status-active-light)", color: "var(--info)" },
  detect: { bg: "var(--meeting-light)", color: "var(--meeting)" },
  end: { bg: "rgba(100,116,139,0.08)", color: "var(--text-muted)" },
};

function ActionBadge({ action }: { action: ActivityAction }) {
  const style = actionColors[action] || actionColors.update;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium capitalize"
      style={{ background: style.bg, color: style.color }}
    >
      {action}
    </span>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function detailsToString(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "-";
  const parts: string[] = [];
  for (const [key, val] of Object.entries(details)) {
    parts.push(`${key}: ${String(val)}`);
  }
  return parts.join(", ");
}

interface ActivityTableProps {
  data: ActivityEntry[];
  loading?: boolean;
}

// DataTable expects Record<string, unknown>, so we cast through the column render fns
type Row = ActivityEntry & Record<string, unknown>;

export default function ActivityTable({ data, loading }: ActivityTableProps) {
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
      key: "user_name",
      label: "User",
      render: (row) => (
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>
          <Sensitive>{(row.user_name as string) || "System"}</Sensitive>
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => <ActionBadge action={row.action as ActivityAction} />,
    },
    {
      key: "entity_type",
      label: "Entity",
      render: (row) => (
        <span
          className="text-xs capitalize px-2 py-0.5 rounded"
          style={{
            background: "var(--bg-hover)",
            color: "var(--text-tertiary)",
          }}
        >
          {(row.entity_type as string).replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (row) => (
        <span
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
          title={detailsToString(row.details as Record<string, unknown>)}
        >
          {truncate(
            detailsToString(row.details as Record<string, unknown>),
            60
          )}
        </span>
      ),
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
      emptyMessage="No activity entries found"
      renderMobileCard={(row) => (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActionBadge action={row.action as ActivityAction} />
              <span
                className="text-xs capitalize px-2 py-0.5 rounded"
                style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}
              >
                {(row.entity_type as string).replace(/_/g, " ")}
              </span>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {timeAgo(row.timestamp as string)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              <Sensitive>{(row.user_name as string) || "System"}</Sensitive>
            </span>
          </div>
          {row.details && Object.keys(row.details as Record<string, unknown>).length > 0 && (
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {truncate(detailsToString(row.details as Record<string, unknown>), 80)}
            </p>
          )}
        </div>
      )}
    />
  );
}
