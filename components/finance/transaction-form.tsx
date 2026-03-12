"use client";

import { useState } from "react";
import type { Transaction, TransactionType, TransactionCategory } from "@/lib/types";

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (data: {
    date: string;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    amount: number;
    tags: string[];
  }) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: "subscription", label: "Subscription" },
  { value: "prize", label: "Prize" },
  { value: "operational", label: "Operational" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "other", label: "Other" },
];

export default function TransactionForm({
  transaction,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().substring(0, 10));
  const [type, setType] = useState<TransactionType>(transaction?.type || "income");
  const [category, setCategory] = useState<TransactionCategory>(transaction?.category || "subscription");
  const [description, setDescription] = useState(transaction?.description || "");
  const [amount, setAmount] = useState(transaction?.amount?.toString() || "");
  const [tagsInput, setTagsInput] = useState(transaction?.tags?.join(", ") || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !description || !amount) return;

    setLoading(true);
    try {
      await onSubmit({
        date,
        type,
        category,
        description,
        amount: parseFloat(amount),
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "var(--bg-card)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--accent)]"
          style={inputStyle}
        />
      </div>

      {/* Type */}
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Type
        </label>
        <div className="flex gap-2">
          {(["income", "expense"] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="flex-1 px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors"
              style={{
                background:
                  type === t
                    ? t === "income"
                      ? "var(--success-light)"
                      : "var(--error-light)"
                    : "var(--bg-card)",
                borderColor:
                  type === t
                    ? t === "income"
                      ? "var(--success)"
                      : "var(--error)"
                    : "var(--border)",
                color:
                  type === t
                    ? t === "income"
                      ? "var(--success)"
                      : "var(--error)"
                    : "var(--text-secondary)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TransactionCategory)}
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--accent)]"
          style={inputStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="e.g. Patreon monthly revenue"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--accent)]"
          style={inputStyle}
        />
      </div>

      {/* Amount */}
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Amount (EUR)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="0"
          step="0.01"
          placeholder="0.00"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--accent)]"
          style={inputStyle}
        />
      </div>

      {/* Tags */}
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. recurring, platform"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--accent)]"
          style={inputStyle}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
          style={{
            background: "transparent",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
          }}
        >
          {loading
            ? "Saving..."
            : transaction
              ? "Update Transaction"
              : "Add Transaction"}
        </button>
      </div>
    </form>
  );
}
