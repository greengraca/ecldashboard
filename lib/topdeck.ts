import { getDb } from "./mongodb";

// ─── Types ───

export interface DumpMatch {
  season: number;
  table: number;
  start: number | null;
  end: number | null;
  es: number[];
  winner: number | string | null; // entrant_id or "_DRAW_"
  raw: Record<string, unknown>;
}

export interface MonthDumpPayload {
  month: string;
  bracket_id: string;
  matches: DumpMatch[];
  entrant_to_uid: Record<string, string>;
}

export interface MonthInfo {
  bracket_id: string;
  month: string;
}

export interface EntrantStats {
  points: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  win_pct: number;
}

// ─── Constants ───

const START_POINTS = 1000;
const WAGER_RATE = 0.1;

// ─── In-memory cache with TTL ───

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const dumpCache = new Map<string, CacheEntry<MonthDumpPayload>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// ─── Functions ───

/**
 * Find distinct (bracket_id, month) pairs from topdeck_month_dump_runs.
 * Falls back to chunks collection if runs collection has no data.
 */
export async function getHistoricalMonths(bracketId?: string): Promise<MonthInfo[]> {
  const db = await getDb();

  // Try runs collection first
  const runsFilter: Record<string, unknown> = {};
  if (bracketId) runsFilter.bracket_id = bracketId;

  let results: MonthInfo[] = [];

  try {
    const runsDocs = await db
      .collection("topdeck_month_dump_runs")
      .aggregate<{ _id: { bracket_id: string; month: string } }>([
        { $match: runsFilter },
        { $group: { _id: { bracket_id: "$bracket_id", month: "$month" } } },
      ])
      .toArray();

    if (runsDocs.length > 0) {
      results = runsDocs.map((d) => ({
        bracket_id: d._id.bracket_id,
        month: d._id.month,
      }));
    }
  } catch {
    // collection may not exist, fall through
  }

  // Fall back to chunks collection
  if (results.length === 0) {
    try {
      const chunkDocs = await db
        .collection("topdeck_month_dump_chunks")
        .aggregate<{ _id: { bracket_id: string; month: string } }>([
          { $match: runsFilter },
          { $group: { _id: { bracket_id: "$bracket_id", month: "$month" } } },
        ])
        .toArray();

      results = chunkDocs.map((d) => ({
        bracket_id: d._id.bracket_id,
        month: d._id.month,
      }));
    } catch {
      // collection may not exist
    }
  }

  // Sort ascending by month
  results.sort((a, b) => a.month.localeCompare(b.month));
  return results;
}

/**
 * Load chunks for a given month and reassemble the JSON payload.
 * Uses in-memory cache with TTL.
 */
export async function reassembleMonthDump(monthInfo: MonthInfo): Promise<MonthDumpPayload> {
  const cacheKey = `${monthInfo.bracket_id}:${monthInfo.month}`;
  const cached = getCached(dumpCache, cacheKey);
  if (cached) return cached;

  const db = await getDb();

  // Find the latest run for this bracket_id + month
  const latestRun = await db
    .collection("topdeck_month_dump_runs")
    .findOne(
      { bracket_id: monthInfo.bracket_id, month: monthInfo.month },
      { sort: { created_at: -1 } }
    );

  if (!latestRun) {
    throw new Error(
      `No dump run found for bracket_id=${monthInfo.bracket_id}, month=${monthInfo.month}`
    );
  }

  // Load all chunks for this run, ordered by chunk_index
  const chunks = await db
    .collection("topdeck_month_dump_chunks")
    .find({
      bracket_id: monthInfo.bracket_id,
      month: monthInfo.month,
      run_id: latestRun.run_id,
    })
    .sort({ chunk_index: 1 })
    .toArray();

  if (chunks.length === 0) {
    throw new Error(
      `No chunks found for run_id=${latestRun.run_id}`
    );
  }

  // Concatenate all chunk data and parse
  const jsonString = chunks.map((c) => c.data).join("");
  const payload: MonthDumpPayload = JSON.parse(jsonString);

  setCache(dumpCache, cacheKey, payload);
  return payload;
}

/**
 * Compute standings from matches using the staking model.
 * START_POINTS=1000, WAGER_RATE=0.1
 */
export function computeStandings(
  matches: DumpMatch[],
  allEntrantIds: number[]
): Map<number, EntrantStats> {
  // Initialize points for all known entrants
  const points = new Map<number, number>();
  const games = new Map<number, number>();
  const wins = new Map<number, number>();
  const losses = new Map<number, number>();
  const draws = new Map<number, number>();

  for (const eid of allEntrantIds) {
    points.set(eid, START_POINTS);
    games.set(eid, 0);
    wins.set(eid, 0);
    losses.set(eid, 0);
    draws.set(eid, 0);
  }

  // Process each valid completed match
  for (const match of matches) {
    // Valid completed: winner !== null and es.length >= 2
    if (match.winner === null || match.es.length < 2) continue;

    const participants = match.es;

    // Ensure all participants have been initialized
    for (const eid of participants) {
      if (!points.has(eid)) {
        points.set(eid, START_POINTS);
        games.set(eid, 0);
        wins.set(eid, 0);
        losses.set(eid, 0);
        draws.set(eid, 0);
      }
    }

    // Each player wagers WAGER_RATE of their current points
    const stakes = new Map<number, number>();
    let pot = 0;

    for (const eid of participants) {
      const currentPoints = points.get(eid)!;
      const stake = currentPoints * WAGER_RATE;
      stakes.set(eid, stake);
      pot += stake;
      points.set(eid, currentPoints - stake);
      games.set(eid, games.get(eid)! + 1);
    }

    const isDraw = match.winner === "_DRAW_";

    if (isDraw) {
      // Split pot equally among participants
      const share = pot / participants.length;
      for (const eid of participants) {
        points.set(eid, points.get(eid)! + share);
        draws.set(eid, draws.get(eid)! + 1);
      }
    } else {
      // Winner takes the entire pot
      const winnerId = match.winner as number;
      points.set(winnerId, (points.get(winnerId) ?? 0) + pot);
      wins.set(winnerId, (wins.get(winnerId) ?? 0) + 1);

      // Everyone else records a loss
      for (const eid of participants) {
        if (eid !== winnerId) {
          losses.set(eid, losses.get(eid)! + 1);
        }
      }
    }
  }

  // Build stats map
  const statsMap = new Map<number, EntrantStats>();

  for (const eid of points.keys()) {
    const g = games.get(eid)!;
    const w = wins.get(eid)!;
    const l = losses.get(eid)!;
    const d = draws.get(eid)!;

    statsMap.set(eid, {
      points: Math.round(points.get(eid)! * 100) / 100,
      games: g,
      wins: w,
      losses: l,
      draws: d,
      win_pct: g > 0 ? Math.round((w / g) * 10000) / 100 : 0,
    });
  }

  return statsMap;
}

/**
 * Extract single player stats from a dump payload.
 */
export function getPlayerStatsFromDump(
  dump: MonthDumpPayload,
  targetUid: string
): EntrantStats | null {
  // Find all entrant IDs that map to this uid
  const entrantIds: number[] = [];
  for (const [eidStr, uid] of Object.entries(dump.entrant_to_uid)) {
    if (uid === targetUid) {
      entrantIds.push(Number(eidStr));
    }
  }

  if (entrantIds.length === 0) return null;

  // Get all entrant IDs from the dump
  const allEntrantIds = Object.keys(dump.entrant_to_uid).map(Number);

  // Compute standings for all
  const standings = computeStandings(dump.matches, allEntrantIds);

  // Aggregate stats for all entrant IDs belonging to this uid
  let totalPoints = 0;
  let totalGames = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;

  for (const eid of entrantIds) {
    const stats = standings.get(eid);
    if (stats) {
      totalPoints += stats.points;
      totalGames += stats.games;
      totalWins += stats.wins;
      totalLosses += stats.losses;
      totalDraws += stats.draws;
    }
  }

  return {
    points: Math.round(totalPoints * 100) / 100,
    games: totalGames,
    wins: totalWins,
    losses: totalLosses,
    draws: totalDraws,
    win_pct: totalGames > 0 ? Math.round((totalWins / totalGames) * 10000) / 100 : 0,
  };
}
