"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Users, Gamepad2, Trophy, TrendingUp, Save, Check, GripVertical, Hash } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
import StandingsTable from "@/components/players/standings-table";
import LiveStandingsTable from "@/components/players/live-standings-table";
import TurnOrderSection from "@/components/players/turn-order-section";
import type { Player, LiveStanding, Standing } from "@/lib/types";

interface PlayersData {
  players: Player[];
  month: string | null;
  bracket_id?: string;
}

interface LiveStandingsData {
  standings: LiveStanding[];
  total_matches: number;
  in_progress: number;
  voided: number;
  bracket_id?: string;
}

interface BracketData {
  month: string;
  top16_winners: string[];
  top4_order: string[];
  top4_winner: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Snake-draft seeding into 4 pods (same pattern as TopDeck)
// Seeds 1-16 distributed: Pod1=[1,8,9,16], Pod2=[2,7,10,15], Pod3=[3,6,11,14], Pod4=[4,5,12,13]
function seedIntoPods(players: Standing[]): Standing[][] {
  const pods: Standing[][] = [[], [], [], []];
  const pattern = [0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0];
  for (let i = 0; i < Math.min(players.length, 16); i++) {
    pods[pattern[i]].push(players[i]);
  }
  return pods;
}

// ─── Interactive Bracket Editor ───

function BracketEditor({
  eligible,
  month,
  mode,
}: {
  eligible: Standing[];
  month: string;
  mode: "top16" | "top4";
}) {
  const { data: bracketRes, mutate } = useSWR<{ data: BracketData | null }>(
    `/api/players/brackets?month=${month}`,
    fetcher
  );

  const saved = bracketRes?.data;
  const [top16Winners, setTop16Winners] = useState<string[]>([]);
  const [top4Order, setTop4Order] = useState<string[]>([]);
  const [top4Winner, setTop4Winner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Drag-and-drop state for Top 4
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sync from server when data loads
  useEffect(() => {
    if (saved) {
      setTop16Winners(saved.top16_winners || []);
      setTop4Order(saved.top4_order || []);
      setTop4Winner(saved.top4_winner || null);
      setDirty(false);
    }
  }, [saved]);

  const pods = useMemo(() => seedIntoPods(eligible), [eligible]);

  // Find which pod a uid belongs to
  const uidToPod = useMemo(() => {
    const map = new Map<string, number>();
    pods.forEach((pod, podIdx) => {
      pod.forEach((p) => map.set(p.uid, podIdx));
    });
    return map;
  }, [pods]);

  const toggleTop16Winner = useCallback(
    (uid: string) => {
      const podIdx = uidToPod.get(uid);
      if (podIdx === undefined) return;

      setTop16Winners((prev) => {
        if (prev.includes(uid)) {
          setTop4Winner((w) => (w === uid ? null : w));
          return prev.filter((id) => id !== uid);
        }
        const existing = prev.find((id) => uidToPod.get(id) === podIdx);
        let next = prev;
        if (existing) {
          setTop4Winner((w) => (w === existing ? null : w));
          next = prev.filter((id) => id !== existing);
        }
        return [...next, uid];
      });
      setDirty(true);
    },
    [uidToPod]
  );

  const toggleTop4Winner = useCallback((uid: string) => {
    setTop4Winner((prev) => (prev === uid ? null : uid));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/players/brackets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, top16_winners: top16Winners, top4_order: top4Order, top4_winner: top4Winner }),
      });
      await mutate();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  // Build the top4 pod from the winners of each top16 pod, respecting saved order
  const top4Players = useMemo(() => {
    const winners: Standing[] = [];
    for (let i = 0; i < 4; i++) {
      const winner = pods[i]?.find((p) => top16Winners.includes(p.uid));
      if (winner) winners.push(winner);
    }
    // Apply saved order if we have one
    if (top4Order.length > 0 && winners.length === 4) {
      const byUid = new Map(winners.map((w) => [w.uid, w]));
      const ordered: Standing[] = [];
      for (const uid of top4Order) {
        const p = byUid.get(uid);
        if (p) {
          ordered.push(p);
          byUid.delete(uid);
        }
      }
      // Append any not in the saved order (new winners)
      for (const p of byUid.values()) ordered.push(p);
      return ordered;
    }
    return winners;
  }, [pods, top16Winners, top4Order]);

  if (mode === "top4") {
    if (top16Winners.length < 4) {
      return (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
        >
          <Trophy className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Select all 4 pod winners in Top 16 first
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {top16Winners.length}/4 winners selected
          </p>
        </div>
      );
    }

    const handleDragStart = (idx: number, e: React.PointerEvent) => {
      // Only allow drag from the grip handle
      setDragIdx(idx);
      setOverIdx(idx);
      dragStartY.current = e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleDragMove = (e: React.PointerEvent) => {
      if (dragIdx === null) return;
      // Determine which item we're over based on pointer position
      for (let i = 0; i < itemRefs.current.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY < rect.bottom) {
          if (i !== overIdx) setOverIdx(i);
          break;
        }
      }
    };

    const handleDragEnd = () => {
      if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
        const newOrder = [...top4Players.map((p) => p.uid)];
        const [moved] = newOrder.splice(dragIdx, 1);
        newOrder.splice(overIdx, 0, moved);
        setTop4Order(newOrder);
        setDirty(true);
      }
      setDragIdx(null);
      setOverIdx(null);
    };

    return (
      <div className="space-y-4">
        <div className="max-w-md mx-auto">
          <p className="text-[11px] text-center mb-2" style={{ color: "var(--text-muted)" }}>
            Drag to reorder &middot; Tap name to set winner
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div
              className="px-4 py-2.5 text-center font-semibold text-sm border-b"
              style={{ color: "var(--accent)", borderColor: "var(--border)", background: "var(--card-inner-bg)" }}
            >
              Top 4
            </div>
            <div>
              {top4Players.map((p, i) => {
                const isWinner = top4Winner === p.uid;
                const isDragging = dragIdx === i;
                const isOver = dragIdx !== null && overIdx === i && dragIdx !== i;
                return (
                  <div
                    key={p.uid}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    className="flex items-center transition-all duration-150"
                    style={{
                      borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                      background: isDragging
                        ? "var(--bg-hover)"
                        : isOver
                        ? "var(--accent-light)"
                        : isWinner
                        ? "var(--accent-light)"
                        : "transparent",
                      opacity: isDragging ? 0.7 : 1,
                      boxShadow: isOver ? "inset 0 -2px 0 var(--accent)" : undefined,
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      className="flex items-center justify-center px-2 py-2.5 cursor-grab active:cursor-grabbing touch-none select-none"
                      style={{ color: "var(--text-muted)" }}
                      onPointerDown={(e) => handleDragStart(i, e)}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    {/* Player button */}
                    <button
                      onClick={() => toggleTop4Winner(p.uid)}
                      className="flex-1 flex items-center gap-3 pr-4 py-2.5 transition-colors text-left"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          background: isWinner ? "var(--accent)" : "var(--bg-hover)",
                          color: isWinner ? "var(--bg-page)" : "var(--text-muted)",
                        }}
                      >
                        {isWinner ? <Trophy className="w-3 h-3" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {p.name}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {p.points.toFixed(0)} pts &middot; {p.games}G {p.wins}W-{p.losses}L
                        </p>
                      </div>
                      {isWinner && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--accent)", color: "var(--bg-page)" }}
                        >
                          WINNER
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {dirty && <SaveButton saving={saving} onSave={handleSave} />}
      </div>
    );
  }

  // ─── Top 16 mode ───
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pods.map((pod, podIdx) => {
          const podWinner = pod.find((p) => top16Winners.includes(p.uid));
          return (
            <div
              key={podIdx}
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
            >
              <div
                className="px-4 py-2.5 text-center font-semibold text-sm border-b flex items-center justify-center gap-2"
                style={{ color: "var(--text-primary)", borderColor: "var(--border)", background: "var(--card-inner-bg)" }}
              >
                Pod {podIdx + 1}
                {podWinner && <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />}
              </div>
              <div>
                {pod.map((p, i) => {
                  const isWinner = top16Winners.includes(p.uid);
                  return (
                    <button
                      key={p.uid}
                      onClick={() => toggleTop16Winner(p.uid)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                      style={{
                        borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                        background: isWinner ? "var(--accent-light)" : "transparent",
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          background: isWinner ? "var(--accent)" : "var(--bg-hover)",
                          color: isWinner ? "var(--bg-page)" : "var(--text-muted)",
                        }}
                      >
                        {p.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {p.name}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {p.points.toFixed(0)} pts &middot; {p.games}G {p.wins}W-{p.losses}L
                        </p>
                      </div>
                      {isWinner && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--accent)", color: "var(--bg-page)" }}
                        >
                          WINNER
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {dirty && <SaveButton saving={saving} onSave={handleSave} />}
    </div>
  );
}

function SaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ background: "var(--accent)", color: "var(--bg-page)", opacity: saving ? 0.6 : 1 }}
      >
        {saving ? (
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--bg-page)", borderTopColor: "transparent" }} />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

export default function PlayersPage() {
  const router = useRouter();
  const [month, setMonth] = useState(getCurrentMonth);
  const [filter, setFilter] = useState<"none" | "eligible" | "top16" | "inactive" | "most_games" | "top16_pods" | "top4_pods">("none");

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    setFilter("none");
  };

  const isCurrentMonth = month === getCurrentMonth();

  // Dump data — only fetch for past months
  const { data: playersData, isLoading: playersLoading } =
    useSWR<{ data: PlayersData }>(
      !isCurrentMonth ? `/api/players?month=${month}` : null,
      fetcher
    );

  // Live standings — only fetch for current month
  const {
    data: liveData,
    error: liveError,
    isLoading: liveLoading,
  } = useSWR<{ data: LiveStandingsData }>(
    isCurrentMonth ? "/api/players/standings/live" : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  // Bracket data — fetch for past months to show champion banner
  const { data: bracketRes } = useSWR<{ data: BracketData | null }>(
    !isCurrentMonth ? `/api/players/brackets?month=${month}` : null,
    fetcher
  );

  const players = playersData?.data?.players || [];
  const liveStandings = liveData?.data?.standings || [];
  const liveTotalMatches: number = liveData?.data?.total_matches ?? 0;
  const liveInProgress: number = liveData?.data?.in_progress ?? 0;
  const liveVoided: number = liveData?.data?.voided ?? 0;
  const bracketId = liveData?.data?.bracket_id || playersData?.data?.bracket_id || "";

  // Resolve champion name + uid from bracket data + player list
  const champion = useMemo(() => {
    const winnerId = bracketRes?.data?.top4_winner;
    if (!winnerId) return null;
    const player = players.find((p) => p.uid === winnerId);
    return { name: player?.name || winnerId, uid: winnerId };
  }, [bracketRes, players]);

  // Summary stats — derived from live data or dump data depending on month
  const dataLoading = isCurrentMonth ? liveLoading : playersLoading;

  const stats = useMemo(() => {
    if (isCurrentMonth) {
      const total = liveStandings.length;
      const active = liveStandings.filter((s) => s.games > 0).length;
      const avg =
        active > 0
          ? Math.round(
              liveStandings.reduce((sum, s) => sum + s.games, 0) / active
            )
          : 0;
      const top = liveStandings.length > 0 ? liveStandings[0].points.toFixed(0) : "--";
      const topName = liveStandings.length > 0 ? liveStandings[0].name : "";
      const mostGamesPlayer = liveStandings.length > 0
        ? [...liveStandings].sort((a, b) => b.games - a.games)[0]
        : null;
      const mostGames = mostGamesPlayer ? mostGamesPlayer.games : "--";
      const mostGamesName = mostGamesPlayer ? mostGamesPlayer.name : "";
      const totalGames = liveTotalMatches;
      return { total, active, avg, top, topName, mostGames, mostGamesName, totalGames };
    } else {
      const total = players.length;
      const active = players.filter((p) => p.games > 0).length;
      const avg =
        active > 0
          ? Math.round(
              players.reduce((sum, p) => sum + p.games, 0) / active
            )
          : 0;
      const top = players.length > 0 ? players[0].points.toFixed(0) : "--";
      const topName = players.length > 0 ? players[0].name : "";
      const mostGamesPlayer = players.length > 0
        ? [...players].sort((a, b) => b.games - a.games)[0]
        : null;
      const mostGames = mostGamesPlayer ? mostGamesPlayer.games : "--";
      const mostGamesName = mostGamesPlayer ? mostGamesPlayer.name : "";
      const totalGames = Math.round(players.reduce((sum, p) => sum + p.games, 0) / 4);
      return { total, active, avg, top, topName, mostGames, mostGamesName, totalGames };
    }
  }, [isCurrentMonth, liveStandings, players, liveTotalMatches]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            League
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            League standings and game statistics
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MonthPicker value={month} onChange={handleMonthChange} minMonth="2025-12" maxMonth={getCurrentMonth()} />
          <a
            href={bracketId ? `https://topdeck.gg/bracket/${bracketId}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] transition-colors hover:underline h-4"
            style={{
              color: "var(--text-muted)",
              visibility: bracketId ? "visible" : "hidden",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            ({bracketId})
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        <StatCard
          title="Total Games"
          value={dataLoading ? "--" : stats.totalGames}
          subtitle={!dataLoading && isCurrentMonth && liveVoided > 0 ? `${liveVoided} voided` : undefined}
          icon={
            <Hash
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
          }
        />
        <StatCard
          title="Total Players"
          value={dataLoading ? "--" : stats.total}
          icon={
            <Users
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
          }
        />
        <StatCard
          title="Active This Month"
          value={dataLoading ? "--" : stats.active}
          subtitle="Players with games"
          icon={
            <Gamepad2
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
          }
        />
        <StatCard
          title="Avg Games"
          value={dataLoading ? "--" : stats.avg}
          subtitle="Per active player"
          icon={
            <TrendingUp
              className="w-4 h-4"
              style={{ color: "var(--warning)" }}
            />
          }
        />
        <StatCard
          title="Top Points"
          value={dataLoading ? "--" : stats.top}
          subtitle={stats.topName}
          icon={
            <Trophy
              className="w-4 h-4"
              style={{ color: "#fbbf24" }}
            />
          }
        />
        <StatCard
          title="Most Games"
          value={dataLoading ? "--" : stats.mostGames}
          subtitle={stats.mostGamesName}
          icon={
            <Gamepad2
              className="w-4 h-4"
              style={{ color: "var(--success)" }}
            />
          }
        />
      </div>

      {/* Turn Order Stats */}
      <TurnOrderSection month={month} />

      {/* ═══ Current Month — Live Standings ═══ */}
      {isCurrentMonth && (
        <>
          {liveError && (
            <div
              className="mb-6 p-4 rounded-xl border text-sm"
              style={{
                background: "var(--error-light)",
                borderColor: "var(--error-border)",
                color: "var(--error)",
              }}
            >
              Failed to load live standings. Please try again.
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
            <button
              onClick={() => setFilter(filter === "eligible" ? "none" : "eligible")}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: filter === "eligible"
                  ? "var(--success-light)"
                  : "var(--bg-card)",
                color: filter === "eligible"
                  ? "var(--success)"
                  : "var(--text-secondary)",
                border: `1px solid ${filter === "eligible" ? "var(--success)" : "var(--border)"}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border flex items-center justify-center text-[10px]"
                style={{
                  borderColor: filter === "eligible"
                    ? "var(--success)"
                    : "var(--text-muted)",
                  background: filter === "eligible" ? "var(--success)" : "transparent",
                  color: filter === "eligible" ? "var(--bg-page)" : "transparent",
                }}
              >
                {filter === "eligible" ? "\u2713" : ""}
              </span>
              Top 16 Eligible
            </button>
            <button
              onClick={() => setFilter(filter === "most_games" ? "none" : "most_games")}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: filter === "most_games"
                  ? "var(--success-light)"
                  : "var(--bg-card)",
                color: filter === "most_games"
                  ? "var(--success)"
                  : "var(--text-secondary)",
                border: `1px solid ${filter === "most_games" ? "var(--success)" : "var(--border)"}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border flex items-center justify-center text-[10px]"
                style={{
                  borderColor: filter === "most_games"
                    ? "var(--success)"
                    : "var(--text-muted)",
                  background: filter === "most_games" ? "var(--success)" : "transparent",
                  color: filter === "most_games" ? "var(--bg-page)" : "transparent",
                }}
              >
                {filter === "most_games" ? "\u2713" : ""}
              </span>
              Most Games
            </button>
            <button
              onClick={() => setFilter(filter === "inactive" ? "none" : "inactive")}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: filter === "inactive"
                  ? "var(--error-light)"
                  : "var(--bg-card)",
                color: filter === "inactive"
                  ? "var(--error)"
                  : "var(--text-secondary)",
                border: `1px solid ${filter === "inactive" ? "var(--error)" : "var(--border)"}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border flex items-center justify-center text-[10px]"
                style={{
                  borderColor: filter === "inactive"
                    ? "var(--error)"
                    : "var(--text-muted)",
                  background: filter === "inactive" ? "var(--error)" : "transparent",
                  color: filter === "inactive" ? "var(--bg-page)" : "transparent",
                }}
              >
                {filter === "inactive" ? "\u2713" : ""}
              </span>
              Inactive{filter === "inactive" && ` (${liveStandings.filter((s) => s.games === 0).length})`}
            </button>
          </div>

          {/* Match summary */}
          {!liveLoading && liveTotalMatches > 0 && (
            <div
              className="flex items-center gap-3 mb-4 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <span>{liveTotalMatches} completed games</span>
              {liveInProgress > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{ background: "var(--warning-light)", color: "var(--warning)" }}
                >
                  {liveInProgress} in progress
                </span>
              )}
              {liveVoided > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: "var(--error-light)", color: "var(--error)" }}
                >
                  {liveVoided} voided
                </span>
              )}
            </div>
          )}

          {liveLoading ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{
                background: "var(--surface-gradient)",
                backdropFilter: "var(--surface-blur)",
                border: "1.5px solid rgba(255, 255, 255, 0.10)",
                boxShadow: "var(--surface-shadow)",
              }}
            >
              <div
                className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
                style={{
                  borderColor: "var(--border)",
                  borderTopColor: "var(--accent)",
                }}
              />
              <p
                className="text-sm mt-3"
                style={{ color: "var(--text-muted)" }}
              >
                Fetching live standings from TopDeck...
              </p>
            </div>
          ) : (
            <LiveStandingsTable
              standings={filter === "inactive" ? liveStandings.filter((s) => s.games === 0) : filter === "most_games" ? [...liveStandings].sort((a, b) => b.games - a.games).slice(0, 5) : liveStandings}
              showEligibleOnly={filter === "eligible"}
              onRowClick={(uid) => router.push(`/league/${uid}`)}
            />
          )}
        </>
      )}

      {/* ═══ Past Months — Dump Standings ═══ */}
      {!isCurrentMonth && (
        <>
          {/* Champion banner — always visible */}
          {champion && (
            <div
              className="rounded-xl border p-4 text-center mb-6"
              style={{ background: "var(--accent-light)", borderColor: "var(--accent-border)" }}
            >
              <Trophy className="w-6 h-6 mx-auto mb-1" style={{ color: "var(--accent)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Champion</p>
              <p
                className="text-lg font-bold cursor-pointer transition-opacity hover:opacity-80"
                style={{ color: "var(--accent)" }}
                onClick={() => router.push(`/league/${champion.uid}`)}
              >
                {champion.name}
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
            <button
              onClick={() => setFilter(filter === "top16" ? "none" : "top16")}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: filter === "top16"
                  ? "var(--success-light)"
                  : "var(--bg-card)",
                color: filter === "top16"
                  ? "var(--success)"
                  : "var(--text-secondary)",
                border: `1px solid ${filter === "top16" ? "var(--success)" : "var(--border)"}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border flex items-center justify-center text-[10px]"
                style={{
                  borderColor: filter === "top16"
                    ? "var(--success)"
                    : "var(--text-muted)",
                  background: filter === "top16" ? "var(--success)" : "transparent",
                  color: filter === "top16" ? "var(--bg-page)" : "transparent",
                }}
              >
                {filter === "top16" ? "\u2713" : ""}
              </span>
              Top 16 Cut
            </button>
            <button
              onClick={() => setFilter(filter === "most_games" ? "none" : "most_games")}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: filter === "most_games"
                  ? "var(--success-light)"
                  : "var(--bg-card)",
                color: filter === "most_games"
                  ? "var(--success)"
                  : "var(--text-secondary)",
                border: `1px solid ${filter === "most_games" ? "var(--success)" : "var(--border)"}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border flex items-center justify-center text-[10px]"
                style={{
                  borderColor: filter === "most_games"
                    ? "var(--success)"
                    : "var(--text-muted)",
                  background: filter === "most_games" ? "var(--success)" : "transparent",
                  color: filter === "most_games" ? "var(--bg-page)" : "transparent",
                }}
              >
                {filter === "most_games" ? "\u2713" : ""}
              </span>
              Most Games
            </button>
            <button
              onClick={() => setFilter(filter === "inactive" ? "none" : "inactive")}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
              style={{
                background: filter === "inactive"
                  ? "var(--error-light)"
                  : "var(--bg-card)",
                color: filter === "inactive"
                  ? "var(--error)"
                  : "var(--text-secondary)",
                border: `1px solid ${filter === "inactive" ? "var(--error)" : "var(--border)"}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border flex items-center justify-center text-[10px]"
                style={{
                  borderColor: filter === "inactive"
                    ? "var(--error)"
                    : "var(--text-muted)",
                  background: filter === "inactive" ? "var(--error)" : "transparent",
                  color: filter === "inactive" ? "var(--bg-page)" : "transparent",
                }}
              >
                {filter === "inactive" ? "\u2713" : ""}
              </span>
              Inactive{filter === "inactive" && ` (${players.filter((p) => p.games === 0).length})`}
            </button>

            <div className="hidden sm:block flex-1" />

            {/* Top 16 / Top 4 — separate row on mobile, inline on desktop */}
            <div className="w-full sm:w-auto flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
              <button
                onClick={() => setFilter(filter === "top16_pods" ? "none" : "top16_pods")}
                className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-22 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                style={{
                  background: filter === "top16_pods"
                    ? "var(--accent-light)"
                    : "var(--bg-card)",
                  color: filter === "top16_pods"
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                  border: `1px solid ${filter === "top16_pods" ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                <span className="w-3 h-3 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5" />
                </span>
                Top 16
              </button>
              <button
                onClick={() => setFilter(filter === "top4_pods" ? "none" : "top4_pods")}
                className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-22 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                style={{
                  background: filter === "top4_pods"
                    ? "var(--accent-light)"
                    : "var(--bg-card)",
                  color: filter === "top4_pods"
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                  border: `1px solid ${filter === "top4_pods" ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                <span className="w-3 h-3 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5" />
                </span>
                Top 4
              </button>
            </div>
          </div>

          {playersLoading ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{
                background: "var(--surface-gradient)",
                backdropFilter: "var(--surface-blur)",
                border: "1.5px solid rgba(255, 255, 255, 0.10)",
                boxShadow: "var(--surface-shadow)",
              }}
            >
              <div
                className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
                style={{
                  borderColor: "var(--border)",
                  borderTopColor: "var(--accent)",
                }}
              />
              <p
                className="text-sm mt-3"
                style={{ color: "var(--text-muted)" }}
              >
                Loading standings...
              </p>
            </div>
          ) : (filter === "top16_pods" || filter === "top4_pods") ? (
            <BracketEditor
              eligible={players
                .filter((p) => p.games >= 10)
                .slice(0, 16)
                .map((p, i) => ({ rank: i + 1, uid: p.uid, name: p.name, points: p.points, games: p.games, wins: p.wins, losses: p.losses, draws: p.draws, win_pct: p.win_pct }))}
              month={month}
              mode={filter === "top16_pods" ? "top16" : "top4"}
            />
          ) : (
            <StandingsTable
              key={filter}
              onRowClick={(uid) => router.push(`/league/${uid}`)}
              standings={(() => {
                const allStandings = players.map((p) => ({ rank: p.rank!, uid: p.uid, name: p.name, points: p.points, games: p.games, wins: p.wins, losses: p.losses, draws: p.draws, win_pct: p.win_pct }));
                if (filter === "top16") {
                  const eligible = allStandings.filter((s) => s.games >= 10);
                  return eligible.slice(0, 16).map((s, i) => ({ ...s, rank: i + 1 }));
                }
                if (filter === "inactive") return allStandings.filter((s) => s.games === 0);
                if (filter === "most_games") return [...allStandings].sort((a, b) => b.games - a.games).slice(0, 5);
                return allStandings;
              })()}
              defaultSort={filter === "most_games" ? { key: "games", dir: "desc" } : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
