"use client";

import DataTable, { type Column } from "@/components/dashboard/data-table";
import type { Subscriber, SubscriptionSource } from "@/lib/types";

interface SubscriberTableProps {
  subscribers: Subscriber[];
  filterSource?: SubscriptionSource | null;
}

const SOURCE_BADGES: Record<
  SubscriptionSource,
  { label: string; color: string; bg: string }
> = {
  patreon: {
    label: "Patreon",
    color: "var(--status-patreon)",
    bg: "var(--status-patreon-light)",
  },
  kofi: {
    label: "Ko-fi",
    color: "var(--status-kofi)",
    bg: "var(--status-kofi-light)",
  },
  free: {
    label: "Free",
    color: "var(--status-free)",
    bg: "var(--status-free-light)",
  },
};

function SourceBadge({ source }: { source: SubscriptionSource }) {
  const badge = SOURCE_BADGES[source];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: badge.color, background: badge.bg }}
    >
      {badge.label}
    </span>
  );
}

function PlayingStatus({ isPlaying }: { isPlaying: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color: isPlaying ? "var(--success)" : "var(--text-muted)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: isPlaying ? "var(--success)" : "var(--text-muted)",
        }}
      />
      {isPlaying ? "Active" : "Inactive"}
    </span>
  );
}

const columns: Column<Subscriber & Record<string, unknown>>[] = [
  {
    key: "display_name",
    label: "Name",
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-2.5">
        {row.avatar_url ? (
          <img
            src={row.avatar_url as string}
            alt=""
            className="w-7 h-7 rounded-full"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
            }}
          >
            {(row.display_name as string).charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {row.display_name as string}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {row.username as string}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "source",
    label: "Source",
    sortable: true,
    render: (row) => <SourceBadge source={row.source as SubscriptionSource} />,
  },
  {
    key: "tier",
    label: "Tier",
    sortable: true,
  },
  {
    key: "is_playing",
    label: "Status",
    sortable: true,
    render: (row) => <PlayingStatus isPlaying={row.is_playing as boolean} />,
  },
  {
    key: "games_played",
    label: "Games",
    sortable: true,
    className: "text-right",
    render: (row) => (
      <span className="tabular-nums">{row.games_played as number}</span>
    ),
  },
];

export default function SubscriberTable({
  subscribers,
  filterSource,
}: SubscriberTableProps) {
  const filtered = filterSource
    ? subscribers.filter((s) => s.source === filterSource)
    : subscribers;

  // Cast for DataTable compatibility
  const data = filtered as unknown as (Subscriber & Record<string, unknown>)[];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <DataTable
        columns={columns}
        data={data}
        keyField="discord_id"
        emptyMessage="No subscribers found for this month"
      />
    </div>
  );
}
