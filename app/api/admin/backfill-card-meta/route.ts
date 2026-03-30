import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getDb } from "@/lib/mongodb";

/**
 * One-time backfill: copy card metadata from existing mtg_single prizes
 * to their matching media drive entries (by r2_key).
 */
export const POST = withAuth(async () => {
  const db = await getDb();

  // Find all card single prizes that have an r2_key
  const prizes = await db
    .collection("dashboard_prizes")
    .find({ category: "mtg_single", r2_key: { $ne: null } })
    .toArray();

  let updated = 0;

  for (const prize of prizes) {
    const cardMeta = {
      ...(prize.name ? { cardName: prize.name } : {}),
      ...(prize.set_name ? { setName: prize.set_name } : {}),
      ...(prize.card_language ? { cardLanguage: prize.card_language } : {}),
      ...(prize.condition ? { condition: prize.condition } : {}),
      ...(prize.value ? { value: prize.value } : {}),
    };

    if (Object.keys(cardMeta).length === 0) continue;

    const result = await db
      .collection("dashboard_media_files")
      .updateOne(
        { r2Key: prize.r2_key },
        { $set: { cardMeta } }
      );

    if (result.modifiedCount > 0) updated++;
  }

  return NextResponse.json({
    data: { prizesScanned: prizes.length, driveEntriesUpdated: updated },
  });
}, "admin/backfill-card-meta:POST");
