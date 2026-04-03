import { getDb } from "./mongodb";
import { getHistoricalMonths } from "./topdeck";
import { TOPDECK_BRACKET_ID } from "./constants";

// In-memory cache (bracket_id per month rarely changes)
const cache = new Map<string, { bracket_id: string; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Resolve the bracket_id for a given month ("YYYY-MM").
 *
 * Priority:
 *  1. online_games collection — the bot writes games with the correct bracket_id
 *     as they happen, so this works even for the current month before any dump.
 *  2. topdeck_month_dump_runs / chunks — historical dumps.
 *  3. TOPDECK_BRACKET_ID env var — last resort fallback.
 */
export async function getBracketIdForMonth(month: string): Promise<string> {
  const cached = cache.get(month);
  if (cached && Date.now() < cached.expires) return cached.bracket_id;

  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);

  const db = await getDb();

  // 1. Check online_games — pick the bracket_id with the most games this month
  try {
    const results = await db
      .collection("online_games")
      .aggregate<{ _id: string; count: number }>([
        { $match: { year, month: monthNum } },
        { $group: { _id: "$bracket_id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ])
      .toArray();

    if (results.length > 0 && results[0]._id) {
      const bracketId = results[0]._id;
      cache.set(month, { bracket_id: bracketId, expires: Date.now() + CACHE_TTL });
      return bracketId;
    }
  } catch {
    // collection may not exist
  }

  // 2. Check dump runs
  const months = await getHistoricalMonths();
  const monthInfo = months.find((m) => m.month === month);
  if (monthInfo) {
    cache.set(month, { bracket_id: monthInfo.bracket_id, expires: Date.now() + CACHE_TTL });
    return monthInfo.bracket_id;
  }

  // 3. Fall back to env var
  return TOPDECK_BRACKET_ID;
}
