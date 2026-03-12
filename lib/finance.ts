import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import type {
  Transaction,
  FixedCost,
  MonthlySummary,
  TransactionType,
  TransactionCategory,
} from "./types";

// ─── Transactions ───

export async function getTransactions(month: string): Promise<Transaction[]> {
  const db = await getDb();
  return db
    .collection<Transaction>("dashboard_transactions")
    .find({ month })
    .sort({ date: -1 })
    .toArray();
}

export async function createTransaction(
  data: {
    month: string;
    date: string;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    amount: number;
    tags: string[];
  },
  userId: string,
  userName: string
): Promise<Transaction> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc: Omit<Transaction, "_id"> = {
    ...data,
    currency: "EUR",
    modified_by: userName,
    created_at: now,
    updated_at: now,
  };

  const result = await db
    .collection("dashboard_transactions")
    .insertOne(doc);

  await logActivity("create", "transaction", result.insertedId.toString(), {
    description: data.description,
    amount: data.amount,
    type: data.type,
  }, userId, userName);

  return { _id: result.insertedId, ...doc };
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    date: string;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    amount: number;
    tags: string[];
  }>,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const updateData = {
    ...data,
    modified_by: userName,
    updated_at: new Date().toISOString(),
  };

  await db
    .collection("dashboard_transactions")
    .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  await logActivity("update", "transaction", id, {
    updated_fields: Object.keys(data),
  }, userId, userName);
}

export async function deleteTransaction(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();

  const doc = await db
    .collection("dashboard_transactions")
    .findOne({ _id: new ObjectId(id) });

  await db
    .collection("dashboard_transactions")
    .deleteOne({ _id: new ObjectId(id) });

  await logActivity("delete", "transaction", id, {
    description: doc?.description,
    amount: doc?.amount,
  }, userId, userName);
}

// ─── Fixed Costs ───

export async function getFixedCosts(): Promise<FixedCost[]> {
  const db = await getDb();
  return db
    .collection<FixedCost>("dashboard_fixed_costs")
    .find({})
    .sort({ name: 1 })
    .toArray();
}

export async function createFixedCost(
  data: {
    name: string;
    amount: number;
    category: "prize" | "operational";
    active: boolean;
    start_month: string;
    end_month: string | null;
  },
  userId: string,
  userName: string
): Promise<FixedCost> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc: Omit<FixedCost, "_id"> = {
    ...data,
    modified_by: userName,
    created_at: now,
    updated_at: now,
  };

  const result = await db
    .collection("dashboard_fixed_costs")
    .insertOne(doc);

  await logActivity("create", "fixed_cost", result.insertedId.toString(), {
    name: data.name,
    amount: data.amount,
  }, userId, userName);

  return { _id: result.insertedId, ...doc };
}

export async function updateFixedCost(
  id: string,
  data: Partial<{
    name: string;
    amount: number;
    category: "prize" | "operational";
    active: boolean;
    start_month: string;
    end_month: string | null;
  }>,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const updateData = {
    ...data,
    modified_by: userName,
    updated_at: new Date().toISOString(),
  };

  await db
    .collection("dashboard_fixed_costs")
    .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  await logActivity("update", "fixed_cost", id, {
    updated_fields: Object.keys(data),
  }, userId, userName);
}

export async function deleteFixedCost(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();

  const doc = await db
    .collection("dashboard_fixed_costs")
    .findOne({ _id: new ObjectId(id) });

  await db
    .collection("dashboard_fixed_costs")
    .deleteOne({ _id: new ObjectId(id) });

  await logActivity("delete", "fixed_cost", id, {
    name: doc?.name,
    amount: doc?.amount,
  }, userId, userName);
}

// ─── Summary ───

export async function getMonthlySummary(
  month: string
): Promise<MonthlySummary> {
  const db = await getDb();

  const [transactions, fixedCosts] = await Promise.all([
    db
      .collection<Transaction>("dashboard_transactions")
      .find({ month })
      .toArray(),
    db
      .collection<FixedCost>("dashboard_fixed_costs")
      .find({
        active: true,
        start_month: { $lte: month },
        $or: [
          { end_month: null },
          { end_month: { $gte: month } },
        ],
      })
      .toArray(),
  ]);

  const breakdown = {
    subscription: 0,
    prize: 0,
    operational: 0,
    sponsorship: 0,
    other: 0,
  };

  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      income += tx.amount;
    } else {
      expenses += tx.amount;
    }
    breakdown[tx.category] += tx.amount * (tx.type === "income" ? 1 : -1);
  }

  let fixedCostTotal = 0;
  for (const fc of fixedCosts) {
    fixedCostTotal += fc.amount;
    if (fc.category === "prize") {
      breakdown.prize -= fc.amount;
    } else {
      breakdown.operational -= fc.amount;
    }
  }

  return {
    month,
    income,
    expenses,
    fixed_costs: fixedCostTotal,
    net: income - expenses - fixedCostTotal,
    breakdown,
  };
}

export async function getMultiMonthSummary(
  months: string[]
): Promise<MonthlySummary[]> {
  return Promise.all(months.map((m) => getMonthlySummary(m)));
}
