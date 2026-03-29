"use client";

import { useId } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import PlayerChartTooltip from "./chart-tooltip";

const POINTS_COLOR = "#3b82f6";
const RANK_COLOR = "#f59e0b";

const AXIS_STYLE = { fontSize: 11, fill: "var(--text-muted)" };

interface DataPoint {
  label: string;
  points: number;
  rank: number;
}

interface PointsRankChartProps {
  data: DataPoint[];
  height?: number;
}

export default function PointsRankChart({
  data,
  height = 250,
}: PointsRankChartProps) {
  const gradientId = useId();

  if (data.length === 0) return null;

  const maxRank = Math.max(...data.map((d) => d.rank));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ left: -10, right: -10, top: 5, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`pointsFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={POINTS_COLOR} stopOpacity={0.2} />
              <stop offset="100%" stopColor={POINTS_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="points"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <YAxis
            yAxisId="rank"
            orientation="right"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            reversed
            domain={[1, maxRank + 1]}
            tickFormatter={(v: number) => `#${v}`}
          />
          <Tooltip
            content={
              <PlayerChartTooltip
                valueFormatter={(v, name) =>
                  name === "Rank" ? `#${v}` : v.toFixed(0)
                }
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
          />
          <Area
            yAxisId="points"
            type="natural"
            dataKey="points"
            name="Points"
            stroke={POINTS_COLOR}
            strokeWidth={2}
            fill={`url(#pointsFill-${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: POINTS_COLOR,
              stroke: "#0a0f14",
              strokeWidth: 2,
            }}
          />
          <Line
            yAxisId="rank"
            type="natural"
            dataKey="rank"
            name="Rank"
            stroke={RANK_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: RANK_COLOR,
              stroke: "#0a0f14",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
