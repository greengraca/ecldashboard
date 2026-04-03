"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Standing } from "@/lib/types";

type SortKey = "rank" | "points" | "wins" | "losses" | "draws" | "games" | "win_pct";
type SortDir = "asc" | "desc";

interface StandingsTableProps {
  standings: Standing[];
  defaultSort?: { key: SortKey; dir: SortDir };
  onRowClick?: (uid: string) => void;
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

export default function StandingsTable({ standings, defaultSort, onRowClick }: StandingsTableProps) {
  const PAGE_SIZE = 16;
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort?.key ?? "rank");
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort?.dir ?? "asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasOnLastPage = useRef(false);

  useEffect(() => {
    if (wasOnLastPage.current && containerRef.current) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      });
      wasOnLastPage.current = false;
    }
  }, [page]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  const filtered = search
    ? standings.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : standings;

  const sorted = [...filtered].sort((a, b) => {
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

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

  const navigatePage = (newPage: number) => {
    const tp = Math.ceil(sorted.length / PAGE_SIZE);
    wasOnLastPage.current = page >= tp - 1;
    setPage(newPage);
  };

  const thClass =
    "px-4 py-3 font-medium text-xs uppercase tracking-wider select-none cursor-pointer transition-colors hover:text-[var(--accent)]";
  const thHeaderStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    background: "rgba(255, 255, 255, 0.02)",
  };

  return (
    <div
      ref={containerRef}
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
              style={{ background: isPodium ? rankStyle.bg : undefined, cursor: onRowClick ? "pointer" : undefined }}
              onClick={onRowClick ? () => onRowClick(s.uid) : undefined}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
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
                  <span
                    className={`font-medium ${isPodium ? "text-base" : "text-sm"}`}
                    style={{ color: isPodium ? rankStyle.color : "var(--text-primary)" }}
                  >
                    {s.name}
                  </span>
                </div>
                <span className="tabular-nums font-semibold" style={{ color: "var(--accent)" }}>
                  {s.points.toFixed(0)}
                </span>
              </div>
              <div className="text-xs ml-[42px] space-y-1">
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    <span style={{ color: "var(--success)" }}>{s.wins}W</span>
                    <span style={{ color: "var(--text-muted)" }}> / </span>
                    <span style={{ color: "var(--error)" }}>{s.losses}L</span>
                    <span style={{ color: "var(--text-muted)" }}> / </span>
                    <span style={{ color: "var(--text-secondary)" }}>{s.draws}D</span>
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>{parseFloat(s.win_pct.toFixed(2))}%</span>
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  {s.games} games
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
              <th
                className={`${thClass} text-left w-24`}
                style={{ ...thHeaderStyle, color: sortKey === "rank" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("rank")}
              >
                <span className="inline-flex items-center gap-1">
                  Rank
                  <SortIcon active={sortKey === "rank"} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider"
                style={{ ...thHeaderStyle, color: "var(--text-muted)" }}
              >
                Player
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ ...thHeaderStyle, color: sortKey === "points" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("points")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Points
                  <SortIcon active={sortKey === "points"} dir={sortDir} />
                </span>
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ ...thHeaderStyle, color: sortKey === "wins" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("wins")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  W / L / D
                  <SortIcon active={sortKey === "wins"} dir={sortDir} />
                </span>
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ ...thHeaderStyle, color: sortKey === "games" ? "var(--accent)" : "var(--text-muted)" }}
                onClick={() => handleSort("games")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Games
                  <SortIcon active={sortKey === "games"} dir={sortDir} />
                </span>
              </th>
              <th
                className={`${thClass} text-right`}
                style={{ ...thHeaderStyle, color: sortKey === "win_pct" ? "var(--accent)" : "var(--text-muted)" }}
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
            {paged.map((s) => {
              const isPodium = s.rank <= 3;
              const rankStyle = getRankStyle(s.rank);

              return (
                <tr
                  key={s.uid}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                  data-rank={isPodium ? s.rank : undefined}
                  style={{
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
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigatePage(0)}
              disabled={page === 0}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page === 0 ? "transparent" : "var(--bg-hover)",
                color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page === 0 ? 0.5 : 1,
                cursor: page === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigatePage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page === 0 ? "transparent" : "var(--bg-hover)",
                color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page === 0 ? 0.5 : 1,
                cursor: page === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs tabular-nums px-1.5" style={{ color: "var(--text-secondary)" }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => navigatePage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page >= totalPages - 1 ? "transparent" : "var(--bg-hover)",
                color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page >= totalPages - 1 ? 0.5 : 1,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigatePage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors"
              style={{
                background: page >= totalPages - 1 ? "transparent" : "var(--bg-hover)",
                color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                opacity: page >= totalPages - 1 ? 0.5 : 1,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
