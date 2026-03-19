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
    seat: number;
    winRate: number;
    gamesInSeat: number;
    totalSeatGames: number;
  } | null;
  unluckiest: {
    name: string;
    discord: string;
    seat: number;
    winRate: number;
    gamesInSeat: number;
    totalSeatGames: number;
  } | null;
}

// ─── Computation ───

const MIN_SEAT_GAMES = 3;

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
    end?: number | null;
  }>,
  playerNames: Map<number, { name: string; discord: string }>
): TurnOrderStats {
  const turnWins: [number, number, number, number] = [0, 0, 0, 0];
  let completedPods = 0;
  let draws = 0;

  // Per-player seat tracking: entrantId → seatIndex → { games, wins }
  const playerSeats = new Map<number, Map<number, { games: number; wins: number }>>();

  for (const m of matches) {
    // Swiss rounds only
    if (m.season !== 0) continue;
    // Must be a 4-player pod
    if (m.es.length !== 4) continue;
    // Must not be muted
    if (m.mute) continue;
    // Must have an end time
    if (m.end == null) continue;
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

  // Calculate rates
  const turnRates: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    turnRates[i] = completedPods > 0 ? turnWins[i] / completedPods : 0;
  }

  const totalWithDraws = completedPods + draws;
  const drawRate = totalWithDraws > 0 ? draws / totalWithDraws : 0;

  // Find luckiest and unluckiest
  let luckiest: TurnOrderStats["luckiest"] = null;
  let unluckiest: TurnOrderStats["unluckiest"] = null;

  let highestWinRate = -1;
  let lowestWinRate = Infinity;

  for (const [eid, seats] of playerSeats) {
    const info = playerNames.get(eid);
    if (!info) continue;

    // Total games across all seats for this player
    let totalSeatGames = 0;
    for (const seatData of seats.values()) {
      totalSeatGames += seatData.games;
    }

    for (const [seatIdx, seatData] of seats) {
      if (seatData.games < MIN_SEAT_GAMES) continue;

      const winRate = seatData.wins / seatData.games;

      if (winRate > highestWinRate) {
        highestWinRate = winRate;
        luckiest = {
          name: info.name,
          discord: info.discord,
          seat: seatIdx + 1, // 1-indexed
          winRate,
          gamesInSeat: seatData.games,
          totalSeatGames,
        };
      }

      if (winRate < lowestWinRate) {
        lowestWinRate = winRate;
        unluckiest = {
          name: info.name,
          discord: info.discord,
          seat: seatIdx + 1, // 1-indexed
          winRate,
          gamesInSeat: seatData.games,
          totalSeatGames,
        };
      }
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
