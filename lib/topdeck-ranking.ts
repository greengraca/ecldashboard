// lib/topdeck-ranking.ts
//
// TopDeck's SortByRanking: a league is ordered by the event's tiebreakers
// (C:Breakers — the "tie settings" on the event setup page). Unset = TopDeck's
// league default: MPTS (points ROUNDED to a whole number, so 1243.11 and 1242.59
// tie) → SR (win %) → OSR (opponents' win %) → OBEAT (unique opponents beaten)
// → UOPP (unique opponents) → entrant number (first come, first served).
// Percentages compare at 2 decimals, as TopDeck shows them. Sorting on raw
// points instead put Markus Schran above Rodrigo Costa e Silva in 2026-10 —
// both 1243, Rodrigo ahead on win %. Mirrored in eclBot topdeck_fetch.py.

export const DEFAULT_LEAGUE_BREAKERS = ["MPTS", "SR", "OSR", "OBEAT", "UOPP"] as const;
export type Breaker = (typeof DEFAULT_LEAGUE_BREAKERS)[number];

const SUPPORTED = new Set<string>(DEFAULT_LEAGUE_BREAKERS);

/** Inputs to TopDeck's ranking for one player. Rates are 0–1, points raw (unrounded). */
export interface RankInputs {
  points: number;
  winRate: number;
  oppWinRate: number;
  oppsBeaten: number;
  uniqueOpps: number;
  entrantId: number;
}

/** The event's tiebreaker order from a parsed TopDeck doc, keeping the ones we compute. */
export function breakersFromFields(fields: Record<string, unknown>): Breaker[] {
  let raw = fields["C:Breakers"];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_LEAGUE_BREAKERS];
  const unknown = raw.filter((b) => !SUPPORTED.has(b));
  if (unknown.length > 0) {
    console.warn(`TopDeck tiebreakers ${unknown.join(", ")} not supported — ranking skips them`);
  }
  return raw.filter((b): b is Breaker => SUPPORTED.has(b));
}

const pct2 = (rate: number) => Math.round(rate * 10000) / 100;

/** Ascending sort key reproducing TopDeck's order (best first). Compare with compareRankKeys. */
export function topdeckRankKey(p: RankInputs, breakers: readonly Breaker[] = DEFAULT_LEAGUE_BREAKERS): number[] {
  const metric: Record<Breaker, number> = {
    MPTS: Math.round(p.points),
    SR: pct2(p.winRate),
    OSR: pct2(p.oppWinRate),
    OBEAT: p.oppsBeaten,
    UOPP: p.uniqueOpps,
  };
  return [...breakers.map((b) => -metric[b]), p.entrantId];
}

export function compareRankKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}
