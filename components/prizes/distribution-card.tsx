"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, Check, Package } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { PlanningStatus } from "@/lib/types";

interface DistributionCardProps {
  month: string;
  onNavigate: (tab: string, section?: string) => void;
  onOpenRaffle: () => void;
}

const DISTRIBUTION_ITEMS: {
  key: keyof PlanningStatus["distribution"];
  label: string;
  action: "navigate" | "raffle";
  tab?: string;
  section?: string;
}[] = [
  { key: "codes_loaded", label: "Codes loaded", action: "navigate", tab: "dragon_shield", section: "codes" },
  { key: "codes_sent", label: "Codes sent", action: "navigate", tab: "dragon_shield", section: "codes" },
  { key: "addresses_collected", label: "Addresses", action: "navigate", tab: "dragon_shield", section: "addresses" },
  { key: "raffle_done", label: "Most Games raffle", action: "raffle" },
  { key: "playmats_handed_off", label: "Playmats → DS", action: "navigate", tab: "dragon_shield", section: "addresses" },
];

export default function DistributionCard({ month, onNavigate, onOpenRaffle }: DistributionCardProps) {
  const { data } = useSWR<{ data: PlanningStatus }>(
    `/api/prizes/planning-status?month=${month}`,
    fetcher
  );
  const status = data?.data;

  const doneCount = status
    ? Object.values(status.distribution).filter(Boolean).length
    : 0;
  const total = DISTRIBUTION_ITEMS.length;
  const allDone = doneCount === total;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (allDone) setCollapsed(true);
  }, [allDone]);

  if (!status) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-between rounded-lg px-4 py-3 mb-4 transition-colors cursor-pointer hover:brightness-110"
        style={{
          background: allDone ? "var(--success-light)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${allDone ? "var(--success)" : "var(--border)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {allDone ? (
            <Check className="w-4 h-4" style={{ color: "var(--success)" }} />
          ) : (
            <Package className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          )}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Distribution — {allDone ? "Complete" : `${doneCount}/${total} done`}
          </span>
        </div>
        <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
      </button>
    );
  }

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "var(--surface-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Distribution — {doneCount} of {total} done
          </span>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-1">
          <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {DISTRIBUTION_ITEMS.map((item) => {
          const done = status.distribution[item.key];
          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.action === "raffle") {
                  onOpenRaffle();
                } else {
                  onNavigate(item.tab!, item.section);
                }
              }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:brightness-125"
              style={{
                background: done ? "var(--success-light)" : "var(--warning-light)",
                color: done ? "var(--success)" : "var(--warning)",
              }}
            >
              {done ? "✓" : "○"} {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
