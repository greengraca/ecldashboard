"use client";

import { useState } from "react";
import type { LiveStanding } from "@/lib/types";

interface LiveStandingsTableProps {
  standings: LiveStanding[];
  showEligibleOnly: boolean;
}

type SortKey = "rank" | "points" | "wins" | "losses" | "draws" | "games" | "win_pct" | "ow_pct" | "online_games";
type SortDir = "asc" | "desc";

function getRankStyle(rank: number): { color: string; bg: string } {
  switch (rank) {
    case 1:
      return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)" };
    case 2:
      return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.08)" };
    case 3:
      return { color: "#cd7f32", bg: "rgba(205, 127, 50, 0.08)" };
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

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span
      className="inline-block ml-1 text-[10px]"
      style={{ color: active ? "var(--accent)" : "var(--text-muted)", opacity: active ? 1 : 0.4 }}
    >
      {active ? (dir === "asc" ? "▲" : "▼") : "▲"}
    </span>
  );
}

const COLUMNS: { key: SortKey | null; label: string; align: "left" | "right" }[] = [
  { key: "rank", label: "Rank", align: "left" },
  { key: null, label: "Player", align: "left" },
  { key: "points", label: "Points", align: "right" },
  { key: "wins", label: "W / L / D", align: "right" },
  { key: "games", label: "Games", align: "right" },
  { key: "win_pct", label: "Win%", align: "right" },
  { key: "ow_pct", label: "OW%", align: "right" },
  { key: "online_games", label: "Online", align: "right" },
  { key: null, label: "", align: "right" },
];

export default function LiveStandingsTable({
  standings,
  showEligibleOnly,
}: LiveStandingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  const filtered = showEligibleOnly
    ? standings.filter((s) => s.eligible)
    : standings;

  if (filtered.length === 0) {
    return (
      <div
        className="text-center py-12 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {showEligibleOnly
          ? "No eligible players yet"
          : "No standings data available"}
      </div>
    );
  }

  // Re-rank if filtering
  const display = showEligibleOnly
    ? filtered.map((s, i) => ({ ...s, rank: i + 1 }))
    : filtered;

  const sorted = [...display].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const thBase =
    "px-4 py-3 font-medium text-xs uppercase tracking-wider";
  const thSortable =
    `${thBase} select-none cursor-pointer transition-colors hover:text-[var(--accent)]`;

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
              {COLUMNS.map((col, i) => (
                <th
                  key={i}
                  className={`${col.key ? thSortable : thBase} text-${col.align} ${i === 0 ? "w-24" : ""}`}
                  style={{
                    color: col.key && sortKey === col.key ? "var(--accent)" : "var(--text-muted)",
                  }}
                  onClick={col.key ? () => handleSort(col.key!) : undefined}
                >
                  {col.key ? (
                    <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </span>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const isPodium = s.rank <= 3;
              const rankStyle = getRankStyle(s.rank);

              return (
                <tr
                  key={s.uid}
                  className="border-b border-[var(--border-subtle)] transition-colors"
                  style={{
                    background: isPodium && !s.dropped ? rankStyle.bg : undefined,
                    opacity: s.dropped ? 0.4 : 1,
                  }}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={s.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span
                        className={`font-medium ${isPodium ? "text-base" : "text-sm"}`}
                        style={{
                          color: s.dropped
                            ? "var(--text-muted)"
                            : isPodium
                              ? rankStyle.color
                              : "var(--text-primary)",
                        }}
                      >
                        {s.name}
                        {s.dropped && (
                          <span
                            className="ml-2 text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: "var(--error-light)",
                              color: "var(--error)",
                            }}
                          >
                            dropped
                          </span>
                        )}
                      </span>
                    </div>
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
                      <span style={{ color: "var(--text-secondary)" }}>
                        {s.draws}
                      </span>
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
                    {parseFloat(s.win_pct.toFixed(2))}%
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {parseFloat(s.ow_pct.toFixed(2))}%
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.online_games}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                      style={{
                        background: s.eligible
                          ? "var(--success-light)"
                          : "var(--error-light)",
                        color: s.eligible
                          ? "var(--success)"
                          : "var(--error)",
                      }}
                      title={
                        s.eligible
                          ? "Top 16 eligible"
                          : s.dropped
                            ? "Dropped"
                            : s.games < 10
                              ? `Need ${10 - s.games} more total games`
                              : `Need ${10 - s.online_games} more online games`
                      }
                    >
                      {s.eligible ? "\u2713" : "\u2717"}
                    </span>
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
