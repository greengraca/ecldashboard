# Monthly Entry Rules & Per-Tier Patreon Income

## Problem

The ECL subscription system treats all Patreon members identically (flat net rate) and has no concept of:
- Per-tier pricing (Bronze/Silver pay less than Grinder/Gold/Diamond)
- Free months (December 2025 was free for everyone)
- Dual tags (a paid member who also qualifies for free entry should show both)
- Free entry reasons (Topcut, Arena Vanguard, etc.)

## Scope

### In Scope
1. Per-tier Patreon income calculation using snapshot data
2. December 2025 free month (zero subscription income for all sources)
3. January 2026 Bronze/Silver tier income inclusion (January only, not ongoing)
4. Dual-tag display for paid subscribers with free entry roles (any month)
5. Free entry reason detection (Topcut from Dec standings for Jan only, Vanguard/Judge/Mod from roles any month)
6. Arena Vanguard role ID env var
7. Re-run backfill with Bronze/Silver in eligible tiers
8. Trim tier names in backfill and net rate mapping to avoid trailing-space mismatches

### Out of Scope
- New DB collections or schema changes
- New API routes
- Configurable free months (hardcoded one-off)
- Stat card changes (dual-tag members count under paid source only)
- Filter logic changes

## Design

### 1. Constants (`lib/constants.ts`)

**New exports:**

```ts
export const ARENA_VANGUARD_ROLE_IDS = parseIntSet(process.env.ARENA_VANGUARD_ROLE_IDS);

// Net income per Patreon tier (after ~10.9% Patreon fee)
export const PATREON_TIER_NET: Record<string, number> = {
  "Bronze": 2.67,
  "Silver": 4.45,
  "ECL Grinder": 5.79,
  "Gold": 5.79,
  "Diamond": 5.79,
};
```

**Modified:**

```ts
// Add Bronze and Silver
export const ECL_ELIGIBLE_PATREON_TIERS = [
  "ECL Grinder", "Gold", "Diamond", "Bronze", "Silver"
];
```

`ALL_SUB_ROLE_IDS` is NOT changed — Arena Vanguard is checked separately to avoid double-counting subscribers.

### 2. Type Change (`lib/types.ts`)

Add to `Subscriber` interface:

```ts
free_entry_reason: string | null;
```

Values: `"Topcut"`, `"Vanguard"`, `"Judge"`, `"Mod"`, `"Free Entry"` (generic fallback), or `null`.

### 3. Income Calculation (`lib/subscription-income.ts`)

Replace flat `patreonCount * rates.patreon_net` with per-tier aggregation:

```
1. If month === "2025-12": return zero for ALL sources (Patreon, Ko-fi, manual).
   December was a free month — even if payments were made, no subscription
   income is recorded. Payments near end-of-December effectively apply to January.

2. Aggregate dashboard_patreon_snapshots grouped by tier (trimmed) for the month
3. For each tier group:
   - If tier is "Bronze" or "Silver" and month !== "2026-01": skip
     (Bronze/Silver are January 2026 only — they were always eligible tiers
      but only counted for income that one month)
   - Otherwise: income += count * PATREON_TIER_NET[tier]
4. patreon.count = total eligible Patreon subscribers (sum of counted tier groups)
5. Ko-fi and manual income calculation unchanged
```

The `patreon_net` field in `dashboard_subscription_rates` becomes unused for Patreon calculation but is kept for backwards compatibility. The existing query changes from an unfiltered `countDocuments({ month })` to a filtered aggregation grouped by tier.

### 4. Subscriber Dual Tags (`lib/subscribers.ts`)

Dual tags apply to **any month**, not just January. Any paid subscriber who also has a free entry role gets a `free_entry_reason`.

After the existing source determination pass, add a secondary pass:

**For paid subscribers** (`source === "patreon"` or `source === "kofi"`):
```
1. Check if they have any FREE_ENTRY_ROLE_IDS, JUDGE_ROLE_IDS, ECL_MOD_ROLE_IDS,
   or ARENA_VANGUARD_ROLE_IDS
2. If yes, determine reason (first match wins):
   a. If month is "2026-01" and in December 2025 top 16 → "Topcut"
   b. If has ARENA_VANGUARD_ROLE_IDS → "Vanguard"
   c. If has JUDGE_ROLE_IDS → "Judge"
   d. If has ECL_MOD_ROLE_IDS → "Mod"
   e. Otherwise → "Free Entry"
3. Set subscriber.free_entry_reason = reason
```

**For free-source subscribers** (`source === "free"`):
```
1. Determine specific reason using same priority:
   a. If month is "2026-01" and in December 2025 top 16 → "Topcut"
   b. If has ARENA_VANGUARD_ROLE_IDS → "Vanguard"
   c. If has JUDGE_ROLE_IDS → already shown in tier name
   d. If has ECL_MOD_ROLE_IDS → already shown in tier name
   e. Otherwise → null
2. Set subscriber.free_entry_reason = reason (only if it adds info beyond the tier)
```

For free-source subscribers, `free_entry_reason` is set to the specific reason when it's more informative than the primary badge (e.g., a free subscriber who is a Topcut finisher shows `[Free: Topcut]` instead of just `[Free]`). Judge and Mod reasons are already visible in the tier column, so those stay `null`.

**Topcut detection:** Query December 2025 standings using existing `computeStandings()` from dump data. Only checked when `month === "2026-01"`. Cache the result since it's immutable historical data.

### 5. Subscriber Table UI (`components/subscribers/subscriber-table.tsx`)

**For paid subscribers with `free_entry_reason`:**
After the primary source badge, render a muted secondary badge:
- Format: `[Free: {reason}]` e.g. `[Free: Topcut]`, `[Free: Vanguard]`
- Style: existing free badge colors at reduced opacity (~60%)

**For free subscribers with `free_entry_reason`:**
Replace the generic `[Free]` badge with the specific `[Free: {reason}]` badge (at full opacity, since it's their primary badge).

### 6. Env Changes

**`.env.local.example`** — add:
```
ARENA_VANGUARD_ROLE_IDS=
```

### 7. Backfill

- Trim tier names during backfill (`row["Tier"].trim()`) to normalize trailing spaces from CSV
- Re-run `backfillPatreon` after updating `ECL_ELIGIBLE_PATREON_TIERS` to include Bronze/Silver
- This populates `dashboard_patreon_snapshots` with Bronze/Silver members for all months they were active
- The income logic filters them to only count in January 2026

## Hardcoded One-Offs

| Rule | Month | Logic Location |
|------|-------|----------------|
| Zero subscription income (all sources) | 2025-12 | `lib/subscription-income.ts` |
| Bronze/Silver count for income | 2026-01 only | `lib/subscription-income.ts` |
| Topcut free entry reason detection | 2026-01 only | `lib/subscribers.ts` |

## Not Month-Gated (Permanent)

| Feature | Logic Location |
|---------|----------------|
| Per-tier Patreon income (Grinder/Gold/Diamond) | `lib/subscription-income.ts` |
| Dual-tag display for paid + free entry | `lib/subscribers.ts` + subscriber table |
| Vanguard/Judge/Mod free entry reasons | `lib/subscribers.ts` |

## Files Changed

| File | Change |
|------|--------|
| `lib/constants.ts` | Add `ARENA_VANGUARD_ROLE_IDS`, `PATREON_TIER_NET`, expand `ECL_ELIGIBLE_PATREON_TIERS` |
| `lib/types.ts` | Add `free_entry_reason: string \| null` to `Subscriber` |
| `lib/subscribers.ts` | Secondary pass for free entry reason on all subscribers |
| `lib/subscription-income.ts` | Per-tier aggregation, Dec zero, Jan Bronze/Silver inclusion |
| `lib/backfill.ts` | Trim tier names during backfill |
| `components/subscribers/subscriber-table.tsx` | Muted secondary badge (paid) or specific primary badge (free) for `free_entry_reason` |
| `.env.local.example` | Add `ARENA_VANGUARD_ROLE_IDS` |

## No Changes To

- API routes (subscriber API already returns full `Subscriber` objects)
- DB schema (snapshots already have `tier` field)
- Stat cards (dual-tag members count under paid source only)
- Filter logic
- Manual payment system
- Finance summary structure (just the income amounts change)
