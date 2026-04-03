"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SubscriptionIncome, SubscriptionIncomeBreakdown, SubscriptionBreakdownEntry } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";

const TIER_VALUE: Record<string, number> = { Diamond: 5, Gold: 4, "ECL Grinder": 3, Silver: 2, Bronze: 1 };

interface SubscriptionIncomeCardProps {
  income: SubscriptionIncome | null;
  isLoading: boolean;
  month: string;
}

type SourceKey = "patreon" | "kofi" | "manual";

export default function SubscriptionIncomeCard({
  income,
  isLoading,
  month,
}: SubscriptionIncomeCardProps) {
  const [expanded, setExpanded] = useState<SourceKey | null>(null);
  const [breakdown, setBreakdown] = useState<SubscriptionIncomeBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownMonth, setBreakdownMonth] = useState<string | null>(null);
  const [activeTierFilter, setActiveTierFilter] = useState<string | null>(null);

  // Re-fetch breakdown when month changes — keep stale data visible to avoid jitter
  useEffect(() => {
    if (breakdownMonth && breakdownMonth !== month && expanded) {
      setActiveTierFilter(null);
      setBreakdownLoading(true);
      fetch(`/api/finance/subscription-income/breakdown?month=${month}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setBreakdown(json.data);
            setBreakdownMonth(month);
          }
        })
        .catch(() => {})
        .finally(() => setBreakdownLoading(false));
    }
  }, [month, breakdownMonth, expanded]);

  async function toggleSource(key: SourceKey) {
    if (expanded === key) {
      setExpanded(null);
      setActiveTierFilter(null);
      return;
    }

    setExpanded(key);
    setActiveTierFilter(null);

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
        className="rounded-xl p-6 h-full"
        style={{
          background: "var(--surface-gradient)",
          backdropFilter: "var(--surface-blur)",
          border: "1.5px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "var(--surface-shadow)",
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
  ].filter((src) => src.count > 0) as { key: SourceKey; label: string; count: number; amount: number; color: string }[];

  // Collect unique tiers from the current Patreon breakdown
  const patreonEntries = breakdown?.patreon ?? [];
  const uniqueTiers = [...new Set(patreonEntries.map((e) => e.tier).filter(Boolean))]
    .toSorted((a, b) => (TIER_VALUE[b as string] ?? 0) - (TIER_VALUE[a as string] ?? 0)) as string[];

  function renderEntry(entry: SubscriptionBreakdownEntry, key: string, muted: boolean) {
    const inner = (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate" style={{ color: "var(--text-secondary)" }}>
            <Sensitive>{entry.name}</Sensitive>
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
          {!entry.topdeck_uid && (
            <span
              className="shrink-0 rounded px-1 py-px leading-none italic"
              style={{
                fontSize: "10px",
                background: "rgba(239,68,68,0.10)",
                color: "var(--danger, #ef4444)",
              }}
            >
              never joined
            </span>
          )}
        </div>
        <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
          <Sensitive placeholder="€•••••">&euro;{entry.amount.toFixed(2)}</Sensitive>
        </span>
      </div>
    );

    const href = entry.topdeck_uid
      ? `/league/${entry.topdeck_uid}`
      : entry.discord_id
        ? `/subscribers`
        : null;

    if (href) {
      return (
        <Link
          key={key}
          href={href}
          className="block rounded px-1 -mx-1 transition-colors"
          onMouseEnter={(e) => { e.currentTarget.style.background = muted ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {inner}
        </Link>
      );
    }

    return <div key={key}>{inner}</div>;
  }

  function renderBreakdownEntries(entries: SubscriptionBreakdownEntry[], color: string, sourceKey: SourceKey) {
    // Sort by amount descending, then name
    const sorted = [...entries].sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.name.localeCompare(b.name);
    });

    // If tier filter is active, split into matched (top) and rest (muted)
    const hasTierFilter = activeTierFilter && sourceKey === "patreon";
    let matched: typeof sorted;
    let rest: typeof sorted;
    if (hasTierFilter) {
      matched = [];
      rest = [];
      for (const e of sorted) {
        (e.tier === activeTierFilter ? matched : rest).push(e);
      }
    } else {
      matched = sorted;
      rest = [];
    }

    return (
      <div className="mt-2 ml-4" style={{ borderLeft: `2px solid ${color}`, paddingLeft: "12px" }}>
        {/* Tier filter pills — only for Patreon */}
        {sourceKey === "patreon" && uniqueTiers.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {uniqueTiers.map((tier) => {
              const isActive = activeTierFilter === tier;
              const count = entries.filter((e) => e.tier === tier).length;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setActiveTierFilter(isActive ? null : tier)}
                  className="rounded px-1.5 py-0.5 transition-colors"
                  style={{
                    fontSize: "10px",
                    lineHeight: "1.4",
                    background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                    border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                  }}
                >
                  {tier} ({count})
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-0.5 text-sm">
          {matched.map((entry, i) => renderEntry(entry, `m-${i}`, false))}
        </div>

        {rest.length > 0 && (
          <div className="space-y-0.5 text-sm mt-1" style={{ opacity: 0.4 }}>
            {rest.map((entry, i) => renderEntry(entry, `r-${i}`, true))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Subscription Income
        </h3>
      </div>

      <div className="mb-4">
        <span
          className="text-3xl font-bold"
          style={{ color: "var(--success)" }}
        >
          <Sensitive placeholder="€•••••">&euro;{income.total.toFixed(2)}</Sensitive>
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
                    (<Sensitive>{src.count}</Sensitive>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--text-primary)" }}>
                    <Sensitive placeholder="€•••••">&euro;{src.amount.toFixed(2)}</Sensitive>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
              </button>

              {isExpanded && (
                // Show stale data with opacity while loading new month, spinner only on first load
                entries.length > 0 ? (
                  <div style={{ opacity: breakdownLoading ? 0.45 : 1, transition: "opacity 150ms" }}>
                    {renderBreakdownEntries(entries, src.color, src.key)}
                  </div>
                ) : breakdownLoading ? (
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
