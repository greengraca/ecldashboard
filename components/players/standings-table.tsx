"use client";

import type { Standing } from "@/lib/types";

interface StandingsTableProps {
  standings: Standing[];
}

function getRankStyle(rank: number): { color: string; bg: string } {
  switch (rank) {
    case 1:
      return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)" }; // gold
    case 2:
      return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.08)" }; // silver
    case 3:
      return { color: "#cd7f32", bg: "rgba(205, 127, 50, 0.08)" }; // bronze
    default:
      return { color: "var(--text-muted)", bg: "transparent" };
  }
}

function RankBadge({ rank }: { rank: number }) {
  const style = getRankStyle(rank);
  const isPodium = rank <= 3;

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold ${
        isPodium ? "w-8 h-8 rounded-full text-sm" : "text-sm w-8 text-center"
      }`}
      style={{
        color: style.color,
        background: isPodium ? style.bg : undefined,
        border: isPodium ? `1px solid ${style.color}30` : undefined,
      }}
    >
      {rank}
    </span>
  );
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <div
        className="text-center py-12 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        No standings data available
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th
                className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider w-16"
                style={{ color: "var(--text-muted)" }}
              >
                Rank
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Player
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Points
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                W / L / D
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Games
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Win%
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const isPodium = s.rank <= 3;
              const rankStyle = getRankStyle(s.rank);

              return (
                <tr
                  key={s.uid}
                  className="border-b border-[var(--border-subtle)] transition-colors"
                  style={{
                    background: isPodium ? rankStyle.bg : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={s.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${isPodium ? "text-base" : "text-sm"}`}
                      style={{ color: isPodium ? rankStyle.color : "var(--text-primary)" }}
                    >
                      {s.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="tabular-nums font-semibold"
                      style={{ color: "var(--accent)" }}
                    >
                      {s.points.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="tabular-nums text-sm">
                      <span style={{ color: "var(--success)" }}>{s.wins}</span>
                      <span style={{ color: "var(--text-muted)" }}> / </span>
                      <span style={{ color: "var(--error)" }}>{s.losses}</span>
                      <span style={{ color: "var(--text-muted)" }}> / </span>
                      <span style={{ color: "var(--text-secondary)" }}>{s.draws}</span>
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.games}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.win_pct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
