"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, BarChart3, Crown, Frown } from "lucide-react";
import type { TurnOrderStats } from "@/lib/turn-order-stats";
import { fetcher } from "@/lib/fetcher";

interface TurnOrderSectionProps {
  month: string;
}

export default function TurnOrderSection({ month }: TurnOrderSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useSWR<{ data: TurnOrderStats }>(
    `/api/players/turn-order-stats?month=${month}`,
    fetcher
  );

  const stats = data?.data;
  const hasData = stats && stats.completedPods > 0;

  return (
    <div
      className="rounded-xl mb-8 overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:brightness-110"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(251, 191, 36, 0.15)" }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              More Stats
            </span>
            {!isLoading && hasData && (
              <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                {stats.completedPods + stats.draws} completed pods
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        )}
      </button>

      {/* Expandable content */}
      <div
        style={{
          maxHeight: expanded ? "800px" : "0",
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease-in-out, opacity 0.2s ease-in-out",
        }}
      >
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="text-center py-8">
              <div
                className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
              />
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Computing turn order stats...
              </p>
            </div>
          ) : !hasData ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No completed pods yet
              </p>
            </div>
          ) : (
            <>
              {/* Section title */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Turn Order Win Rates
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Based on {stats.completedPods + stats.draws} completed pods in Swiss rounds
                </p>
              </div>

              {/* 5 stat cards: Turn 1-4 + Draw Rate */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3"
                    style={{
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                      Seat {i + 1}
                    </p>
                    <p className="text-lg font-bold tabular-nums mt-0.5" style={{ color: "var(--text-primary)" }}>
                      {(stats.turnRates[i] * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {stats.turnWins[i]} wins
                    </p>
                  </div>
                ))}
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Draw Rate
                  </p>
                  <p className="text-lg font-bold tabular-nums mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {(stats.drawRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {stats.draws} draws
                  </p>
                </div>
              </div>

              {/* Luckiest / Unluckiest players */}
              {(stats.luckiest || stats.unluckiest) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.luckiest && (
                    <div
                      className="rounded-lg p-4"
                      style={{
                        background: "var(--card-inner-bg)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                          Luckiest Player
                        </span>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {stats.luckiest.name}
                      </p>
                      {stats.luckiest.discord && (
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {stats.luckiest.discord}
                        </p>
                      )}
                      <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-semibold tabular-nums" style={{ color: "var(--success)" }}>
                          {(stats.luckiest.rate * 100).toFixed(0)}%
                        </span>
                        {" "}of games in seat 1
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}({stats.luckiest.gamesInSeat}/{stats.luckiest.totalGames})
                        </span>
                      </p>
                    </div>
                  )}
                  {stats.unluckiest && (
                    <div
                      className="rounded-lg p-4"
                      style={{
                        background: "var(--card-inner-bg)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Frown className="w-4 h-4" style={{ color: "var(--error)" }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--error)" }}>
                          Unluckiest Player
                        </span>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {stats.unluckiest.name}
                      </p>
                      {stats.unluckiest.discord && (
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {stats.unluckiest.discord}
                        </p>
                      )}
                      <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-semibold tabular-nums" style={{ color: "var(--error)" }}>
                          {(stats.unluckiest.rate * 100).toFixed(0)}%
                        </span>
                        {" "}of games in seat 4
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}({stats.unluckiest.gamesInSeat}/{stats.unluckiest.totalGames})
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
