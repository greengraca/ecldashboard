import {
  TOP16_MIN_TOTAL_GAMES,
  TOP16_MIN_ONLINE_GAMES,
  TOP16_NO_RECENCY_GAMES,
  TOP16_TOTAL_GAMES_FROM,
} from "./constants";

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
