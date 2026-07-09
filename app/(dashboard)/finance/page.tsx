"use client";

import { useState, useCallback, useTransition } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Plus, Receipt, Landmark, Users, CheckCircle2, Wallet } from "lucide-react";
import MonthPicker from "@/components/dashboard/month-picker";
import PageHeader from "@/components/dashboard/page-header";
import ContentCard from "@/components/dashboard/content-card";
import DashboardTabs from "@/components/dashboard/tabs";
import LoadingSurface from "@/components/dashboard/loading-surface";
import Modal from "@/components/dashboard/modal";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import BalanceCard from "@/components/finance/balance-card";
import TransactionForm from "@/components/finance/transaction-form";
import TransactionTable from "@/components/finance/transaction-table";
import FixedCostManager from "@/components/finance/fixed-cost-manager";
import dynamic from "next/dynamic";
const MonthlyBreakdownChart = dynamic(() => import("@/components/finance/monthly-breakdown-chart"), { ssr: false });
import SubscriptionIncomeCard from "@/components/finance/SubscriptionIncomeCard";
import GroupSummaryCard from "@/components/finance/group-summary-card";
import DistributionSection from "@/components/finance/distribution-section";
import { Sensitive } from "@/components/dashboard/sensitive";
import type {
  Transaction,
  FixedCost,
  MonthlySummary,
  GroupSummary,
  DistributionLedger,
  TransactionType,
  TransactionCategory,
} from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";

type FinanceTab = "transactions" | "fixed_costs" | "team_split";

export default function FinancePage() {
  const { mutate: globalMutate } = useSWRConfig();
  const [month, setMonth] = useState(getCurrentMonth);
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<FinanceTab>("transactions");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [deleteFcId, setDeleteFcId] = useState<string | null>(null);

  const {
    data: txData,
    isLoading: txLoading,
    mutate: mutateTx,
  } = useSWR<{ data: Transaction[] }>(
    `/api/finance/transactions?month=${month}`,
    fetcher
  );

  const {
    data: summaryData,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR<{ data: MonthlySummary }>(
    `/api/finance/summary?month=${month}`,
    fetcher
  );

  const {
    data: fcData,
    isLoading: fcLoading,
    mutate: mutateFc,
  } = useSWR<{ data: FixedCost[] }>("/api/finance/fixed-costs", fetcher);

  const {
    data: groupData,
    isLoading: groupLoading,
    mutate: mutateGroup,
  } = useSWR<{ data: GroupSummary }>(
    `/api/finance/group-summary?month=${month}`,
    fetcher
  );

  const {
    data: distData,
    mutate: mutateDist,
  } = useSWR<{ data: DistributionLedger }>("/api/finance/distributions", fetcher);

  const transactions = txData?.data || [];
  const summary = summaryData?.data || null;
  const fixedCosts = fcData?.data || [];
  const groupSummary = groupData?.data || null;
  const hasSubscriptionIncome = !!(summary?.subscription_income && summary.subscription_income.total > 0);
  const ledger = distData?.data ?? null;
  const markedMonths = new Set(
    (ledger?.months ?? []).filter((r) => r.status === "distributed").map((r) => r.month)
  );
  const selectedRow = ledger?.months.find((r) => r.month === month) ?? null;

  const refreshAll = useCallback(() => {
    mutateTx();
    mutateSummary();
    mutateFc();
    mutateGroup();
    mutateDist();
    // Invalidate multi-month summary used by dashboard home FinanceOverview
    globalMutate(
      (key: string) => typeof key === "string" && key.startsWith("/api/finance/summary?months="),
      undefined,
      { revalidate: true },
    );
  }, [mutateTx, mutateSummary, mutateFc, mutateGroup, mutateDist, globalMutate]);

  function openAdd() {
    setEditingTx(undefined);
    setModalOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setModalOpen(true);
  }

  async function handleSubmitTransaction(data: {
    date: string;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    amount: number;
    tags: string[];
    paid_by?: string | null;
  }) {
    if (editingTx) {
      await fetch(`/api/finance/transactions/${editingTx._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setModalOpen(false);
    setEditingTx(undefined);
    // Navigate to the month of the submitted transaction
    const txMonth = data.date.substring(0, 7); // "YYYY-MM"
    if (txMonth !== month) {
      setMonth(txMonth);
    } else {
      refreshAll();
    }
  }

  function handleDeleteTransaction(tx: Transaction) {
    setDeleteTx(tx);
  }

  async function confirmDeleteTransaction() {
    if (!deleteTx) return;
    await fetch(`/api/finance/transactions/${deleteTx._id}`, {
      method: "DELETE",
    });
    setDeleteTx(null);
    refreshAll();
  }

  async function handleAddFixedCost(data: {
    name: string;
    amount: number;
    category: "prize" | "operational";
    active: boolean;
    start_month: string;
    end_month: string | null;
    paid_by?: string | null;
  }) {
    await fetch("/api/finance/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refreshAll();
  }

  async function handleUpdateFixedCost(
    id: string,
    data: Partial<{
      name: string;
      amount: number;
      category: "prize" | "operational";
      active: boolean;
      end_month: string | null;
      paid_by: string | null;
    }>
  ) {
    await fetch(`/api/finance/fixed-costs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, effective_month: month }),
    });
    refreshAll();
  }

  function handleDeleteFixedCost(id: string) {
    setDeleteFcId(id);
  }

  async function confirmDeleteFixedCost() {
    if (!deleteFcId) return;
    await fetch(`/api/finance/fixed-costs/${deleteFcId}`, {
      method: "DELETE",
    });
    setDeleteFcId(null);
    refreshAll();
  }

  async function handleReimburse(id: string, source: "transaction" | "fixed_cost", currentlyReimbursed: boolean) {
    await fetch("/api/finance/reimburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, source, reimbursed: !currentlyReimbursed }),
    });
    refreshAll();
  }

  function handleReimburseTx(tx: Transaction) {
    handleReimburse(String(tx._id), "transaction", !!tx.reimbursed);
  }

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Track income, expenses, and monthly P&L"
        action={
          <MonthPicker
            value={month}
            onChange={(m) => startTransition(() => setMonth(m))}
            minMonth="2025-11"
            maxMonth={getCurrentMonth()}
            markedMonths={markedMonths}
          />
        }
      />

      {selectedRow && selectedRow.net > 0 && (
        <div
          className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: `1.5px solid ${selectedRow.status === "distributed" ? "var(--success)" : selectedRow.status === "retained" ? "var(--border)" : "var(--warning, #f59e0b)"}`,
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedRow.status === "distributed" ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--success)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Distributed {selectedRow.distributed_at?.slice(0, 10)} ·{" "}
                  <Sensitive placeholder="€•••">{`€${selectedRow.net_paid.toFixed(2)}`}</Sensitive>{" "}
                  (cedhpt <Sensitive placeholder="€•••">{`€${selectedRow.cedhpt_share.toFixed(2)}`}</Sensitive> / ca{" "}
                  <Sensitive placeholder="€•••">{`€${selectedRow.ca_share.toFixed(2)}`}</Sensitive>)
                </span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 shrink-0" style={{ color: selectedRow.status === "retained" ? "var(--text-muted)" : "var(--warning, #f59e0b)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {selectedRow.status === "over" ? (
                    <>Over-distributed · paid <Sensitive placeholder="€•••">{`€${selectedRow.net_paid.toFixed(2)}`}</Sensitive>, net now <Sensitive placeholder="€•••">{`€${selectedRow.net.toFixed(2)}`}</Sensitive> — over by <Sensitive placeholder="€•••">{`€${(selectedRow.net_paid - selectedRow.net).toFixed(2)}`}</Sensitive></>
                  ) : selectedRow.status === "partial" ? (
                    <>Partially distributed · <Sensitive placeholder="€•••">{`€${selectedRow.available.toFixed(2)}`}</Sensitive> of <Sensitive placeholder="€•••">{`€${selectedRow.net.toFixed(2)}`}</Sensitive> still available</>
                  ) : (
                    <>Not distributed · <Sensitive placeholder="€•••">{`€${selectedRow.available.toFixed(2)}`}</Sensitive> available</>
                  )}
                </span>
              </>
            )}
          </div>
          <div className="shrink-0">
            <button
              onClick={() => setActiveTab("team_split")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--accent-light)", color: "var(--accent)" }}
            >
              {selectedRow.available > 0.01 ? "Distribute" : "Manage"}
            </button>
          </div>
        </div>
      )}

      {/* Status row — 4 KPI cards */}
      <div className="mb-6">
        <BalanceCard summary={summary} isLoading={summaryLoading} />
      </div>

      {/* Aux row: breakdown chart + subscription income */}
      <div className={`grid grid-cols-1 ${hasSubscriptionIncome ? "lg:grid-cols-2" : ""} gap-4 mb-6`}>
        <MonthlyBreakdownChart month={month} summary={summary} isLoading={summaryLoading} />
        {hasSubscriptionIncome && (
          <SubscriptionIncomeCard
            income={summary?.subscription_income ?? null}
            isLoading={summaryLoading}
            month={month}
          />
        )}
      </div>

      {/* Main content card — tabs */}
      <ContentCard padding="none">
        <DashboardTabs
          items={[
            { key: "transactions", label: "Transactions", icon: Receipt },
            { key: "fixed_costs", label: "Fixed Costs", icon: Landmark },
            { key: "team_split", label: "Team Split", icon: Users },
          ]}
          active={activeTab}
          onChange={(key) => setActiveTab(key as FinanceTab)}
          action={
            activeTab === "transactions" ? (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            ) : undefined
          }
        />

        <div className="p-6">
          {activeTab === "transactions" && (
            txLoading || summaryLoading ? (
              <LoadingSurface message="Loading transactions..." />
            ) : (
              <TransactionTable
                transactions={transactions}
                onEdit={openEdit}
                onDelete={handleDeleteTransaction}
                onReimburse={handleReimburseTx}
              />
            )
          )}

          {activeTab === "fixed_costs" && (
            fcLoading ? (
              <LoadingSurface />
            ) : (
              <FixedCostManager
                fixedCosts={fixedCosts}
                month={month}
                onAdd={handleAddFixedCost}
                onUpdate={handleUpdateFixedCost}
                onDelete={handleDeleteFixedCost}
              />
            )
          )}

          {activeTab === "team_split" && (
            <>
              <DistributionSection />
              <GroupSummaryCard
                summary={groupSummary}
                isLoading={groupLoading}
                onReimburse={handleReimburse}
              />
            </>
          )}
        </div>
      </ContentCard>

      {/* Transaction Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(undefined);
        }}
        title={editingTx ? "Edit Transaction" : "Add Transaction"}
      >
        <TransactionForm
          transaction={editingTx}
          defaultMonth={month}
          onSubmit={handleSubmitTransaction}
          onCancel={() => {
            setModalOpen(false);
            setEditingTx(undefined);
          }}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteTx}
        onClose={() => setDeleteTx(null)}
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction"
        message={deleteTx ? `Delete "${deleteTx.description}" (€${deleteTx.amount.toFixed(2)})?` : ""}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmModal
        open={!!deleteFcId}
        onClose={() => setDeleteFcId(null)}
        onConfirm={confirmDeleteFixedCost}
        title="Delete Fixed Cost"
        message="Delete this fixed cost? It will be removed from all months and any associated payment records will be cleaned up."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
