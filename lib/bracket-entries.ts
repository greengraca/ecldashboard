// lib/bracket-entries.ts
//
// Bracket entry analysis: how many players enter the bracket on each day of the
// month. A player "enters" on the day of their earliest game (minimum match
// start), bucketed by day-of-month in Europe/Lisbon. TopDeck stores no
// registration timestamp, so first-game time is the only entry signal available.

import { topdeckTsToMs } from "./utils";

// ─── Types ───

export interface BracketEntryDay {
  day: number;        // day of month (1..31), Lisbon time
  entrants: number;   // players whose first game of the month was this day
  cumulative: number; // running total of entrants through this day
}

export interface BracketEntriesResult {
  days: BracketEntryDay[];
  totalEntrants: number;
}

/** One pod/match: its start time (unix SECONDS, or null) and the UIDs in it. */
export interface EntryPod {
  start: number | null;
  uids: string[];
}

// ─── Lisbon day-of-month ───

const LISBON_TZ = "Europe/Lisbon";

// Reused formatter — constructing Intl.DateTimeFormat per call is comparatively
// expensive and we call this once per (pod), potentially thousands of times.
const lisbonFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LISBON_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Convert a TopDeck timestamp to { year, month, day } in Europe/Lisbon.
 * The raw value may be unix seconds or milliseconds — topdeckTsToMs normalizes
 * both to milliseconds (values > 1e10 are already ms) before constructing Date.
 */
export function lisbonYMD(ts: number): { year: number; month: number; day: number } {
  const parts = lisbonFormatter.formatToParts(new Date(topdeckTsToMs(ts)));
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === "year") year = parseInt(p.value, 10);
    else if (p.type === "month") month = parseInt(p.value, 10);
    else if (p.type === "day") day = parseInt(p.value, 10);
  }
  return { year, month, day };
}

// ─── Computation ───

/**
 * Compute per-day bracket entries for a month.
 *
 * Within a single month, day-of-month is monotonic with timestamp, so tracking
 * the earliest DAY per UID is equivalent to the day of the earliest timestamp.
 * A player who re-registers under multiple entrant IDs collapses to one UID and
 * is counted once, on their earliest day.
 *
 * @param pods  one entry per match/pod (start = unix seconds or null, uids = players)
 * @param month "YYYY-MM" — only pods whose Lisbon start falls in this month count
 */
export function computeBracketEntriesByDay(
  pods: EntryPod[],
  month: string
): BracketEntriesResult {
  const [targetYear, targetMonth] = month.split("-").map(Number);

  // earliest entry day per uid (restricted to the target month)
  const earliestDay = new Map<string, number>();

  for (const pod of pods) {
    if (pod.start == null) continue;
    const { year, month: m, day } = lisbonYMD(pod.start);
    if (year !== targetYear || m !== targetMonth) continue; // month-boundary guard
    for (const uid of pod.uids) {
      if (!uid) continue;
      const prev = earliestDay.get(uid);
      if (prev === undefined || day < prev) earliestDay.set(uid, day);
    }
  }

  const totalEntrants = earliestDay.size;
  if (totalEntrants === 0) {
    return { days: [], totalEntrants: 0 };
  }

  // count new entrants per day + find the last active day
  const perDay = new Map<number, number>();
  let maxDay = 1;
  for (const day of earliestDay.values()) {
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    if (day > maxDay) maxDay = day;
  }

  // gap-fill days 1..maxDay so the cumulative line reads from the month's start
  const days: BracketEntryDay[] = [];
  let cumulative = 0;
  for (let d = 1; d <= maxDay; d++) {
    const entrants = perDay.get(d) ?? 0;
    cumulative += entrants;
    days.push({ day: d, entrants, cumulative });
  }

  return { days, totalEntrants };
}
