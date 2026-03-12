import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import type { ManualPayment } from "./types";

const COLLECTION = "dashboard_manual_payments";

export async function getManualPayments(
  month: string
): Promise<ManualPayment[]> {
  const db = await getDb();
  return db.collection<ManualPayment>(COLLECTION).find({ month }).toArray();
}

export async function markManualPaid(
  month: string,
  discordId: string,
  userId: string,
  userName: string
): Promise<ManualPayment> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc: Omit<ManualPayment, "_id"> = {
    month,
    discord_id: discordId,
    marked_by: userName,
    created_at: now,
  };

  const result = await db.collection(COLLECTION).insertOne(doc);

  await logActivity(
    "create",
    "manual_payment",
    result.insertedId.toString(),
    { month, discord_id: discordId },
    userId,
    userName
  );

  return { _id: result.insertedId, ...doc };
}

export async function unmarkManualPaid(
  month: string,
  discordId: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();

  const doc = await db
    .collection(COLLECTION)
    .findOne({ month, discord_id: discordId });

  if (!doc) return;

  await db
    .collection(COLLECTION)
    .deleteOne({ month, discord_id: discordId });

  await logActivity(
    "delete",
    "manual_payment",
    doc._id.toString(),
    { month, discord_id: discordId },
    userId,
    userName
  );
}
