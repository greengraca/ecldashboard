import type { FixedCost } from "./types";

/**
 * Resolve the effective amount for a fixed cost in a given month.
 * Uses amount_history if present, otherwise falls back to fc.amount.
 */
export function getEffectiveAmount(fc: FixedCost, month: string): number {
  if (!fc.amount_history || fc.amount_history.length === 0) {
    return fc.amount;
  }
  // amount_history is sorted by effective_from ascending
  // Find the latest entry where effective_from <= month
  let effective = fc.amount;
  for (const entry of fc.amount_history) {
    if (entry.effective_from <= month) {
      effective = entry.amount;
    } else {
      break;
    }
  }
  return effective;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getNextMonth(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}
