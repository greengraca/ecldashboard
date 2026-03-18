"use client";

import { Pencil, Trash2, CheckCircle, Clock } from "lucide-react";
import DataTable from "@/components/dashboard/data-table";
import type { Column } from "@/components/dashboard/data-table";
import type { Transaction } from "@/lib/types";
import { TEAM_MEMBERS, TREASURER_ID } from "@/lib/constants";
import { Sensitive } from "@/components/dashboard/sensitive";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onReimburse?: (tx: Transaction) => void;
}

function getMemberName(id: string | null | undefined): string {
  if (!id) return "—";
  return TEAM_MEMBERS.find((m) => m.id === id)?.name || id;
}

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  onReimburse,
}: TransactionTableProps) {
  const columns: Column<Transaction>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {row.date}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
          style={{
            background:
              row.type === "income"
                ? "var(--success-light)"
                : "var(--error-light)",
            color:
              row.type === "income" ? "var(--success)" : "var(--error)",
          }}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (row) => (
        <span
          className="capitalize text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {row.category}
        </span>
      ),
    },
    {
      key: "paid_by",
      label: "Paid by",
      render: (row) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <Sensitive>{getMemberName((row as unknown as Transaction).paid_by)}</Sensitive>
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row) => (
        <span style={{ color: "var(--text-primary)" }}>
          <Sensitive>{row.description}</Sensitive>
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      className: "text-right",
      render: (row) => (
        <span
          className="font-medium"
          style={{
            color:
              row.type === "income" ? "var(--success)" : "var(--error)",
          }}
        >
          <Sensitive placeholder="€•••••">{row.type === "income" ? "+" : "-"}&euro;{row.amount.toFixed(2)}</Sensitive>
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-32",
      render: (row) => {
        const tx = row as unknown as Transaction;
        const showReimburse = tx.type === "expense" && tx.paid_by && tx.paid_by !== TREASURER_ID && onReimburse;
        return (
          <div className="flex items-center gap-1 justify-end">
            {showReimburse && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReimburse(tx);
                }}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: tx.reimbursed ? "var(--success)" : "var(--warning, #f59e0b)",
                }}
                title={tx.reimbursed ? "Reimbursed — click to undo" : "Pending — click to reimburse"}
              >
                {tx.reimbursed ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--error-light)]"
              style={{ color: "var(--text-muted)" }}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.015)",
        border: "1px solid var(--border)",
      }}
    >
      <DataTable<Record<string, unknown>>
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={transactions as unknown as Record<string, unknown>[]}
        keyField="_id"
        emptyMessage="No transactions for this month"
        renderMobileCard={(row) => {
          const tx = row as unknown as Transaction;
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={{
                      background: tx.type === "income" ? "var(--success-light)" : "var(--error-light)",
                      color: tx.type === "income" ? "var(--success)" : "var(--error)",
                    }}
                  >
                    {tx.type}
                  </span>
                  <span className="capitalize text-xs" style={{ color: "var(--text-muted)" }}>
                    {tx.category}
                  </span>
                </div>
                <span
                  className="font-medium text-sm"
                  style={{ color: tx.type === "income" ? "var(--success)" : "var(--error)" }}
                >
                  <Sensitive placeholder="€•••••">{tx.type === "income" ? "+" : "-"}&euro;{tx.amount.toFixed(2)}</Sensitive>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <Sensitive>{tx.description}</Sensitive>
                </span>
                <div className="flex items-center gap-1">
                  {tx.type === "expense" && tx.paid_by && tx.paid_by !== TREASURER_ID && onReimburse && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onReimburse(tx); }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: tx.reimbursed ? "var(--success)" : "var(--warning, #f59e0b)" }}
                      title={tx.reimbursed ? "Reimbursed" : "Pending"}
                    >
                      {tx.reimbursed ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--error-light)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{tx.date}</span>
                {tx.paid_by && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Paid by <Sensitive>{getMemberName(tx.paid_by)}</Sensitive>
                  </span>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
