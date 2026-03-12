"use client";

import type { SubscriptionIncome } from "@/lib/types";

interface SubscriptionIncomeCardProps {
  income: SubscriptionIncome | null;
  isLoading: boolean;
  onSyncPatreon?: () => void;
  isSyncing?: boolean;
}

export default function SubscriptionIncomeCard({
  income,
  isLoading,
  onSyncPatreon,
  isSyncing,
}: SubscriptionIncomeCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-center py-8">
          <div
            className="w-6 h-6 animate-spin rounded-full border-2"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
        </div>
      </div>
    );
  }

  if (!income) return null;

  const sources = [
    {
      label: "Patreon",
      count: income.patreon.count,
      amount: income.patreon.amount,
      color: "var(--warning)",
    },
    {
      label: "Ko-fi",
      count: income.kofi.count,
      amount: income.kofi.amount,
      color: "var(--accent)",
    },
    {
      label: "Manual",
      count: income.manual.count,
      amount: income.manual.amount,
      color: "var(--success)",
    },
  ];

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Subscription Income
        </h3>
        {onSyncPatreon && (
          <button
            onClick={onSyncPatreon}
            disabled={isSyncing}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
              opacity: isSyncing ? 0.6 : 1,
            }}
          >
            {isSyncing ? "Syncing..." : "Sync Patreon"}
          </button>
        )}
      </div>

      <div className="mb-4">
        <span
          className="text-3xl font-bold"
          style={{ color: "var(--success)" }}
        >
          &euro;{income.total.toFixed(2)}
        </span>
      </div>

      <div className="space-y-3">
        {sources.map((src) => (
          <div
            key={src.label}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: src.color }}
              />
              <span style={{ color: "var(--text-secondary)" }}>
                {src.label}
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                ({src.count})
              </span>
            </div>
            <span style={{ color: "var(--text-primary)" }}>
              &euro;{src.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
