"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Loader2, Save } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import MonthPicker from "@/components/dashboard/month-picker";
import PlannerSlotPanel from "./planner-slot-panel";
import { fetcher } from "@/lib/fetcher";
import { getNextMonth, getCurrentMonth } from "@/lib/utils";
import type { PlannerCard } from "@/lib/scryfall-server";

interface PlannerSlot {
  key: string;
  label: string;
  default_amount: number;
  saved_amount: number | null;
  min_eur: number;
  max_eur: number;
  suggestions: PlannerCard[];
  total_results: number;
}

interface PlannerData {
  month: string;
  prev_month: string;
  subscription_income: number;
  prize_budget: number;
  saved_allocations: Record<string, number> | null;
  slots: PlannerSlot[];
}

interface PlannerResponse {
  data: PlannerData;
}

interface PrizePlannerModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PrizePlannerModal({ open, onClose }: PrizePlannerModalProps) {
  const [month, setMonth] = useState(getNextMonth);
  const [slotAmounts, setSlotAmounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useSWR<PlannerResponse>(
    open ? `/api/prizes/planner?month=${month}` : null,
    fetcher,
    {
      onSuccess: (res) => {
        // Initialize slot amounts from API data
        const amounts: Record<string, number> = {};
        for (const slot of res.data.slots) {
          amounts[slot.key] = slot.saved_amount ?? slot.default_amount;
        }
        setSlotAmounts(amounts);
        setSaved(false);
      },
      revalidateOnFocus: false,
    }
  );

  const plannerData = data?.data;
  const totalAllocated = Object.values(slotAmounts).reduce((s, v) => s + v, 0);
  const budget = plannerData?.prize_budget ?? 0;
  const overBudget = totalAllocated > budget && budget > 0;
  const pct = budget > 0 ? Math.min((totalAllocated / budget) * 100, 100) : 0;

  const handleAmountChange = useCallback((key: string, amount: number) => {
    setSlotAmounts((prev) => ({ ...prev, [key]: amount }));
    setSaved(false);
  }, []);

  const handleRefresh = useCallback(async (minEur: number, maxEur: number): Promise<PlannerCard[]> => {
    try {
      const res = await fetch(
        `/api/prizes/planner/refresh?min_eur=${minEur}&max_eur=${maxEur}&page=1`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.suggestions || [];
    } catch {
      return [];
    }
  }, []);

  async function handleSave() {
    if (!plannerData) return;
    setSaving(true);
    try {
      const res = await fetch("/api/prizes/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          total_budget: budget,
          allocations: {
            placement_1st: slotAmounts.placement_1st || 0,
            placement_2nd: slotAmounts.placement_2nd || 0,
            placement_3rd: slotAmounts.placement_3rd || 0,
            placement_4th: slotAmounts.placement_4th || 0,
            most_games: slotAmounts.most_games || 0,
            treasure_pods: 0,
            top16: 0,
            ring: 0,
            other: 0,
          },
          notes: "",
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Prize Planner"
      maxWidth="max-w-5xl"
    >
      {/* Month picker + budget summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <MonthPicker
          value={month}
          onChange={(m: string) => setMonth(m)}
          minMonth="2026-01"
          maxMonth={getNextMonth()}
        />
        {plannerData && (
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span>
              Prev month income:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {"\u20AC"}{plannerData.subscription_income.toFixed(2)}
              </strong>
            </span>
            <span style={{ color: "var(--border)" }}>{"\u2192"}</span>
            <span>
              Prize budget (50%):{" "}
              <strong style={{ color: "var(--accent)" }}>
                {"\u20AC"}{plannerData.prize_budget.toFixed(2)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      )}

      {/* Slots */}
      {plannerData && !isLoading && (
        <div className="space-y-4 mb-5">
          {plannerData.slots.map((slot) => {
            const amt = slotAmounts[slot.key] ?? slot.default_amount;
            const minEur = Math.max(1, Math.round(amt * 0.85 * 100) / 100);
            const maxEur = Math.round(amt * 1.15 * 100) / 100;
            return (
              <PlannerSlotPanel
                key={slot.key}
                slotKey={slot.key}
                label={slot.label}
                amount={amt}
                onAmountChange={(v) => handleAmountChange(slot.key, v)}
                suggestions={slot.suggestions}
                totalResults={slot.total_results}
                onRefresh={() => handleRefresh(minEur, maxEur)}
              />
            );
          })}
        </div>
      )}

      {/* Footer: budget bar + save */}
      {plannerData && !isLoading && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "var(--surface-border)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Allocated: {"\u20AC"}{totalAllocated.toFixed(2)} / {"\u20AC"}{budget.toFixed(2)}
            </span>
            {overBudget && (
              <span className="text-xs font-medium" style={{ color: "var(--error)" }}>
                Over budget by {"\u20AC"}{(totalAllocated - budget).toFixed(2)}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-2 rounded-full overflow-hidden mb-3"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: overBudget
                  ? "var(--error)"
                  : pct > 80
                  ? "#f59e0b"
                  : "var(--success)",
              }}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: saved
                  ? "rgba(52,211,153,0.15)"
                  : "rgba(251,191,36,0.15)",
                color: saved ? "var(--success)" : "var(--accent)",
                border: saved
                  ? "1px solid rgba(52,211,153,0.35)"
                  : "1px solid rgba(251,191,36,0.35)",
              }}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saved ? "Saved" : "Save Budget"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
