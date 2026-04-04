import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { createTransaction, updateTransaction, deleteTransaction } from "./finance";
import type { CardOrder, InventoryCard, InventoryCardStatus, Prize } from "./types";

const ORDERS_COLLECTION = "dashboard_card_orders";
const INVENTORY_COLLECTION = "dashboard_card_inventory";
const PRIZES_COLLECTION = "dashboard_prizes";

// ─── Orders ───

export async function getOrders(): Promise<CardOrder[]> {
  const db = await getDb();
  return db
    .collection<CardOrder>(ORDERS_COLLECTION)
    .find({})
    .sort({ date: -1 })
    .toArray();
}

export async function getOrder(id: string): Promise<CardOrder | null> {
  const db = await getDb();
  return db
    .collection<CardOrder>(ORDERS_COLLECTION)
    .findOne({ _id: new ObjectId(id) });
}

export async function createOrder(
  data: {
    date: string;
    seller: string;
    shipping_cost: number;
    notes?: string | null;
    cards: Array<{
      name: string;
      price: number;
      condition?: string | null;
      card_language?: string | null;
      set_name?: string | null;
      image_url?: string | null;
      r2_key?: string | null;
      scryfall_id?: string | null;
    }>;
  },
  userId: string,
  userName: string
): Promise<{ order: CardOrder; cards: InventoryCard[] }> {
  const db = await getDb();
  const now = new Date().toISOString();

  const cardCount = data.cards.length;
  const totalCardsCost = data.cards.reduce((sum, c) => sum + c.price, 0);
  const shippingPerCard = cardCount > 0 ? data.shipping_cost / cardCount : 0;

  // Create finance transaction
  const tx = await createTransaction(
    {
      month: data.date.substring(0, 7),
      date: data.date,
      type: "expense",
      category: "prize",
      description: `Card order: ${data.seller} (${cardCount} cards)`,
      amount: totalCardsCost + data.shipping_cost,
      tags: ["card-order"],
    },
    userId,
    userName
  );

  // Create order doc
  const orderDoc: Omit<CardOrder, "_id"> = {
    date: data.date,
    seller: data.seller,
    total_cards_cost: totalCardsCost,
    shipping_cost: data.shipping_cost,
    card_count: cardCount,
    notes: data.notes ?? null,
    transaction_id: String(tx._id),
    created_by: userName,
    modified_by: userName,
    created_at: now,
    updated_at: now,
  };

  const orderResult = await db.collection(ORDERS_COLLECTION).insertOne(orderDoc);
  const orderId = String(orderResult.insertedId);

  // Create inventory card docs
  const cardDocs: Array<Omit<InventoryCard, "_id">> = data.cards.map((c) => ({
    order_id: orderId,
    name: c.name,
    price: c.price,
    computed_cost: c.price + shippingPerCard,
    condition: c.condition ?? null,
    card_language: c.card_language ?? null,
    set_name: c.set_name ?? null,
    image_url: c.image_url ?? null,
    r2_key: c.r2_key ?? null,
    scryfall_id: c.scryfall_id ?? null,
    status: "in_stock" as const,
    assigned_prize_id: null,
    assigned_month: null,
    created_at: now,
    updated_at: now,
  }));

  const cardResult = await db.collection(INVENTORY_COLLECTION).insertMany(cardDocs);

  logActivity("create", "card_order", orderId, {
    seller: data.seller,
    card_count: cardCount,
    total: totalCardsCost + data.shipping_cost,
  }, userId, userName);

  const order: CardOrder = { _id: orderResult.insertedId, ...orderDoc };
  const cards: InventoryCard[] = cardDocs.map((doc, i) => ({
    _id: cardResult.insertedIds[i],
    ...doc,
  }));

  return { order, cards };
}

export async function updateOrder(
  id: string,
  data: Partial<{
    date: string;
    seller: string;
    shipping_cost: number;
    notes: string | null;
  }>,
  userId: string,
  userName: string
): Promise<CardOrder | null> {
  const db = await getDb();
  const existing = await db
    .collection<CardOrder>(ORDERS_COLLECTION)
    .findOne({ _id: new ObjectId(id) });

  if (!existing) return null;

  const now = new Date().toISOString();

  // If shipping cost changed, recompute all card computed_costs
  if (data.shipping_cost !== undefined && data.shipping_cost !== existing.shipping_cost) {
    const newShippingPerCard = existing.card_count > 0
      ? data.shipping_cost / existing.card_count
      : 0;

    const cards = await db
      .collection<InventoryCard>(INVENTORY_COLLECTION)
      .find({ order_id: id })
      .toArray();

    if (cards.length > 0) {
      const ops = cards.map((card) => ({
        updateOne: {
          filter: { _id: new ObjectId(String(card._id)) },
          update: {
            $set: {
              computed_cost: card.price + newShippingPerCard,
              updated_at: now,
            },
          },
        },
      }));
      await db.collection(INVENTORY_COLLECTION).bulkWrite(ops);
    }

    // Update finance transaction amount
    const newTotal = existing.total_cards_cost + data.shipping_cost;
    await updateTransaction(
      existing.transaction_id,
      {
        amount: newTotal,
        description: `Card order: ${data.seller || existing.seller} (${existing.card_count} cards)`,
      },
      userId,
      userName
    );
  }

  const updateData = {
    ...data,
    modified_by: userName,
    updated_at: now,
  };

  await db
    .collection(ORDERS_COLLECTION)
    .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  logActivity("update", "card_order", id, {
    updated_fields: Object.keys(data),
  }, userId, userName);

  return { ...existing, ...updateData, _id: existing._id } as CardOrder;
}

export async function deleteOrder(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const existing = await db
    .collection<CardOrder>(ORDERS_COLLECTION)
    .findOne({ _id: new ObjectId(id) });

  if (!existing) throw new Error("Order not found");

  // Check for assigned cards
  const assignedCount = await db
    .collection<InventoryCard>(INVENTORY_COLLECTION)
    .countDocuments({ order_id: id, status: "assigned" });

  if (assignedCount > 0) {
    throw new Error("Cannot delete order with assigned cards");
  }

  // Delete all inventory cards for this order
  await db.collection(INVENTORY_COLLECTION).deleteMany({ order_id: id });

  // Delete finance transaction
  await deleteTransaction(existing.transaction_id, userId, userName);

  // Delete order
  await db.collection(ORDERS_COLLECTION).deleteOne({ _id: new ObjectId(id) });

  logActivity("delete", "card_order", id, {
    seller: existing.seller,
    card_count: existing.card_count,
  }, userId, userName);
}

// ─── Inventory Cards ───

export async function getInventoryCards(
  filter?: { status?: InventoryCardStatus }
): Promise<InventoryCard[]> {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (filter?.status) query.status = filter.status;

  return db
    .collection<InventoryCard>(INVENTORY_COLLECTION)
    .find(query)
    .sort({ created_at: -1 })
    .toArray();
}

export async function getInventoryCard(id: string): Promise<InventoryCard | null> {
  const db = await getDb();
  return db
    .collection<InventoryCard>(INVENTORY_COLLECTION)
    .findOne({ _id: new ObjectId(id) });
}

export async function getInventorySummary(): Promise<{
  in_stock: number;
  assigned: number;
  orders: number;
}> {
  const db = await getDb();
  const [inStock, assigned, orders] = await Promise.all([
    db.collection(INVENTORY_COLLECTION).countDocuments({ status: "in_stock" }),
    db.collection(INVENTORY_COLLECTION).countDocuments({ status: "assigned" }),
    db.collection(ORDERS_COLLECTION).countDocuments({}),
  ]);
  return { in_stock: inStock, assigned, orders };
}

// ─── Assignment ───

export async function assignCard(
  cardId: string,
  prizeData: {
    month: string;
    recipient_type: string;
    placement?: number | null;
    recipient_name?: string;
    recipient_uid?: string | null;
    recipient_discord_id?: string | null;
    status?: string;
  },
  userId: string,
  userName: string
): Promise<{ prize: Prize; card: InventoryCard }> {
  const db = await getDb();
  const card = await db
    .collection<InventoryCard>(INVENTORY_COLLECTION)
    .findOne({ _id: new ObjectId(cardId) });

  if (!card) throw new Error("Inventory card not found");
  if (card.status !== "in_stock") throw new Error("Card is not available for assignment");

  const now = new Date().toISOString();

  // Create Prize doc from inventory card
  const prizeDoc: Omit<Prize, "_id"> = {
    month: prizeData.month,
    category: "mtg_single",
    name: card.name,
    description: "",
    image_url: card.image_url,
    r2_key: card.r2_key,
    value: card.computed_cost,
    condition: card.condition,
    card_language: card.card_language,
    set_name: card.set_name,
    recipient_type: prizeData.recipient_type as Prize["recipient_type"],
    placement: prizeData.placement ?? null,
    recipient_uid: prizeData.recipient_uid ?? null,
    recipient_name: prizeData.recipient_name || "",
    recipient_discord_id: prizeData.recipient_discord_id ?? null,
    shipping_status: "pending",
    tracking_number: null,
    shipping_date: null,
    delivery_date: null,
    shipping_notes: null,
    transaction_id: null,
    inventory_card_id: cardId,
    status: (prizeData.status as Prize["status"]) || "confirmed",
    created_by: userName,
    modified_by: userName,
    created_at: now,
    updated_at: now,
  };

  const prizeResult = await db.collection(PRIZES_COLLECTION).insertOne(prizeDoc);
  const prizeId = String(prizeResult.insertedId);

  // Update inventory card
  await db.collection(INVENTORY_COLLECTION).updateOne(
    { _id: new ObjectId(cardId) },
    {
      $set: {
        status: "assigned",
        assigned_prize_id: prizeId,
        assigned_month: prizeData.month,
        updated_at: now,
      },
    }
  );

  logActivity("create", "prize", prizeId, {
    name: card.name,
    source: "inventory",
    value: card.computed_cost,
  }, userId, userName);

  const prize: Prize = { _id: prizeResult.insertedId, ...prizeDoc };
  const updatedCard: InventoryCard = {
    ...card,
    status: "assigned",
    assigned_prize_id: prizeId,
    assigned_month: prizeData.month,
    updated_at: now,
  };

  return { prize, card: updatedCard };
}

export async function unassignCard(
  cardId: string,
  userId: string,
  userName: string
): Promise<InventoryCard> {
  const db = await getDb();
  const card = await db
    .collection<InventoryCard>(INVENTORY_COLLECTION)
    .findOne({ _id: new ObjectId(cardId) });

  if (!card) throw new Error("Inventory card not found");
  if (card.status !== "assigned") throw new Error("Card is not assigned");

  const now = new Date().toISOString();

  // Delete the linked prize
  if (card.assigned_prize_id) {
    await db
      .collection(PRIZES_COLLECTION)
      .deleteOne({ _id: new ObjectId(card.assigned_prize_id) });

    logActivity("delete", "prize", card.assigned_prize_id, {
      name: card.name,
      source: "inventory_unassign",
    }, userId, userName);
  }

  // Reset inventory card
  await db.collection(INVENTORY_COLLECTION).updateOne(
    { _id: new ObjectId(cardId) },
    {
      $set: {
        status: "in_stock",
        assigned_prize_id: null,
        assigned_month: null,
        updated_at: now,
      },
    }
  );

  return {
    ...card,
    status: "in_stock",
    assigned_prize_id: null,
    assigned_month: null,
    updated_at: now,
  };
}

// ─── Get cards for a specific order ───

export async function getOrderCards(orderId: string): Promise<InventoryCard[]> {
  const db = await getDb();
  return db
    .collection<InventoryCard>(INVENTORY_COLLECTION)
    .find({ order_id: orderId })
    .sort({ created_at: 1 })
    .toArray();
}
