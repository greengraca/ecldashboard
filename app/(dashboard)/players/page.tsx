"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Users, Gamepad2, Trophy, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
import StandingsTable from "@/components/players/standings-table";
import LiveStandingsTable from "@/components/players/live-standings-table";
import type { Player, LiveStanding } from "@/lib/types";

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PlayersPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [filter, setFilter] = useState<"none" | "eligible" | "top16" | "inactive" | "most_games">("none");

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

  const players = playersData?.data?.players || [];
  const liveStandings = liveData?.data?.standings || [];
  const liveTotalMatches: number = liveData?.data?.total_matches ?? 0;
  const liveInProgress: number = liveData?.data?.in_progress ?? 0;
  const liveVoided: number = liveData?.data?.voided ?? 0;
  const bracketId = liveData?.data?.bracket_id || playersData?.data?.bracket_id || "";

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
      return { total, active, avg, top, topName, mostGames, mostGamesName };
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
      return { total, active, avg, top, topName, mostGames, mostGamesName };
    }
  }, [isCurrentMonth, liveStandings, players]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Standings
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Player rankings and game statistics
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MonthPicker value={month} onChange={handleMonthChange} minMonth="2025-12" maxMonth={getCurrentMonth()} />
          {bracketId && (
            <a
              href={`https://topdeck.gg/bracket/${bracketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] transition-colors hover:underline"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              ({bracketId})
            </a>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setFilter(filter === "eligible" ? "none" : "eligible")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
              className="rounded-xl border p-12 text-center"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border)",
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
            />
          )}
        </>
      )}

      {/* ═══ Past Months — Dump Standings ═══ */}
      {!isCurrentMonth && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setFilter(filter === "top16" ? "none" : "top16")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
          </div>

          {playersLoading ? (
            <div
              className="rounded-xl border p-12 text-center"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border)",
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
          ) : (
            <StandingsTable
              key={filter}
              standings={(() => {
                const allStandings = players.map((p) => ({ rank: p.rank!, uid: p.uid, name: p.name, points: p.points, games: p.games, wins: p.wins, losses: p.losses, draws: p.draws, win_pct: p.win_pct }));
                if (filter === "top16") return allStandings.slice(0, 16);
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
