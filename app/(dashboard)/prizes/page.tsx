"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Trophy, Package, Euro, Gift, Settings, BarChart3, Image, Award } from "lucide-react";
import MonthPicker from "@/components/dashboard/month-picker";
import StatCard from "@/components/dashboard/stat-card";
import TreasurePodConfig from "@/components/prizes/treasure-pod-config";
import TreasurePodMonitor from "@/components/prizes/treasure-pod-monitor";
import CardGallery from "@/components/prizes/card-gallery";
import CardSingleForm from "@/components/prizes/card-single-form";
import AwardsShippingTab from "@/components/prizes/awards-shipping-tab";
import PrizeForm from "@/components/prizes/prize-form";
import type { PrizeFormData } from "@/components/prizes/prize-form";
import PrizeDetailModal from "@/components/prizes/prize-detail-modal";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import type { Prize, PrizeBudget, PrizeBudgetAllocations, PrizeSummary } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";

type Tab = "pods_config" | "pods_monitor" | "card_gallery" | "awards_shipping";

const TAB_CONFIG: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: "pods_config", label: "Pods Config", icon: Settings },
  { key: "pods_monitor", label: "Pods Monitor", icon: BarChart3 },
  { key: "card_gallery", label: "Card Singles", icon: Image },
  { key: "awards_shipping", label: "Awards & Shipping", icon: Award },
];

export default function PrizesPage() {
  const currentMonth = getCurrentMonth();
  const [month, setMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<Tab>("pods_monitor");
  const [formOpen, setFormOpen] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
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
    setCardFormOpen(false);
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
    if (prize.category === "mtg_single") {
      setEditingPrize(prize);
      setCardFormOpen(true);
    } else {
      setEditingPrize(prize);
      setFormOpen(true);
    }
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
            Treasure pods, card singles, awards, and shipping
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

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 mb-6 border-b overflow-x-auto"
        style={{ borderColor: "var(--border)" }}
      >
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap"
              style={{
                color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.key && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "pods_config" && (
        <TreasurePodConfig month={month} />
      )}

      {activeTab === "pods_monitor" && (
        <TreasurePodMonitor month={month} />
      )}

      {activeTab === "card_gallery" && (
        <CardGallery
          prizes={prizes}
          isLoading={isLoading}
          onAddCard={() => {
            setEditingPrize(undefined);
            setCardFormOpen(true);
          }}
          onCardClick={(prize) => setDetailPrize(prize)}
        />
      )}

      {activeTab === "awards_shipping" && (
        <AwardsShippingTab
          prizes={prizes}
          budget={budget}
          summary={summary}
          month={month}
          isLoading={isLoading}
          onRefreshAll={refreshAll}
          onOpenForm={() => {
            setEditingPrize(undefined);
            setFormOpen(true);
          }}
          onRowClick={(p) => setDetailPrize(p)}
          onSaveBudget={handleSaveBudget}
          onUpdateShipping={handleUpdateShipping}
        />
      )}

      {/* Card single form modal */}
      <CardSingleForm
        open={cardFormOpen}
        onClose={() => {
          setCardFormOpen(false);
          setEditingPrize(undefined);
        }}
        onSubmit={handleSubmitPrize}
        prize={editingPrize}
        defaultMonth={month}
      />

      {/* General prize form modal */}
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
