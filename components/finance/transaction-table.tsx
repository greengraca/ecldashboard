"use client";

import { Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/dashboard/data-table";
import type { Column } from "@/components/dashboard/data-table";
import type { Transaction } from "@/lib/types";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
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
      key: "description",
      label: "Description",
      render: (row) => (
        <span style={{ color: "var(--text-primary)" }}>
          {row.description}
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
          {row.type === "income" ? "+" : "-"}&euro;{row.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-24",
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
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
      ),
    },
  ];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <DataTable<Record<string, unknown>>
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={transactions as unknown as Record<string, unknown>[]}
        keyField="_id"
        emptyMessage="No transactions for this month"
      />
    </div>
  );
}
