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
  Cell,
} from "recharts";
import type { MonthlySummary } from "@/lib/types";

interface MonthlyBreakdownChartProps {
  month: string;
  summary: MonthlySummary | null;
  isLoading: boolean;
}

// Shades of green for income, shades of red for expenses
const INCOME_SHADES = ["#34d399", "#4ade80", "#86efac", "#a7f3d0"];
const EXPENSE_SHADES = ["#f87171", "#fca5a5", "#fb923c", "#fda4af"];

const CATEGORY_LABELS: Record<string, string> = {
  subscription: "Subscription",
  sponsorship: "Sponsorship",
  prize: "Prize",
  operational: "Operational",
  other: "Other",
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs border"
      style={{
        background: "var(--bg-page)",
        borderColor: "var(--border)",
      }}
    >
      <p style={{ color: entry.payload.color }}>
        {"\u20AC"}{Math.abs(entry.value).toFixed(2)}
      </p>
    </div>
  );
}

export default function MonthlyBreakdownChart({
  summary,
  isLoading,
}: MonthlyBreakdownChartProps) {
  const breakdown = summary?.breakdown;

  const data = breakdown
    ? (() => {
        let incomeIdx = 0;
        let expenseIdx = 0;
        return Object.entries(breakdown)
          .map(([key, value]) => ({
            category: CATEGORY_LABELS[key] || key,
            amount: Math.abs(value),
            value: value,
            isIncome: value > 0,
          }))
          .filter((d) => d.amount > 0)
          .sort((a, b) => b.amount - a.amount)
          .map((d) => ({
            ...d,
            color: d.isIncome
              ? INCOME_SHADES[incomeIdx++ % INCOME_SHADES.length]
              : EXPENSE_SHADES[expenseIdx++ % EXPENSE_SHADES.length],
          }));
      })()
    : [];

  return (
    <div
      className="rounded-xl border p-4 sm:p-6 mb-8"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h2
          className="text-sm font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Category Breakdown
        </h2>
        {summary && (
          <div className="flex items-center gap-4 text-xs">
            <span style={{ color: "var(--success)" }}>
              Income: +{"\u20AC"}{summary.income.toFixed(2)}
            </span>
            <span style={{ color: "var(--error)" }}>
              Expenses: -{"\u20AC"}{(summary.expenses + summary.fixed_costs).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 220 }}
        >
          <div
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex items-center justify-center text-sm"
          style={{ height: 220, color: "var(--text-muted)" }}
        >
          No transactions this month
        </div>
      ) : (
        <div style={{ height: 220, outline: "none", WebkitTapHighlightColor: "transparent" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" barSize={20} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `\u20AC${v}`}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {data.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-3 justify-center">
          {data.map((d) => (
            <div key={d.category} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: d.color, opacity: 0.85 }}
              />
              <span style={{ color: "var(--text-muted)" }}>{d.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
