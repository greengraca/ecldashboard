"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import type { MonthlySummary } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

function euro(value: number, showSign = false): string {
  const prefix = showSign ? (value >= 0 ? "+" : "-") : value < 0 ? "-" : "";
  return `${prefix}\u20AC${Math.abs(value).toFixed(2)}`;
}

const TABS = ["overview", "breakdown"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { overview: "Overview", breakdown: "Breakdown" };

/* ─── Overview Tab ─── */

function OverviewTab({ totals }: { totals: { net: number; split: number; income: number; expenses: number; months: number } }) {
  const isPositive = totals.split >= 0;

  return (
    <div>
      {/* Total net banner */}
      <div
        className="rounded-lg p-4 mb-5 text-center"
        style={{
          background: isPositive
            ? "linear-gradient(135deg, rgba(52, 211, 153, 0.06) 0%, rgba(212, 160, 23, 0.06) 100%)"
            : "var(--error-light)",
          border: `1px solid ${isPositive ? "rgba(52, 211, 153, 0.15)" : "var(--error-border)"}`,
        }}
      >
        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          Total Net Profit &middot; {totals.months} months
        </p>
        <p
          className="text-3xl font-bold"
          style={{ color: isPositive ? "var(--success)" : "var(--error)" }}
        >
          <Sensitive placeholder="€•••••">{euro(totals.net, true)}</Sensitive>
        </p>
      </div>

      {/* Group cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GroupBalanceCard
          label="cedhpt"
          color="#D4A017"
          split={totals.split}
        />
        <GroupBalanceCard
          label="CommanderArena"
          color="#34d399"
          split={totals.split}
        />
      </div>
    </div>
  );
}

function GroupBalanceCard({
  label,
  color,
  split,
}: {
  label: string;
  color: string;
  split: number;
}) {
  const isPositive = split >= 0;

  return (
    <div
      className="relative overflow-hidden rounded-lg border p-5"
      style={{
        background: "var(--card-inner-bg)",
        borderColor: `${color}22`,
      }}
    >
      {/* Subtle gradient glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: color, transform: "translate(30%, -30%)" }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: color }}
          />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {label}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${color}15`, color }}
          >
            50%
          </span>
        </div>

        <p
          className="text-2xl font-bold tracking-tight"
          style={{ color: isPositive ? color : "var(--error)" }}
        >
          <Sensitive placeholder="€•••••">{euro(split, true)}</Sensitive>
        </p>

        {/* Progress-style bar */}
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: isPositive ? "100%" : "0%",
              background: `linear-gradient(90deg, ${color}88, ${color})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Breakdown Tab ─── */

function BreakdownTab({
  summaries,
  totals,
}: {
  summaries: MonthlySummary[];
  totals: { income: number; expenses: number; net: number; split: number };
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ color: "var(--text-primary)" }}>
        <thead>
          <tr className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            <th className="text-left py-2 px-3 font-medium">Month</th>
            <th className="text-right py-2 px-3 font-medium">Income</th>
            <th className="text-right py-2 px-3 font-medium">Expenses</th>
            <th className="text-right py-2 px-3 font-medium">Net</th>
            <th className="text-right py-2 px-3 font-medium">cedhpt</th>
            <th className="text-right py-2 px-3 font-medium">CA</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => {
            const split = s.net / 2;
            const totalExpenses = s.expenses + s.fixed_costs;
            return (
              <tr key={s.month} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="py-2.5 px-3 font-medium">{formatMonth(s.month)}</td>
                <td className="py-2.5 px-3 text-right" style={{ color: "var(--success)" }}>
                  <Sensitive placeholder="€•••••">{euro(s.income)}</Sensitive>
                </td>
                <td className="py-2.5 px-3 text-right" style={{ color: "var(--error)" }}>
                  <Sensitive placeholder="€•••••">{euro(totalExpenses)}</Sensitive>
                </td>
                <td
                  className="py-2.5 px-3 text-right font-medium"
                  style={{ color: s.net >= 0 ? "var(--success)" : "var(--error)" }}
                >
                  <Sensitive placeholder="€•••••">{euro(s.net, true)}</Sensitive>
                </td>
                <td
                  className="py-2.5 px-3 text-right"
                  style={{ color: split >= 0 ? "var(--text-secondary)" : "var(--error)" }}
                >
                  <Sensitive placeholder="€•••••">{euro(split, true)}</Sensitive>
                </td>
                <td
                  className="py-2.5 px-3 text-right"
                  style={{ color: split >= 0 ? "var(--text-secondary)" : "var(--error)" }}
                >
                  <Sensitive placeholder="€•••••">{euro(split, true)}</Sensitive>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold" style={{ borderColor: "var(--border)" }}>
            <td className="py-2.5 px-3">Total</td>
            <td className="py-2.5 px-3 text-right" style={{ color: "var(--success)" }}>
              <Sensitive placeholder="€•••••">{euro(totals.income)}</Sensitive>
            </td>
            <td className="py-2.5 px-3 text-right" style={{ color: "var(--error)" }}>
              <Sensitive placeholder="€•••••">{euro(totals.expenses)}</Sensitive>
            </td>
            <td
              className="py-2.5 px-3 text-right"
              style={{ color: totals.net >= 0 ? "var(--success)" : "var(--error)" }}
            >
              <Sensitive placeholder="€•••••">{euro(totals.net, true)}</Sensitive>
            </td>
            <td
              className="py-2.5 px-3 text-right"
              style={{ color: totals.split >= 0 ? "var(--accent)" : "var(--error)" }}
            >
              <Sensitive placeholder="€•••••">{euro(totals.split, true)}</Sensitive>
            </td>
            <td
              className="py-2.5 px-3 text-right"
              style={{ color: totals.split >= 0 ? "var(--accent)" : "var(--error)" }}
            >
              <Sensitive placeholder="€•••••">{euro(totals.split, true)}</Sensitive>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ─── Main Component ─── */

export default function ProfitSplitTable() {
  const [tab, setTab] = useState<Tab>("overview");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const startMonth = "2025-11";
  const allMonths = generateMonthRange(startMonth, currentMonth);

  const { data: multiData, isLoading } = useSWR<{ data: MonthlySummary[] }>(
    `/api/finance/summary?months=${allMonths.join(",")}`,
    fetcher
  );

  const summaries = multiData?.data || [];

  const totals = useMemo(() => {
    let income = 0,
      expenses = 0,
      fixedCosts = 0,
      net = 0;
    for (const s of summaries) {
      income += s.income;
      expenses += s.expenses;
      fixedCosts += s.fixed_costs;
      net += s.net;
    }
    return { income, expenses: expenses + fixedCosts, net, split: net / 2, months: summaries.length };
  }, [summaries]);

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
      >
        <div
          className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (summaries.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 sm:p-6"
      style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
    >
      {/* Header + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Group Profit Split
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            50/50 split between cedhpt and CommanderArena
          </p>
        </div>

        <div
          className="flex w-fit rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border)" }}
        >
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: tab === t ? "var(--accent-light)" : "transparent",
                color: tab === t ? "var(--accent)" : "var(--text-muted)",
                borderRight: i < TABS.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "overview" ? (
        <OverviewTab totals={totals} />
      ) : (
        <BreakdownTab summaries={summaries} totals={totals} />
      )}
    </div>
  );
}
