import {
  TOP16_MIN_TOTAL_GAMES,
  TOP16_MIN_ONLINE_GAMES,
  TOP16_NO_RECENCY_GAMES,
  TOP16_RECENCY_AFTER_DAY,
  TOP16_TOTAL_GAMES_FROM,
} from "./constants";
import { topdeckTsToMs } from "./utils";

/** True when `month` ("YYYY-MM") uses the total-games rule; older months stay on the online rule. */
export function usesTotalGamesRule(month: string): boolean {
  return month >= TOP16_TOTAL_GAMES_FROM;
}

export interface Top16EligibilityInput {
  month: string;
  dropped: boolean;
  totalGames: number;
  /** Ignored by the total-games rule; used only by the frozen pre-2026-05 online rule. */
  onlineGames: number;
  recencyApplies: boolean;
  /** Any-game recency for the new rule; online recency for the old rule (caller decides). */
  hasRecent: boolean;
}

/**
 * Freeze-aware Top 16 eligibility predicate. Single source of truth for the dashboard.
 *
 * - Months >= TOP16_TOTAL_GAMES_FROM ("2026-05"): not dropped + total >= 10 + recency (any game).
 * - Older months: original rule — online >= 10 + recency on online games — kept frozen so historical
 *   displays match what actually decided those past cuts.
 */
export function isTop16Eligible(p: Top16EligibilityInput): boolean {
  if (p.dropped) return false;
  if (usesTotalGamesRule(p.month)) {
    if (p.totalGames < TOP16_MIN_TOTAL_GAMES) return false;
    if (p.totalGames >= TOP16_NO_RECENCY_GAMES) return true;
    if (!p.recencyApplies) return true;
    return p.hasRecent;
  }
  // Frozen old rule (online-gated)
  if (p.totalGames < TOP16_MIN_TOTAL_GAMES) return false;
  if (p.onlineGames < TOP16_MIN_ONLINE_GAMES) return false;
  if (p.onlineGames >= TOP16_NO_RECENCY_GAMES) return true;
  if (!p.recencyApplies) return true;
  return p.hasRecent;
}

// ─── Recency, sourced from TopDeck ───

/** One counted game, as TopDeck reports it. */
export interface RecencyGame {
  /** TopDeck UIDs of everyone in the pod. */
  uids: string[];
  /** Raw TopDeck `Start` — seconds or milliseconds; normalized here, so pass it through untouched. */
  start: number | null;
}

/**
 * Start of the recency cutoff day, in ms. `afterDay` past the end of the month
 * clamps to the last day, mirroring eclBot's `is_recency_active`.
 */
export function recencyCutoffMs(year: number, month: number, afterDay: number = TOP16_RECENCY_AFTER_DAY): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Date.UTC(year, month - 1, Math.min(afterDay, daysInMonth));
}

/**
 * UIDs with at least one game on/after the recency cutoff day.
 *
 * Read straight from TopDeck's match list rather than the `online_games` mirror:
 * that mirror only holds pods eclBot synced, so an outage there used to strip
 * genuine post-cutoff games and silently drop players from the cut.
 *
 * Callers pass only games that count toward standings (completed or draw) —
 * voided and in-progress pods must be filtered out first.
 */
export function recentUidsFromGames(
  games: RecencyGame[],
  year: number,
  month: number,
  afterDay: number = TOP16_RECENCY_AFTER_DAY,
): Set<string> {
  const cutoffMs = recencyCutoffMs(year, month, afterDay);
  const uids = new Set<string>();
  for (const g of games) {
    if (g.start == null) continue;
    if (topdeckTsToMs(g.start) < cutoffMs) continue;
    for (const raw of g.uids) {
      const uid = String(raw).trim();
      if (uid) uids.add(uid);
    }
  }
  return uids;
}
