// Most Games raffle selection. Single source of truth for the dashboard (raffle
// candidates + League "Most Games" chip). Mirrors eclBot's utils/most_games.py.
//
// Pure (no env, no I/O) so the client-side League page and the server agree.

export const MOST_GAMES_TOP_N = 5;
export const MOST_GAMES_MIN_POINTS = 800;
// Month (YYYY-MM) from which candidates need MOST_GAMES_MIN_POINTS. Earlier months
// stay frozen on the games-only rule, so a late draw for an old month matches
// what players were told at the time.
export const MOST_GAMES_MIN_POINTS_FROM = "2026-10";

/** True when `month` ("YYYY-MM") requires the minimum points. */
export function usesMostGamesPointsRule(month: string): boolean {
  return month >= MOST_GAMES_MIN_POINTS_FROM;
}

/**
 * The Top 5 by games among players who meet the points minimum (when the month
 * uses it). Ties on games break by points, matching the bot's (-games, -pts) sort.
 * Callers filter dropped players first — drop state comes from different sources.
 */
export function selectMostGamesTop5<T extends { games: number; points: number }>(
  players: T[],
  month: string,
): T[] {
  const pool = usesMostGamesPointsRule(month)
    ? players.filter((p) => p.points >= MOST_GAMES_MIN_POINTS)
    : players;
  return [...pool]
    .sort((a, b) => b.games - a.games || b.points - a.points)
    .slice(0, MOST_GAMES_TOP_N);
}
