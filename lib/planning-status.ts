import { getDb } from "./mongodb";
import type { PlanningStatus } from "./types";

export async function getPlanningStatus(viewingMonth: string): Promise<PlanningStatus> {
  const db = await getDb();

  // Planning checks the NEXT month relative to viewingMonth
  const [year, mon] = viewingMonth.split("-").map(Number);
  const nextDate = new Date(year, mon, 1); // mon is 1-based but Date month is 0-based, so this = next month
  const planningMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  // Distribution checks the VIEWING month
  const distributionMonth = viewingMonth;

  // Run all checks in parallel
  const [budget, podConfig, cardSingles, placements, dragonShieldNext, dragonShieldCurrent, raffle] =
    await Promise.all([
      db.collection("dashboard_prize_budgets").findOne({ month: planningMonth }),
      db.collection("dashboard_treasure_pod_config").findOne({ month: planningMonth, status: "active" }),
      db.collection("dashboard_prizes").countDocuments({ month: planningMonth, category: "mtg_single", recipient_type: "placement" }),
      db.collection("dashboard_prizes").countDocuments({ month: planningMonth, recipient_type: "most_games" }),
      db.collection("dashboard_dragon_shield").findOne({ month: planningMonth }),
      db.collection("dashboard_dragon_shield").findOne({ month: distributionMonth }),
      db.collection("dashboard_raffle_results").findOne({ month: distributionMonth }),
    ]);

  // Sleeve files: all 3 slots filled
  const sleeveFilesUploaded = dragonShieldNext
    ? !!(dragonShieldNext.sleeve_files?.champion && dragonShieldNext.sleeve_files?.top4 && dragonShieldNext.sleeve_files?.top16)
    : false;

  // Playmat files: both slots filled
  const playmatFilesUploaded = dragonShieldNext
    ? !!(dragonShieldNext.playmat_files?.champion && dragonShieldNext.playmat_files?.top4)
    : false;

  // Distribution: codes
  const codes = dragonShieldCurrent?.codes || [];
  const codesLoaded = codes.length === 16;
  const codesSent = codesLoaded && codes.every((c: { sent: boolean }) => c.sent);

  // Distribution: addresses — check top 4 players have addresses
  let addressesCollected = false;
  if (codes.length >= 4) {
    const top4Uids = codes.slice(0, 4).map((c: { player_uid: string | null }) => c.player_uid).filter(Boolean);
    if (top4Uids.length === 4) {
      const addressCount = await db.collection("dashboard_player_addresses").countDocuments({
        player_uid: { $in: top4Uids },
      });
      addressesCollected = addressCount >= 4;
    }
  }

  return {
    planning: {
      budget_set: !!budget,
      pod_config_active: !!podConfig,
      card_singles_added: cardSingles >= 4,
      card_singles_count: cardSingles as number,
      placement_prizes_set: placements >= 1,
      sleeve_files_uploaded: sleeveFilesUploaded,
      playmat_files_uploaded: playmatFilesUploaded,
    },
    distribution: {
      codes_loaded: codesLoaded,
      codes_sent: codesSent,
      addresses_collected: addressesCollected,
      raffle_done: !!raffle,
      playmats_handed_off: dragonShieldCurrent?.playmat_handoff ?? false,
    },
    planning_month: planningMonth,
    distribution_month: distributionMonth,
  };
}
