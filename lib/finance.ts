import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { getSubscriptionIncome } from "./subscription-income";
import type {
  Transaction,
  FixedCost,
  FixedCostPayment,
  MonthlySummary,
  GroupSummary,
  GroupDetail,
  PendingReimbursement,
  TransactionType,
  TransactionCategory,
} from "./types";
import { TEAM_MEMBERS, TREASURER_ID, GROUPS } from "./constants";

// ─── Transactions ───

export async function getTransactions(month: string): Promise<Transaction[]> {
  const db = await getDb();
  return db
    .collection<Transaction>("dashboard_transactions")
    .find({ month })
    .sort({ date: 1 })
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
    paid_by?: string | null;
  },
  userId: string,
  userName: string
): Promise<Transaction> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc: Omit<Transaction, "_id"> = {
    ...data,
    paid_by: data.paid_by || null,
    reimbursed: false,
    reimbursed_at: null,
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
    paid_by: string | null;
    reimbursed: boolean;
    reimbursed_at: string | null;
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
    paid_by?: string | null;
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
    paid_by: string | null;
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

  const [transactions, fixedCosts, subscriptionIncome] = await Promise.all([
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
    getSubscriptionIncome(month),
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
    // Reclassify legacy subscription transactions to other
    const breakdownCategory = tx.category === "subscription" ? "other" : tx.category;
    breakdown[breakdownCategory] += tx.amount * (tx.type === "income" ? 1 : -1);
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

  const subTotal = subscriptionIncome.total;
  breakdown.subscription = subTotal;

  return {
    month,
    income: income + subTotal,
    expenses,
    fixed_costs: fixedCostTotal,
    net: income + subTotal - expenses - fixedCostTotal,
    breakdown,
    subscription_income: subscriptionIncome,
  };
}

export async function getMultiMonthSummary(
  months: string[]
): Promise<MonthlySummary[]> {
  return Promise.all(months.map((m) => getMonthlySummary(m)));
}

// ─── Reimbursements & Group Summary ───

function getMemberName(id: string): string {
  return TEAM_MEMBERS.find((m) => m.id === id)?.name || id;
}

function getMemberGroup(id: string): "cedhpt" | "ca" | null {
  return TEAM_MEMBERS.find((m) => m.id === id)?.group || null;
}

export async function getAllPendingReimbursements(): Promise<PendingReimbursement[]> {
  const db = await getDb();
  const pending: PendingReimbursement[] = [];

  const [transactions, fixedCostPayments] = await Promise.all([
    db.collection<Transaction>("dashboard_transactions")
      .find({
        type: "expense",
        paid_by: { $ne: null, $nin: [TREASURER_ID] },
        reimbursed: { $ne: true },
      })
      .sort({ date: -1 })
      .toArray(),
    db.collection<FixedCostPayment>("dashboard_fixed_cost_payments")
      .find({
        paid_by: { $ne: TREASURER_ID },
        reimbursed: { $ne: true },
      })
      .sort({ month: -1 })
      .toArray(),
  ]);

  for (const tx of transactions) {
    pending.push({
      id: String(tx._id),
      source: "transaction",
      description: tx.description,
      amount: tx.amount,
      paid_by: tx.paid_by!,
      paid_by_name: getMemberName(tx.paid_by!),
      date: tx.date,
    });
  }

  // Batch-load fixed cost names
  const fcIds = [...new Set(fixedCostPayments.map((p) => p.fixed_cost_id))];
  const fcDocs = fcIds.length > 0
    ? await db.collection<FixedCost>("dashboard_fixed_costs")
        .find({ _id: { $in: fcIds.map((id) => new ObjectId(id)) } })
        .toArray()
    : [];
  const fcNameMap = new Map(fcDocs.map((fc) => [String(fc._id), fc.name]));

  for (const fcp of fixedCostPayments) {
    pending.push({
      id: String(fcp._id),
      source: "fixed_cost",
      description: fcNameMap.get(fcp.fixed_cost_id) || "Fixed cost",
      amount: fcp.amount,
      paid_by: fcp.paid_by,
      paid_by_name: getMemberName(fcp.paid_by),
      date: `${fcp.month}-01`,
    });
  }

  return pending;
}

export async function reimburseExpense(
  id: string,
  source: "transaction" | "fixed_cost",
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const collection = source === "transaction"
    ? "dashboard_transactions"
    : "dashboard_fixed_cost_payments";

  await db.collection(collection).updateOne(
    { _id: new ObjectId(id) },
    { $set: { reimbursed: true, reimbursed_at: now, updated_at: now } }
  );

  await logActivity("update", source, id, {
    action: "reimburse",
  }, userId, userName);
}

export async function unreimburseExpense(
  id: string,
  source: "transaction" | "fixed_cost",
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const collection = source === "transaction"
    ? "dashboard_transactions"
    : "dashboard_fixed_cost_payments";

  await db.collection(collection).updateOne(
    { _id: new ObjectId(id) },
    { $set: { reimbursed: false, reimbursed_at: null, updated_at: now } }
  );

  await logActivity("update", source, id, {
    action: "unreimburse",
  }, userId, userName);
}

export async function ensureFixedCostPayments(month: string): Promise<void> {
  const db = await getDb();
  const fixedCosts = await db
    .collection<FixedCost>("dashboard_fixed_costs")
    .find({
      active: true,
      paid_by: { $ne: null },
      start_month: { $lte: month },
      $or: [{ end_month: null }, { end_month: { $gte: month } }],
    })
    .toArray();

  const now = new Date().toISOString();
  for (const fc of fixedCosts) {
    const fcId = String(fc._id);
    await db.collection("dashboard_fixed_cost_payments").updateOne(
      { fixed_cost_id: fcId, month },
      {
        $setOnInsert: {
          fixed_cost_id: fcId,
          month,
          paid_by: fc.paid_by,
          amount: fc.amount,
          reimbursed: false,
          reimbursed_at: null,
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
  }
}

export async function getGroupSummary(month: string): Promise<GroupSummary> {
  const db = await getDb();
  await ensureFixedCostPayments(month);

  const [transactions, fixedCostPayments, summary] = await Promise.all([
    db.collection<Transaction>("dashboard_transactions")
      .find({ month, type: "expense", paid_by: { $ne: null } })
      .toArray(),
    db.collection<FixedCostPayment>("dashboard_fixed_cost_payments")
      .find({ month })
      .toArray(),
    getMonthlySummary(month),
  ]);

  const totalNet = summary.net;
  const profitSplit = totalNet / 2;

  const groups: Record<"cedhpt" | "ca", GroupDetail> = {
    cedhpt: { label: GROUPS.cedhpt.label, profit_share: profitSplit, expenses_paid: 0, pending: 0 },
    ca: { label: GROUPS.ca.label, profit_share: profitSplit, expenses_paid: 0, pending: 0 },
  };

  const pending: PendingReimbursement[] = [];

  for (const tx of transactions) {
    const group = getMemberGroup(tx.paid_by!);
    if (!group) continue;
    groups[group].expenses_paid += tx.amount;
    if (tx.paid_by !== TREASURER_ID && !tx.reimbursed) {
      groups[group].pending += tx.amount;
      pending.push({
        id: String(tx._id),
        source: "transaction",
        description: tx.description,
        amount: tx.amount,
        paid_by: tx.paid_by!,
        paid_by_name: getMemberName(tx.paid_by!),
        date: tx.date,
      });
    }
  }

  for (const fcp of fixedCostPayments) {
    const group = getMemberGroup(fcp.paid_by);
    if (!group) continue;
    groups[group].expenses_paid += fcp.amount;
    if (fcp.paid_by !== TREASURER_ID && !fcp.reimbursed) {
      groups[group].pending += fcp.amount;
      // Look up fixed cost name for description
      const fc = await db.collection<FixedCost>("dashboard_fixed_costs")
        .findOne({ _id: new ObjectId(fcp.fixed_cost_id) });
      pending.push({
        id: String(fcp._id),
        source: "fixed_cost",
        description: fc?.name || "Fixed cost",
        amount: fcp.amount,
        paid_by: fcp.paid_by,
        paid_by_name: getMemberName(fcp.paid_by),
        date: `${month}-01`,
      });
    }
  }

  return {
    month,
    total_income: summary.income,
    total_expenses: summary.expenses + summary.fixed_costs,
    total_net: totalNet,
    profit_split: profitSplit,
    groups: { cedhpt: groups.cedhpt, ca: groups.ca },
    pending_reimbursements: pending,
  };
}
