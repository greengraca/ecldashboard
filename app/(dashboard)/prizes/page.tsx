"use client";

import { useState, useCallback, useTransition } from "react";
import useSWR from "swr";
import { Trophy, Shield, Gem } from "lucide-react";
import MonthPicker from "@/components/dashboard/month-picker";
import PlanningCard from "@/components/prizes/planning-card";
import DistributionCard from "@/components/prizes/distribution-card";
import TreasurePodsTab from "@/components/prizes/treasure-pods-tab";
import PrizesTab from "@/components/prizes/prizes-tab";
import DragonShieldTab from "@/components/prizes/dragon-shield-tab";
import PrizeForm from "@/components/prizes/prize-form";
import type { PrizeFormData } from "@/components/prizes/prize-form";
import CardSingleForm from "@/components/prizes/card-single-form";
import PrizeDetailModal from "@/components/prizes/prize-detail-modal";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import RaffleModal from "@/components/prizes/raffle-modal";
import type { Prize, PrizeBudget, PrizeBudgetAllocations } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";

type Tab = "pods" | "prizes" | "dragon_shield";

const TAB_CONFIG: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: "pods", label: "Treasure Pods", icon: Gem },
  { key: "prizes", label: "Prizes", icon: Trophy },
  { key: "dragon_shield", label: "Dragon Shield", icon: Shield },
];

export default function PrizesPage() {
  const currentMonth = getCurrentMonth();
  const [month, setMonth] = useState(currentMonth);
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("pods");
  const [tabSection, setTabSection] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | undefined>(undefined);
  const [detailPrize, setDetailPrize] = useState<Prize | null>(null);
  const [deletePrize, setDeletePrize] = useState<Prize | null>(null);
  const [raffleOpen, setRaffleOpen] = useState(false);

  const isCurrentMonth = month === currentMonth;

  const {
    data: prizesData,
    isLoading: prizesLoading,
    mutate: mutatePrizes,
  } = useSWR<{ data: Prize[] }>(`/api/prizes?month=${month}`, fetcher);

  const {
    data: budgetData,
    mutate: mutateBudget,
  } = useSWR<{ data: PrizeBudget | null }>(`/api/prizes/budget?month=${month}`, fetcher);

  const prizes = prizesData?.data || [];
  const budget = budgetData?.data || null;

  const refreshAll = useCallback(() => {
    mutatePrizes();
    mutateBudget();
  }, [mutatePrizes, mutateBudget]);

  function handleMonthChange(m: string) {
    startTransition(() => setMonth(m));
  }

  function handleNavigate(tab: string, section?: string) {
    if (tab === "pods") {
      setActiveTab("pods");
      setTabSection(section);
    } else if (tab === "prizes") {
      setActiveTab("prizes");
      setTabSection(section);
    } else if (tab === "dragon_shield") {
      setActiveTab("dragon_shield");
      setTabSection(section);
    }
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Prizes
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Treasure pods, prizes, and Dragon Shield
          </p>
        </div>
        <MonthPicker value={month} onChange={handleMonthChange} minMonth="2025-11" />
      </div>

      {/* Planning + Distribution cards (current month only) */}
      {isCurrentMonth && (
        <>
          <PlanningCard month={month} onNavigate={handleNavigate} />
          <DistributionCard
            month={month}
            onNavigate={handleNavigate}
            onOpenRaffle={() => setRaffleOpen(true)}
          />
        </>
      )}

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
              onClick={() => { setActiveTab(tab.key); setTabSection(undefined); }}
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
      {activeTab === "pods" && (
        <TreasurePodsTab month={month} showConfig={tabSection === "config"} />
      )}

      {activeTab === "prizes" && (
        <PrizesTab
          prizes={prizes}
          budget={budget}
          month={month}
          isLoading={prizesLoading}
          onRefreshAll={refreshAll}
          onAddCard={() => { setEditingPrize(undefined); setCardFormOpen(true); }}
          onAddPrize={() => { setEditingPrize(undefined); setFormOpen(true); }}
          onPrizeClick={(p) => setDetailPrize(p)}
          onSaveBudget={handleSaveBudget}
          initialFilter={tabSection}
        />
      )}

      {activeTab === "dragon_shield" && (
        <DragonShieldTab month={month} initialSection={tabSection} />
      )}

      {/* Modals */}
      <CardSingleForm
        open={cardFormOpen}
        onClose={() => { setCardFormOpen(false); setEditingPrize(undefined); }}
        onSubmit={handleSubmitPrize}
        prize={editingPrize}
        defaultMonth={month}
      />

      <PrizeForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingPrize(undefined); }}
        onSubmit={handleSubmitPrize}
        prize={editingPrize}
        defaultMonth={month}
      />

      <PrizeDetailModal
        prize={detailPrize}
        open={!!detailPrize}
        onClose={() => setDetailPrize(null)}
        onEdit={handleEditPrize}
        onDelete={handleDeletePrize}
      />

      <ConfirmModal
        open={!!deletePrize}
        onClose={() => setDeletePrize(null)}
        onConfirm={confirmDeletePrize}
        title="Delete Prize"
        message={deletePrize ? `Delete "${deletePrize.name}" (€${deletePrize.value.toFixed(2)})?` : ""}
        confirmLabel="Delete"
        variant="danger"
      />

      <RaffleModal
        open={raffleOpen}
        month={month}
        onClose={() => setRaffleOpen(false)}
        onComplete={() => { setRaffleOpen(false); refreshAll(); }}
      />
    </div>
  );
}
