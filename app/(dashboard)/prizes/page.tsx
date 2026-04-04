"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Trophy, Shield, Gem, Dices } from "lucide-react";
import MonthPicker from "@/components/dashboard/month-picker";
import PlanningCard from "@/components/prizes/planning-card";
import DistributionCard from "@/components/prizes/distribution-card";
import TreasurePodsTab from "@/components/prizes/treasure-pods-tab";
import PrizesTab from "@/components/prizes/prizes-tab";
import DragonShieldTab from "@/components/prizes/dragon-shield-tab";
import dynamic from "next/dynamic";
import type { PrizeFormData } from "@/components/prizes/prize-form";
import type { CardGroup } from "@/components/prizes/card-single-form";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import InventorySection from "@/components/prizes/inventory-section";
const PrizeForm = dynamic(() => import("@/components/prizes/prize-form"), { ssr: false });
const CardSingleForm = dynamic(() => import("@/components/prizes/card-single-form"), { ssr: false });
const PrizeDetailModal = dynamic(() => import("@/components/prizes/prize-detail-modal"), { ssr: false });
const RaffleModal = dynamic(() => import("@/components/prizes/raffle-modal"), { ssr: false });
const OrderForm = dynamic(() => import("@/components/prizes/order-form"), { ssr: false });
const InventoryPicker = dynamic(() => import("@/components/prizes/inventory-picker"), { ssr: false });
import type { Prize, PrizeBudget, PrizeBudgetAllocations, TreasurePodData, InventoryCard } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth, getNextMonth } from "@/lib/utils";

type Tab = "pods" | "prizes" | "dragon_shield";

const TAB_CONFIG: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: "prizes", label: "Prizes", icon: Trophy },
  { key: "pods", label: "Treasure Pods", icon: Gem },
  { key: "dragon_shield", label: "Dragon Shield", icon: Shield },
];

export default function PrizesPage() {
  const currentMonth = getCurrentMonth();
  const [month, setMonth] = useState(currentMonth);
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("prizes");
  const [tabSection, setTabSection] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | undefined>(undefined);
  const [detailPrize, setDetailPrize] = useState<Prize | null>(null);
  const [deletePrize, setDeletePrize] = useState<Prize | null>(null);
  const [cardFormGroup, setCardFormGroup] = useState<CardGroup | undefined>(undefined);
  const [raffleOpen, setRaffleOpen] = useState(false);
  const [monthHighlight, setMonthHighlight] = useState(false);
  const [inventoryPickerOpen, setInventoryPickerOpen] = useState(false);
  const [selectedInventoryCard, setSelectedInventoryCard] = useState<InventoryCard | null>(null);
  const [inventoryPickerGroup, setInventoryPickerGroup] = useState<CardGroup | undefined>(undefined);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [orderFormOpen, setOrderFormOpen] = useState(false);

  const nextMonth = getNextMonth();
  const isCurrentMonth = month === currentMonth;
  const isPlanningMonth = month === nextMonth;
  const showPlanningCard = isCurrentMonth || isPlanningMonth;
  const showDistributionCard = true;

  const {
    data: prizesData,
    isLoading: prizesLoading,
    mutate: mutatePrizes,
  } = useSWR<{ data: Prize[] }>(`/api/prizes?month=${month}`, fetcher);

  const {
    data: budgetData,
    mutate: mutateBudget,
  } = useSWR<{ data: PrizeBudget | null }>(`/api/prizes/budget?month=${month}`, fetcher);

  const { data: podData } = useSWR<{ data: TreasurePodData }>(
    `/api/prizes/treasure-pods?month=${month}`,
    fetcher
  );

  const { mutate: globalMutate } = useSWRConfig();

  const prizes = prizesData?.data || [];
  const budget = budgetData?.data || null;

  // Match treasure-pod-section logic: schedule exists + pods triggered within the month
  const hasPodData = (() => {
    if (!podData?.data?.schedule) return false;
    const [y, m] = month.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1).getTime();
    const monthEnd = new Date(y, m, 1).getTime();
    return podData.data.pods.some((p) => {
      const ts = new Date(p.triggered_at).getTime();
      return ts >= monthStart && ts < monthEnd;
    });
  })();

  const refreshAll = useCallback(() => {
    mutatePrizes();
    mutateBudget();
    setInventoryRefreshKey((k) => k + 1);
    // Refresh planning/distribution status cards
    globalMutate(`/api/prizes/planning-status?month=${currentMonth}`);
  }, [mutatePrizes, mutateBudget, globalMutate, currentMonth]);

  // If user lands on pods tab but there's no pod data, fall back to prizes
  useEffect(() => {
    if (!podData || tabSection) return;
    if (!hasPodData && activeTab === "pods") {
      setActiveTab("prizes");
    }
  }, [podData, hasPodData]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMonthChange(m: string) {
    setMonthHighlight(false);
    startTransition(() => setMonth(m));
  }

  function handleNavigate(tab: string, section?: string, targetMonth?: string) {
    if (targetMonth && targetMonth !== month) {
      startTransition(() => setMonth(targetMonth));
      // Trigger highlight — reset first to retrigger if already true
      setMonthHighlight(false);
      requestAnimationFrame(() => setMonthHighlight(true));
    }
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
    const res = editingPrize
      ? await fetch(`/api/prizes/${editingPrize._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      : await fetch("/api/prizes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Failed to save prize");
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

  function handleAssignFromInventory(card: InventoryCard) {
    setSelectedInventoryCard(card);
    setInventoryPickerGroup(undefined);
    setInventoryPickerOpen(true);
  }

  function handleAddFromInventory(group?: CardGroup) {
    setSelectedInventoryCard(null);
    setInventoryPickerGroup(group);
    setInventoryPickerOpen(true);
  }

  function handleInventoryAssigned() {
    setInventoryPickerOpen(false);
    setSelectedInventoryCard(null);
    refreshAll();
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
        <MonthPicker value={month} onChange={handleMonthChange} minMonth="2025-11" highlight={monthHighlight || isPlanningMonth} />
      </div>

      {/* Planning card: visible on current month and planning (next) month */}
      {showPlanningCard && (
        <PlanningCard month={currentMonth} onNavigate={handleNavigate} />
      )}

      {/* Distribution card: current month only */}
      {showDistributionCard && (
        <DistributionCard
          month={month}
          onNavigate={handleNavigate}
          onOpenRaffle={() => setRaffleOpen(true)}
        />
      )}

      {/* Card Inventory */}
      <InventorySection
        onAssignCard={handleAssignFromInventory}
        onNewOrder={() => setOrderFormOpen(true)}
        refreshKey={inventoryRefreshKey}
      />

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
        <div className="flex-1" />
        <button
          onClick={() => setRaffleOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap hover:brightness-125"
          style={{ color: "var(--text-muted)" }}
        >
          <Dices className="w-3.5 h-3.5" />
          Most Games Raffle
        </button>
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
          onAddCard={(group) => { setEditingPrize(undefined); setCardFormGroup(group); setCardFormOpen(true); }}
          onAddFromInventory={handleAddFromInventory}
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
        onClose={() => { setCardFormOpen(false); setEditingPrize(undefined); setCardFormGroup(undefined); }}
        onSubmit={handleSubmitPrize}
        prize={editingPrize}
        defaultMonth={month}
        defaultGroup={cardFormGroup}
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
        title={deletePrize?.inventory_card_id ? "Remove from Prizes" : "Delete Prize"}
        message={
          deletePrize?.inventory_card_id
            ? `Remove "${deletePrize.name}" from prizes? The card will return to inventory.`
            : deletePrize ? `Delete "${deletePrize.name}" (€${deletePrize.value.toFixed(2)})?` : ""
        }
        confirmLabel={deletePrize?.inventory_card_id ? "Remove" : "Delete"}
        variant="danger"
      />

      <RaffleModal
        open={raffleOpen}
        month={month}
        onClose={() => setRaffleOpen(false)}
        onComplete={() => { setRaffleOpen(false); refreshAll(); }}
      />

      <InventoryPicker
        open={inventoryPickerOpen}
        onClose={() => { setInventoryPickerOpen(false); setSelectedInventoryCard(null); }}
        onAssigned={handleInventoryAssigned}
        card={selectedInventoryCard}
        month={month}
        defaultGroup={inventoryPickerGroup}
      />

      <OrderForm
        open={orderFormOpen}
        onClose={() => setOrderFormOpen(false)}
        onSaved={refreshAll}
      />
    </div>
  );
}
