"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Plus, Trophy, Package, Euro, Gift } from "lucide-react";
import MonthPicker from "@/components/dashboard/month-picker";
import StatCard from "@/components/dashboard/stat-card";
import PrizeTable from "@/components/prizes/prize-table";
import PrizeForm from "@/components/prizes/prize-form";
import type { PrizeFormData } from "@/components/prizes/prize-form";
import PrizeDetailModal from "@/components/prizes/prize-detail-modal";
import BudgetConfigurator from "@/components/prizes/budget-configurator";
import ShippingTracker from "@/components/prizes/shipping-tracker";
import AutoPopulateButton from "@/components/prizes/auto-populate-button";
import TreasurePodSection from "@/components/prizes/treasure-pod-section";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import type { Prize, PrizeBudget, PrizeBudgetAllocations, PrizeSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "awarded" | "planning" | "shipping";

export default function PrizesPage() {
  const currentMonth = getCurrentMonth();
  const [month, setMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    month < currentMonth ? "awarded" : "planning"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | undefined>(undefined);
  const [detailPrize, setDetailPrize] = useState<Prize | null>(null);
  const [deletePrize, setDeletePrize] = useState<Prize | null>(null);

  const {
    data: prizesData,
    isLoading: prizesLoading,
    mutate: mutatePrizes,
  } = useSWR<{ data: Prize[] }>(`/api/prizes?month=${month}`, fetcher);

  const {
    data: summaryData,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR<{ data: PrizeSummary }>(`/api/prizes/summary?month=${month}`, fetcher);

  const {
    data: budgetData,
    mutate: mutateBudget,
  } = useSWR<{ data: PrizeBudget | null }>(`/api/prizes/budget?month=${month}`, fetcher);

  const prizes = prizesData?.data || [];
  const summary = summaryData?.data || null;
  const budget = budgetData?.data || null;

  const refreshAll = useCallback(() => {
    mutatePrizes();
    mutateSummary();
    mutateBudget();
  }, [mutatePrizes, mutateSummary, mutateBudget]);

  function handleMonthChange(m: string) {
    setMonth(m);
    setActiveTab(m < currentMonth ? "awarded" : "planning");
  }

  async function handleSubmitPrize(data: PrizeFormData) {
    if (editingPrize) {
      await fetch(`/api/prizes/${editingPrize._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setFormOpen(false);
    setEditingPrize(undefined);
    refreshAll();
  }

  function handleDeletePrize(prize: Prize) {
    setDeletePrize(prize);
  }

  async function confirmDeletePrize() {
    if (!deletePrize) return;
    await fetch(`/api/prizes/${deletePrize._id}`, { method: "DELETE" });
    setDeletePrize(null);
    refreshAll();
  }

  function handleEditPrize(prize: Prize) {
    setEditingPrize(prize);
    setFormOpen(true);
  }

  async function handleSaveBudget(data: {
    month: string;
    total_budget: number;
    allocations: PrizeBudgetAllocations;
    notes: string;
  }) {
    await fetch("/api/prizes/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refreshAll();
  }

  async function handleUpdateShipping(
    id: string,
    data: {
      shipping_status: string;
      tracking_number?: string | null;
      shipping_date?: string | null;
      delivery_date?: string | null;
      shipping_notes?: string | null;
    }
  ) {
    await fetch(`/api/prizes/${id}/shipping`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refreshAll();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "awarded", label: "Awarded" },
    { key: "planning", label: "Planning" },
    { key: "shipping", label: "Shipping" },
  ];

  const isLoading = prizesLoading || summaryLoading;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Prizes
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Track prizes, shipping, and budget
          </p>
        </div>
        <MonthPicker value={month} onChange={handleMonthChange} minMonth="2025-11" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Prizes"
          value={isLoading ? "..." : summary?.total_prizes ?? 0}
          icon={<Trophy className="w-4 h-4" style={{ color: "var(--accent)" }} />}
        />
        <StatCard
          title="Total Value"
          value={isLoading ? "..." : `€${(summary?.total_value ?? 0).toFixed(2)}`}
          icon={<Euro className="w-4 h-4" style={{ color: "var(--accent)" }} />}
        />
        <StatCard
          title="Pending Shipment"
          value={isLoading ? "..." : summary?.pending_shipment ?? 0}
          icon={<Package className="w-4 h-4" style={{ color: "var(--accent)" }} />}
        />
        <StatCard
          title="Budget Remaining"
          value={
            isLoading
              ? "..."
              : summary?.budget_remaining != null
                ? `€${summary.budget_remaining.toFixed(2)}`
                : "No budget"
          }
          icon={<Gift className="w-4 h-4" style={{ color: "var(--accent)" }} />}
        />
      </div>

      {/* Treasure Pods */}
      <TreasurePodSection month={month} />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "awarded" && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-4">
            <AutoPopulateButton month={month} onComplete={refreshAll} />
            <button
              onClick={() => {
                setEditingPrize(undefined);
                setFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: "var(--accent-light)",
                color: "var(--accent)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Prize
            </button>
          </div>
          {isLoading ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
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
              onRowClick={(p) => setDetailPrize(p as Prize)}
            />
          )}
        </div>
      )}

      {activeTab === "planning" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetConfigurator
            budget={budget}
            totalSpent={summary?.total_value ?? 0}
            month={month}
            onSave={handleSaveBudget}
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
                onClick={() => {
                  setEditingPrize(undefined);
                  setFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <PrizeTable
              prizes={prizes.filter((p) => p.status === "planned")}
              onRowClick={(p) => setDetailPrize(p as Prize)}
            />
          </div>
        </div>
      )}

      {activeTab === "shipping" && (
        <ShippingTracker
          prizes={prizes}
          onUpdateShipping={handleUpdateShipping}
        />
      )}

      {/* Prize form modal */}
      <PrizeForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPrize(undefined);
        }}
        onSubmit={handleSubmitPrize}
        prize={editingPrize}
        defaultMonth={month}
      />

      {/* Prize detail modal */}
      <PrizeDetailModal
        prize={detailPrize}
        open={!!detailPrize}
        onClose={() => setDetailPrize(null)}
        onEdit={handleEditPrize}
        onDelete={handleDeletePrize}
      />

      {/* Delete Prize Confirm */}
      <ConfirmModal
        open={!!deletePrize}
        onClose={() => setDeletePrize(null)}
        onConfirm={confirmDeletePrize}
        title="Delete Prize"
        message={deletePrize ? `Delete "${deletePrize.name}" (€${deletePrize.value.toFixed(2)})?` : ""}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
