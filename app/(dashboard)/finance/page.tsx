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
import type {
  Transaction,
  FixedCost,
  MonthlySummary,
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

  const transactions = txData?.data || [];
  const summary = summaryData?.data || null;
  const fixedCosts = fcData?.data || [];

  const refreshAll = useCallback(() => {
    mutateTx();
    mutateSummary();
    mutateFc();
  }, [mutateTx, mutateSummary, mutateFc]);

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
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} minMonth="2025-11" maxMonth={getCurrentMonth()} />
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Monthly Breakdown Chart */}
      <MonthlyBreakdownChart month={month} summary={summary} isLoading={summaryLoading} />

      {/* Subscription Income */}
      <div className="mb-8">
        <SubscriptionIncomeCard
          income={summary?.subscription_income ?? null}
          isLoading={summaryLoading}
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

      {/* Balance Cards */}
      <div className="mb-8">
        <BalanceCard summary={summary} isLoading={summaryLoading} />
      </div>

      {/* Transaction Table */}
      <div className="mb-8">
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Transactions
        </h2>
        {isLoading ? (
          <div
            className="rounded-xl border p-12 text-center"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
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
            className="rounded-xl border p-12 text-center"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
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
