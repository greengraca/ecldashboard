"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users, Gamepad2, Trophy, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import MonthPicker from "@/components/dashboard/month-picker";
import PlayerTable from "@/components/players/player-table";
import StandingsTable from "@/components/players/standings-table";
import type { Player, Standing } from "@/lib/types";

interface PlayersData {
  players: Player[];
  month: string | null;
}

interface StandingsData {
  standings: Standing[];
  month: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PlayersPage() {
  const [month, setMonth] = useState(getCurrentMonth);

  const { data: playersData, error: playersError, isLoading: playersLoading } =
    useSWR<{ data: PlayersData }>(
      `/api/players?month=${month}`,
      fetcher
    );

  const { data: standingsData, error: standingsError, isLoading: standingsLoading } =
    useSWR<{ data: StandingsData }>(
      `/api/players/standings?month=${month}`,
      fetcher
    );

  const players = playersData?.data?.players || [];
  const standings = standingsData?.data?.standings || [];
  const isLoading = playersLoading || standingsLoading;
  const hasError = playersError || standingsError;

  // Summary stats
  const totalPlayers = players.length;
  const activePlayers = players.filter((p) => p.games > 0).length;
  const avgGames =
    activePlayers > 0
      ? Math.round(
          players.reduce((sum, p) => sum + p.games, 0) / activePlayers
        )
      : 0;
  const topPoints = standings.length > 0 ? standings[0].points.toFixed(0) : "--";

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
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Error state */}
      {hasError && (
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
          value={isLoading ? "--" : totalPlayers}
          icon={
            <Users
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
          }
        />
        <StatCard
          title="Active This Month"
          value={isLoading ? "--" : activePlayers}
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
          value={isLoading ? "--" : avgGames}
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
          value={isLoading ? "--" : topPoints}
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
  );
}
