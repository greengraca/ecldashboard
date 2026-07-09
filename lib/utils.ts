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

/**
 * Normalize a TopDeck match timestamp (Start/End) to milliseconds.
 * TopDeck stores these as either unix seconds or milliseconds — values above
 * 1e10 are milliseconds (a seconds value that large would be year ~2286+).
 * Mirrors eclBot's `normalize_ts` so day-bucketing matches the bot.
 */
export function topdeckTsToMs(raw: number): number {
  return raw > 1e10 ? raw : raw * 1000;
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

/** Add `n` months to a "YYYY-MM" key (n may be negative). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Contiguous list of `count` months starting at `start` (inclusive), in order. */
export function monthRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}
