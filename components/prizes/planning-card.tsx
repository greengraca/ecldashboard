"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, Check, Circle } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { PlanningStatus } from "@/lib/types";

interface PlanningCardProps {
  month: string;
  onNavigate: (tab: string, section?: string, targetMonth?: string) => void;
}

const PLANNING_ITEMS: {
  key: keyof PlanningStatus["planning"];
  label: string;
  tab: string;
  section?: string;
}[] = [
  { key: "budget_set", label: "Budget", tab: "prizes", section: "budget" },
  { key: "pod_config_active", label: "Pod Config", tab: "pods", section: "config" },
  { key: "card_singles_added", label: "Card Singles", tab: "prizes", section: "mtg_single" },
  { key: "placement_prizes_set", label: "Placement Prizes", tab: "prizes", section: "placement" },
  { key: "sleeve_files_uploaded", label: "Sleeve Files", tab: "dragon_shield", section: "files" },
  { key: "playmat_files_uploaded", label: "Playmat Files", tab: "dragon_shield", section: "files" },
];

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function PlanningCard({ month, onNavigate }: PlanningCardProps) {
  const { data } = useSWR<{ data: PlanningStatus }>(
    `/api/prizes/planning-status?month=${month}`,
    fetcher
  );
  const status = data?.data;

  const doneCount = status
    ? Object.values(status.planning).filter(Boolean).length
    : 0;
  const total = PLANNING_ITEMS.length;
  const allDone = doneCount === total;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (allDone) setCollapsed(true);
  }, [allDone]);

  if (!status) return null;

  const planningMonthLabel = formatMonth(status.planning_month);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-between rounded-lg px-4 py-3 mb-4 transition-colors cursor-pointer"
        style={{
          background: allDone ? "rgba(34,197,94,0.08)" : "rgba(168,85,247,0.08)",
          border: `1px solid ${allDone ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.15)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {allDone ? (
            <Check className="w-4 h-4" style={{ color: "var(--success, #22c55e)" }} />
          ) : (
            <span style={{ color: "var(--accent)" }}>🎯</span>
          )}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {planningMonthLabel} — {allDone ? "All set" : `${doneCount}/${total} ready`}
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
        background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.08))",
        border: "1px solid rgba(168,85,247,0.25)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            🎯 Plan {planningMonthLabel}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {doneCount} of {total} steps complete
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ width: 60, background: "rgba(255,255,255,0.1)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(doneCount / total) * 100}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              {Math.round((doneCount / total) * 100)}%
            </span>
          </div>
          <button onClick={() => setCollapsed(true)} className="p-1">
            <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PLANNING_ITEMS.map((item) => {
          const done = status.planning[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.tab, item.section, status.planning_month)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
              style={{
                background: done ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${done ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
              }}
            >
              {done ? (
                <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />
              ) : (
                <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: "#f59e0b" }} />
              )}
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
