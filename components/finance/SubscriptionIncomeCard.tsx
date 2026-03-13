"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SubscriptionIncome, SubscriptionIncomeBreakdown, SubscriptionBreakdownEntry } from "@/lib/types";

interface SubscriptionIncomeCardProps {
  income: SubscriptionIncome | null;
  isLoading: boolean;
  month: string;
  onSyncPatreon?: () => void;
  isSyncing?: boolean;
}

type SourceKey = "patreon" | "kofi" | "manual";

export default function SubscriptionIncomeCard({
  income,
  isLoading,
  month,
  onSyncPatreon,
  isSyncing,
}: SubscriptionIncomeCardProps) {
  const [expanded, setExpanded] = useState<SourceKey | null>(null);
  const [breakdown, setBreakdown] = useState<SubscriptionIncomeBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownMonth, setBreakdownMonth] = useState<string | null>(null);
  const [activeTierFilter, setActiveTierFilter] = useState<string | null>(null);

  async function toggleSource(key: SourceKey) {
    if (expanded === key) {
      setExpanded(null);
      return;
    }

    setExpanded(key);

    // Fetch breakdown if not cached for this month
    if (!breakdown || breakdownMonth !== month) {
      setBreakdownLoading(true);
      try {
        const res = await fetch(`/api/finance/subscription-income/breakdown?month=${month}`);
        const json = await res.json();
        if (json.data) {
          setBreakdown(json.data);
          setBreakdownMonth(month);
        }
      } catch {
        // silently fail — the section just won't show entries
      } finally {
        setBreakdownLoading(false);
      }
    }
  }

  if (isLoading) {
    return (
      <div
        className="rounded-xl border p-6 h-full"
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

  const sources: { key: SourceKey; label: string; count: number; amount: number; color: string }[] = [
    {
      key: "patreon",
      label: "Patreon",
      count: income.patreon.count,
      amount: income.patreon.amount,
      color: "var(--warning)",
    },
    {
      key: "kofi",
      label: "Ko-fi",
      count: income.kofi.count,
      amount: income.kofi.amount,
      color: "var(--accent)",
    },
    {
      key: "manual",
      label: "Manual",
      count: income.manual.count,
      amount: income.manual.amount,
      color: "var(--success)",
    },
  ];

  const TIER_ORDER: Record<string, number> = {
    "Diamond": 0,
    "Gold": 1,
    "ECL Grinder": 2,
    "Silver": 3,
    "Bronze": 4,
  };

  function sortEntries(entries: SubscriptionBreakdownEntry[]) {
    return [...entries].sort((a, b) => {
      // Sort by tier rank first (higher tiers on top), then by amount desc, then name
      const tierA = a.tier ? (TIER_ORDER[a.tier] ?? 99) : 99;
      const tierB = b.tier ? (TIER_ORDER[b.tier] ?? 99) : 99;
      if (tierA !== tierB) return tierA - tierB;
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.name.localeCompare(b.name);
    });
  }

  function renderBreakdownEntries(entries: SubscriptionBreakdownEntry[], color: string) {
    const sorted = sortEntries(entries);
    return (
      <div
        className="mt-2 ml-4 space-y-1 text-sm"
        style={{ borderLeft: `2px solid ${color}`, paddingLeft: "12px" }}
      >
        {sorted.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {entry.name}
              </span>
              {entry.tier && (
                <span
                  className="shrink-0 rounded px-1 py-px leading-none"
                  style={{
                    fontSize: "10px",
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--text-muted)",
                  }}
                >
                  {entry.tier}
                </span>
              )}
            </div>
            <span
              className="shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              &euro;{entry.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-6 h-full"
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

      <div className="space-y-1">
        {sources.map((src) => {
          const isExpanded = expanded === src.key;
          const entries = breakdown?.[src.key] ?? [];

          return (
            <div key={src.key}>
              <button
                type="button"
                onClick={() => toggleSource(src.key)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:brightness-110"
                style={{
                  background: isExpanded ? "rgba(255,255,255,0.04)" : "transparent",
                }}
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
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--text-primary)" }}>
                    &euro;{src.amount.toFixed(2)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
              </button>

              {isExpanded && (
                breakdownLoading ? (
                  <div className="flex items-center gap-2 mt-2 ml-6">
                    <div
                      className="w-4 h-4 animate-spin rounded-full border-2"
                      style={{
                        borderColor: "var(--border)",
                        borderTopColor: src.color,
                      }}
                    />
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Loading...
                    </span>
                  </div>
                ) : entries.length > 0 ? (
                  renderBreakdownEntries(entries, src.color)
                ) : (
                  <p className="mt-2 ml-6 text-sm" style={{ color: "var(--text-muted)" }}>
                    No entries found
                  </p>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
