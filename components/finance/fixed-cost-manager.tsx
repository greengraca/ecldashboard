"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { FixedCost } from "@/lib/types";
import Select from "@/components/dashboard/select";

interface FixedCostManagerProps {
  fixedCosts: FixedCost[];
  onAdd: (data: {
    name: string;
    amount: number;
    category: "prize" | "operational";
    active: boolean;
    start_month: string;
    end_month: string | null;
  }) => Promise<void>;
  onUpdate: (
    id: string,
    data: Partial<{
      name: string;
      amount: number;
      category: "prize" | "operational";
      active: boolean;
      end_month: string | null;
    }>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function FixedCostManager({
  fixedCosts,
  onAdd,
  onUpdate,
  onDelete,
}: FixedCostManagerProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    category: "operational" as "prize" | "operational",
    start_month: new Date().toISOString().substring(0, 7),
  });
  const [editForm, setEditForm] = useState({
    name: "",
    amount: "",
    category: "operational" as "prize" | "operational",
  });

  const monthlyTotal = fixedCosts
    .filter((fc) => fc.active)
    .reduce((sum, fc) => sum + fc.amount, 0);

  async function handleAdd() {
    if (!form.name || !form.amount) return;
    await onAdd({
      name: form.name,
      amount: parseFloat(form.amount),
      category: form.category,
      active: true,
      start_month: form.start_month,
      end_month: null,
    });
    setForm({ name: "", amount: "", category: "operational", start_month: new Date().toISOString().substring(0, 7) });
    setAdding(false);
  }

  function startEdit(fc: FixedCost) {
    setEditingId(String(fc._id));
    setEditForm({
      name: fc.name,
      amount: fc.amount.toString(),
      category: fc.category,
    });
  }

  async function handleUpdate(id: string) {
    await onUpdate(id, {
      name: editForm.name,
      amount: parseFloat(editForm.amount),
      category: editForm.category,
    });
    setEditingId(null);
  }

  const inputStyle = {
    background: "var(--bg-card)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Fixed Costs
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Monthly total:{" "}
            <span className="font-medium" style={{ color: "var(--error)" }}>
              &euro;{monthlyTotal.toFixed(2)}
            </span>
          </p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
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

      {/* Add form */}
      {adding && (
        <div
          className="mb-4 p-3 rounded-lg border space-y-3"
          style={{
            background: "var(--card-inner-bg)",
            borderColor: "var(--border)",
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Amount"
              min="0"
              step="0.01"
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.category}
              onChange={(val) =>
                setForm({
                  ...form,
                  category: val as "prize" | "operational",
                })
              }
              options={[
                { value: "operational", label: "Operational" },
                { value: "prize", label: "Prize" },
              ]}
            />
            <input
              type="month"
              value={form.start_month}
              onChange={(e) =>
                setForm({ ...form, start_month: e.target.value })
              }
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-1">
        {fixedCosts.length === 0 && (
          <p
            className="text-sm text-center py-6"
            style={{ color: "var(--text-muted)" }}
          >
            No fixed costs configured
          </p>
        )}
        {fixedCosts.map((fc) => {
          const id = String(fc._id);
          const isEditing = editingId === id;

          return (
            <div
              key={id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            >
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="px-2 py-1 rounded border text-sm outline-none w-32"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: e.target.value })
                    }
                    className="px-2 py-1 rounded border text-sm outline-none w-20"
                    style={inputStyle}
                    step="0.01"
                  />
                  <Select
                    value={editForm.category}
                    onChange={(val) =>
                      setEditForm({
                        ...editForm,
                        category: val as "prize" | "operational",
                      })
                    }
                    options={[
                      { value: "operational", label: "Operational" },
                      { value: "prize", label: "Prize" },
                    ]}
                    size="sm"
                  />
                  <button
                    onClick={() => handleUpdate(id)}
                    className="p-1 rounded hover:bg-[var(--success-light)]"
                    style={{ color: "var(--success)" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded hover:bg-[var(--error-light)]"
                    style={{ color: "var(--error)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        onUpdate(id, { active: !fc.active })
                      }
                      className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                      style={{
                        borderColor: fc.active
                          ? "var(--success)"
                          : "var(--border)",
                        background: fc.active
                          ? "var(--success-light)"
                          : "transparent",
                      }}
                      title={fc.active ? "Active" : "Inactive"}
                    >
                      {fc.active && (
                        <Check
                          className="w-3 h-3"
                          style={{ color: "var(--success)" }}
                        />
                      )}
                    </button>
                    <div>
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: fc.active
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                          textDecoration: fc.active ? "none" : "line-through",
                        }}
                      >
                        {fc.name}
                      </span>
                      <span
                        className="ml-2 text-xs capitalize"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {fc.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: fc.active
                          ? "var(--error)"
                          : "var(--text-muted)",
                      }}
                    >
                      &euro;{fc.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => startEdit(fc)}
                      className="p-1 rounded hover:bg-[var(--bg-hover)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(id)}
                      className="p-1 rounded hover:bg-[var(--error-light)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
