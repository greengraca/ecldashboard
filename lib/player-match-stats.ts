// lib/player-match-stats.ts
//
// Computes current-month per-match analytics for a single player.
// Reuses fetchLiveStandings() (5-min cache) and replays the staking
// model to produce daily activity and progression snapshots.

import { fetchLiveStandings, START_POINTS } from "./topdeck-live";
import type { GamePod } from "./topdeck-live";
import { WAGER_RATE } from "./constants";
import type { DailyActivity, DailyProgression, PlayerMatchStats } from "./types";

// ─── Helpers ───

const lisbonDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Lisbon",
  day: "numeric",
});

function getLisbonDay(timestampSec: number): number {
  return parseInt(lisbonDayFmt.format(new Date(timestampSec * 1000)), 10);
}

function completedPods(pods: GamePod[]): GamePod[] {
  return pods
    .filter(
      (p) =>
        (p.status === "completed" || p.status === "draw") &&
        p.endTime !== null
    )
    .sort((a, b) => a.endTime! - b.endTime!);
}

// ─── Daily Activity ───

function buildDailyActivity(
  pods: GamePod[],
  targetUid: string
): DailyActivity[] {
  const map = new Map<number, DailyActivity>();

  for (const pod of pods) {
    const isParticipant = pod.players.some((p) => p.uid === targetUid);
    if (!isParticipant) continue;

    const day = getLisbonDay(pod.endTime!);
    const entry = map.get(day) || { day, wins: 0, losses: 0, draws: 0 };

    if (pod.status === "draw") {
      entry.draws++;
    } else if (pod.winner?.uid === targetUid) {
      entry.wins++;
    } else {
      entry.losses++;
    }
    map.set(day, entry);
  }

  return Array.from(map.values()).sort((a, b) => a.day - b.day);
}

// ─── Daily Progression (staking replay) ───

function buildDailyProgression(
  pods: GamePod[],
  targetUid: string
): DailyProgression[] {
  if (pods.length === 0) return [];

  // Collect all unique player UIDs across all pods
  const allUids = new Set<string>();
  for (const pod of pods) {
    for (const p of pod.players) allUids.add(p.uid);
  }

  // Initialize state for all players
  const points = new Map<string, number>();
  const stats = new Map<string, { wins: number; games: number }>();
  for (const uid of allUids) {
    points.set(uid, START_POINTS);
    stats.set(uid, { wins: 0, games: 0 });
  }

  const progression: DailyProgression[] = [];
  let lastDay = -1;

  for (let i = 0; i < pods.length; i++) {
    const pod = pods[i];
    const uids = pod.players.map((p) => p.uid);

    // Ensure any late-appearing players are initialized
    for (const uid of uids) {
      if (!points.has(uid)) {
        points.set(uid, START_POINTS);
        stats.set(uid, { wins: 0, games: 0 });
      }
    }

    // Staking: each participant wagers WAGER_RATE of their points
    let pot = 0;
    for (const uid of uids) {
      const stake = points.get(uid)! * WAGER_RATE;
      pot += stake;
      points.set(uid, points.get(uid)! - stake);
    }

    if (pod.status === "draw") {
      const share = pot / uids.length;
      for (const uid of uids) {
        points.set(uid, points.get(uid)! + share);
        stats.get(uid)!.games++;
      }
    } else {
      const winnerUid = pod.winner!.uid;
      points.set(winnerUid, (points.get(winnerUid) ?? START_POINTS) + pot);
      for (const uid of uids) {
        stats.get(uid)!.games++;
        if (uid === winnerUid) stats.get(uid)!.wins++;
      }
    }

    // Emit snapshot at each new day boundary (after last match of the day)
    const day = getLisbonDay(pod.endTime!);
    const nextDay =
      i < pods.length - 1 ? getLisbonDay(pods[i + 1].endTime!) : -1;
    const isDayBoundary = nextDay !== day;

    if (isDayBoundary && day !== lastDay) {
      const targetPts = points.get(targetUid) ?? START_POINTS;
      const targetStats = stats.get(targetUid) ?? { wins: 0, games: 0 };
      const winPct =
        targetStats.games > 0
          ? (targetStats.wins / targetStats.games) * 100
          : 0;

      // Simplified ranking by points only (OW%/win% tiebreakers omitted
      // for daily chart snapshots — computing incremental OW% would require
      // per-player opponent tracking with minimal visual benefit)
      let rank = 1;
      for (const [uid, pts] of points) {
        if (uid !== targetUid && pts > targetPts) rank++;
      }

      progression.push({
        day,
        points: Math.round(targetPts * 100) / 100,
        rank,
        winPct: Math.round(winPct * 100) / 100,
        games: targetStats.games,
      });

      lastDay = day;
    }
  }

  return progression;
}

// ─── Public API ───

export async function getPlayerMatchStats(
  uid: string
): Promise<PlayerMatchStats | null> {
  const { rows, gamePods } = await fetchLiveStandings();

  // Check player exists in current bracket
  const playerRow = rows.find((r) => r.uid === uid);
  if (!playerRow) return null;

  const sorted = completedPods(gamePods);
  const dailyActivity = buildDailyActivity(sorted, uid);
  const dailyProgression = buildDailyProgression(sorted, uid);

  return {
    dailyActivity,
    dailyProgression,
    record: {
      wins: playerRow.wins,
      losses: playerRow.losses,
      draws: playerRow.draws,
    },
  };
}
