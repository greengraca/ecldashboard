"use client";

import useSWR from "swr";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { UserPlus } from "lucide-react";
import PlayerChartTooltip from "./charts/chart-tooltip";
import { fetcher } from "@/lib/fetcher";
import type { BracketEntriesResult } from "@/lib/bracket-entries";

const BAR_COLOR = "var(--accent)";
const LINE_COLOR = "#60a5fa";
const AXIS_STYLE = { fontSize: 11, fill: "var(--text-muted)" };

interface BracketEntriesSectionProps {
  month: string;
}

export default function BracketEntriesSection({ month }: BracketEntriesSectionProps) {
  const { data, isLoading } = useSWR<{ data: BracketEntriesResult }>(
    `/api/players/bracket-entries?month=${month}`,
    fetcher
  );

  const result = data?.data;
  const hasData = !!result && result.days.length > 0;

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
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(251, 191, 36, 0.15)" }}
        >
          <UserPlus className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
        <div className="text-left">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Bracket Entries by Day
          </span>
          {!isLoading && hasData && (
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
              {result.totalEntrants} players entered
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="text-center py-10">
            <div
              className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
            />
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Computing entries...
            </p>
          </div>
        ) : !hasData ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No entries yet
            </p>
          </div>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={result.days}
                margin={{ left: -20, right: 8, top: 5, bottom: 0 }}
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
                  yAxisId="left"
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<PlayerChartTooltip labelFormatter={(d) => `Day ${d}`} />}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />
                <Bar
                  yAxisId="left"
                  dataKey="entrants"
                  name="New entrants"
                  fill={BAR_COLOR}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  name="Total entered"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
