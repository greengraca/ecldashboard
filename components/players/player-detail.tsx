"use client";

import { Trophy, Medal, Award, Gift } from "lucide-react";
import type { PlayerDetail as PlayerDetailType } from "@/lib/types";

interface PlayerDetailProps {
  player: PlayerDetailType;
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
      className="p-2.5 sm:p-4 rounded-xl border text-center"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
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

export default function PlayerDetail({ player }: PlayerDetailProps) {
  const history = player.monthly_history;

  // Find min/max points for scaling the text-based progression
  const pointValues = history.map((h) => h.points);
  const maxPoints = Math.max(...pointValues, 1);

  return (
    <div className="space-y-8">
      {/* Player Header */}
      <div className="flex items-center gap-4">
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
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {player.name}
          </h2>
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
              Member since {player.first_month}
            </p>
          )}
        </div>
      </div>

      {/* Achievement Badges */}
      {(player.achievements.champion.length > 0 ||
        player.achievements.top4.length > 0 ||
        player.achievements.top16.length > 0) && (
        <div>
          <h3
            className="text-sm font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Achievements
          </h3>
          <div className="flex flex-wrap gap-2">
            {player.achievements.champion.map((m) => (
              <span
                key={`champ-${m}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(251, 191, 36, 0.12)", color: "#fbbf24", border: "1px solid rgba(251, 191, 36, 0.25)" }}
              >
                <Trophy className="w-3.5 h-3.5" />
                Champion {m}
              </span>
            ))}
            {player.achievements.top4.map((m) => (
              <span
                key={`top4-${m}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(148, 163, 184, 0.12)", color: "#94a3b8", border: "1px solid rgba(148, 163, 184, 0.25)" }}
              >
                <Medal className="w-3.5 h-3.5" />
                Top 4 {m}
              </span>
            ))}
            {player.achievements.top16.map((m) => (
              <span
                key={`top16-${m}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(205, 127, 50, 0.12)", color: "#cd7f32", border: "1px solid rgba(205, 127, 50, 0.25)" }}
              >
                <Award className="w-3.5 h-3.5" />
                Top 16 {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prizes Placeholder */}
      <div
        className="rounded-xl border p-6 text-center"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <Gift className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Prizes coming soon
        </p>
      </div>

      {/* Current Stats */}
      <div>
        <h3
          className="text-sm font-medium uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Current Stats
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <StatBox label="Points" value={player.points.toFixed(0)} color="var(--accent)" />
          <StatBox label="Games" value={player.games} />
          <StatBox label="Wins" value={player.wins} color="var(--success)" />
          <StatBox label="Losses" value={player.losses} color="var(--error)" />
          <StatBox label="Draws" value={player.draws} />
          <StatBox label="Win %" value={`${parseFloat(player.win_pct.toFixed(2))}%`} />
        </div>
      </div>

      {/* Monthly Points Progression */}
      {history.length > 1 && (
        <div>
          <h3
            className="text-sm font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Points Progression
          </h3>
          <div
            className="p-4 rounded-xl border overflow-x-auto"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-end gap-3 min-w-max">
              {history.map((h) => {
                const barHeight = Math.max(
                  20,
                  (h.points / maxPoints) * 120
                );
                return (
                  <div key={h.month} className="flex flex-col items-center gap-1">
                    <span
                      className="text-xs tabular-nums font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      {h.points.toFixed(0)}
                    </span>
                    <div
                      className="w-10 rounded-t-md transition-all"
                      style={{
                        height: `${barHeight}px`,
                        background:
                          "linear-gradient(to top, var(--accent-dim), var(--accent))",
                        opacity: 0.8,
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h.month.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Monthly History Table */}
      <div>
        <h3
          className="text-sm font-medium uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Monthly History
        </h3>
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          {/* Mobile card view */}
          <div className="sm:hidden">
            {[...history].reverse().map((h) => (
              <div key={h.month} className="mobile-card space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {h.month}
                  </span>
                  <div className="flex items-center gap-2">
                    {h.rank && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>#{h.rank}</span>
                    )}
                    <span className="tabular-nums font-medium" style={{ color: "var(--accent)" }}>
                      {h.points.toFixed(0)} pts
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>{h.games} games</span>
                  <span style={{ color: "var(--success)" }}>{h.wins}W</span>
                  <span style={{ color: "var(--error)" }}>{h.losses}L</span>
                  <span style={{ color: "var(--text-secondary)" }}>{h.draws}D</span>
                  <span style={{ color: "var(--text-secondary)" }}>{parseFloat(h.win_pct.toFixed(2))}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Month", "Rank", "Points", "Games", "Wins", "Losses", "Draws", "Win%"].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 font-medium text-xs uppercase tracking-wider ${
                          h === "Month" ? "text-left" : "text-right"
                        }`}
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
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
                      {h.month}
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
