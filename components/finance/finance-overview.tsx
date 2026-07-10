"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Wallet } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { MonthlySummary, DistributionLedger } from "@/lib/types";
import { distributionEvents } from "@/lib/distributions-math";
import { Sensitive, SensitiveBlock } from "@/components/dashboard/sensitive";
import { useSensitiveData } from "@/contexts/SensitiveDataContext";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";

function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy,
    m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`;
}

const CHART_VIEWS = ["area", "bar"] as const;
type ChartView = (typeof CHART_VIEWS)[number];

const CHART_LABELS: Record<ChartView, string> = {
  area: "Area",
  bar: "Bar + Line",
};

interface ChartDataPoint {
  month: string;
  label: string;
  income: number;
  expenses: number;
  fixed_costs: number;
  total_expenses: number;
  net: number;
  balance: number;
}

// Custom tooltip matching glassmorphism style
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs border"
      style={{
        background: "var(--bg-page)",
        borderColor: "var(--border)",
      }}
    >
      <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {"\u20AC"}{Math.abs(entry.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

export default function FinanceOverview() {
  const [chartView, setChartView] = useState<ChartView>("area");
  const { hidden: sensitiveHidden } = useSensitiveData();

  const currentMonth = getCurrentMonth();
  const startMonth = "2025-11";
  const allMonths = generateMonthRange(startMonth, currentMonth);

  const { data: multiData, isLoading } = useSWR<{ data: MonthlySummary[] }>(
    `/api/finance/summary?months=${allMonths.join(",")}`,
    fetcher
  );

  const summaries = multiData?.data || [];

  const { data: distData } = useSWR<{ data: DistributionLedger }>(
    "/api/finance/distributions",
    fetcher
  );
  // One marker per payout ACTION (records sharing a timestamp), not per month.
  const payoutEvents = useMemo(
    () => distributionEvents(distData?.data?.months ?? []),
    [distData]
  );

  const { chartData, remainingBalance, totalDistributed } = useMemo(() => {
    if (!summaries.length) return { chartData: [], remainingBalance: 0, totalDistributed: 0 };

    // Apply each payout at its "through" month so the line tracks the UNDISTRIBUTED
    // balance (rises with profit, drops when a payout settles months).
    const distByThrough = new Map<string, number>();
    for (const ev of payoutEvents) distByThrough.set(ev.through, (distByThrough.get(ev.through) ?? 0) + ev.total);

    let cumNet = 0;
    let cumDist = 0;
    const points: ChartDataPoint[] = summaries.map((s) => {
      cumNet += s.net;
      cumDist += distByThrough.get(s.month) ?? 0;
      return {
        month: s.month,
        label: formatMonth(s.month),
        income: s.income,
        expenses: s.expenses,
        fixed_costs: s.fixed_costs,
        total_expenses: s.expenses + s.fixed_costs,
        net: s.net,
        balance: parseFloat((cumNet - cumDist).toFixed(2)),
      };
    });

    const totalDist = payoutEvents.reduce((sum, e) => sum + e.total, 0);
    const remaining = points.length ? points[points.length - 1].balance : 0;
    return { chartData: points, remainingBalance: remaining, totalDistributed: totalDist };
  }, [summaries, payoutEvents]);

  const axisStyle = {
    fontSize: 11,
    fill: "var(--text-muted)",
  };

  return (
    <div
      className="rounded-xl p-4 sm:p-6 mb-8"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {/* Top row: rolling balance + chart tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Rolling balance */}
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-xl"
            style={{
              background:
                remainingBalance >= 0
                  ? "var(--success-light)"
                  : "var(--error-light)",
            }}
          >
            <Wallet
              className="w-6 h-6"
              style={{
                color:
                  remainingBalance >= 0 ? "var(--success)" : "var(--error)",
              }}
            />
          </div>
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Treasury Balance
            </p>
            <p
              className="text-2xl sm:text-3xl font-bold"
              style={{
                color: isLoading
                  ? "var(--text-muted)"
                  : remainingBalance >= 0
                    ? "var(--success)"
                    : "var(--error)",
              }}
            >
              {isLoading
                ? "--"
                : <Sensitive placeholder="€•••••">{`${remainingBalance >= 0 ? "+" : "-"}\u20AC${Math.abs(remainingBalance).toFixed(2)}`}</Sensitive>}
            </p>
            {!isLoading && totalDistributed > 0.01 && (
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                <Sensitive placeholder="€••• distributed">{`€${totalDistributed.toFixed(2)} distributed to date`}</Sensitive>
              </p>
            )}
          </div>
        </div>

        {/* Chart view tabs */}
        <div
          className="flex w-fit rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border)" }}
        >
          {CHART_VIEWS.map((view) => (
            <button
              key={view}
              onClick={() => setChartView(view)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background:
                  chartView === view
                    ? "var(--accent-light)"
                    : "transparent",
                color:
                  chartView === view
                    ? "var(--accent)"
                    : "var(--text-muted)",
                borderRight:
                  view !== "bar" ? "1px solid var(--border)" : "none",
              }}
            >
              {CHART_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {sensitiveHidden ? (
        <SensitiveBlock message="Chart hidden in privacy mode" height={280} />
      ) : isLoading ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 280 }}
        >
          <div
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
        </div>
      ) : chartData.length === 0 ? (
        <div
          className="flex items-center justify-center text-sm"
          style={{ height: 280, color: "var(--text-muted)" }}
        >
          No data available
        </div>
      ) : (
        <div style={{ height: 280, outline: "none", WebkitTapHighlightColor: "transparent" }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "area" ? (
              <AreaChart data={chartData} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4A017" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#D4A017" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `\u20AC${v}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="#D4A017"
                  strokeWidth={2.5}
                  fill="url(#balanceGrad)"
                  dot={{
                    r: 4,
                    fill: "#0a0f14",
                    stroke: "#D4A017",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#D4A017",
                    stroke: "#0a0f14",
                    strokeWidth: 2,
                  }}
                />
                {payoutEvents.map((ev) => (
                  <ReferenceLine
                    key={ev.paid_at}
                    x={formatMonth(ev.through)}
                    stroke="var(--accent)"
                    strokeDasharray="4 3"
                    strokeOpacity={0.85}
                    label={{ value: `€${ev.total.toFixed(2)} ▸ ${formatMonth(ev.through)}`, position: "top", fill: "var(--accent)", fontSize: 10, fontWeight: 600 }}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={chartData} barGap={2} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `\u20AC${v}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#34d399"
                  radius={[4, 4, 0, 0]}
                  opacity={0.85}
                />
                <Bar dataKey="expenses" name="Expenses" stackId="costs" fill="#fca5a5" opacity={0.85} />
                <Bar dataKey="fixed_costs" name="Fixed Costs" stackId="costs" fill="#fbbf24" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="#D4A017"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "#0a0f14",
                    stroke: "#D4A017",
                    strokeWidth: 2,
                  }}
                />
                {payoutEvents.map((ev) => (
                  <ReferenceLine
                    key={ev.paid_at}
                    x={formatMonth(ev.through)}
                    stroke="var(--accent)"
                    strokeDasharray="4 3"
                    strokeOpacity={0.85}
                    label={{ value: `€${ev.total.toFixed(2)} ▸ ${formatMonth(ev.through)}`, position: "top", fill: "var(--accent)", fontSize: 10, fontWeight: 600 }}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
