"use client";

import { TrendingUp, TrendingDown, Landmark, Wallet } from "lucide-react";
import type { MonthlySummary } from "@/lib/types";

interface BalanceCardProps {
  summary: MonthlySummary | null;
  isLoading: boolean;
}

export default function BalanceCard({ summary, isLoading }: BalanceCardProps) {
  const items = [
    {
      label: "Income",
      value: summary?.income ?? 0,
      icon: <TrendingUp className="w-4 h-4" />,
      color: "var(--success)",
      bgColor: "var(--success-light)",
      prefix: "+",
    },
    {
      label: "Expenses",
      value: summary?.expenses ?? 0,
      icon: <TrendingDown className="w-4 h-4" />,
      color: "var(--error)",
      bgColor: "var(--error-light)",
      prefix: "-",
    },
    {
      label: "Fixed Costs",
      value: summary?.fixed_costs ?? 0,
      icon: <Landmark className="w-4 h-4" />,
      color: "var(--warning)",
      bgColor: "var(--warning-light)",
      prefix: "-",
    },
  ];

  const net = summary?.net ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="p-3 sm:p-5 rounded-xl transition-colors"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <div className="flex items-start justify-between mb-1.5 sm:mb-3">
            <p
              className="text-[10px] sm:text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {item.label}
            </p>
            <div className="hidden sm:block p-2 rounded-lg" style={{ background: item.bgColor }}>
              <span style={{ color: item.color }}>{item.icon}</span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: item.color }}>
            {isLoading
              ? "--"
              : `${item.prefix}\u20AC${item.value.toFixed(2)}`}
          </p>
        </div>
      ))}

      {/* Net Balance */}
      <div
        className="p-3 sm:p-5 rounded-xl transition-colors"
        style={{
          background: "var(--surface-gradient)",
          backdropFilter: "var(--surface-blur)",
          border: `1.5px solid ${net >= 0 ? "var(--success)" : "var(--error)"}`,
          boxShadow: "var(--surface-shadow)",
        }}
      >
        <div className="flex items-start justify-between mb-1.5 sm:mb-3">
          <p
            className="text-[10px] sm:text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Net Balance
          </p>
          <div
            className="hidden sm:block p-2 rounded-lg"
            style={{
              background: net >= 0 ? "var(--success-light)" : "var(--error-light)",
            }}
          >
            <Wallet
              className="w-4 h-4"
              style={{
                color: net >= 0 ? "var(--success)" : "var(--error)",
              }}
            />
          </div>
        </div>
        <p
          className="text-xl sm:text-2xl font-bold"
          style={{
            color: net >= 0 ? "var(--success)" : "var(--error)",
          }}
        >
          {isLoading
            ? "--"
            : `${net >= 0 ? "+" : "-"}\u20AC${Math.abs(net).toFixed(2)}`}
        </p>
      </div>
    </div>
  );
}
