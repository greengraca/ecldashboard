"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (month: string) => void;
  minMonth?: string;
  maxMonth?: string;
}

function parseMonth(m: string): [number, number] {
  const [y, mo] = m.split("-").map(Number);
  return [y, mo];
}

function formatMonth(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function displayMonth(m: string): string {
  const [y, mo] = parseMonth(m);
  const date = new Date(y, mo - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function MonthPicker({
  value,
  onChange,
  minMonth,
  maxMonth,
}: MonthPickerProps) {
  const [y, m] = parseMonth(value);

  function prev() {
    const nm = m === 1 ? 12 : m - 1;
    const ny = m === 1 ? y - 1 : y;
    const next = formatMonth(ny, nm);
    if (minMonth && next < minMonth) return;
    onChange(next);
  }

  function next() {
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    const nextMonth = formatMonth(ny, nm);
    if (maxMonth && nextMonth > maxMonth) return;
    onChange(nextMonth);
  }

  const canPrev = !minMonth || value > minMonth;
  const canNext = !maxMonth || value < maxMonth;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        disabled={!canPrev}
        className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
        style={{
          color: "var(--text-secondary)",
          background: "transparent",
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span
        className="text-sm font-medium min-w-[140px] text-center"
        style={{ color: "var(--text-primary)" }}
      >
        {displayMonth(value)}
      </span>
      <button
        onClick={next}
        disabled={!canNext}
        className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
        style={{
          color: "var(--text-secondary)",
          background: "transparent",
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
