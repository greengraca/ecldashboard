"use client";

import { useState, useEffect } from "react";
import type { PrizeBudget, PrizeBudgetAllocations } from "@/lib/types";

const DEFAULT_ALLOCATIONS: PrizeBudgetAllocations = {
  placement_1st: 0,
  placement_2nd: 0,
  placement_3rd: 0,
  placement_4th: 0,
  most_games: 0,
  treasure_pods: 0,
  top16: 0,
  ring: 0,
  other: 0,
};

const ALLOCATION_LABELS: Record<keyof PrizeBudgetAllocations, string> = {
  placement_1st: "1st Place",
  placement_2nd: "2nd Place",
  placement_3rd: "3rd Place",
  placement_4th: "4th Place",
  most_games: "Most Games",
  treasure_pods: "Treasure Pods",
  top16: "Top 16",
  ring: "Monthly Ring",
  other: "Other",
};

interface BudgetConfiguratorProps {
  budget: PrizeBudget | null;
  totalSpent: number;
  month: string;
  onSave: (data: {
    month: string;
    total_budget: number;
    allocations: PrizeBudgetAllocations;
    notes: string;
  }) => Promise<void>;
}

export default function BudgetConfigurator({
  budget,
  totalSpent,
  month,
  onSave,
}: BudgetConfiguratorProps) {
  const [totalBudget, setTotalBudget] = useState("");
  const [allocations, setAllocations] = useState<PrizeBudgetAllocations>(DEFAULT_ALLOCATIONS);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (budget) {
      setTotalBudget(budget.total_budget.toString());
      setAllocations({ ...DEFAULT_ALLOCATIONS, ...budget.allocations });
      setNotes(budget.notes);
    } else {
      setTotalBudget("");
      setAllocations(DEFAULT_ALLOCATIONS);
      setNotes("");
    }
  }, [budget]);

  const allocatedTotal = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  const budgetNum = Number(totalBudget) || 0;
  const remaining = budgetNum - totalSpent;
  const unallocated = budgetNum - allocatedTotal;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        month,
        total_budget: budgetNum,
        allocations,
        notes,
      });
    } finally {
      setSaving(false);
    }
  }

  function updateAllocation(key: keyof PrizeBudgetAllocations, val: string) {
    setAllocations((prev) => ({ ...prev, [key]: Number(val) || 0 }));
  }

  const progressPct = budgetNum > 0 ? Math.min((totalSpent / budgetNum) * 100, 100) : 0;
  const isOverBudget = totalSpent > budgetNum && budgetNum > 0;

  const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--bg-page)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
        Budget
      </h3>

      {/* Total budget input */}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          Total Budget (EUR)
        </label>
        <input
          type="number"
          value={totalBudget}
          onChange={(e) => setTotalBudget(e.target.value)}
          min="0"
          step="0.01"
          className={inputClass}
          style={inputStyle}
          placeholder="0.00"
        />
      </div>

      {/* Progress bar */}
      {budgetNum > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--text-muted)" }}>
              Spent: €{totalSpent.toFixed(2)}
            </span>
            <span style={{ color: isOverBudget ? "var(--error)" : "var(--text-muted)" }}>
              {isOverBudget ? "Over budget!" : `€${remaining.toFixed(2)} remaining`}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--bg-page)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: isOverBudget
                  ? "var(--error)"
                  : progressPct > 80
                    ? "#f59e0b"
                    : "var(--accent)",
              }}
            />
          </div>
        </div>
      )}

      {/* Allocations */}
      <div className="mb-4">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
          Allocations
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(ALLOCATION_LABELS) as Array<keyof PrizeBudgetAllocations>).map((key) => (
            <div key={key}>
              <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                {ALLOCATION_LABELS[key]}
              </label>
              <input
                type="number"
                value={allocations[key] || ""}
                onChange={(e) => updateAllocation(key, e.target.value)}
                min="0"
                step="0.01"
                className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={inputStyle}
                placeholder="0"
              />
            </div>
          ))}
        </div>
        {budgetNum > 0 && (
          <p className="text-[10px] mt-2" style={{ color: unallocated < 0 ? "var(--error)" : "var(--text-muted)" }}>
            {unallocated >= 0 ? `€${unallocated.toFixed(2)} unallocated` : `€${Math.abs(unallocated).toFixed(2)} over-allocated`}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
          style={inputStyle}
          placeholder="Budget notes..."
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          background: "rgba(251, 191, 36, 0.15)",
          color: "var(--accent)",
          border: "1px solid rgba(251, 191, 36, 0.35)",
          backdropFilter: "blur(8px)",
        }}
      >
        {saving ? "Saving..." : "Save Budget"}
      </button>
    </div>
  );
}
