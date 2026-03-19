"use client";

import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { LiveStanding } from "@/lib/types";

interface LiveStandingsTableProps {
  standings: LiveStanding[];
  showEligibleOnly: boolean;
  onRowClick?: (uid: string) => void;
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
  onRowClick,
}: LiveStandingsTableProps) {
  const PAGE_SIZE = 16;
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [showEligibleOnly]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  const filtered = standings.filter((s) => {
    const matchesEligible = !showEligibleOnly || s.eligible;
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchesEligible && matchesSearch;
  });

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

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const thBase =
    "px-4 py-3 font-medium text-xs uppercase tracking-wider";
  const thSortable =
    `${thBase} select-none cursor-pointer transition-colors hover:text-[var(--accent)]`;
  const thHeaderStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    background: "rgba(255, 255, 255, 0.02)",
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.015)",
        border: "1px solid var(--border)",
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
            placeholder="Search players..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm outline-none transition-colors hover:border-[var(--text-muted)] focus:border-[var(--accent)]"
            style={{
              background: "var(--bg-page)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      </div>
      {/* Mobile card view */}
      <div className="sm:hidden">
        {paged.map((s) => {
          const isPodium = s.rank <= 3;
          const rankStyle = getRankStyle(s.rank);
          return (
            <div
              key={s.uid}
              className="mobile-card"
              style={{
                background: isPodium && !s.dropped ? rankStyle.bg : undefined,
                opacity: s.dropped ? 0.4 : 1,
                cursor: onRowClick ? "pointer" : undefined,
              }}
              onClick={onRowClick ? () => onRowClick(s.uid) : undefined}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <RankBadge rank={s.rank} />
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span
                      className={`font-medium ${isPodium ? "text-base" : "text-sm"}`}
                      style={{
                        color: s.dropped ? "var(--text-muted)" : isPodium ? rankStyle.color : "var(--text-primary)",
                      }}
                    >
                      {s.name}
                    </span>
                    {s.dropped && (
                      <span
                        className="ml-2 text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "var(--error-light)", color: "var(--error)" }}
                      >
                        dropped
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-semibold" style={{ color: "var(--accent)" }}>
                    {s.points.toFixed(0)}
                  </span>
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{
                      background: s.eligible ? "var(--success-light)" : "var(--error-light)",
                      color: s.eligible ? "var(--success)" : "var(--error)",
                    }}
                  >
                    {s.eligible ? "\u2713" : "\u2717"}
                  </span>
                </div>
              </div>
              <div className="text-xs ml-[42px] space-y-1">
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    <span style={{ color: "var(--success)" }}>{s.wins}W</span>
                    <span style={{ color: "var(--text-muted)" }}>/</span>
                    <span style={{ color: "var(--error)" }}>{s.losses}L</span>
                    <span style={{ color: "var(--text-muted)" }}>/</span>
                    <span style={{ color: "var(--text-secondary)" }}>{s.draws}D</span>
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>{parseFloat(s.win_pct.toFixed(2))}%</span>
                  <span style={{ color: "var(--text-secondary)" }}>OW {parseFloat(s.ow_pct.toFixed(2))}%</span>
                </div>
                <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
                  <span>{s.games} games</span>
                  <span>&middot;</span>
                  <span>{s.online_games} online</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {COLUMNS.map((col, i) => (
                <th
                  key={i}
                  className={`${col.key ? thSortable : thBase} text-${col.align} ${i === 0 ? "w-24" : ""}`}
                  style={{
                    ...thHeaderStyle,
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
            {paged.map((s) => {
              const isPodium = s.rank <= 3;
              const rankStyle = getRankStyle(s.rank);

              return (
                <tr
                  key={s.uid}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                  data-rank={isPodium && !s.dropped ? s.rank : undefined}
                  style={{
                    opacity: s.dropped ? 0.4 : 1,
                    cursor: onRowClick ? "pointer" : undefined,
                  }}
                  onClick={onRowClick ? () => onRowClick(s.uid) : undefined}
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
                          style={{ opacity: s.dropped ? 0.4 : 1 }}
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                          style={{
                            background: "var(--accent-light)",
                            color: "var(--accent)",
                            opacity: s.dropped ? 0.4 : 1,
                          }}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                      )}
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
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: page === 0 ? "transparent" : "var(--bg-hover)",
                color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page === 0 ? 0.5 : 1,
                cursor: page === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft className="w-3 h-3" />
              Prev
            </button>
            <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: page >= totalPages - 1 ? "transparent" : "var(--bg-hover)",
                color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page >= totalPages - 1 ? 0.5 : 1,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              }}
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
