"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import PlayerChartTooltip from "./chart-tooltip";

// Hex values matching CSS vars (SVG fill doesn't resolve CSS vars)
const WIN_COLOR = "#34d399";
const LOSS_COLOR = "#fca5a5";
const DRAW_COLOR = "#64748b";

interface SeasonRecordChartProps {
  wins: number;
  losses: number;
  draws: number;
}

export default function SeasonRecordChart({
  wins,
  losses,
  draws,
}: SeasonRecordChartProps) {
  const total = wins + losses + draws;
  if (total === 0) return null;

  const segments: { name: string; value: number; color: string }[] = [];
  if (wins > 0) segments.push({ name: "Wins", value: wins, color: WIN_COLOR });
  if (losses > 0) segments.push({ name: "Losses", value: losses, color: LOSS_COLOR });
  if (draws > 0) segments.push({ name: "Draws", value: draws, color: DRAW_COLOR });

  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center p-4"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {segments.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ zIndex: 50 }}
              content={
                <PlayerChartTooltip
                  valueFormatter={(v, name) => {
                    const pct = ((v / total) * 100).toFixed(0);
                    return `${v} (${pct}%)`;
                  }}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {total}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            games
          </span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-2">
        {segments.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {s.value} {s.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
