"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import MonthPicker from "@/components/dashboard/month-picker";
import Modal from "@/components/dashboard/modal";
import BalanceCard from "@/components/finance/balance-card";
import TransactionForm from "@/components/finance/transaction-form";
import TransactionTable from "@/components/finance/transaction-table";
import FixedCostManager from "@/components/finance/fixed-cost-manager";
import MonthlyBreakdownChart from "@/components/finance/monthly-breakdown-chart";
import SubscriptionIncomeCard from "@/components/finance/SubscriptionIncomeCard";
import GroupSummaryCard from "@/components/finance/group-summary-card";
import type {
  Transaction,
  FixedCost,
  MonthlySummary,
  GroupSummary,
  TransactionType,
  TransactionCategory,
} from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancePage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(
    undefined
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const transactions = txData?.data || [];
  const summary = summaryData?.data || null;
  const fixedCosts = fcData?.data || [];
  const groupSummary = groupData?.data || null;

  const refreshAll = useCallback(() => {
    mutateTx();
    mutateSummary();
    mutateFc();
    mutateGroup();
  }, [mutateTx, mutateSummary, mutateFc, mutateGroup]);

  const handleSyncPatreon = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/patreon/sync?month=${month}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        setSyncError(err.error || "Sync failed");
        return;
      }
      mutateSummary();
    } catch {
      setSyncError("Failed to sync Patreon");
    } finally {
      setIsSyncing(false);
    }
  };

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

  async function handleDeleteTransaction(tx: Transaction) {
    if (!confirm(`Delete "${tx.description}"?`)) return;
    await fetch(`/api/finance/transactions/${tx._id}`, {
      method: "DELETE",
    });
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
      body: JSON.stringify(data),
    });
    refreshAll();
  }

  async function handleDeleteFixedCost(id: string) {
    if (!confirm("Delete this fixed cost?")) return;
    await fetch(`/api/finance/fixed-costs/${id}`, {
      method: "DELETE",
    });
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

  const isLoading = txLoading || summaryLoading || fcLoading;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Finance
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Track income, expenses, and monthly P&amp;L
          </p>
        </div>
        <MonthPicker value={month} onChange={setMonth} minMonth="2025-11" maxMonth={getCurrentMonth()} />
      </div>

      {/* Category Breakdown + Subscription Income */}
      {(() => {
        const hasSubscriptionIncome = summary?.subscription_income && summary.subscription_income.total > 0;
        return (
          <div className={`grid grid-cols-1 ${hasSubscriptionIncome ? "lg:grid-cols-2" : ""} gap-4 mb-8`}>
            <MonthlyBreakdownChart month={month} summary={summary} isLoading={summaryLoading} />
            {hasSubscriptionIncome && (
              <div>
                <SubscriptionIncomeCard
                  income={summary?.subscription_income ?? null}
                  isLoading={summaryLoading}
                  month={month}
                  onSyncPatreon={handleSyncPatreon}
                  isSyncing={isSyncing}
                />
                {syncError && (
                  <div
                    className="mt-3 rounded-lg border px-4 py-3 text-sm"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      borderColor: "var(--error)",
                      color: "var(--error)",
                    }}
                  >
                    {syncError}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Balance Cards */}
      <div className="mb-8">
        <BalanceCard summary={summary} isLoading={summaryLoading} />
      </div>

      {/* Transaction Table */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Transactions
          </h2>
          <button
            onClick={openAdd}
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
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
            <p
              className="text-sm mt-3"
              style={{ color: "var(--text-muted)" }}
            >
              Loading transactions...
            </p>
          </div>
        ) : (
          <TransactionTable
            transactions={transactions}
            onEdit={openEdit}
            onDelete={handleDeleteTransaction}
            onReimburse={handleReimburseTx}
          />
        )}
      </div>

      {/* Fixed Cost Manager */}
      <div className="mb-8">
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Fixed Costs
        </h2>
        {fcLoading ? (
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
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
          </div>
        ) : (
          <FixedCostManager
            fixedCosts={fixedCosts}
            month={month}
            onAdd={handleAddFixedCost}
            onUpdate={handleUpdateFixedCost}
            onDelete={handleDeleteFixedCost}
          />
        )}
      </div>

      {/* Group Profit Split */}
      <div className="mb-8">
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Team Split
        </h2>
        <GroupSummaryCard
          summary={groupSummary}
          isLoading={groupLoading}
          onReimburse={handleReimburse}
        />
      </div>

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
    </div>
  );
}
