"use client";

import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/dashboard/data-table";
import type { Player } from "@/lib/types";

interface PlayerTableProps {
  players: Player[];
}

function SubscriberBadge({ player }: { player: Player }) {
  if (!player.is_subscriber) return null;

  const sourceColors: Record<string, { color: string; bg: string; label: string }> = {
    patreon: {
      color: "var(--status-patreon)",
      bg: "var(--status-patreon-light)",
      label: "Patreon",
    },
    kofi: {
      color: "var(--status-kofi)",
      bg: "var(--status-kofi-light)",
      label: "Ko-fi",
    },
    free: {
      color: "var(--status-free)",
      bg: "var(--status-free-light)",
      label: "Free",
    },
  };

  const info = player.subscription_source
    ? sourceColors[player.subscription_source]
    : { color: "var(--success)", bg: "var(--success-light)", label: "Sub" };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: info.color, background: info.bg }}
    >
      {info.label}
    </span>
  );
}

const columns: Column<Player & Record<string, unknown>>[] = [
  {
    key: "rank",
    label: "Rank",
    sortable: true,
    className: "w-16 text-center",
    render: (row) => (
      <span
        className="text-sm font-mono font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        #{row.rank as number}
      </span>
    ),
  },
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (row) => (
      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {row.name as string}
      </span>
    ),
  },
  {
    key: "points",
    label: "Points",
    sortable: true,
    className: "text-right",
    render: (row) => (
      <span className="tabular-nums font-medium" style={{ color: "var(--accent)" }}>
        {(row.points as number).toFixed(0)}
      </span>
    ),
  },
  {
    key: "games",
    label: "Games",
    sortable: true,
    className: "text-right",
    render: (row) => <span className="tabular-nums">{row.games as number}</span>,
  },
  {
    key: "wins",
    label: "Wins",
    sortable: true,
    className: "text-right",
    render: (row) => (
      <span className="tabular-nums" style={{ color: "var(--success)" }}>
        {row.wins as number}
      </span>
    ),
  },
  {
    key: "losses",
    label: "Losses",
    sortable: true,
    className: "text-right",
    render: (row) => (
      <span className="tabular-nums" style={{ color: "var(--error)" }}>
        {row.losses as number}
      </span>
    ),
  },
  {
    key: "win_pct",
    label: "Win%",
    sortable: true,
    className: "text-right",
    render: (row) => (
      <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
        {parseFloat((row.win_pct as number).toFixed(2))}%
      </span>
    ),
  },
  {
    key: "is_subscriber",
    label: "Subscriber",
    render: (row) => <SubscriberBadge player={row as unknown as Player} />,
  },
];

export default function PlayerTable({ players }: PlayerTableProps) {
  const router = useRouter();

  const data = players as unknown as (Player & Record<string, unknown>)[];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.015)",
        border: "1px solid var(--border)",
      }}
    >
      <DataTable
        columns={columns}
        data={data}
        keyField="uid"
        emptyMessage="No players found for this month"
        bare
        onRowClick={(row) => router.push(`/league/${row.uid}`)}
        renderMobileCard={(row) => {
          const player = row as unknown as Player;
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                    #{player.rank}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {player.name}
                  </span>
                  <SubscriberBadge player={player} />
                </div>
                <span className="tabular-nums font-medium" style={{ color: "var(--accent)" }}>
                  {player.points.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{player.games} games</span>
                <span style={{ color: "var(--success)" }}>{player.wins}W</span>
                <span style={{ color: "var(--error)" }}>{player.losses}L</span>
                <span style={{ color: "var(--text-secondary)" }}>{parseFloat(player.win_pct.toFixed(2))}%</span>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
