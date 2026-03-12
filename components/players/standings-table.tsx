"use client";

import { useState } from "react";
import type { Standing } from "@/lib/types";

type SortKey = "rank" | "points" | "wins" | "losses" | "draws" | "games" | "win_pct";
type SortDir = "asc" | "desc";

interface StandingsTableProps {
  standings: Standing[];
  defaultSort?: { key: SortKey; dir: SortDir };
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

export default function StandingsTable({ standings, defaultSort }: StandingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort?.key ?? "rank");
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort?.dir ?? "asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  const sorted = [...standings].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === "wins" || sortKey === "losses" || sortKey === "draws") {
      av = a[sortKey];
      bv = b[sortKey];
    } else {
      av = a[sortKey];
      bv = b[sortKey];
    }
    return sortDir === "asc" ? av - bv : bv - av;
  });

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

  const thClass =
    "px-4 py-3 font-medium text-xs uppercase tracking-wider select-none cursor-pointer transition-colors hover:text-[var(--accent)]";

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
                className={`${thClass} text-left w-24`}
                style={{ color: sortKey === "rank" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("rank")}
              >
                <span className="inline-flex items-center gap-1">
                  Rank
                  <SortIcon active={sortKey === "rank"} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Player
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ color: sortKey === "points" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("points")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Points
                  <SortIcon active={sortKey === "points"} dir={sortDir} />
                </span>
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ color: sortKey === "wins" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("wins")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  W / L / D
                  <SortIcon active={sortKey === "wins"} dir={sortDir} />
                </span>
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ color: sortKey === "games" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("games")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Games
                  <SortIcon active={sortKey === "games"} dir={sortDir} />
                </span>
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ color: sortKey === "win_pct" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("win_pct")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Win%
                  <SortIcon active={sortKey === "win_pct"} dir={sortDir} />
                </span>
              </th>
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
                    background: isPodium ? rankStyle.bg : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={s.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {s.avatar_url ? (
                        <img
                          src={s.avatar_url}
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
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`font-medium ${isPodium ? "text-base" : "text-sm"}`}
                        style={{ color: isPodium ? rankStyle.color : "var(--text-primary)" }}
                      >
                        {s.name}
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
                    {parseFloat(s.win_pct.toFixed(2))}%
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
