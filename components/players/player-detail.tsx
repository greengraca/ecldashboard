"use client";

import { Trophy, Medal, Award, Gift, BarChart3 } from "lucide-react";
import type {
  PlayerDetail as PlayerDetailType,
  PlayerMatchStats,
} from "@/lib/types";
import dynamic from "next/dynamic";
const SeasonRecordChart = dynamic(() => import("./charts/season-record-chart"), { ssr: false });
const MonthlyActivityChart = dynamic(() => import("./charts/monthly-activity-chart"), { ssr: false });
const PointsRankChart = dynamic(() => import("./charts/points-rank-chart"), { ssr: false });
const WinRateChart = dynamic(() => import("./charts/win-rate-chart"), { ssr: false });


interface PlayerDetailProps {
  player: PlayerDetailType;
  matchStats: PlayerMatchStats | null;
  matchStatsLoading: boolean;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function formatMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-sm font-medium uppercase tracking-wider mb-3"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </h3>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {children}
    </div>
  );
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="rounded-xl skeleton animate-pulse"
      style={{ height }}
    />
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      className="p-2.5 sm:p-4 rounded-xl text-center"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <p
        className="text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5 sm:mb-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className="text-base sm:text-xl font-bold tabular-nums"
        style={{ color: color || "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

export default function PlayerDetail({
  player,
  matchStats,
  matchStatsLoading,
}: PlayerDetailProps) {
  const history = player.monthly_history;

  // ─── All-Time chart data ───
  const allTimePointsRank = history
    .filter((h) => h.rank !== null)
    .map((h) => ({
      label: formatMonthShort(h.month),
      points: h.points,
      rank: h.rank!,
    }));

  const allTimeWinRate = history
    .filter((h) => h.rank !== null)
    .map((h) => ({
      label: formatMonthShort(h.month),
      winPct: h.win_pct,
    }));

  const hasCurrentMonthData =
    matchStats !== null && matchStats.dailyActivity.length > 0;

  // ─── Career highlights ───
  const bestRank = history.reduce<number | null>((best, h) => {
    if (h.rank === null) return best;
    return best === null ? h.rank : Math.min(best, h.rank);
  }, null);

  const bestPoints = Math.max(...history.map((h) => h.points));
  const monthsActive = history.length;

  return (
    <div className="space-y-8">
      {/* ─── Player Header ─── */}
      <div className="flex items-center gap-4">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt=""
            className="w-14 h-14 rounded-full"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
            }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {player.name}
          </h2>
          {(player.discord_username || player.uid) && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {[player.discord_username, player.uid]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {player.rank && (
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Rank #{player.rank}
              </span>
            )}
            {player.is_subscriber && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  color:
                    player.subscription_source === "patreon"
                      ? "var(--status-patreon)"
                      : player.subscription_source === "kofi"
                        ? "var(--status-kofi)"
                        : "var(--status-free)",
                  background:
                    player.subscription_source === "patreon"
                      ? "var(--status-patreon-light)"
                      : player.subscription_source === "kofi"
                        ? "var(--status-kofi-light)"
                        : "var(--status-free-light)",
                }}
              >
                {player.subscription_source === "patreon"
                  ? "Patreon"
                  : player.subscription_source === "kofi"
                    ? "Ko-fi"
                    : "Free"}
              </span>
            )}
          </div>
          {player.first_month && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Member since {formatMonth(player.first_month)}
            </p>
          )}
        </div>
      </div>

      {/* ─── Achievement Badges ─── */}
      {(player.achievements.champion.length > 0 ||
        player.achievements.top4.length > 0 ||
        player.achievements.top16.length > 0) && (
        <div>
          <SectionHeader>Achievements</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {player.achievements.champion.map((m) => (
              <span
                key={`champ-${m}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(251, 191, 36, 0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251, 191, 36, 0.25)",
                }}
              >
                <Trophy className="w-3.5 h-3.5" />
                Champion {formatMonth(m)}
              </span>
            ))}
            {player.achievements.top4
              .filter((m) => !player.achievements.champion.includes(m))
              .map((m) => (
                <span
                  key={`top4-${m}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(176, 206, 232, 0.12)",
                    color: "#b0cee8",
                    border: "1px solid rgba(176, 206, 232, 0.25)",
                  }}
                >
                  <Medal className="w-3.5 h-3.5" />
                  Top 4 {formatMonth(m)}
                </span>
              ))}
            {player.achievements.top16
              .filter(
                (m) =>
                  !player.achievements.top4.includes(m) &&
                  !player.achievements.champion.includes(m)
              )
              .map((m) => (
                <span
                  key={`top16-${m}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(205, 127, 50, 0.12)",
                    color: "#cd7f32",
                    border: "1px solid rgba(205, 127, 50, 0.25)",
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  Top 16 {formatMonth(m)}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* ─── Prizes Placeholder ─── */}
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: "var(--surface-gradient)",
          backdropFilter: "var(--surface-blur)",
          border: "1.5px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "var(--surface-shadow)",
        }}
      >
        <Gift
          className="w-6 h-6 mx-auto mb-2"
          style={{ color: "var(--text-muted)" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Prizes coming soon
        </p>
      </div>

      {/* ─── Current Stats + Season Record Donut ─── */}
      <div>
        <SectionHeader>Current League Stats</SectionHeader>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3">
            <StatBox
              label="Points"
              value={player.points.toFixed(0)}
              color="var(--accent)"
            />
            <StatBox
              label="Win %"
              value={`${parseFloat(player.win_pct.toFixed(2))}%`}
            />
            <StatBox
              label="OW %"
              value={`${parseFloat(player.ow_pct.toFixed(2))}%`}
            />
            <StatBox
              label="Best Swiss Rank"
              value={bestRank ? `#${bestRank}` : "--"}
              color="var(--accent)"
            />
            <StatBox
              label="Months Active"
              value={monthsActive}
            />
            <StatBox
              label="Best Points"
              value={bestPoints.toFixed(0)}
            />
          </div>
          {player.games > 0 && (
            <div className="flex-shrink-0">
              <SeasonRecordChart
                wins={player.wins}
                losses={player.losses}
                draws={player.draws}
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── This Month ─── */}
      <div>
        <SectionHeader>This Month</SectionHeader>
        {matchStatsLoading ? (
          <ChartSkeleton height={220} />
        ) : !hasCurrentMonthData ? (
          <ChartCard>
            <div className="flex flex-col items-center justify-center py-8">
              <BarChart3
                className="w-6 h-6 mb-2"
                style={{ color: "var(--text-muted)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No games this month yet
              </p>
            </div>
          </ChartCard>
        ) : (
          <ChartCard>
            <p
              className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Daily Activity
            </p>
            <MonthlyActivityChart data={matchStats!.dailyActivity} />
          </ChartCard>
        )}
      </div>

      {/* ─── All-Time Trends ─── */}
      {history.length > 1 && (
        <div>
          <SectionHeader>All-Time Trends</SectionHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* All-Time Points & Rank */}
            {allTimePointsRank.length > 1 && (
              <ChartCard>
                <p
                  className="text-xs font-medium uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Points & Rank
                </p>
                <PointsRankChart data={allTimePointsRank} height={220} />
              </ChartCard>
            )}

            {/* All-Time Win Rate */}
            {allTimeWinRate.length > 1 && (
              <ChartCard>
                <p
                  className="text-xs font-medium uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Win Rate
                </p>
                <WinRateChart data={allTimeWinRate} />
              </ChartCard>
            )}
          </div>
        </div>
      )}

      {/* ─── Monthly History Table ─── */}
      <div>
        <SectionHeader>Monthly History</SectionHeader>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.015)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Mobile card view */}
          <div className="sm:hidden">
            {[...history].reverse().map((h) => (
              <div key={h.month} className="mobile-card space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatMonth(h.month)}
                  </span>
                  <div className="flex items-center gap-2">
                    {h.rank && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        #{h.rank}
                      </span>
                    )}
                    <span
                      className="tabular-nums font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      {h.points.toFixed(0)} pts
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>
                    {h.games} games
                  </span>
                  <span style={{ color: "var(--success)" }}>{h.wins}W</span>
                  <span style={{ color: "var(--error)" }}>{h.losses}L</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {h.draws}D
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {parseFloat(h.win_pct.toFixed(2))}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {[
                    "Month",
                    "Rank",
                    "Points",
                    "Games",
                    "Wins",
                    "Losses",
                    "Draws",
                    "Win%",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-medium text-xs uppercase tracking-wider ${
                        h === "Month" ? "text-left" : "text-right"
                      }`}
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        background: "rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr
                    key={h.month}
                    className="border-b border-[var(--border-subtle)]"
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatMonth(h.month)}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {h.rank ? `#${h.rank}` : "--"}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      {h.points.toFixed(0)}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {h.games}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "var(--success)" }}
                    >
                      {h.wins}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "var(--error)" }}
                    >
                      {h.losses}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {h.draws}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {parseFloat(h.win_pct.toFixed(2))}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
