"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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
    className: "text-center",
    render: (row) => (
      <span className="tabular-nums">{row.games_played as number}</span>
    ),
  },
];

export default function SubscriberTable({
  subscribers,
  filterSource,
}: SubscriberTableProps) {
  const [search, setSearch] = useState("");

  const filtered = subscribers.filter((s) => {
    const matchesSource = !filterSource || s.source === filterSource;
    const matchesSearch =
      !search ||
      s.display_name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase());
    return matchesSource && matchesSearch;
  });

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
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="relative max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm outline-none transition-colors hover:border-[var(--text-muted)] focus:border-[var(--accent)]"
            style={{
              background: "var(--bg-page)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        keyField="discord_id"
        emptyMessage="No subscribers found for this month"
        rowHover
        defaultSortKey="is_playing"
        defaultSortDir="desc"
        renderMobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {row.avatar_url ? (
                  <img src={row.avatar_url as string} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
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
              <SourceBadge source={row.source as SubscriptionSource} />
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
              <PlayingStatus isPlaying={row.is_playing as boolean} />
              {row.tier && <span>Tier: {row.tier as string}</span>}
              <span className="tabular-nums">{row.games_played as number} games</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
