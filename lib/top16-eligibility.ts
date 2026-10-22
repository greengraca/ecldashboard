import {
  TOP16_MIN_TOTAL_GAMES,
  TOP16_MIN_ONLINE_GAMES,
  TOP16_NO_RECENCY_GAMES,
  TOP16_RECENCY_AFTER_DAY,
  TOP16_RECENCY_FROM,
  TOP16_NO_RECENCY_FROM,
  TOP16_TOTAL_GAMES_FROM,
} from "./constants";
import { topdeckTsToMs } from "./utils";

/** True when `month` ("YYYY-MM") uses the total-games rule; older months stay on the online rule. */
export function usesTotalGamesRule(month: string): boolean {
  return month >= TOP16_TOTAL_GAMES_FROM;
}

/** True when `month` ("YYYY-MM") falls in the frozen 2026-03..2026-09 "game after day N" window. */
export function recencyRuleApplies(month: string): boolean {
  return month >= TOP16_RECENCY_FROM && month < TOP16_NO_RECENCY_FROM;
}

export interface Top16EligibilityInput {
  month: string;
  dropped: boolean;
  totalGames: number;
  /** Ignored by the total-games rule; used only by the frozen pre-2026-05 online rule. */
  onlineGames: number;
  /**
   * Any-game recency for the total-games rule; online recency for the old rule (caller decides).
   * Only read for months where `recencyRuleApplies`.
   */
  hasRecent?: boolean;
}

/**
 * Freeze-aware Top 16 eligibility predicate. Single source of truth for the dashboard.
 *
 * - Months >= TOP16_TOTAL_GAMES_FROM ("2026-05"): not dropped + total >= 10.
 * - Older months: original rule — online >= 10 — kept frozen so historical displays
 *   match what actually decided those past cuts.
 * - Months in the recency window (2026-03..2026-09) also needed a game after day 20
 *   unless they had 20+ games (total, or online under the old rule). Frozen likewise.
 */
export function isTop16Eligible(p: Top16EligibilityInput): boolean {
  if (p.dropped) return false;
  if (p.totalGames < TOP16_MIN_TOTAL_GAMES) return false;
  const totalRule = usesTotalGamesRule(p.month);
  // Frozen old rule (online-gated)
  if (!totalRule && p.onlineGames < TOP16_MIN_ONLINE_GAMES) return false;
  if (!recencyRuleApplies(p.month)) return true;
  // Frozen recency rule
  if ((totalRule ? p.totalGames : p.onlineGames) >= TOP16_NO_RECENCY_GAMES) return true;
  return p.hasRecent ?? false;
}

// ─── Recency (frozen months only), sourced from TopDeck ───

/** One counted game, as TopDeck reports it. */
export interface RecencyGame {
  /** TopDeck UIDs of everyone in the pod. */
  uids: string[];
  /** Raw TopDeck `Start` — seconds or milliseconds; normalized here, so pass it through untouched. */
  start: number | null;
}

/**
 * Start of the recency cutoff day, in ms. `afterDay` past the end of the month
 * clamps to the last day, as eclBot did while it still had the rule.
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
