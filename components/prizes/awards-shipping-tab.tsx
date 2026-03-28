"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import PrizeTable from "./prize-table";
import BudgetConfigurator from "./budget-configurator";
import ShippingTracker from "./shipping-tracker";
import AutoPopulateButton from "./auto-populate-button";
import type { Prize, PrizeBudget, PrizeBudgetAllocations, PrizeSummary } from "@/lib/types";

type SubTab = "awarded" | "planning" | "shipping";

interface AwardsShippingTabProps {
  prizes: Prize[];
  budget: PrizeBudget | null;
  summary: PrizeSummary | null;
  month: string;
  isLoading: boolean;
  onRefreshAll: () => void;
  onOpenForm: () => void;
  onRowClick: (prize: Prize) => void;
  onSaveBudget: (data: {
    month: string;
    total_budget: number;
    allocations: PrizeBudgetAllocations;
    notes: string;
  }) => Promise<void>;
  onUpdateShipping: (
    id: string,
    data: {
      shipping_status: string;
      tracking_number?: string | null;
      shipping_date?: string | null;
      delivery_date?: string | null;
      shipping_notes?: string | null;
    }
  ) => Promise<void>;
}

export default function AwardsShippingTab({
  prizes,
  budget,
  summary,
  month,
  isLoading,
  onRefreshAll,
  onOpenForm,
  onRowClick,
  onSaveBudget,
  onUpdateShipping,
}: AwardsShippingTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("awarded");

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "awarded", label: "Awarded" },
    { key: "planning", label: "Planning" },
    { key: "shipping", label: "Shipping" },
  ];

  return (
    <div>
      {/* Sub-tab bar */}
      <div
        className="flex items-center gap-1 mb-6 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className="px-4 py-2 text-xs font-medium transition-colors relative"
            style={{
              color: subTab === tab.key ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {tab.label}
            {subTab === tab.key && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Awarded sub-tab */}
      {subTab === "awarded" && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-4">
            <AutoPopulateButton month={month} onComplete={onRefreshAll} />
            <button
              onClick={onOpenForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--accent-light)", color: "var(--accent)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Prize
            </button>
          </div>
          {isLoading ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{
                background: "var(--surface-gradient)",
                backdropFilter: "var(--surface-blur)",
                border: "1.5px solid rgba(255, 255, 255, 0.10)",
                boxShadow: "var(--surface-shadow)",
              }}
            >
              <div
                className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
              />
              <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
                Loading prizes...
              </p>
            </div>
          ) : (
            <PrizeTable
              prizes={prizes}
              onRowClick={(p) => onRowClick(p as Prize)}
            />
          )}
        </div>
      )}

      {/* Planning sub-tab */}
      {subTab === "planning" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetConfigurator
            budget={budget}
            totalSpent={summary?.total_value ?? 0}
            month={month}
            onSave={onSaveBudget}
          />
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Planned Prizes
              </h3>
              <button
                onClick={onOpenForm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <PrizeTable
              prizes={prizes.filter((p) => p.status === "planned")}
              onRowClick={(p) => onRowClick(p as Prize)}
            />
          </div>
        </div>
      )}

      {/* Shipping sub-tab */}
      {subTab === "shipping" && (
        <ShippingTracker
          prizes={prizes}
          onUpdateShipping={onUpdateShipping}
        />
      )}
    </div>
  );
}
