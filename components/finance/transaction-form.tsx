"use client";

import { useState, useEffect } from "react";
import type { Transaction, TransactionType, TransactionCategory } from "@/lib/types";
import Select from "@/components/dashboard/select";

interface TransactionFormProps {
  transaction?: Transaction;
  defaultMonth?: string; // "YYYY-MM" — used when creating new transactions
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

function getDefaultDate(defaultMonth?: string): string {
  const today = new Date().toISOString().substring(0, 10);
  if (!defaultMonth || defaultMonth === today.substring(0, 7)) return today;
  return `${defaultMonth}-01`;
}

export default function TransactionForm({
  transaction,
  defaultMonth,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const initialDate = transaction?.date || getDefaultDate(defaultMonth);
  const [day, setDay] = useState(initialDate.split("-")[2]);
  const [monthVal, setMonthVal] = useState(initialDate.split("-")[1]);
  const [year, setYear] = useState(initialDate.split("-")[0]);

  const date = `${year}-${monthVal}-${day}`;

  // Restrict date picker to not allow future dates
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const numYear = parseInt(year);
  const numMonth = parseInt(monthVal);

  const maxMonth = numYear >= todayYear ? todayMonth : 12;
  const maxDay =
    numYear >= todayYear && numMonth >= todayMonth ? todayDay : 31;

  // Clamp month/day when they exceed the allowed max
  useEffect(() => {
    if (numMonth > maxMonth) setMonthVal(String(maxMonth).padStart(2, "0"));
  }, [numMonth, maxMonth]);

  useEffect(() => {
    if (parseInt(day) > maxDay) setDay(String(maxDay).padStart(2, "0"));
  }, [day, maxDay]);

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
        <div className="flex gap-2">
          <Select
            value={day}
            onChange={setDay}
            options={Array.from({ length: maxDay }, (_, i) => {
              const d = String(i + 1).padStart(2, "0");
              return { value: d, label: d };
            })}
            className="flex-1"
          />
          <Select
            value={monthVal}
            onChange={setMonthVal}
            options={[
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December",
            ].slice(0, maxMonth).map((name, i) => ({
              value: String(i + 1).padStart(2, "0"),
              label: name,
            }))}
            className="flex-1"
          />
          <Select
            value={year}
            onChange={setYear}
            options={Array.from({ length: todayYear - 2024 + 1 }, (_, i) => {
              const y = String(2024 + i);
              return { value: y, label: y };
            })}
            className="flex-1"
          />
        </div>
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
        <Select
          value={category}
          onChange={(val) => setCategory(val as TransactionCategory)}
          options={CATEGORIES}
          className="w-full"
        />
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
