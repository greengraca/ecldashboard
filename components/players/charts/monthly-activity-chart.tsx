"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import PlayerChartTooltip from "./chart-tooltip";
import type { DailyActivity } from "@/lib/types";

const WIN_COLOR = "#34d399";
const LOSS_COLOR = "#fca5a5";
const DRAW_COLOR = "#64748b";

const AXIS_STYLE = { fontSize: 11, fill: "var(--text-muted)" };

interface MonthlyActivityChartProps {
  data: DailyActivity[];
}

export default function MonthlyActivityChart({
  data,
}: MonthlyActivityChartProps) {
  if (data.length === 0) return null;

  // Fill in gaps: ensure all days from min to max are represented
  const minDay = data[0].day;
  const maxDay = data[data.length - 1].day;
  const byDay = new Map(data.map((d) => [d.day, d]));
  const filled: DailyActivity[] = [];
  for (let d = minDay; d <= maxDay; d++) {
    filled.push(byDay.get(d) || { day: d, wins: 0, losses: 0, draws: 0 });
  }

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filled}
          margin={{ left: -20, right: 5, top: 5, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={
              <PlayerChartTooltip
                labelFormatter={(d) => `Day ${d}`}
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
          />
          <Bar
            dataKey="wins"
            name="Wins"
            stackId="a"
            fill={WIN_COLOR}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="losses"
            name="Losses"
            stackId="a"
            fill={LOSS_COLOR}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="draws"
            name="Draws"
            stackId="a"
            fill={DRAW_COLOR}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
