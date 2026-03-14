"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { MonthlySummary } from "@/lib/types";

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
  const prefix = showSign ? (value >= 0 ? "+" : "-") : (value < 0 ? "-" : "");
  return `${prefix}\u20AC${Math.abs(value).toFixed(2)}`;
}

export default function ProfitSplitTable() {
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
    let income = 0, expenses = 0, fixedCosts = 0, net = 0;
    for (const s of summaries) {
      income += s.income;
      expenses += s.expenses;
      fixedCosts += s.fixed_costs;
      net += s.net;
    }
    return { income, expenses, fixedCosts, net, split: net / 2 };
  }, [summaries]);

  if (isLoading) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div
          className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl border p-4 sm:p-6"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="mb-4">
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ color: "var(--text-primary)" }}>
          <thead>
            <tr
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
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
                <tr
                  key={s.month}
                  className="border-t"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <td className="py-2.5 px-3 font-medium">{formatMonth(s.month)}</td>
                  <td className="py-2.5 px-3 text-right" style={{ color: "var(--success)" }}>
                    {euro(s.income)}
                  </td>
                  <td className="py-2.5 px-3 text-right" style={{ color: "var(--error)" }}>
                    {euro(totalExpenses)}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right font-medium"
                    style={{ color: s.net >= 0 ? "var(--success)" : "var(--error)" }}
                  >
                    {euro(s.net, true)}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right"
                    style={{ color: split >= 0 ? "var(--text-secondary)" : "var(--error)" }}
                  >
                    {euro(split, true)}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right"
                    style={{ color: split >= 0 ? "var(--text-secondary)" : "var(--error)" }}
                  >
                    {euro(split, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr
              className="border-t-2 font-semibold"
              style={{ borderColor: "var(--border)" }}
            >
              <td className="py-2.5 px-3">Total</td>
              <td className="py-2.5 px-3 text-right" style={{ color: "var(--success)" }}>
                {euro(totals.income)}
              </td>
              <td className="py-2.5 px-3 text-right" style={{ color: "var(--error)" }}>
                {euro(totals.expenses + totals.fixedCosts)}
              </td>
              <td
                className="py-2.5 px-3 text-right"
                style={{ color: totals.net >= 0 ? "var(--success)" : "var(--error)" }}
              >
                {euro(totals.net, true)}
              </td>
              <td
                className="py-2.5 px-3 text-right"
                style={{ color: totals.split >= 0 ? "var(--accent)" : "var(--error)" }}
              >
                {euro(totals.split, true)}
              </td>
              <td
                className="py-2.5 px-3 text-right"
                style={{ color: totals.split >= 0 ? "var(--accent)" : "var(--error)" }}
              >
                {euro(totals.split, true)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
