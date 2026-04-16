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

// ─── Helpers ───

import { getEffectiveAmount } from "./utils";
export { getEffectiveAmount };

// ─── Indexes (flag-based, idempotent) ───

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    await db.collection("dashboard_transactions").createIndex({ month: 1 }, { name: "month" });
    await db.collection("dashboard_fixed_costs").createIndex(
      { active: 1, start_month: 1, end_month: 1 },
      { name: "active_month_range" }
    );
    await db.collection("dashboard_patreon_snapshots").createIndex({ month: 1 }, { name: "month" });
    await db.collection("dashboard_manual_payments").createIndex({ month: 1 }, { name: "month" });
    indexesEnsured = true;
  } catch {
    indexesEnsured = true;
  }
}
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

  logActivity("create", "transaction", result.insertedId.toString(), {
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

  logActivity("update", "transaction", id, {
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

  logActivity("delete", "transaction", id, {
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

  logActivity("create", "fixed_cost", result.insertedId.toString(), {
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
  userName: string,
  effectiveMonth?: string
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  // If amount is changing and we have a month context, manage history
  if (data.amount != null && effectiveMonth) {
    const existing = await db
      .collection<FixedCost>("dashboard_fixed_costs")
      .findOne({ _id: new ObjectId(id) });

    if (existing) {
      const history = existing.amount_history || [
        { amount: existing.amount, effective_from: existing.start_month },
      ];

      // Remove any existing entry for this exact month
      const filtered = history.filter(
        (h) => h.effective_from !== effectiveMonth
      );

      // Add the new entry and sort
      filtered.push({ amount: data.amount, effective_from: effectiveMonth });
      filtered.sort((a, b) => a.effective_from.localeCompare(b.effective_from));

      // Update amount to the latest value in history
      const latestAmount = filtered[filtered.length - 1].amount;

      const updateData = {
        ...data,
        amount: latestAmount,
        amount_history: filtered,
        modified_by: userName,
        updated_at: now,
      };

      await db
        .collection("dashboard_fixed_costs")
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

      logActivity("update", "fixed_cost", id, {
        updated_fields: Object.keys(data),
        effective_month: effectiveMonth,
      }, userId, userName);
      return;
    }
  }

  // Non-amount updates or no month context — simple update
  const updateData = {
    ...data,
    modified_by: userName,
    updated_at: now,
  };

  await db
    .collection("dashboard_fixed_costs")
    .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  logActivity("update", "fixed_cost", id, {
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

  await Promise.all([
    db.collection("dashboard_fixed_costs").deleteOne({ _id: new ObjectId(id) }),
    db.collection("dashboard_fixed_cost_payments").deleteMany({ fixed_cost_id: id }),
  ]);

  logActivity("delete", "fixed_cost", id, {
    name: doc?.name,
    amount: doc?.amount,
  }, userId, userName);
}

// ─── Summary ───

export async function getMonthlySummary(
  month: string
): Promise<MonthlySummary> {
  await ensureIndexes();
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
    const amt = getEffectiveAmount(fc, month);
    fixedCostTotal += amt;
    if (fc.category === "prize") {
      breakdown.prize -= amt;
    } else {
      breakdown.operational -= amt;
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
  // Pre-warm shared caches (Discord members, bracket registrations) sequentially
  // so the parallel per-month calls don't all race to fetch the same external data.
  if (months.length > 1) {
    const { fetchGuildMembers } = await import("./discord");
    const { getRegisteredDiscordIds } = await import("./bracket-registration");
    await fetchGuildMembers().catch(() => {});
    await getRegisteredDiscordIds(months[months.length - 1]).catch(() => {});
  }
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

  // Batch-load fixed cost docs (need amount_history for effective-amount recompute)
  const fcIds = [...new Set(fixedCostPayments.map((p) => p.fixed_cost_id))];
  const fcDocs = fcIds.length > 0
    ? await db.collection<FixedCost>("dashboard_fixed_costs")
        .find({ _id: { $in: fcIds.map((id) => new ObjectId(id)) } })
        .toArray()
    : [];
  const fcMap = new Map(fcDocs.map((fc) => [String(fc._id), fc]));

  for (const fcp of fixedCostPayments) {
    // Skip orphaned payments from deleted fixed costs
    const fc = fcMap.get(fcp.fixed_cost_id);
    if (!fc) continue;
    // Recompute against amount_history so retroactive edits show up even
    // before the month's ensureFixedCostPayments has re-run.
    const amount = getEffectiveAmount(fc, fcp.month);
    pending.push({
      id: String(fcp._id),
      source: "fixed_cost",
      description: fc.name,
      amount,
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

  logActivity("update", source, id, {
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

  logActivity("update", source, id, {
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

  // Clean up orphaned payments from deleted fixed costs
  const existingPayments = await db
    .collection<FixedCostPayment>("dashboard_fixed_cost_payments")
    .find({ month })
    .toArray();
  if (existingPayments.length > 0) {
    const referencedFcIds = [...new Set(existingPayments.map((p) => p.fixed_cost_id))];
    const existingFcDocs = await db.collection<FixedCost>("dashboard_fixed_costs")
      .find({ _id: { $in: referencedFcIds.map((id) => new ObjectId(id)) } })
      .project({ _id: 1 })
      .toArray();
    const existingFcIds = new Set(existingFcDocs.map((fc) => String(fc._id)));
    const orphanIds = existingPayments
      .filter((p) => !existingFcIds.has(p.fixed_cost_id))
      .map((p) => new ObjectId(String(p._id)));
    if (orphanIds.length > 0) {
      await db.collection("dashboard_fixed_cost_payments")
        .deleteMany({ _id: { $in: orphanIds } });
    }
  }

  const now = new Date().toISOString();
  for (const fc of fixedCosts) {
    const fcId = String(fc._id);
    const amt = getEffectiveAmount(fc, month);
    // Refresh amount on existing non-reimbursed payments so retroactive
    // amount_history edits propagate. Reimbursed payments stay frozen.
    await db.collection("dashboard_fixed_cost_payments").updateOne(
      { fixed_cost_id: fcId, month, reimbursed: { $ne: true } },
      { $set: { amount: amt, paid_by: fc.paid_by, updated_at: now } }
    );
    // Create if missing.
    await db.collection("dashboard_fixed_cost_payments").updateOne(
      { fixed_cost_id: fcId, month },
      {
        $setOnInsert: {
          fixed_cost_id: fcId,
          month,
          paid_by: fc.paid_by,
          amount: amt,
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

  // Batch-load fixed cost names and filter out orphaned payments
  const fcIds = [...new Set(fixedCostPayments.map((p) => p.fixed_cost_id))];
  const fcDocs = fcIds.length > 0
    ? await db.collection<FixedCost>("dashboard_fixed_costs")
        .find({ _id: { $in: fcIds.map((id) => new ObjectId(id)) } })
        .toArray()
    : [];
  const fcMap = new Map(fcDocs.map((fc) => [String(fc._id), fc]));
  const validPayments = fixedCostPayments.filter((fcp) => fcMap.has(fcp.fixed_cost_id));

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

  for (const fcp of validPayments) {
    const group = getMemberGroup(fcp.paid_by);
    if (!group) continue;
    const fc = fcMap.get(fcp.fixed_cost_id)!;
    groups[group].expenses_paid += fcp.amount;
    if (fcp.paid_by !== TREASURER_ID && !fcp.reimbursed) {
      groups[group].pending += fcp.amount;
      pending.push({
        id: String(fcp._id),
        source: "fixed_cost",
        description: fc.name,
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
