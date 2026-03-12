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
2. December 2025 free month (zero subscription income)
3. January 2026 Bronze/Silver tier income inclusion
4. Dual-tag display for paid subscribers with free entry roles
5. Free entry reason detection (Topcut from Dec standings, Vanguard from role)
6. Arena Vanguard role ID env var
7. Re-run backfill with Bronze/Silver in eligible tiers

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

export const PATREON_TIER_NET: Record<string, number> = {
  "Bronze ": 2.67,
  "Silver": 4.45,
  "ECL Grinder": 5.79,
  "Gold": 5.79,
  "Diamond": 5.79,
};
```

**Modified:**

```ts
// Add Bronze and Silver (note trailing space on Bronze from Patreon CSV)
export const ECL_ELIGIBLE_PATREON_TIERS = [
  "ECL Grinder", "Gold", "Diamond", "Bronze ", "Silver"
];
```

`ALL_SUB_ROLE_IDS` is NOT changed — Arena Vanguard is checked separately to avoid double-counting subscribers.

### 2. Type Change (`lib/types.ts`)

Add to `Subscriber` interface:

```ts
free_entry_reason: string | null;
```

Values: `"Topcut"`, `"Vanguard"`, `"Free Entry"` (generic fallback), or `null`.

### 3. Income Calculation (`lib/subscription-income.ts`)

Replace flat `patreonCount * rates.patreon_net` with:

```
1. If month === "2025-12": return zero for all sources (Patreon, Ko-fi, manual)
2. Aggregate dashboard_patreon_snapshots grouped by tier for the month
3. For each tier group:
   - If tier is "Bronze " or "Silver" and month !== "2026-01": skip (not eligible)
   - Otherwise: income += count * PATREON_TIER_NET[tier]
4. Ko-fi and manual income unchanged
```

The `patreon_net` field in `dashboard_subscription_rates` becomes unused for Patreon calculation but is kept for backwards compatibility.

### 4. Subscriber Dual Tags (`lib/subscribers.ts`)

After the existing source determination pass, add a secondary pass for paid subscribers (`source === "patreon"` or `source === "kofi"`):

```
For each paid subscriber:
  1. Check if they have any FREE_ENTRY_ROLE_IDS → candidate for free_entry_reason
  2. If candidate:
     a. Check December 2025 top 16 standings → "Topcut"
     b. Check ARENA_VANGUARD_ROLE_IDS → "Vanguard"
     c. Otherwise → "Free Entry"
  3. Set subscriber.free_entry_reason = reason
```

For `source === "free"` subscribers, `free_entry_reason` stays `null` (their free status is already their primary badge).

**Topcut detection:** Query December 2025 standings using existing `computeStandings()` from dump data. Cache the result since it's immutable historical data.

### 5. Subscriber Table UI (`components/subscribers/subscriber-table.tsx`)

After the primary source badge, if `free_entry_reason` is set, render a muted secondary badge:

- Format: `[Free: {reason}]` e.g. `[Free: Topcut]`, `[Free: Vanguard]`
- Style: uses the existing free badge colors but at reduced opacity (~60%) to visually subordinate it to the primary paid badge
- Only appears for paid subscribers with a `free_entry_reason`

### 6. Env Changes

**`.env.local.example`** — add:
```
ARENA_VANGUARD_ROLE_IDS=
```

### 7. Backfill

Re-run existing backfill (`backfillPatreon`) after updating `ECL_ELIGIBLE_PATREON_TIERS` to include Bronze/Silver. This populates `dashboard_patreon_snapshots` with Bronze/Silver members for all months they were active. The income logic filters them to only count in January 2026.

## Hardcoded One-Offs

| Rule | Month | Logic Location |
|------|-------|----------------|
| Zero subscription income | 2025-12 | `lib/subscription-income.ts` |
| Bronze/Silver count for income | 2026-01 | `lib/subscription-income.ts` |
| Expanded free entry detection | 2026-01+ | `lib/subscribers.ts` (role-based, not month-gated) |

## Files Changed

| File | Change |
|------|--------|
| `lib/constants.ts` | Add `ARENA_VANGUARD_ROLE_IDS`, `PATREON_TIER_NET`, expand `ECL_ELIGIBLE_PATREON_TIERS` |
| `lib/types.ts` | Add `free_entry_reason: string \| null` to `Subscriber` |
| `lib/subscribers.ts` | Secondary pass for free entry reason on paid subscribers |
| `lib/subscription-income.ts` | Per-tier aggregation, Dec zero, Jan Bronze/Silver inclusion |
| `components/subscribers/subscriber-table.tsx` | Muted secondary badge for `free_entry_reason` |
| `.env.local.example` | Add `ARENA_VANGUARD_ROLE_IDS` |

## No Changes To

- API routes (subscriber API already returns full `Subscriber` objects)
- DB schema (snapshots already have `tier` field)
- Stat cards (dual-tag members count under paid source only)
- Filter logic
- Manual payment system
- Finance summary structure (just the income amounts change)
