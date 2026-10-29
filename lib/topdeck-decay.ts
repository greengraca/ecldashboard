// lib/topdeck-decay.ts
//
// TopDeck "Inactivity decay" — a league scoring setting, first turned on for
// 2026-10 ("10% of points above the starting score every 7 days, never
// returned"). Port of TopDeck's DecayOn / DecaySchedule / DecayTicks /
// DecayPoints and the two places EntityRender applies them. Mirrored in
// eclBot topdeck_fetch.py — keep both in step.
//
// How TopDeck applies it:
//  - Before a table scores, every seat whose clock is behind the table's Start
//    (End if no Start) decays for the idle gap, then the clock moves to Start.
//    So the wager reads the decayed points.
//  - After the last table, everyone decays from their last game to "now",
//    capped at the league's End / S1:End (decay stops when the league does).
//  - Whole ticks only: nothing in the first period, then one tick per period
//    ("Daily" mode: one per day after the first period). Each tick takes `rate`
//    of what sits above the starting points; players at or below start never
//    move.

/** Decay knobs in the units the scoring loop needs. */
export interface DecayConfig {
  /** Share of the points above start taken per tick (0.1 = 10%). */
  rate: number;
  /** Idle ms before the first tick. */
  firstMs: number;
  /** ms between later ticks. */
  stepMs: number;
}

/** TopDeck's raw decay settings, as eclBot stores them in a month dump (`scoring.decay`). */
export interface DecaySettings {
  mode: string;
  perc: number;
  period_days: number;
}

// TopDeck ConfigDefaults for the keys decay reads — a doc only carries C:{key}
// once the TO changes it from the default.
const DEFAULT_DECAY_MODE = "None";
const DEFAULT_DECAY_PERC = 10;
const DEFAULT_DECAY_PERIOD_DAYS = 7;
const DAY_MS = 86_400_000;

export function decayConfigFromSettings(s: DecaySettings | null | undefined): DecayConfig | null {
  if (!s || (s.mode !== "Periodic" && s.mode !== "Daily")) return null;
  const periodMs = Number(s.period_days) * DAY_MS;
  return {
    rate: Number(s.perc) / 100,
    firstMs: periodMs,
    stepMs: s.mode === "Daily" ? DAY_MS : periodMs,
  };
}

/**
 * Read decay settings from a parsed TopDeck Firestore doc (fsValueToPy'd fields).
 * Null when decay is off — TopDeck also requires PointWager scoring.
 */
export function decaySettingsFromFields(fields: Record<string, unknown>): DecaySettings | null {
  if (fields["C:PointMode"] !== "PointWager") return null;
  const mode = typeof fields["C:DecayMode"] === "string" ? (fields["C:DecayMode"] as string) : DEFAULT_DECAY_MODE;
  if (mode !== "Periodic" && mode !== "Daily") return null;
  return {
    mode,
    perc: fields["C:DecayPerc"] != null ? Number(fields["C:DecayPerc"]) : DEFAULT_DECAY_PERC,
    period_days: fields["C:DecayPeriodDays"] != null ? Number(fields["C:DecayPeriodDays"]) : DEFAULT_DECAY_PERIOD_DAYS,
  };
}

/** League end (ms) that stops the idle tail: TopDeck's `End || S1:End`. Null while running. */
export function decayEndFromFields(fields: Record<string, unknown>): number | null {
  const end = Number(fields["End"]) || Number(fields["S1:End"]);
  return end > 0 ? end : null;
}

/** The moment a table counts as activity for the idle clock: TopDeck's `Start || End || 0`, raw. */
export function tableActivityTs(start: unknown, end: unknown): number {
  return (typeof start === "number" && start) || (typeof end === "number" && end) || 0;
}

/**
 * Per-player idle clocks for one standings replay. Points live in the caller's
 * map; the clock only decays them in place.
 */
export class DecayClock<K> {
  private lastPlayed = new Map<K, number>();

  constructor(
    private cfg: DecayConfig | null,
    private startPoints: number,
  ) {}

  private decayed(points: number, fromMs: number, toMs: number): number {
    const cfg = this.cfg;
    if (!cfg || !(points > this.startPoints)) return points;
    const idle = toMs - fromMs;
    if (!(cfg.firstMs > 0) || idle < cfg.firstMs) return points;
    const ticks = Math.floor((idle - cfg.firstMs) / cfg.stepMs) + 1;
    const after = this.startPoints + (points - this.startPoints) * Math.pow(1 - cfg.rate, ticks);
    return Math.min(points, Math.max(this.startPoints, after));
  }

  /** Call for each seat before a table scores. `at` = tableActivityTs(...). */
  touch(points: Map<K, number>, key: K, at: number): void {
    if (!this.cfg) return;
    const last = this.lastPlayed.get(key) ?? 0;
    if (at > last) {
      points.set(key, this.decayed(points.get(key)!, last, at));
      this.lastPlayed.set(key, at);
    }
  }

  /** What `key` would show at `at` without changing state (chart snapshots). */
  view(points: Map<K, number>, key: K, at: number): number {
    return this.decayed(points.get(key)!, this.lastPlayed.get(key) ?? 0, at);
  }

  /** Idle tail: decay everyone from their last game to `at`. Call once, after the last table. */
  settle(points: Map<K, number>, at: number): void {
    if (!this.cfg) return;
    for (const key of points.keys()) {
      points.set(key, this.view(points, key, at));
    }
  }
}

/** The "now" TopDeck decays a league up to: the earlier of `nowMs` and the league's end. */
export function decayUntil(endMs: number | null, nowMs: number = Date.now()): number {
  return endMs !== null ? Math.min(nowMs, endMs) : nowMs;
}
