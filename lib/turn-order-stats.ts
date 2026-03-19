// lib/turn-order-stats.ts
//
// Turn order (seat position) win rate analysis for 4-player pods.

// ─── Types ───

export interface TurnOrderStats {
  completedPods: number;
  turnWins: [number, number, number, number]; // wins per seat 1-4
  turnRates: [number, number, number, number]; // win rate per seat 1-4
  draws: number;
  drawRate: number;
  luckiest: {
    name: string;
    discord: string;
    gamesInSeat: number;
    totalGames: number;
    rate: number; // % of games in seat 1
  } | null;
  unluckiest: {
    name: string;
    discord: string;
    gamesInSeat: number;
    totalGames: number;
    rate: number; // % of games in seat 4
  } | null;
}

// ─── Computation ───

/**
 * Compute turn order win rate statistics from raw match data.
 * Only considers Swiss rounds (season === 0) with exactly 4 players.
 */
export function computeTurnOrderStats(
  matches: Array<{
    season: number;
    es: number[];
    winner: number | string | null;
    mute?: boolean;
  }>,
  playerNames: Map<number, { name: string; discord: string }>
): TurnOrderStats {
  const turnWins: [number, number, number, number] = [0, 0, 0, 0];
  let completedPods = 0;
  let draws = 0;

  // Per-player seat tracking: entrantId → seatIndex → { games, wins }
  const playerSeats = new Map<number, Map<number, { games: number; wins: number }>>();

  for (const m of matches) {
    // Swiss rounds only (season 1 in TopDeck's 1-based indexing)
    if (m.season !== 1) continue;
    // Must be a 4-player pod
    if (m.es.length !== 4) continue;
    // Must not be muted
    if (m.mute) continue;
    // Must have a valid winner
    if (m.winner === null) continue;

    const isDraw = m.winner === "_DRAW_";
    const winnerSeatIdx = isDraw ? -1 : m.es.indexOf(m.winner as number);

    // If winner is a number but not found in es, skip this match
    if (!isDraw && winnerSeatIdx === -1) continue;

    if (isDraw) {
      draws++;
    } else {
      completedPods++;
      turnWins[winnerSeatIdx]++;
    }

    // Track per-player seat data
    for (let seatIdx = 0; seatIdx < 4; seatIdx++) {
      const eid = m.es[seatIdx];
      if (!playerSeats.has(eid)) {
        playerSeats.set(eid, new Map());
      }
      const seats = playerSeats.get(eid)!;
      if (!seats.has(seatIdx)) {
        seats.set(seatIdx, { games: 0, wins: 0 });
      }
      const seatData = seats.get(seatIdx)!;
      seatData.games++;
      if (!isDraw && winnerSeatIdx === seatIdx && m.es[seatIdx] === (m.winner as number)) {
        seatData.wins++;
      }
    }
  }

  // Calculate rates — all 5 (seat 1-4 + draws) share the same denominator so they sum to 100%
  const totalPods = completedPods + draws;
  const turnRates: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    turnRates[i] = totalPods > 0 ? turnWins[i] / totalPods : 0;
  }
  const drawRate = totalPods > 0 ? draws / totalPods : 0;

  // Luckiest = highest % of games in seat 1 (min 5 total games)
  // Unluckiest = highest % of games in seat 4 (min 5 total games)
  const MIN_GAMES = 5;
  let luckiest: TurnOrderStats["luckiest"] = null;
  let unluckiest: TurnOrderStats["unluckiest"] = null;

  let highestSeat1Rate = -1;
  let highestSeat4Rate = -1;

  for (const [eid, seats] of playerSeats) {
    const info = playerNames.get(eid);
    if (!info) continue;

    let totalGames = 0;
    for (const seatData of seats.values()) {
      totalGames += seatData.games;
    }
    if (totalGames < MIN_GAMES) continue;

    const seat1 = seats.get(0)?.games ?? 0;
    const seat1Rate = seat1 / totalGames;
    if (seat1Rate > highestSeat1Rate) {
      highestSeat1Rate = seat1Rate;
      luckiest = {
        name: info.name,
        discord: info.discord,
        gamesInSeat: seat1,
        totalGames,
        rate: seat1Rate,
      };
    }

    const seat4 = seats.get(3)?.games ?? 0;
    const seat4Rate = seat4 / totalGames;
    if (seat4Rate > highestSeat4Rate) {
      highestSeat4Rate = seat4Rate;
      unluckiest = {
        name: info.name,
        discord: info.discord,
        gamesInSeat: seat4,
        totalGames,
        rate: seat4Rate,
      };
    }
  }

  return {
    completedPods,
    turnWins,
    turnRates,
    draws,
    drawRate,
    luckiest,
    unluckiest,
  };
}
