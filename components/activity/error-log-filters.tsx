"use client";

import { RotateCcw } from "lucide-react";
import Select from "@/components/dashboard/select";

export interface ErrorLogFilterValues {
  level: string;
  source: string;
  from: string;
  to: string;
}

interface ErrorLogFiltersProps {
  values: ErrorLogFilterValues;
  onChange: (values: ErrorLogFilterValues) => void;
}

const LEVELS = [
  { value: "", label: "All Levels" },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warning" },
  { value: "info", label: "Info" },
];

const SOURCES = [
  { value: "", label: "All Sources" },
  { value: "rate-limit", label: "Rate Limit" },
];

const defaultValues: ErrorLogFilterValues = {
  level: "",
  source: "",
  from: "",
  to: "",
};

export default function ErrorLogFilters({
  values,
  onChange,
}: ErrorLogFiltersProps) {
  function update(partial: Partial<ErrorLogFilterValues>) {
    onChange({ ...values, ...partial });
  }

  const hasFilters = values.level || values.source || values.from || values.to;

  const inputStyle = {
    background: "var(--bg-card)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
    colorScheme: "dark" as const,
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={values.level}
        onChange={(val) => update({ level: val })}
        options={LEVELS}
      />
      <Select
        value={values.source}
        onChange={(val) => update({ source: val })}
        options={SOURCES}
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
