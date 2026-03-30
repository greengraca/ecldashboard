// lib/topdeck-live.ts
//
// Fetches live data from TopDeck public endpoints, parses Firestore doc,
// computes standings using the bot's staking model.
// Port of eclBot/topdeck_fetch.py.

import { TOPDECK_BRACKET_ID, FIRESTORE_DOC_URL_TEMPLATE, WAGER_RATE } from "./constants";
import { fetchPublicPData } from "./topdeck-cache";

// ─── Types ───

interface RawMatch {
  season: number;
  table: number;
  start: number | null;
  end: number | null;
  es: number[];
  winner: number | string | null;
  mute: boolean;
}

export interface LivePlayerRow {
  entrant_id: number;
  uid: string | null;
  name: string;
  discord: string;
  points: number;
  win_pct: number;
  ow_pct: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  dropped: boolean;
}

// ─── Constants ───

export const START_POINTS = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface GamePod {
  season: number;
  table: number;
  players: { uid: string; name: string; discord: string }[];
  winner: { uid: string; name: string } | null;
  status: "completed" | "draw" | "in_progress" | "voided";
  startTime: number | null;
  endTime: number | null;
}

export interface LiveStandingsResult {
  rows: LivePlayerRow[];
  totalMatches: number;
  inProgress: number;
  voided: number;
  voidedMatchIds: { season: number; table: number }[];
  gamePods: GamePod[];
}

// ─── Cache ───

let cachedResult: LiveStandingsResult | null = null;
let cacheExpires = 0;

// ─── Firestore value parsing ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fsValueToPy(v: any): any {
  if (v == null) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return Boolean(v.booleanValue);
  if ("integerValue" in v) {
    const n = parseInt(v.integerValue, 10);
    return isNaN(n) ? null : n;
  }
  if ("doubleValue" in v) {
    const n = parseFloat(v.doubleValue);
    return isNaN(n) ? null : n;
  }
  if ("arrayValue" in v) {
    const vals = v.arrayValue?.values || [];
    return vals.map(fsValueToPy);
  }
  if ("mapValue" in v) {
    const fields = v.mapValue?.fields || {};
    const out: Record<string, unknown> = {};
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = fsValueToPy(fv);
    }
    return out;
  }
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTournamentFields(doc: any): Record<string, any> {
  const fields = doc?.fields || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [k, fv] of Object.entries(fields)) {
    out[k] = fsValueToPy(fv);
  }
  return out;
}

// ─── Data extraction ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEntrantToUid(fields: Record<string, any>): Map<number, string> {
  const map = new Map<number, string>();
  for (const [k, v] of Object.entries(fields)) {
    const m = k.match(/^E(\d+):P1$/);
    if (!m) continue;
    const eid = parseInt(m[1], 10);
    if (typeof v === "string" && v) {
      map.set(eid, v);
    }
  }
  return map;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMatches(fields: Record<string, any>): RawMatch[] {
  const matches: RawMatch[] = [];
  for (const [k, v] of Object.entries(fields)) {
    const m = k.match(/^S(\d+):T(\d+)$/);
    if (!m || typeof v !== "object" || v === null) continue;

    const season = parseInt(m[1], 10);
    const table = parseInt(m[2], 10);

    const start = typeof v.Start === "number" ? v.Start : null;
    const end = typeof v.End === "number" ? v.End : null;

    const esRaw = v.Es;
    const es: number[] = [];
    if (Array.isArray(esRaw)) {
      for (const x of esRaw) {
        if (typeof x === "number") es.push(x);
        else if (typeof x === "string" && /^\d+$/.test(x)) es.push(parseInt(x, 10));
      }
    }

    matches.push({
      season,
      table,
      start,
      end,
      es,
      winner: v.Winner ?? null,
      mute: v.Mute === true,
    });
  }

  matches.sort((a, b) => (a.start ?? 0) - (b.start ?? 0) || a.season - b.season || a.table - b.table);
  return matches;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDropState(fields: Record<string, any>): { isDropped: Map<number, boolean>; droppedAt: Map<number, number> } {
  const latestDrop = new Map<number, number>();
  const latestUndrop = new Map<number, number>();

  for (const [k, v] of Object.entries(fields)) {
    let m = k.match(/^E(\d+):D:Drop(\d+)$/);
    if (m) {
      const eid = parseInt(m[1], 10);
      const ts = typeof v === "number" ? v : NaN;
      if (!isNaN(ts)) {
        const prev = latestDrop.get(eid);
        if (prev === undefined || ts > prev) latestDrop.set(eid, ts);
      }
      continue;
    }
    m = k.match(/^E(\d+):D:Undrop(\d+)$/);
    if (m) {
      const eid = parseInt(m[1], 10);
      const ts = typeof v === "number" ? v : NaN;
      if (!isNaN(ts)) {
        const prev = latestUndrop.get(eid);
        if (prev === undefined || ts > prev) latestUndrop.set(eid, ts);
      }
    }
  }

  const isDropped = new Map<number, boolean>();
  const droppedAt = new Map<number, number>();

  const allIds = new Set([...latestDrop.keys(), ...latestUndrop.keys()]);
  for (const eid of allIds) {
    const d = latestDrop.get(eid);
    const u = latestUndrop.get(eid);
    const dropped = d !== undefined && (u === undefined || d > u);
    isDropped.set(eid, dropped);
    if (dropped && d !== undefined) droppedAt.set(eid, d);
  }

  return { isDropped, droppedAt };
}

// ─── Match validity (matches bot's _is_valid_completed_match) ───

function isValidCompletedMatch(m: RawMatch): boolean {
  if (m.es.length < 2) return false;
  if (m.mute) return false;
  if (m.end === null) return false;
  if (typeof m.winner === "number") return true;
  if (m.winner === "_DRAW_") return true;
  return false;
}

// ─── Standings computation (matches bot's _compute_standings) ───

function computeStandings(matches: RawMatch[], entrantIds: Set<number>) {
  const points = new Map<number, number>();
  const stats = new Map<number, { games: number; wins: number; draws: number; losses: number; opponents: Set<number> }>();
  let totalMatches = 0;
  let inProgress = 0;
  let voided = 0;
  const voidedMatchIds: { season: number; table: number }[] = [];

  for (const eid of entrantIds) {
    points.set(eid, START_POINTS);
    stats.set(eid, { games: 0, wins: 0, draws: 0, losses: 0, opponents: new Set() });
  }

  for (const m of matches) {
    if (!isValidCompletedMatch(m)) {
      if (m.es.length >= 2) {
        if (m.end === null) inProgress++;
        else {
          voided++;
          voidedMatchIds.push({ season: m.season, table: m.table });
        }
      }
      continue;
    }
    totalMatches++;

    // Ensure all participants initialized
    for (const eid of m.es) {
      if (!points.has(eid)) {
        points.set(eid, START_POINTS);
        stats.set(eid, { games: 0, wins: 0, draws: 0, losses: 0, opponents: new Set() });
      }
    }

    // Track opponents
    for (const eid of m.es) {
      const s = stats.get(eid)!;
      for (const opp of m.es) {
        if (opp !== eid) s.opponents.add(opp);
      }
    }

    // Staking
    const stakes: { eid: number; stake: number }[] = [];
    let pot = 0;
    for (const eid of m.es) {
      const stake = points.get(eid)! * WAGER_RATE;
      stakes.push({ eid, stake });
      pot += stake;
      points.set(eid, points.get(eid)! - stake);
    }

    if (m.winner === "_DRAW_") {
      const share = pot / m.es.length;
      for (const eid of m.es) {
        points.set(eid, points.get(eid)! + share);
        const s = stats.get(eid)!;
        s.games++;
        s.draws++;
      }
    } else {
      const winnerId = m.winner as number;
      points.set(winnerId, (points.get(winnerId) ?? START_POINTS) + pot);

      for (const eid of m.es) {
        const s = stats.get(eid)!;
        s.games++;
        if (eid === winnerId) s.wins++;
        else s.losses++;
      }
    }
  }

  // Win%
  const winPct = new Map<number, number>();
  for (const [eid, s] of stats) {
    winPct.set(eid, s.games > 0 ? s.wins / s.games : 0);
  }

  // OW% = average win% of unique opponents
  const owPct = new Map<number, number>();
  for (const [eid, s] of stats) {
    const opps = [...s.opponents];
    if (opps.length === 0) {
      owPct.set(eid, 0);
      continue;
    }
    const avg = opps.reduce((sum, opp) => sum + (winPct.get(opp) ?? 0), 0) / opps.length;
    owPct.set(eid, avg);
  }

  return { points, stats, winPct, owPct, totalMatches, inProgress, voided, voidedMatchIds };
}

// ─── Main fetch ───

export async function fetchLiveStandings(bracketId?: string): Promise<LiveStandingsResult> {
  // Check cache
  if (cachedResult && Date.now() < cacheExpires) {
    return cachedResult;
  }

  const bid = bracketId || TOPDECK_BRACKET_ID;
  if (!bid) throw new Error("TOPDECK_BRACKET_ID not configured");

  if (!FIRESTORE_DOC_URL_TEMPLATE) {
    throw new Error("FIRESTORE_DOC_URL_TEMPLATE not configured");
  }

  const docUrl = FIRESTORE_DOC_URL_TEMPLATE.replace("{bracket_id}", bid);

  // Fetch both endpoints in parallel
  const [players, docRes] = await Promise.all([
    fetchPublicPData(bid),
    fetch(docUrl),
  ]);

  if (!docRes.ok) {
    throw new Error(`TopDeck Firestore doc returned ${docRes.status}`);
  }

  const doc = await docRes.json();

  const fields = parseTournamentFields(doc);
  const entrantToUid = extractEntrantToUid(fields);
  const matches = extractMatches(fields);
  const dropState = extractDropState(fields);

  // Collect all entrant IDs
  const entrantIds = new Set(entrantToUid.keys());
  for (const m of matches) {
    for (const eid of m.es) entrantIds.add(eid);
  }

  const { points, stats, winPct, owPct, totalMatches, inProgress, voided, voidedMatchIds } = computeStandings(matches, entrantIds);

  // Build rows
  const rows: LivePlayerRow[] = [];
  for (const eid of entrantIds) {
    const uid = entrantToUid.get(eid) ?? null;
    let playerData: { name?: string; discord?: string } | null = null;

    if (uid !== null && typeof players === "object" && players !== null) {
      playerData = players[uid] ?? null;
    }

    const s = stats.get(eid) ?? { games: 0, wins: 0, draws: 0, losses: 0, opponents: new Set() };
    const dropped = dropState.isDropped.get(eid) ?? false;

    rows.push({
      entrant_id: eid,
      uid,
      name: playerData?.name || uid || "(unknown)",
      discord: playerData?.discord || "",
      points: Math.round((points.get(eid) ?? START_POINTS) * 100) / 100,
      win_pct: Math.round((winPct.get(eid) ?? 0) * 10000) / 100,
      ow_pct: Math.round((owPct.get(eid) ?? 0) * 10000) / 100,
      games: s.games,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      dropped,
    });
  }

  // Sort: active first, then -points, -ow_pct, -win_pct (matches bot)
  rows.sort((a, b) => {
    if (a.dropped !== b.dropped) return a.dropped ? 1 : -1;
    if (b.points !== a.points) return b.points - a.points;
    if (b.ow_pct !== a.ow_pct) return b.ow_pct - a.ow_pct;
    if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct;
    return 0;
  });

  // Build game pods from matches
  const gamePods: GamePod[] = matches
    .filter((m) => m.es.length >= 2)
    .map((m) => {
      const podPlayers = m.es.map((eid) => {
        const uid = entrantToUid.get(eid) ?? String(eid);
        const pdata = uid && typeof players === "object" && players !== null ? players[uid] : null;
        return { uid, name: pdata?.name || uid, discord: pdata?.discord || "" };
      });

      let winner: GamePod["winner"] = null;
      let status: GamePod["status"];

      if (m.mute) {
        status = "voided";
      } else if (m.end === null) {
        status = "in_progress";
      } else if (m.winner === "_DRAW_") {
        status = "draw";
      } else if (typeof m.winner === "number") {
        status = "completed";
        const wUid = entrantToUid.get(m.winner) ?? String(m.winner);
        const wData = wUid && typeof players === "object" && players !== null ? players[wUid] : null;
        winner = { uid: wUid, name: wData?.name || wUid };
      } else {
        status = "voided";
      }

      return {
        season: m.season,
        table: m.table,
        players: podPlayers,
        winner,
        status,
        startTime: m.start,
        endTime: m.end,
      };
    });

  // Cache
  const result: LiveStandingsResult = { rows, totalMatches, inProgress, voided, voidedMatchIds, gamePods };
  cachedResult = result;
  cacheExpires = Date.now() + CACHE_TTL_MS;

  return result;
}

/** Clear the in-memory cache (e.g. after a manual refresh). */
export function clearLiveCache(): void {
  cachedResult = null;
  cacheExpires = 0;
}

// ─── Elimination pods (Top 16 / Top 4) ───

export interface EliminationPod {
  season: number;
  table: number;
  players: { uid: string; name: string }[];
  winner: { uid: string; name: string } | null;
}

export interface EliminationData {
  top16: EliminationPod[];
  top4: EliminationPod[];
  champion: { uid: string; name: string } | null;
}

// Cache per bracket_id
const elimCache = new Map<string, { data: EliminationData; expires: number }>();

/**
 * Fetch elimination round pods (Top 16 = season 1, Top 4 = season 2)
 * directly from the TopDeck Firestore API for any bracket.
 */
export async function fetchEliminationPods(bracketId: string): Promise<EliminationData> {
  const cached = elimCache.get(bracketId);
  if (cached && Date.now() < cached.expires) return cached.data;

  if (!FIRESTORE_DOC_URL_TEMPLATE) {
    throw new Error("FIRESTORE_DOC_URL_TEMPLATE not configured");
  }

  const docUrl = FIRESTORE_DOC_URL_TEMPLATE.replace("{bracket_id}", bracketId);

  const [players, docRes] = await Promise.all([
    fetchPublicPData(bracketId),
    fetch(docUrl),
  ]);

  if (!docRes.ok) {
    throw new Error(`TopDeck Firestore doc returned ${docRes.status}`);
  }

  const doc = await docRes.json();
  const fields = parseTournamentFields(doc);
  const entrantToUid = extractEntrantToUid(fields);
  const matches = extractMatches(fields);

  function resolveName(eid: number): { uid: string; name: string } {
    const uid = entrantToUid.get(eid) ?? String(eid);
    const pdata = uid && typeof players === "object" && players !== null ? players[uid] : null;
    return { uid, name: pdata?.name || uid };
  }

  function buildPod(m: RawMatch): EliminationPod {
    const podPlayers = m.es.map(resolveName);
    let winner: { uid: string; name: string } | null = null;
    if (typeof m.winner === "number") {
      winner = resolveName(m.winner);
    }
    return { season: m.season, table: m.table, players: podPlayers, winner };
  }

  // Season 1 = Top 16 (4 pods of 4), Season 2 = Top 4 (1 pod of 4)
  const top16 = matches.filter((m) => m.season === 1 && m.es.length >= 2).map(buildPod);
  const top4 = matches.filter((m) => m.season === 2 && m.es.length >= 2).map(buildPod);

  // Champion = winner of the Top 4 pod
  const champion = top4.length > 0 && top4[0].winner ? top4[0].winner : null;

  const data: EliminationData = { top16, top4, champion };
  elimCache.set(bracketId, { data, expires: Date.now() + CACHE_TTL_MS });

  return data;
}
