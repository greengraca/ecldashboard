"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users, Gamepad2, Trophy, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
import PlayerTable from "@/components/players/player-table";
import StandingsTable from "@/components/players/standings-table";
import LiveStandingsTable from "@/components/players/live-standings-table";
import type { Player, Standing, LiveStanding } from "@/lib/types";

interface PlayersData {
  players: Player[];
  month: string | null;
}

interface StandingsData {
  standings: Standing[];
  month: string | null;
}

interface LiveStandingsData {
  standings: LiveStanding[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "standings" | "players";

export default function PlayersPage() {
  const [tab, setTab] = useState<Tab>("standings");
  const [month, setMonth] = useState(getCurrentMonth);
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Players tab data (only fetch when tab is active)
  const { data: playersData, error: playersError, isLoading: playersLoading } =
    useSWR<{ data: PlayersData }>(
      tab === "players" ? `/api/players?month=${month}` : null,
      fetcher
    );

  const {
    data: standingsData,
    error: standingsError,
    isLoading: standingsLoading,
  } = useSWR<{ data: StandingsData }>(
    tab === "players" ? `/api/players/standings?month=${month}` : null,
    fetcher
  );

  // Standings tab data (only fetch when tab is active)
  const {
    data: liveData,
    error: liveError,
    isLoading: liveLoading,
  } = useSWR<{ data: LiveStandingsData }>(
    tab === "standings" ? "/api/players/standings/live" : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // refresh every 5 min
  );

  const players = playersData?.data?.players || [];
  const standings = standingsData?.data?.standings || [];
  const liveStandings = liveData?.data?.standings || [];

  // Summary stats for Players tab
  const totalPlayers = players.length;
  const activePlayers = players.filter((p) => p.games > 0).length;
  const avgGames =
    activePlayers > 0
      ? Math.round(
          players.reduce((sum, p) => sum + p.games, 0) / activePlayers
        )
      : 0;
  const topPoints =
    standings.length > 0 ? standings[0].points.toFixed(0) : "--";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Players
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Player rankings and game statistics
          </p>
        </div>
        {tab === "players" && (
          <MonthPicker value={month} onChange={setMonth} />
        )}
      </div>

      {/* Tab Switcher */}
      <div
        className="flex gap-1 p-1 rounded-lg mb-6 w-fit"
        style={{ background: "var(--bg-card)" }}
      >
        {(["standings", "players"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "var(--accent-text)" : "var(--text-secondary)",
            }}
          >
            {t === "standings" ? "Standings" : "Players"}
          </button>
        ))}
      </div>

      {/* ═══ Standings Tab ═══ */}
      {tab === "standings" && (
        <div>
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

          {/* Eligible toggle */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setEligibleOnly(!eligibleOnly)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: eligibleOnly
                  ? "var(--success-light)"
                  : "var(--bg-card)",
                color: eligibleOnly
                  ? "var(--success)"
                  : "var(--text-secondary)",
                border: `1px solid ${eligibleOnly ? "var(--success)" : "var(--border)"}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm border flex items-center justify-center text-[10px]"
                style={{
                  borderColor: eligibleOnly
                    ? "var(--success)"
                    : "var(--text-muted)",
                  background: eligibleOnly ? "var(--success)" : "transparent",
                  color: eligibleOnly ? "var(--bg-page)" : "transparent",
                }}
              >
                {eligibleOnly ? "\u2713" : ""}
              </span>
              Top 16 Eligible
            </button>
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Active + 10 total games + 10 online games
            </span>
          </div>

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
              standings={liveStandings}
              showEligibleOnly={eligibleOnly}
            />
          )}
        </div>
      )}

      {/* ═══ Players Tab ═══ */}
      {tab === "players" && (
        <div>
          {(playersError || standingsError) && (
            <div
              className="mb-6 p-4 rounded-xl border text-sm"
              style={{
                background: "var(--error-light)",
                borderColor: "var(--error-border)",
                color: "var(--error)",
              }}
            >
              Failed to load player data. Please try again.
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Players"
              value={playersLoading ? "--" : totalPlayers}
              icon={
                <Users
                  className="w-4 h-4"
                  style={{ color: "var(--accent)" }}
                />
              }
            />
            <StatCard
              title="Active This Month"
              value={playersLoading ? "--" : activePlayers}
              subtitle="Players with games"
              icon={
                <Gamepad2
                  className="w-4 h-4"
                  style={{ color: "var(--success)" }}
                />
              }
            />
            <StatCard
              title="Avg Games"
              value={playersLoading ? "--" : avgGames}
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
              value={playersLoading ? "--" : topPoints}
              subtitle={standings.length > 0 ? standings[0].name : ""}
              icon={
                <Trophy
                  className="w-4 h-4"
                  style={{ color: "#fbbf24" }}
                />
              }
            />
          </div>

          {/* Top 16 Standings */}
          <div className="mb-8">
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Top 16 Standings
            </h2>
            {standingsLoading ? (
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
              <StandingsTable standings={standings} />
            )}
          </div>

          {/* Full Player Table */}
          <div>
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              All Players
            </h2>
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
                  Loading players...
                </p>
              </div>
            ) : (
              <PlayerTable players={players} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
