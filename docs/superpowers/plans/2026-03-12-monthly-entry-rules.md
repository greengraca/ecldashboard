# Monthly Entry Rules & Per-Tier Income Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-tier Patreon income, December free month, and dual-tag subscriber display.

**Architecture:** Modify constants and income calculation to use per-tier net rates from snapshot data. Add `free_entry_reason` field to subscribers via secondary detection pass. Update subscriber table UI with muted secondary badges.

**Tech Stack:** Next.js 16, TypeScript, MongoDB aggregation, React components with CSS variables.

**Spec:** `docs/superpowers/specs/2026-03-12-monthly-entry-rules-design.md`

---

## Chunk 1: Constants, Types & Backfill

### Task 1: Add constants for per-tier rates and Arena Vanguard roles

**Files:**
- Modify: `lib/constants.ts:16-47`

- [ ] **Step 1: Add Arena Vanguard role IDs and per-tier net mapping**

In `lib/constants.ts`, add after line 20 (after `ECL_MOD_ROLE_IDS`):

```ts
export const ARENA_VANGUARD_ROLE_IDS = parseIntSet(process.env.ARENA_VANGUARD_ROLE_IDS);
```

Replace line 41:
```ts
export const ECL_ELIGIBLE_PATREON_TIERS = ["ECL Grinder", "Gold", "Diamond"];
```
with:
```ts
export const ECL_ELIGIBLE_PATREON_TIERS = ["ECL Grinder", "Gold", "Diamond", "Bronze", "Silver"];
```

Add after `ECL_ELIGIBLE_PATREON_TIERS`:
```ts
// Net income per Patreon tier after ~10.9% Patreon fee.
// Gold/Diamond pay more but extra is donation — capped at Grinder rate.
export const PATREON_TIER_NET: Record<string, number> = {
  "Bronze": 2.67,
  "Silver": 4.45,
  "ECL Grinder": 5.79,
  "Gold": 5.79,
  "Diamond": 5.79,
};
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds (ARENA_VANGUARD_ROLE_IDS defaults to empty set if env var not set).

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: add per-tier Patreon net rates and Arena Vanguard role IDs"
```

### Task 2: Add `free_entry_reason` to Subscriber type and initialize in subscribers

**Files:**
- Modify: `lib/types.ts:7-18`
- Modify: `lib/subscribers.ts` (3 subscriber push sites)

- [ ] **Step 1: Add field to Subscriber interface**

In `lib/types.ts`, add after line 15 (`games_played: number;`):

```ts
  free_entry_reason: string | null;
```

- [ ] **Step 2: Add `free_entry_reason: null` to all subscriber push sites**

In `lib/subscribers.ts`, add `free_entry_reason: null,` to each of the 3 `subscribers.push({...})` calls:

Section 1 (around line 200-213, after `expires_at`):
```ts
      free_entry_reason: null,
```

Section 2 (around line 233-244, after `expires_at`):
```ts
      free_entry_reason: null,
```

Section 3 (around line 265-276, after `expires_at`):
```ts
      free_entry_reason: null,
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds — all Subscriber objects now include `free_entry_reason`.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/subscribers.ts
git commit -m "feat: add free_entry_reason field to Subscriber type"
```

### Task 3: Trim tier names in backfill

**Files:**
- Modify: `lib/backfill.ts:80,130`

- [ ] **Step 1: Trim tier name on read and on write**

In `lib/backfill.ts`, change line 80:
```ts
    const tier = row["Tier"] || "";
```
to:
```ts
    const tier = (row["Tier"] || "").trim();
```

Also change line 130 from:
```ts
            tier,
```
to:
```ts
            tier: tier.trim(),
```
(This is belt-and-suspenders — `tier` is already trimmed above, but this ensures the `$set` value is always clean.)

- [ ] **Step 2: Commit**

```bash
git add lib/backfill.ts
git commit -m "fix: trim Patreon tier names in backfill to normalize trailing spaces"
```

---

## Chunk 2: Per-Tier Income Calculation

### Task 4: Rewrite subscription income to use per-tier aggregation

**Files:**
- Modify: `lib/subscription-income.ts` (full rewrite of the function)

- [ ] **Step 1: Replace income calculation with per-tier logic**

Replace the entire content of `lib/subscription-income.ts` with:

```ts
import { getDb } from "./mongodb";
import { getRatesForMonth } from "./subscription-rates";
import { PATREON_TIER_NET } from "./constants";
import type { SubscriptionIncome } from "./types";

// Bronze/Silver only count for income in January 2026
const BRONZE_SILVER_TIERS = new Set(["Bronze", "Silver"]);
const BRONZE_SILVER_ELIGIBLE_MONTH = "2026-01";

// December 2025 was a free month — zero subscription income
const FREE_MONTH = "2025-12";

export async function getSubscriptionIncome(
  month: string
): Promise<SubscriptionIncome> {
  // Free month: no subscription income for any source
  if (month === FREE_MONTH) {
    return {
      patreon: { count: 0, amount: 0 },
      kofi: { count: 0, amount: 0 },
      manual: { count: 0, amount: 0 },
      total: 0,
    };
  }

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

  // 2. Patreon: aggregate by tier from snapshots, apply per-tier net rates
  const tierCounts = await db
    .collection("dashboard_patreon_snapshots")
    .aggregate<{ _id: string; count: number }>([
      { $match: { month } },
      {
        $group: {
          _id: { $trim: { input: "$tier" } },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  let patreonCount = 0;
  let patreonAmount = 0;
  for (const { _id: tier, count } of tierCounts) {
    // Skip Bronze/Silver unless it's their eligible month
    if (BRONZE_SILVER_TIERS.has(tier) && month !== BRONZE_SILVER_ELIGIBLE_MONTH) {
      continue;
    }
    const netRate = PATREON_TIER_NET[tier];
    if (netRate === undefined) continue; // unknown tier, skip
    patreonCount += count;
    patreonAmount += count * netRate;
  }
  patreonAmount = Math.round(patreonAmount * 100) / 100;

  // 3. Manual: count from dashboard_manual_payments
  const manualCount = await db
    .collection("dashboard_manual_payments")
    .countDocuments({ month });

  const kofiAmount = Math.round(totalKofi * rates.kofi_net * 100) / 100;
  const manualAmount = Math.round(manualCount * rates.manual_net * 100) / 100;

  return {
    patreon: { count: patreonCount, amount: patreonAmount },
    kofi: { count: totalKofi, amount: kofiAmount },
    manual: { count: manualCount, amount: manualAmount },
    total: Math.round((patreonAmount + kofiAmount + manualAmount) * 100) / 100,
  };
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds (Task 2 already added `free_entry_reason: null` to all subscriber objects).

- [ ] **Step 3: Commit**

```bash
git add lib/subscription-income.ts
git commit -m "feat: per-tier Patreon income with Dec free month and Jan Bronze/Silver"
```

---

## Chunk 3: Dual-Tag Subscriber Detection

### Task 5: Add free entry reason detection to subscribers

**Files:**
- Modify: `lib/subscribers.ts:1-15` (imports), `lib/subscribers.ts:106-280` (getSubscribers function)

This is the most complex task. It adds a secondary pass after source determination to detect `free_entry_reason` for all subscribers.

- [ ] **Step 1: Add imports**

In `lib/subscribers.ts`, update the imports from `"./constants"` (line 4-12) to also include `ARENA_VANGUARD_ROLE_IDS`:

```ts
import {
  PATREON_ROLE_IDS,
  KOFI_ROLE_IDS,
  FREE_ENTRY_ROLE_IDS,
  JUDGE_ROLE_IDS,
  ECL_MOD_ROLE_IDS,
  ARENA_VANGUARD_ROLE_IDS,
  DISCORD_GUILD_ID,
  TOPDECK_BRACKET_ID,
} from "./constants";
```

Also add import for `getStandings` from players:

```ts
import { getStandings } from "./players";
```

- [ ] **Step 2: Add helper to detect free entry reason**

Add after the `determineTier` function (after line 104):

```ts
// Cache December 2025 topcut discord usernames (immutable historical data)
let decTopcut: Set<string> | null = null;

async function getDecemberTopcut(): Promise<Set<string>> {
  if (decTopcut) return decTopcut;

  try {
    const { standings } = await getStandings("2025-12");
    // Topcut = top 16 with 10+ games (eligibility threshold)
    const eligible = standings.filter((s) => s.games >= 10);

    // Map TopDeck UIDs to discord usernames via PublicPData
    const months = await getHistoricalMonths();
    const decMonths = months.filter((m) => m.month === "2025-12");
    const bracketIds = [...new Set(decMonths.map((m) => m.bracket_id))];

    const discordUsernames = new Set<string>();
    for (const bid of bracketIds) {
      try {
        const pdata = await fetchPublicPData(bid);
        for (const standing of eligible) {
          const info = pdata[standing.uid];
          if (info?.discord) {
            discordUsernames.add(info.discord.toLowerCase().trim());
          }
        }
      } catch {
        // bracket may no longer exist
      }
    }

    decTopcut = discordUsernames;
    return decTopcut;
  } catch {
    return new Set();
  }
}

function hasFreeEntryRole(roles: string[]): boolean {
  return (
    roleSetHasAny(roles, FREE_ENTRY_ROLE_IDS) ||
    roleSetHasAny(roles, JUDGE_ROLE_IDS) ||
    roleSetHasAny(roles, ECL_MOD_ROLE_IDS) ||
    roleSetHasAny(roles, ARENA_VANGUARD_ROLE_IDS)
  );
}

async function detectFreeEntryReason(
  roles: string[],
  username: string,
  month: string,
  isPaidSource: boolean
): Promise<string | null> {
  if (!hasFreeEntryRole(roles)) return null;

  // Topcut: only for January 2026
  if (month === "2026-01") {
    const topcut = await getDecemberTopcut();
    if (topcut.has(username.toLowerCase().trim())) return "Topcut";
  }

  // Vanguard
  if (roleSetHasAny(roles, ARENA_VANGUARD_ROLE_IDS)) return "Vanguard";

  // Judge/Mod — only informative for paid subscribers
  // (free subscribers already show Judge/Mod in their tier)
  if (isPaidSource) {
    if (roleSetHasAny(roles, JUDGE_ROLE_IDS)) return "Judge";
    if (roleSetHasAny(roles, ECL_MOD_ROLE_IDS)) return "Mod";
  }

  // Generic fallback for paid subscribers with free entry roles
  if (isPaidSource && roleSetHasAny(roles, FREE_ENTRY_ROLE_IDS)) return "Free Entry";

  return null;
}
```

- [ ] **Step 3: Update section 1 subscriber push to use detection**

In `getSubscribers`, section 1 (Discord members with roles). Replace the `free_entry_reason: null,` line (added in Task 2) and the lines before the push. Change:

```ts
    subscribers.push({
      ...
      free_entry_reason: null,
    });
```

to:

```ts
    const isPaid = source === "patreon" || source === "kofi";
    const freeReason = member.roles.length > 0
      ? await detectFreeEntryReason(member.roles, member.username, month, isPaid)
      : null;

    subscribers.push({
      discord_id: member.id,
      username: member.username,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      source,
      tier: determineTier(source, member.roles),
      is_playing: gamesPlayed > 0,
      games_played: gamesPlayed,
      joined_at: member.joined_at,
      expires_at: accessRec?.expires_at
        ? String(accessRec.expires_at)
        : null,
      free_entry_reason: freeReason,
    });
```

Sections 2 and 3 keep `free_entry_reason: null` (already set in Task 2).

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add lib/subscribers.ts
git commit -m "feat: detect free_entry_reason for dual-tag subscriber display"
```

---

## Chunk 4: UI — Dual-Tag Badge Display

### Task 6: Add muted secondary badge to subscriber table

**Files:**
- Modify: `components/subscribers/subscriber-table.tsx`

- [ ] **Step 1: Add FreeReasonBadge component**

In `components/subscribers/subscriber-table.tsx`, add after the `SourceBadge` component (after line 46):

```tsx
function FreeReasonBadge({ reason, muted = false }: { reason: string; muted?: boolean }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        color: "var(--status-free)",
        background: "var(--status-free-light)",
        opacity: muted ? 0.6 : 1,
      }}
    >
      Free: {reason}
    </span>
  );
}
```

- [ ] **Step 2: Render badges in the Source column (desktop)**

In the source column render function (around line 110-138), update to handle three cases:
1. **Paid + free reason** → show both badges, free reason badge is muted
2. **Free + free reason** → replace generic `[Free]` with specific `[Free: reason]` at full opacity
3. **No free reason** → show source badge only (existing behavior)

Replace the render function body:

```tsx
      render: (row) => {
        const isPaid = manualPaidIds?.has(row.discord_id as string);
        const freeReason = row.free_entry_reason as string | null;
        const isFreeSource = row.source === "free";
        return (
          <div className="flex items-center gap-2.5">
            {/* For free subscribers with a reason, replace generic badge */}
            {isFreeSource && freeReason ? (
              <FreeReasonBadge reason={freeReason} />
            ) : (
              <SourceBadge source={row.source as SubscriptionSource} />
            )}
            {/* For paid subscribers with a reason, show muted secondary badge */}
            {!isFreeSource && freeReason && (
              <FreeReasonBadge reason={freeReason} muted />
            )}
            {isFreeSource && onToggleManualPaid && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleManualPaid(row.discord_id as string, !isPaid);
                }}
                className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors"
                style={{
                  background: isPaid ? "var(--accent)" : "var(--border)",
                }}
                title={isPaid ? "Unmark manual payment" : "Mark as manually paid"}
              >
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 rounded-full transition-all duration-200"
                  style={{
                    background: isPaid ? "var(--accent-text)" : "var(--text-muted)",
                    transform: isPaid ? "translate(13px, -50%)" : "translate(5px, -50%)",
                  }}
                />
              </button>
            )}
          </div>
        );
      },
```

- [ ] **Step 3: Update mobile card to show free reason badge**

In the `renderMobileCard` prop (around line 217-248), update the mobile card. After the `<SourceBadge>` on line 240, replace the badge area with logic that handles both paid+reason and free+reason:

```tsx
              <div className="flex items-center gap-1.5">
                {row.source === "free" && (row.free_entry_reason as string | null) ? (
                  <FreeReasonBadge reason={row.free_entry_reason as string} />
                ) : (
                  <SourceBadge source={row.source as SubscriptionSource} />
                )}
                {row.source !== "free" && (row.free_entry_reason as string | null) && (
                  <FreeReasonBadge reason={row.free_entry_reason as string} muted />
                )}
              </div>
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/subscribers/subscriber-table.tsx
git commit -m "feat: show muted free entry reason badge in subscriber table"
```

---

## Chunk 5: Re-run Backfill & Verify

### Task 7: Re-run Patreon backfill and verify

This task requires the dev server running and access to the MongoDB Atlas cluster.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Re-run the Patreon backfill**

Navigate to the admin backfill endpoint or trigger via:
```bash
curl -X POST http://localhost:3000/api/admin/backfill-subscriptions -H "Cookie: <your-auth-cookie>"
```

This will re-run `backfillPatreon()` which now includes Bronze/Silver in `ECL_ELIGIBLE_PATREON_TIERS` and trims tier names.

- [ ] **Step 3: Verify Bronze/Silver snapshots exist for January**

Check MongoDB Atlas or use the finance summary endpoint:
```bash
curl http://localhost:3000/api/finance/summary?month=2026-01 -H "Cookie: <your-auth-cookie>"
```

Expected: `subscription_income.patreon.amount` should now be lower than before (Bronze/Silver at €2.67/€4.45 instead of being excluded).

- [ ] **Step 4: Verify December shows zero income**

```bash
curl http://localhost:3000/api/finance/summary?month=2025-12 -H "Cookie: <your-auth-cookie>"
```

Expected: `subscription_income.patreon.amount`, `kofi.amount`, `manual.amount` all `0`.

- [ ] **Step 5: Verify subscriber dual tags**

Navigate to the Subscribers page for January 2026. Look for Patreon members who also have free entry roles — they should show two badges: `[Patreon] [Free: Topcut]` or similar.

- [ ] **Step 6: Commit any remaining fixes**

If any issues are found during verification, fix and commit.
