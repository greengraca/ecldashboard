"use client";

import { RotateCcw } from "lucide-react";
import Select from "@/components/dashboard/select";

export interface ActivityFilterValues {
  action: string;
  entity_type: string;
  from: string;
  to: string;
}

interface ActivityFiltersProps {
  values: ActivityFilterValues;
  onChange: (values: ActivityFilterValues) => void;
}

const ACTIONS = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "sync", label: "Sync" },
  { value: "join", label: "Join" },
  { value: "leave", label: "Leave" },
];

const ENTITY_TYPES = [
  { value: "", label: "All Entities" },
  { value: "transaction", label: "Transaction" },
  { value: "fixed_cost", label: "Fixed Cost" },
  { value: "subscriber", label: "Subscriber" },
];

const defaultValues: ActivityFilterValues = {
  action: "",
  entity_type: "",
  from: "",
  to: "",
};

export default function ActivityFilters({
  values,
  onChange,
}: ActivityFiltersProps) {
  function update(partial: Partial<ActivityFilterValues>) {
    onChange({ ...values, ...partial });
  }

  const hasFilters =
    values.action || values.entity_type || values.from || values.to;

  const inputStyle = {
    background: "var(--bg-card)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
    colorScheme: "dark" as const,
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={values.action}
        onChange={(val) => update({ action: val })}
        options={ACTIONS}
      />

      <Select
        value={values.entity_type}
        onChange={(val) => update({ entity_type: val })}
        options={ENTITY_TYPES}
      />

      <input
        type="date"
        className="px-3 py-2 rounded-lg border text-sm"
        style={inputStyle}
        value={values.from}
        onChange={(e) => update({ from: e.target.value })}
        placeholder="From"
      />

      <input
        type="date"
        className="px-3 py-2 rounded-lg border text-sm"
        style={inputStyle}
        value={values.to}
        onChange={(e) => update({ to: e.target.value })}
        placeholder="To"
      />

      {hasFilters && (
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
          onClick={() => onChange(defaultValues)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      )}
    </div>
  );
}
