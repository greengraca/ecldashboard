import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import {
  DEFAULT_PATREON_NET,
  DEFAULT_KOFI_NET,
  DEFAULT_MANUAL_NET,
} from "./constants";
import type { SubscriptionRate } from "./types";

const COLLECTION = "dashboard_subscription_rates";

export interface ActiveRates {
  patreon_net: number;
  kofi_net: number;
  manual_net: number;
}

export async function getRatesForMonth(month: string): Promise<ActiveRates> {
  const db = await getDb();
  const rate = await db
    .collection<SubscriptionRate>(COLLECTION)
    .find({ effective_from: { $lte: month } })
    .sort({ effective_from: -1 })
    .limit(1)
    .toArray();

  if (rate.length === 0) {
    return {
      patreon_net: DEFAULT_PATREON_NET,
      kofi_net: DEFAULT_KOFI_NET,
      manual_net: DEFAULT_MANUAL_NET,
    };
  }

  return {
    patreon_net: rate[0].patreon_net,
    kofi_net: rate[0].kofi_net,
    manual_net: rate[0].manual_net,
  };
}

export async function getAllRates(): Promise<SubscriptionRate[]> {
  const db = await getDb();
  return db
    .collection<SubscriptionRate>(COLLECTION)
    .find({})
    .sort({ effective_from: 1 })
    .toArray();
}

export async function createRate(
  data: {
    effective_from: string;
    patreon_net: number;
    kofi_net: number;
    manual_net: number;
  },
  userId: string,
  userName: string
): Promise<SubscriptionRate> {
  const db = await getDb();

  // Validate YYYY-MM format
  if (!/^\d{4}-\d{2}$/.test(data.effective_from)) {
    throw new Error("effective_from must be YYYY-MM format");
  }

  const now = new Date().toISOString();
  const doc: Omit<SubscriptionRate, "_id"> = {
    ...data,
    created_by: userName,
    created_at: now,
  };

  const result = await db.collection(COLLECTION).insertOne(doc);

  await logActivity(
    "create",
    "subscription_rate",
    result.insertedId.toString(),
    { ...data },
    userId,
    userName
  );

  return { _id: result.insertedId, ...doc };
}
