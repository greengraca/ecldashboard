import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { createTransaction, updateTransaction, deleteTransaction } from "./finance";
import type {
  Prize,
  PrizeBudget,
  PrizeSummary,
  PrizeCategory,
  RecipientType,
  ShippingStatus,
  PrizeStatus,
  PrizeBudgetAllocations,
} from "./types";

const COLLECTION = "dashboard_prizes";
const BUDGET_COLLECTION = "dashboard_prize_budgets";

// ─── Prizes CRUD ───

export async function getPrizes(month: string): Promise<Prize[]> {
  const db = await getDb();
  return db
    .collection<Prize>(COLLECTION)
    .find({ month })
    .sort({ recipient_type: 1, placement: 1 })
    .toArray();
}

export async function createPrize(
  data: {
    month: string;
    category: PrizeCategory;
    name: string;
    description: string;
    image_url: string | null;
    value: number;
    recipient_type: RecipientType;
    placement: number | null;
    recipient_uid: string | null;
    recipient_name: string;
    recipient_discord_id: string | null;
    shipping_status: ShippingStatus;
    status: PrizeStatus;
  },
  userId: string,
  userName: string
): Promise<Prize> {
  const db = await getDb();
  const now = new Date().toISOString();

  let transactionId: string | null = null;

  if (data.value > 0) {
    const tx = await createTransaction(
      {
        month: data.month,
        date: new Date().toISOString().substring(0, 10),
        type: "expense",
        category: "prize",
        description: `Prize: ${data.name} (${data.recipient_name})`,
        amount: data.value,
        tags: ["auto-prize", data.category],
      },
      userId,
      userName
    );
    transactionId = String(tx._id);
  }

  const doc: Omit<Prize, "_id"> = {
    ...data,
    tracking_number: null,
    shipping_date: null,
    delivery_date: null,
    shipping_notes: null,
    transaction_id: transactionId,
    created_by: userName,
    modified_by: userName,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection(COLLECTION).insertOne(doc);

  await logActivity("create", "prize", result.insertedId.toString(), {
    name: data.name,
    category: data.category,
    value: data.value,
    recipient: data.recipient_name,
  }, userId, userName);

  return { _id: result.insertedId, ...doc };
}

export async function updatePrize(
  id: string,
  data: Partial<{
    category: PrizeCategory;
    name: string;
    description: string;
    image_url: string | null;
    value: number;
    recipient_type: RecipientType;
    placement: number | null;
    recipient_uid: string | null;
    recipient_name: string;
    recipient_discord_id: string | null;
    shipping_status: ShippingStatus;
    status: PrizeStatus;
  }>,
  userId: string,
  userName: string
): Promise<Prize | null> {
  const db = await getDb();
  const existing = await db
    .collection<Prize>(COLLECTION)
    .findOne({ _id: new ObjectId(id) });

  if (!existing) return null;

  // Handle transaction sync when value changes
  if (data.value !== undefined && data.value !== existing.value) {
    if (existing.transaction_id && data.value > 0) {
      await updateTransaction(
        existing.transaction_id,
        {
          amount: data.value,
          description: `Prize: ${data.name || existing.name} (${data.recipient_name || existing.recipient_name})`,
        },
        userId,
        userName
      );
    } else if (existing.transaction_id && data.value === 0) {
      await deleteTransaction(existing.transaction_id, userId, userName);
      data = { ...data } as typeof data & { transaction_id?: null };
      (data as Record<string, unknown>).transaction_id = null;
    } else if (!existing.transaction_id && data.value > 0) {
      const tx = await createTransaction(
        {
          month: existing.month,
          date: new Date().toISOString().substring(0, 10),
          type: "expense",
          category: "prize",
          description: `Prize: ${data.name || existing.name} (${data.recipient_name || existing.recipient_name})`,
          amount: data.value,
          tags: ["auto-prize", data.category || existing.category],
        },
        userId,
        userName
      );
      (data as Record<string, unknown>).transaction_id = String(tx._id);
    }
  }

  const updateData = {
    ...data,
    modified_by: userName,
    updated_at: new Date().toISOString(),
  };

  await db
    .collection(COLLECTION)
    .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  await logActivity("update", "prize", id, {
    updated_fields: Object.keys(data),
  }, userId, userName);

  return { ...existing, ...updateData, _id: existing._id } as Prize;
}

export async function deletePrize(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const doc = await db
    .collection<Prize>(COLLECTION)
    .findOne({ _id: new ObjectId(id) });

  if (doc?.transaction_id) {
    await deleteTransaction(doc.transaction_id, userId, userName);
  }

  await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

  await logActivity("delete", "prize", id, {
    name: doc?.name,
    value: doc?.value,
  }, userId, userName);
}

export async function updateShipping(
  id: string,
  data: Partial<{
    shipping_status: ShippingStatus;
    tracking_number: string | null;
    shipping_date: string | null;
    delivery_date: string | null;
    shipping_notes: string | null;
  }>,
  userId: string,
  userName: string
): Promise<Prize | null> {
  const db = await getDb();

  const updateData = {
    ...data,
    modified_by: userName,
    updated_at: new Date().toISOString(),
  };

  const result = await db
    .collection<Prize>(COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

  if (!result) return null;

  await logActivity("update", "prize", id, {
    action: "shipping_update",
    ...data,
  }, userId, userName);

  return result;
}

// ─── Budget ───

export async function getPrizeBudget(month: string): Promise<PrizeBudget | null> {
  const db = await getDb();
  return db.collection<PrizeBudget>(BUDGET_COLLECTION).findOne({ month });
}

export async function upsertPrizeBudget(
  month: string,
  data: {
    total_budget: number;
    allocations: PrizeBudgetAllocations;
    notes: string;
  },
  userId: string,
  userName: string
): Promise<PrizeBudget> {
  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db.collection<PrizeBudget>(BUDGET_COLLECTION).findOneAndUpdate(
    { month },
    {
      $set: {
        ...data,
        month,
        modified_by: userName,
        updated_at: now,
      },
      $setOnInsert: {
        created_by: userName,
        created_at: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  await logActivity("update", "prize_budget", month, {
    total_budget: data.total_budget,
  }, userId, userName);

  return result!;
}

// ─── Summary ───

export async function getPrizeSummary(month: string): Promise<PrizeSummary> {
  const db = await getDb();

  const [prizes, budget] = await Promise.all([
    db.collection<Prize>(COLLECTION).find({ month }).toArray(),
    db.collection<PrizeBudget>(BUDGET_COLLECTION).findOne({ month }),
  ]);

  const totalValue = prizes.reduce((sum, p) => sum + p.value, 0);

  return {
    total_prizes: prizes.length,
    total_value: totalValue,
    awarded: prizes.filter((p) => p.status === "awarded").length,
    pending_shipment: prizes.filter((p) => p.shipping_status === "pending").length,
    shipped: prizes.filter((p) => p.shipping_status === "shipped").length,
    delivered: prizes.filter((p) => p.shipping_status === "delivered").length,
    budget_remaining: budget ? budget.total_budget - totalValue : null,
  };
}

// ─── Auto-populate ───

export async function autoPopulatePrizes(
  month: string,
  userId: string,
  userName: string
): Promise<number> {
  const db = await getDb();

  const bracketResults = await db
    .collection("dashboard_bracket_results")
    .findOne({ month });

  const existingPrizes = await db
    .collection<Prize>(COLLECTION)
    .find({ month })
    .toArray();

  const existingKeys = new Set(
    existingPrizes.map((p) => `${p.recipient_type}:${p.placement ?? ""}`)
  );

  let created = 0;
  const now = new Date().toISOString();

  // Create placement stubs from Top 4 order
  const top4Order: Array<{ uid: string; name: string }> = bracketResults?.top4_order || [];
  for (let i = 0; i < top4Order.length && i < 4; i++) {
    const key = `placement:${i + 1}`;
    if (existingKeys.has(key)) continue;

    const player = top4Order[i];
    const doc: Omit<Prize, "_id"> = {
      month,
      category: "other",
      name: `${getPlacementLabel(i + 1)} Place Prize`,
      description: "",
      image_url: null,
      value: 0,
      recipient_type: "placement",
      placement: i + 1,
      recipient_uid: player.uid,
      recipient_name: player.name,
      recipient_discord_id: null,
      shipping_status: "pending",
      tracking_number: null,
      shipping_date: null,
      delivery_date: null,
      shipping_notes: null,
      transaction_id: null,
      status: "planned",
      created_by: userName,
      modified_by: userName,
      created_at: now,
      updated_at: now,
    };

    await db.collection(COLLECTION).insertOne(doc);
    created++;
  }

  // Create Most Games stub
  if (!existingKeys.has("most_games:")) {
    const doc: Omit<Prize, "_id"> = {
      month,
      category: "other",
      name: "Most Games Prize",
      description: "",
      image_url: null,
      value: 0,
      recipient_type: "most_games",
      placement: null,
      recipient_uid: null,
      recipient_name: "TBD",
      recipient_discord_id: null,
      shipping_status: "pending",
      tracking_number: null,
      shipping_date: null,
      delivery_date: null,
      shipping_notes: null,
      transaction_id: null,
      status: "planned",
      created_by: userName,
      modified_by: userName,
      created_at: now,
      updated_at: now,
    };

    await db.collection(COLLECTION).insertOne(doc);
    created++;
  }

  if (created > 0) {
    await logActivity("create", "prize", month, {
      action: "auto_populate",
      count: created,
    }, userId, userName);
  }

  return created;
}

function getPlacementLabel(n: number): string {
  switch (n) {
    case 1: return "1st";
    case 2: return "2nd";
    case 3: return "3rd";
    case 4: return "4th";
    default: return `${n}th`;
  }
}
