"use client";

import { useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import PlayerChartTooltip from "./chart-tooltip";

const WINRATE_COLOR = "#34d399";

const AXIS_STYLE = { fontSize: 11, fill: "var(--text-muted)" };

interface DataPoint {
  label: string;
  winPct: number;
}

interface WinRateChartProps {
  data: DataPoint[];
  height?: number;
}

export default function WinRateChart({
  data,
  height = 200,
}: WinRateChartProps) {
  const gradientId = useId();

  if (data.length === 0) return null;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ left: -15, right: 5, top: 5, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`winRateFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={WINRATE_COLOR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={WINRATE_COLOR} stopOpacity={0} />
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
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ReferenceLine
            y={25}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="6 4"
            label={{
              value: "25% expected",
              position: "right",
              fill: "var(--text-muted)",
              fontSize: 10,
            }}
          />
          <Tooltip
            content={
              <PlayerChartTooltip
                valueFormatter={(v) => `${v.toFixed(1)}%`}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="winPct"
            name="Win Rate"
            stroke={WINRATE_COLOR}
            strokeWidth={2}
            fill={`url(#winRateFill-${gradientId})`}
            dot={{
              r: 3,
              fill: "#0a0f14",
              stroke: WINRATE_COLOR,
              strokeWidth: 2,
            }}
            activeDot={{
              r: 5,
              fill: WINRATE_COLOR,
              stroke: "#0a0f14",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
