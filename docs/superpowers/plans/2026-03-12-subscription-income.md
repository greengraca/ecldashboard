# Subscription Income Auto-Calculation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-calculate monthly subscription income from Patreon, Ko-fi, and manual-payment sources, with configurable rates, historical backfill, and Patreon API integration.

**Architecture:** New lib modules (`lib/patreon.ts`, `lib/subscription-income.ts`) compute income from three MongoDB collections. Rates stored in `dashboard_subscription_rates` with effective-from semantics. Finance summary API extended with `subscription_income` field. UI gains a subscription income card on finance page, manual-paid toggle on subscribers, and rate management on settings.

**Tech Stack:** Next.js 16 (App Router), MongoDB (node driver), SWR, Patreon API v2, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-12-subscription-income-design.md`

---

## Important Context

### No Tests
This project has zero test files. Steps marked "Run" refer to `npm run build` or manual browser verification. No test framework is configured.

### Codebase Patterns
- **SWR fetching:** `const fetcher = (url: string) => fetch(url).then(r => r.json()); const { data, isLoading, mutate } = useSWR<{ data: T }>(url, fetcher);`
- **Auth guard (mutations only):** `const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`
- **User extraction:** `const userId = session.user.id; const userName = (session.user as any).username || session.user.name || "unknown";`
- **Activity logging:** `await logActivity("create", "entity_type", entityId, { ...details }, userId, userName);`
- **API responses:** `{ data: T }` on success, `{ error: string }` on failure
- **CSS theming:** All colors via CSS variables with inline `style={{}}`. Key variables: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--accent)`, `var(--accent-text)` (dark text on gold accent buttons), `var(--bg-card)`, `var(--bg-page)` (for input backgrounds), `var(--border)`, `var(--success)`, `var(--error)`, `var(--warning)`. No `--bg-secondary`, `--bg-tertiary`, `--text-on-accent`, or `--success-rgb` variables exist.
- **Collections:** Dashboard-owned must use `dashboard_` prefix.
- **Timestamps:** ISO string format (`new Date().toISOString()`)
- **Date format:** `month` params are `"YYYY-MM"` strings
- **Settings sections:** Use the `Section` component from `SettingsContent.tsx` for consistent card headers with icons.
- **Finance page SWR:** The summary mutate function is named `mutateSummary` (not `summaryMutate`). Check actual variable names when editing.
- **Subscriber filtering:** The subscribers page filters the array in the page component before passing to SubscriberTable — do NOT pass `filterSource` prop.

### Key Files to Read First
- `lib/types.ts` — all TypeScript interfaces
- `lib/constants.ts` — env var parsing pattern
- `lib/finance.ts` — `getMonthlySummary()` function to extend
- `lib/activity.ts` — `logActivity()` signature
- `lib/auth.ts` — `auth()` export
- `lib/mongodb.ts` — `getDb()` singleton
- `app/(dashboard)/finance/page.tsx` — finance page (client component with SWR)
- `app/(dashboard)/subscribers/page.tsx` — subscribers page
- `components/subscribers/SubscriberTable.tsx` — subscriber row rendering
- `components/finance/BalanceCard.tsx` — existing card pattern (grid of 4 stat cards)
- `app/(dashboard)/settings/page.tsx` — settings page (server component wrapping SettingsContent)
- `components/settings/SettingsContent.tsx` — settings client component with `Section` helper

### Bot Collection Schema (`subs_kofi_events`)
Verified from eclBot source (`cogs/subscriptions_cog.py`):
- `_id`: `"{guild_id}:{txn_id}"`
- `txn_id`: string (Ko-fi transaction ID)
- `guild_id`: int
- `user_id`: int (Discord user ID)
- `source`: `"kofi-one-time"`
- `purchase_month`: `"YYYY-MM"` string
- `effective_month`: `"YYYY-MM"` string (may differ for late-month pre-reg)
- `amount`: float
- `currency`: string
- `created_at`: datetime

---

## Chunk 1: Foundation — Types, Constants, Rate Storage

### Task 1: Add TypeScript types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add new interfaces to `lib/types.ts`**

Append after the `MonthlySummary` interface (after line 99):

```typescript
// ─── Subscription Income Types ───

export interface SubscriptionIncome {
  patreon: { count: number; amount: number };
  kofi: { count: number; amount: number };
  manual: { count: number; amount: number };
  total: number;
}

export interface SubscriptionRate {
  _id?: ObjectId | string;
  effective_from: string; // "YYYY-MM"
  patreon_net: number;
  kofi_net: number;
  manual_net: number;
  created_by: string;
  created_at: string;
}

export interface PatreonSnapshot {
  _id?: ObjectId | string;
  month: string;
  discord_id: string | null;
  patreon_name: string;
  tier: string;
  pledge_amount: number;
  patreon_user_id: string;
  synced_at: string;
}

export interface ManualPayment {
  _id?: ObjectId | string;
  month: string;
  discord_id: string;
  marked_by: string;
  created_at: string;
}
```

Note: `PatreonSnapshot.discord_id` stores the Discord user ID (snowflake) from Patreon's social connections API, not a username.

- [ ] **Step 2: Add `subscription_income` to `MonthlySummary`**

In the `MonthlySummary` interface, add after the `breakdown` field. Mark as optional so existing code doesn't break until Task 5 wires it up:

```typescript
  subscription_income?: SubscriptionIncome;
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS — field is optional so existing `getMonthlySummary()` still compiles.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add subscription income TypeScript types"
```

### Task 2: Add constants

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add subscription constants**

Append to `lib/constants.ts`:

```typescript
// ─── Subscription Income ───

export const ECL_ELIGIBLE_PATREON_TIERS = ["ECL Grinder", "Gold", "Diamond"];

export const DEFAULT_PATREON_NET = 5.79;
export const DEFAULT_KOFI_NET = 5.63;
export const DEFAULT_MANUAL_NET = 6.50;

export const PATREON_CREATOR_TOKEN = process.env.PATREON_CREATOR_TOKEN || "";
```

- [ ] **Step 2: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: add subscription income constants"
```

### Task 3: Subscription rates CRUD (`lib/subscription-rates.ts`)

**Files:**
- Create: `lib/subscription-rates.ts`

- [ ] **Step 1: Create `lib/subscription-rates.ts`**

```typescript
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
    { effective_from: data.effective_from, ...data },
    userId,
    userName
  );

  return { _id: result.insertedId, ...doc };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/subscription-rates.ts
git commit -m "feat: add subscription rates CRUD with effective-from lookup"
```

### Task 4: Subscription income computation (`lib/subscription-income.ts`)

**Files:**
- Create: `lib/subscription-income.ts`

This is the core module. It counts subscribers from each source for a given month and multiplies by the applicable rates.

- [ ] **Step 1: Create `lib/subscription-income.ts`**

```typescript
import { getDb } from "./mongodb";
import { getRatesForMonth } from "./subscription-rates";
import type { SubscriptionIncome } from "./types";

export async function getSubscriptionIncome(
  month: string
): Promise<SubscriptionIncome> {
  const db = await getDb();
  const rates = await getRatesForMonth(month);

  // 1. Ko-fi: count distinct user_ids from subs_kofi_events for this month
  const kofiFromBot = await db
    .collection("subs_kofi_events")
    .aggregate<{ _id: null; count: number }>([
      { $match: { purchase_month: month } },
      { $group: { _id: "$user_id" } },
      { $count: "count" },
    ])
    .toArray()
    .then((r) => r[0]?.count ?? 0);

  // Only use backfill if bot has no data for this month (avoids double-counting)
  let totalKofi = kofiFromBot;
  if (kofiFromBot === 0) {
    const kofiBackfillCount = await db
      .collection("dashboard_kofi_backfill")
      .aggregate<{ _id: null; count: number }>([
        { $match: { month } },
        { $group: { _id: "$discord_username" } },
        { $count: "count" },
      ])
      .toArray()
      .then((r) => r[0]?.count ?? 0);
    totalKofi = kofiBackfillCount;
  }

  // 2. Patreon: count from dashboard_patreon_snapshots
  const patreonCount = await db
    .collection("dashboard_patreon_snapshots")
    .countDocuments({ month });

  // 3. Manual: count from dashboard_manual_payments
  const manualCount = await db
    .collection("dashboard_manual_payments")
    .countDocuments({ month });

  return {
    patreon: {
      count: patreonCount,
      amount: Math.round(patreonCount * rates.patreon_net * 100) / 100,
    },
    kofi: {
      count: totalKofi,
      amount: Math.round(totalKofi * rates.kofi_net * 100) / 100,
    },
    manual: {
      count: manualCount,
      amount: Math.round(manualCount * rates.manual_net * 100) / 100,
    },
    total:
      Math.round(
        (patreonCount * rates.patreon_net +
          totalKofi * rates.kofi_net +
          manualCount * rates.manual_net) *
          100
      ) / 100,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/subscription-income.ts
git commit -m "feat: add subscription income computation from three sources"
```

### Task 5: Extend `getMonthlySummary()` in `lib/finance.ts`

**Files:**
- Modify: `lib/finance.ts`

- [ ] **Step 1: Add import at top of `lib/finance.ts`**

```typescript
import { getSubscriptionIncome } from "./subscription-income";
```

- [ ] **Step 2: Modify `getMonthlySummary()` to include subscription income**

Change the existing `Promise.all` to also fetch subscription income:

```typescript
const [transactions, fixedCosts, subscriptionIncome] = await Promise.all([
  db.collection<Transaction>("dashboard_transactions").find({ month }).toArray(),
  db.collection<FixedCost>("dashboard_fixed_costs").find({
    active: true,
    start_month: { $lte: month },
    $or: [{ end_month: null }, { end_month: { $gte: month } }],
  }).toArray(),
  getSubscriptionIncome(month),
]);
```

In the `for (const tx of transactions)` loop, reclassify `category: "subscription"` transactions to `other` in the breakdown to avoid double-counting with auto-calculated income:

```typescript
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
```

Update the return statement to include subscription income:

```typescript
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
```

- [ ] **Step 3: Make `subscription_income` required on MonthlySummary**

Now that `getMonthlySummary` always returns it, update `lib/types.ts` to remove the `?`:

```typescript
  subscription_income: SubscriptionIncome;
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/finance.ts lib/types.ts
git commit -m "feat: integrate subscription income into monthly summary"
```

---

## Chunk 2: API Routes

### Task 6: Manual payment lib and API routes

**Files:**
- Create: `lib/manual-payments.ts`
- Create: `app/api/subscribers/[discordId]/manual-payment/route.ts`
- Create: `app/api/subscribers/manual-payments/route.ts`

- [ ] **Step 1: Create `lib/manual-payments.ts`**

```typescript
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
```

- [ ] **Step 2: Create `app/api/subscribers/[discordId]/manual-payment/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markManualPaid, unmarkManualPaid } from "@/lib/manual-payments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ discordId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discordId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Missing month parameter" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const result = await markManualPaid(month, discordId, userId, userName);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    console.error("POST manual-payment error:", err);
    return NextResponse.json(
      { error: "Failed to mark manual payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ discordId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discordId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Missing month parameter" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    await unmarkManualPaid(month, discordId, userId, userName);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("DELETE manual-payment error:", err);
    return NextResponse.json(
      { error: "Failed to unmark manual payment" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create `app/api/subscribers/manual-payments/route.ts`** (GET endpoint for listing)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getManualPayments } from "@/lib/manual-payments";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const payments = await getManualPayments(month);
    return NextResponse.json({ data: payments });
  } catch (err) {
    console.error("GET /api/subscribers/manual-payments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch manual payments" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/manual-payments.ts "app/api/subscribers/[discordId]/manual-payment/route.ts" app/api/subscribers/manual-payments/route.ts
git commit -m "feat: add manual payment mark/unmark API with GET listing"
```

### Task 7: Subscription rates API route

**Files:**
- Create: `app/api/finance/subscription-rates/route.ts`

- [ ] **Step 1: Create `app/api/finance/subscription-rates/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllRates, createRate } from "@/lib/subscription-rates";

export async function GET() {
  try {
    const rates = await getAllRates();
    return NextResponse.json({ data: rates });
  } catch (err) {
    console.error("GET /api/finance/subscription-rates error:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscription rates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { effective_from, patreon_net, kofi_net, manual_net } = body;

    if (
      !effective_from ||
      patreon_net == null ||
      kofi_net == null ||
      manual_net == null
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const rate = await createRate(
      {
        effective_from,
        patreon_net: Number(patreon_net),
        kofi_net: Number(kofi_net),
        manual_net: Number(manual_net),
      },
      userId,
      userName
    );

    return NextResponse.json({ data: rate }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/subscription-rates error:", err);
    return NextResponse.json(
      { error: "Failed to create subscription rate" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/finance/subscription-rates/route.ts
git commit -m "feat: add subscription rates GET/POST API"
```

### Task 8: Patreon sync API route and lib

**Files:**
- Create: `lib/patreon.ts`
- Create: `app/api/patreon/sync/route.ts`

- [ ] **Step 1: Create `lib/patreon.ts`**

```typescript
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import {
  PATREON_CREATOR_TOKEN,
  ECL_ELIGIBLE_PATREON_TIERS,
} from "./constants";
import type { PatreonSnapshot } from "./types";

const PATREON_API = "https://www.patreon.com/api/oauth2/v2";
const COLLECTION = "dashboard_patreon_snapshots";

interface PatreonMember {
  id: string;
  attributes: {
    patron_status: string;
    last_charge_date: string | null;
    last_charge_status: string | null;
    pledge_relationship_start: string | null;
    full_name: string;
  };
  relationships: {
    currently_entitled_tiers?: { data: { id: string; type: string }[] };
    user?: { data: { id: string; type: string } };
  };
}

interface PatreonTier {
  id: string;
  attributes: { title: string; amount_cents: number };
}

interface PatreonUser {
  id: string;
  attributes: {
    social_connections?: {
      discord?: { user_id: string; url?: string } | null;
    };
  };
}

async function patreonFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${PATREON_CREATOR_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error(
        "Patreon Creator Access Token is invalid or expired. Regenerate it at patreon.com/portal/registration/register-clients"
      );
    }
    throw new Error(`Patreon API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getCampaignId(): Promise<string> {
  const data = await patreonFetch(`${PATREON_API}/campaigns`);
  if (!data.data?.[0]?.id) {
    throw new Error("No Patreon campaign found");
  }
  return data.data[0].id;
}

export async function syncPatreonForMonth(
  month: string,
  userId: string,
  userName: string
): Promise<{ synced: number; skipped: number; warnings: string[] }> {
  if (!PATREON_CREATOR_TOKEN) {
    throw new Error("PATREON_CREATOR_TOKEN not configured");
  }

  const campaignId = await getCampaignId();
  const warnings: string[] = [];

  // Fetch all members (paginated)
  const members: PatreonMember[] = [];
  const tiers: Map<string, PatreonTier> = new Map();
  const users: Map<string, PatreonUser> = new Map();

  let url: string | null =
    `${PATREON_API}/campaigns/${campaignId}/members` +
    `?include=currently_entitled_tiers,user` +
    `&fields[member]=patron_status,full_name,last_charge_date,last_charge_status,pledge_relationship_start` +
    `&fields[tier]=title,amount_cents` +
    `&fields[user]=social_connections` +
    `&page[size]=500`;

  while (url) {
    const page = await patreonFetch(url);

    for (const item of page.data || []) {
      members.push(item);
    }

    for (const inc of page.included || []) {
      if (inc.type === "tier") tiers.set(inc.id, inc);
      if (inc.type === "user") users.set(inc.id, inc);
    }

    url = page.links?.next || null;
  }

  // Process members — atomic: collect all docs first, then bulk write
  const db = await getDb();
  const collection = db.collection<PatreonSnapshot>(COLLECTION);
  let synced = 0;
  let skipped = 0;

  for (const member of members) {
    if (member.attributes.patron_status !== "active_patron") {
      skipped++;
      continue;
    }
    if (member.attributes.last_charge_status !== "Paid") {
      skipped++;
      continue;
    }

    const tierIds =
      member.relationships.currently_entitled_tiers?.data?.map((t) => t.id) ||
      [];
    const memberTiers = tierIds
      .map((id) => tiers.get(id))
      .filter((t): t is PatreonTier => !!t);

    const eclTier = memberTiers.find((t) =>
      ECL_ELIGIBLE_PATREON_TIERS.includes(t.attributes.title)
    );

    if (!eclTier) {
      for (const t of memberTiers) {
        if (
          !ECL_ELIGIBLE_PATREON_TIERS.includes(t.attributes.title) &&
          t.attributes.amount_cents >= 650
        ) {
          warnings.push(
            `Unrecognized tier "${t.attributes.title}" (${t.attributes.amount_cents}c) for ${member.attributes.full_name}`
          );
        }
      }
      skipped++;
      continue;
    }

    // Discord user ID from social connections (snowflake, not username)
    const patreonUserId = member.relationships.user?.data?.id;
    const user = patreonUserId ? users.get(patreonUserId) : null;
    const discordConnection =
      user?.attributes?.social_connections?.discord ?? null;
    const discordId = discordConnection?.user_id ?? null;

    const now = new Date().toISOString();
    await collection.updateOne(
      { month, patreon_user_id: patreonUserId || member.id },
      {
        $set: {
          month,
          discord_id: discordId,
          patreon_name: member.attributes.full_name,
          tier: eclTier.attributes.title,
          pledge_amount: eclTier.attributes.amount_cents / 100,
          patreon_user_id: patreonUserId || member.id,
          synced_at: now,
        },
      },
      { upsert: true }
    );

    synced++;
  }

  await logActivity(
    "sync",
    "patreon_sync",
    month,
    { synced, skipped, warnings_count: warnings.length },
    userId,
    userName
  );

  return { synced, skipped, warnings };
}
```

- [ ] **Step 2: Create `app/api/patreon/sync/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncPatreonForMonth } from "@/lib/patreon";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const result = await syncPatreonForMonth(month, userId, userName);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("POST /api/patreon/sync error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to sync Patreon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/patreon.ts app/api/patreon/sync/route.ts
git commit -m "feat: add Patreon API sync for monthly snapshots"
```

---

## Chunk 3: Backfill Script

### Task 9: CSV backfill API route

**Files:**
- Create: `lib/backfill.ts`
- Create: `app/api/admin/backfill-subscriptions/route.ts`

The backfill reads CSVs from hardcoded local paths (one-time operation, never deployed to production).

- [ ] **Step 1: Create `lib/backfill.ts`**

```typescript
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { ECL_ELIGIBLE_PATREON_TIERS } from "./constants";
import { readFileSync } from "fs";

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

function getMonthsBetween(start: string, end: string): string[] {
  const months: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy,
    m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

// Hardcoded paths — one-time local operation, never deployed
const PATREON_CSV =
  "C:\\Users\\jopeg\\Downloads\\20260312-members-7890401-Cedhpt.csv";
const KOFI_CSVS = [
  "C:\\Users\\jopeg\\Downloads\\Transaction_December 2025.csv",
  "C:\\Users\\jopeg\\Downloads\\Transaction_January 2026.csv",
  "C:\\Users\\jopeg\\Downloads\\Transaction_February 2026.csv",
  "C:\\Users\\jopeg\\Downloads\\Transaction_March 2026.csv",
];

export async function backfillPatreon(
  userId: string,
  userName: string
): Promise<{ inserted: number; skipped: number }> {
  const content = readFileSync(PATREON_CSV, "utf-8");
  const rows = parseCSV(content);
  const db = await getDb();
  const collection = db.collection("dashboard_patreon_snapshots");
  const syncTimestamp = new Date().toISOString();

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const tier = row["Tier"] || "";
    if (!ECL_ELIGIBLE_PATREON_TIERS.includes(tier)) {
      skipped++;
      continue;
    }

    const status = row["Patron Status"] || "";
    const pledgeAmount = parseFloat(row["Pledge Amount"] || "0");
    const patronageSince = row["Patronage Since Date"] || "";
    const lastChargeDate = row["Last Charge Date"] || "";
    const lastChargeStatus = row["Last Charge Status"] || "";
    const patreonUserId = row["User ID"] || "";
    const patreonName = row["Name"] || "";
    const discord = row["Discord"] || null;

    if (!patronageSince) {
      skipped++;
      continue;
    }

    const startMonth = patronageSince.substring(0, 7);

    let endMonth: string;
    if (status === "Active patron" && lastChargeStatus === "Paid") {
      const currentDate = new Date();
      endMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    } else if (lastChargeDate) {
      endMonth = lastChargeDate.substring(0, 7);
    } else {
      skipped++;
      continue;
    }

    // Only backfill from 2025-12 onward (ECL league start)
    const effectiveStart = startMonth < "2025-12" ? "2025-12" : startMonth;
    if (effectiveStart > endMonth) {
      skipped++;
      continue;
    }

    const months = getMonthsBetween(effectiveStart, endMonth);

    for (const month of months) {
      await collection.updateOne(
        { month, patreon_user_id: patreonUserId },
        {
          $set: {
            month,
            discord_id: discord, // CSV has Discord username, not ID — best we have for backfill
            patreon_name: patreonName,
            tier,
            pledge_amount: pledgeAmount,
            patreon_user_id: patreonUserId,
            synced_at: syncTimestamp,
          },
        },
        { upsert: true }
      );
      inserted++;
    }
  }

  await logActivity(
    "create",
    "backfill",
    "patreon_csv",
    { inserted, skipped },
    userId,
    userName
  );

  return { inserted, skipped };
}

export async function backfillKofi(
  userId: string,
  userName: string
): Promise<{ inserted: number; skipped: number }> {
  const db = await getDb();
  const kofiEvents = db.collection("subs_kofi_events");
  const backfillCollection = db.collection("dashboard_kofi_backfill");
  const syncTimestamp = new Date().toISOString();

  let inserted = 0;
  let skipped = 0;

  for (const csvPath of KOFI_CSVS) {
    const content = readFileSync(csvPath, "utf-8");
    const rows = parseCSV(content);

    for (const row of rows) {
      const dateStr = row["DateTime (UTC)"] || "";
      const discordRaw = row["DiscordUsername"] || "";
      const transactionId = row["TransactionId"] || "";
      const amount = parseFloat(row["Received"] || "0");

      if (!dateStr || !transactionId) {
        skipped++;
        continue;
      }

      // Parse month from "MM/DD/YYYY HH:MM"
      const parts = dateStr.split(" ")[0].split("/");
      if (parts.length !== 3) {
        skipped++;
        continue;
      }
      const month = `${parts[2]}-${parts[0].padStart(2, "0")}`;

      // Strip "#0" suffix from Discord username
      const discord = discordRaw.replace(/#0$/, "").toLowerCase().trim();

      if (!discord || discord === "not connected") {
        skipped++;
        continue;
      }

      // Check if subs_kofi_events already has this transaction
      const existing = await kofiEvents.findOne({ txn_id: transactionId });
      if (existing) {
        skipped++;
        continue;
      }

      await backfillCollection.updateOne(
        { month, discord_username: discord, transaction_id: transactionId },
        {
          $set: {
            month,
            discord_username: discord,
            transaction_id: transactionId,
            amount,
            backfilled_at: syncTimestamp,
          },
        },
        { upsert: true }
      );
      inserted++;
    }
  }

  await logActivity(
    "create",
    "backfill",
    "kofi_csv",
    { inserted, skipped, csv_count: KOFI_CSVS.length },
    userId,
    userName
  );

  return { inserted, skipped };
}
```

- [ ] **Step 2: Create `app/api/admin/backfill-subscriptions/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { backfillPatreon, backfillKofi } from "@/lib/backfill";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName =
      (session.user as any).username || session.user.name || "unknown";

    const patreonResult = await backfillPatreon(userId, userName);
    const kofiResult = await backfillKofi(userId, userName);

    return NextResponse.json({
      data: { patreon: patreonResult, kofi: kofiResult },
    });
  } catch (err) {
    console.error("POST /api/admin/backfill-subscriptions error:", err);
    const message = err instanceof Error ? err.message : "Backfill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/backfill.ts app/api/admin/backfill-subscriptions/route.ts
git commit -m "feat: add CSV backfill for Patreon and Ko-fi historical data"
```

---

## Chunk 4: UI — Finance Page Subscription Income Card

### Task 10: SubscriptionIncomeCard component

**Files:**
- Create: `components/finance/SubscriptionIncomeCard.tsx`

- [ ] **Step 1: Read `components/finance/BalanceCard.tsx` for styling patterns**

- [ ] **Step 2: Create the component**

The card uses the same `var(--bg-card)` / `var(--border)` pattern. Button uses `var(--accent)` background with `var(--accent-text)` for text (dark text on gold). Euro sign prefixed before amount (matching BalanceCard convention).

```typescript
"use client";

import type { SubscriptionIncome } from "@/lib/types";

interface SubscriptionIncomeCardProps {
  income: SubscriptionIncome | null;
  isLoading: boolean;
  onSyncPatreon?: () => void;
  isSyncing?: boolean;
}

export default function SubscriptionIncomeCard({
  income,
  isLoading,
  onSyncPatreon,
  isSyncing,
}: SubscriptionIncomeCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-center py-8">
          <div
            className="w-6 h-6 animate-spin rounded-full border-2"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
        </div>
      </div>
    );
  }

  if (!income) return null;

  const sources = [
    {
      label: "Patreon",
      count: income.patreon.count,
      amount: income.patreon.amount,
      color: "var(--warning)",
    },
    {
      label: "Ko-fi",
      count: income.kofi.count,
      amount: income.kofi.amount,
      color: "var(--accent)",
    },
    {
      label: "Manual",
      count: income.manual.count,
      amount: income.manual.amount,
      color: "var(--success)",
    },
  ];

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Subscription Income
        </h3>
        {onSyncPatreon && (
          <button
            onClick={onSyncPatreon}
            disabled={isSyncing}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
              opacity: isSyncing ? 0.6 : 1,
            }}
          >
            {isSyncing ? "Syncing..." : "Sync Patreon"}
          </button>
        )}
      </div>

      <div className="mb-4">
        <span
          className="text-3xl font-bold"
          style={{ color: "var(--success)" }}
        >
          €{income.total.toFixed(2)}
        </span>
      </div>

      <div className="space-y-3">
        {sources.map((src) => (
          <div
            key={src.label}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: src.color }}
              />
              <span style={{ color: "var(--text-secondary)" }}>
                {src.label}
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                ({src.count})
              </span>
            </div>
            <span style={{ color: "var(--text-primary)" }}>
              €{src.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/finance/SubscriptionIncomeCard.tsx
git commit -m "feat: add SubscriptionIncomeCard component"
```

### Task 11: Integrate SubscriptionIncomeCard into finance page

**Files:**
- Modify: `app/(dashboard)/finance/page.tsx`

- [ ] **Step 1: Read the finance page fully to confirm variable names**

Read `app/(dashboard)/finance/page.tsx`. Note the exact names of: summary SWR data variable, mutate function, loading state. The summary SWR destructuring should look like `{ data: summaryData, isLoading: summaryLoading, mutate: mutateSummary }` — verify and use the actual names.

- [ ] **Step 2: Add imports**

```typescript
import { useState } from "react"; // may already exist
import SubscriptionIncomeCard from "@/components/finance/SubscriptionIncomeCard";
```

- [ ] **Step 3: Add Patreon sync state and handler**

Inside the component, after existing state declarations:

```typescript
const [isSyncing, setIsSyncing] = useState(false);
const [syncError, setSyncError] = useState<string | null>(null);

const handleSyncPatreon = async () => {
  setIsSyncing(true);
  setSyncError(null);
  try {
    const res = await fetch(`/api/patreon/sync?month=${month}`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      setSyncError(err.error || "Sync failed");
      return;
    }
    // Refresh summary — use the actual mutate function name from SWR
    mutateSummary();
  } catch {
    setSyncError("Failed to sync Patreon");
  } finally {
    setIsSyncing(false);
  }
};
```

**Important:** Replace `mutateSummary` with the actual variable name from the SWR destructuring in the file.

- [ ] **Step 4: Add the card to the layout**

Place above or alongside the existing `<BalanceCard>`:

```tsx
<SubscriptionIncomeCard
  income={summary?.subscription_income ?? null}
  isLoading={summaryLoading}
  onSyncPatreon={handleSyncPatreon}
  isSyncing={isSyncing}
/>
{syncError && (
  <div
    className="rounded-lg border px-4 py-3 text-sm"
    style={{
      background: "rgba(239, 68, 68, 0.1)",
      borderColor: "var(--error)",
      color: "var(--error)",
    }}
  >
    {syncError}
  </div>
)}
```

**Important:** Replace `summary` and `summaryLoading` with the actual variable names from the file's SWR hook.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/finance/page.tsx"
git commit -m "feat: add subscription income card to finance page"
```

---

## Chunk 5: UI — Subscribers Page Manual-Paid Toggle

### Task 12: Add manual-paid toggle to SubscriberTable

**Files:**
- Modify: `components/subscribers/SubscriberTable.tsx`
- Modify: `app/(dashboard)/subscribers/page.tsx`

- [ ] **Step 1: Read both files fully**

Read `components/subscribers/SubscriberTable.tsx` and `app/(dashboard)/subscribers/page.tsx`. Note:
- How columns are defined (array of objects with `key`, `label`, `render()`)
- How the SourceBadge inline component works
- How subscribers are filtered in the page before being passed to the table
- The SWR variable names

- [ ] **Step 2: Add props to SubscriberTable**

Add new props:

```typescript
interface SubscriberTableProps {
  subscribers: Subscriber[];
  filterSource?: SubscriptionSource | null;
  manualPaidIds?: Set<string>;
  onToggleManualPaid?: (discordId: string, isPaid: boolean) => void;
}
```

- [ ] **Step 3: Add manual-paid badge and toggle to free-tier rows**

In the tier/source badge rendering area, modify the free-tier badge to show "Paid" when the subscriber is in `manualPaidIds`. Add a toggle button next to it.

```tsx
// Determine if this free subscriber is marked as paid
const isPaid = manualPaidIds?.has(sub.discord_id);

// For the badge area — replace existing free badge logic:
{sub.source === "free" && isPaid ? (
  <span
    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--success)" }}
  >
    Paid
  </span>
) : (
  /* existing SourceBadge for this subscriber */
)}

// Toggle button — only for free-tier subscribers:
{sub.source === "free" && onToggleManualPaid && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onToggleManualPaid(sub.discord_id, !isPaid);
    }}
    className="ml-2 rounded px-2 py-0.5 text-xs transition-colors"
    style={{
      background: isPaid ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
      color: isPaid ? "var(--error)" : "var(--success)",
    }}
  >
    {isPaid ? "Unmark" : "Mark Paid"}
  </button>
)}
```

Note: Use literal rgba values instead of non-existent CSS variable `--success-rgb` / `--error-rgb`.

- [ ] **Step 4: Update subscribers page to fetch and manage manual payments**

In `app/(dashboard)/subscribers/page.tsx`:

1. Add SWR fetch for manual payments:

```typescript
const { data: manualData, mutate: mutateManual } = useSWR<{
  data: { discord_id: string }[];
}>(`/api/subscribers/manual-payments?month=${month}`, fetcher);

const manualPaidIds = new Set(
  (manualData?.data || []).map((m) => m.discord_id)
);
```

2. Add toggle handler:

```typescript
const handleToggleManualPaid = async (
  discordId: string,
  markAsPaid: boolean
) => {
  const method = markAsPaid ? "POST" : "DELETE";
  await fetch(`/api/subscribers/${discordId}/manual-payment?month=${month}`, {
    method,
  });
  mutateManual();
};
```

3. Pass to SubscriberTable (the page already filters subscribers before passing — do NOT add `filterSource`):

```tsx
<SubscriberTable
  subscribers={filteredSubscribers}
  manualPaidIds={manualPaidIds}
  onToggleManualPaid={handleToggleManualPaid}
/>
```

**Important:** Replace `filteredSubscribers` with the actual variable name used in the page.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/subscribers/SubscriberTable.tsx "app/(dashboard)/subscribers/page.tsx"
git commit -m "feat: add manual-paid toggle to subscriber table"
```

---

## Chunk 6: UI — Settings Page Subscription Rates

### Task 13: SubscriptionRatesManager component

**Files:**
- Create: `components/settings/SubscriptionRatesManager.tsx`

Note: Settings components live in `components/settings/`, not `components/dashboard/settings/`.

- [ ] **Step 1: Read `components/settings/SettingsContent.tsx` for patterns**

Pay attention to the `Section` component, how it renders headers with icons, and how sections are laid out. Also check if `MonthPicker` is used anywhere in settings or could be imported.

- [ ] **Step 2: Create the component**

Use `var(--bg-page)` for input backgrounds (same as existing forms), `var(--accent)` / `var(--accent-text)` for buttons. Use the existing `MonthPicker` component if it provides a simple month-string value, otherwise use a plain text input with YYYY-MM placeholder.

```typescript
"use client";

import { useState } from "react";
import useSWR from "swr";
import type { SubscriptionRate } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SubscriptionRatesManager() {
  const { data, mutate } = useSWR<{ data: SubscriptionRate[] }>(
    "/api/finance/subscription-rates",
    fetcher
  );

  const rates = data?.data || [];

  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [patreonNet, setPatreonNet] = useState("5.79");
  const [kofiNet, setKofiNet] = useState("5.63");
  const [manualNet, setManualNet] = useState("6.50");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveFrom) return;

    setSaving(true);
    try {
      const res = await fetch("/api/finance/subscription-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effective_from: effectiveFrom,
          patreon_net: parseFloat(patreonNet),
          kofi_net: parseFloat(kofiNet),
          manual_net: parseFloat(manualNet),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save");
        return;
      }

      mutate();
      setEffectiveFrom("");
    } catch {
      alert("Failed to save rate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Rate history table */}
      {rates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th className="pb-2 text-left font-medium">Effective From</th>
                <th className="pb-2 text-right font-medium">Patreon Net</th>
                <th className="pb-2 text-right font-medium">Ko-fi Net</th>
                <th className="pb-2 text-right font-medium">Manual Net</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr
                  key={rate.effective_from}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <td className="py-2">{rate.effective_from}</td>
                  <td className="py-2 text-right">
                    €{rate.patreon_net.toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    €{rate.kofi_net.toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    €{rate.manual_net.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new rate form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Add new rates (applies from the selected month onward, does not affect
          previous months).
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label
              className="mb-1 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Effective From
            </label>
            <input
              type="month"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Patreon Net (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={patreonNet}
              onChange={(e) => setPatreonNet(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Ko-fi Net (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={kofiNet}
              onChange={(e) => setKofiNet(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Manual Net (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={manualNet}
              onChange={(e) => setManualNet(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !effectiveFrom}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
            opacity: saving || !effectiveFrom ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Add Rate"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/settings/SubscriptionRatesManager.tsx
git commit -m "feat: add SubscriptionRatesManager component for settings"
```

### Task 14: Add SubscriptionRatesManager to settings page

**Files:**
- Modify: `components/settings/SettingsContent.tsx`

- [ ] **Step 1: Read `components/settings/SettingsContent.tsx` fully**

Identify the `Section` component pattern and how to add a new section with an icon.

- [ ] **Step 2: Import and wrap in Section**

Add import:

```typescript
import SubscriptionRatesManager from "./SubscriptionRatesManager";
import { DollarSign } from "lucide-react"; // or appropriate icon already used
```

Add a new section using the existing `Section` component pattern:

```tsx
<Section icon={DollarSign} title="Subscription Rates">
  <SubscriptionRatesManager />
</Section>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/settings/SettingsContent.tsx
git commit -m "feat: add subscription rates section to settings page"
```

---

## Chunk 7: Backfill Execution & Verification

### Task 15: Create MongoDB indexes

- [ ] **Step 1: Create indexes via MongoDB shell or Atlas UI**

These unique indexes prevent duplicate records:

```javascript
db.dashboard_patreon_snapshots.createIndex(
  { month: 1, patreon_user_id: 1 },
  { unique: true }
);
db.dashboard_manual_payments.createIndex(
  { month: 1, discord_id: 1 },
  { unique: true }
);
db.dashboard_subscription_rates.createIndex(
  { effective_from: 1 },
  { unique: true }
);
db.dashboard_kofi_backfill.createIndex(
  { month: 1, discord_username: 1, transaction_id: 1 },
  { unique: true }
);
```

Run these in MongoDB Atlas console or via `mongosh`.

### Task 16: Run the backfill and verify

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Run backfill**

In the browser console (must be logged in):

```javascript
fetch("/api/admin/backfill-subscriptions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
}).then(r => r.json()).then(console.log);
```

Expected: `{ data: { patreon: { inserted: N, skipped: M }, kofi: { inserted: X, skipped: Y } } }`

- [ ] **Step 3: Add initial subscription rates**

```javascript
fetch("/api/finance/subscription-rates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    effective_from: "2025-12",
    patreon_net: 5.79,
    kofi_net: 5.63,
    manual_net: 6.50
  })
}).then(r => r.json()).then(console.log);
```

- [ ] **Step 4: Verify finance page**

Navigate to the finance page. Select December 2025 — confirm Subscription Income card shows Patreon and Ko-fi counts with correct amounts. Repeat for Jan, Feb, Mar 2026.

- [ ] **Step 5: Verify subscriber page toggle**

Navigate to subscribers. Find a "Free" tier subscriber. Click "Mark Paid". Confirm badge changes to "Paid". Click "Unmark". Confirm it reverts.

- [ ] **Step 6: Verify settings page rates**

Navigate to settings. Confirm rate history table shows the 2025-12 entry. Try adding a new rate for a future month.

- [ ] **Step 7: Clean up backfill code**

After successful backfill, the backfill route and hardcoded paths can be removed or left dormant. The `lib/backfill.ts` file and `app/api/admin/backfill-subscriptions/route.ts` are one-time use.
