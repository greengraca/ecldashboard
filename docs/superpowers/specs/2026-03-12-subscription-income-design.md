# Subscription Income Auto-Calculation

## Problem

The dashboard has no way to automatically calculate subscription income from paid members. Income is currently tracked entirely through manual transactions. There is also no historical record of who was subscribed each month — subscriber data is derived from live Discord roles, which change when members cancel.

## Solution Overview

Auto-calculate monthly subscription income from three sources (Patreon, Ko-fi, manual payments), each with platform-specific net amounts after fees. Store historical subscriber data so past months remain accurate. Provide configurable rates that apply from a given month forward.

## Data Sources & Storage

### Ko-fi Income

Read from existing `subs_kofi_events` collection (bot-owned, read-only). Each document has a `purchase_month` field (YYYY-MM format) and an `effective_month` field (may differ for late-month pre-registrations). Group by `purchase_month`, count distinct `user_id`s. Each payment = configurable net (default 5.63 EUR).

No new integration needed — the bot already stores every Ko-fi payment via its Discord channel webhook listener.

### Patreon Income

**Backfill (Dec 2025 – Mar 2026):** One-time script imports from Patreon CSV export. For each member, uses `Patronage Since Date` and `Last Charge Date`/`Last Charge Status` to determine active months. Filters to ECL-eligible tiers only (ECL Grinder, Gold, Diamond).

**Going forward:** Patreon API v2 with a Creator Access Token (long-lived, no OAuth flow). A sync action fetches active members on ECL-eligible tiers and writes to `dashboard_patreon_snapshots`.

**New env var:** `PATREON_CREATOR_TOKEN`

**Collection: `dashboard_patreon_snapshots`**
```
{
  month: "2026-03",
  discord_username: string | null,
  patreon_name: string,
  tier: string,
  pledge_amount: number,
  patreon_user_id: string,
  synced_at: string (ISO)
}
```
**Index:** Unique on `(month, patreon_user_id)`

**Sync flow (`lib/patreon.ts`):**
1. `GET /api/oauth2/v2/campaigns` — get campaign ID
2. `GET /api/oauth2/v2/campaigns/{id}/members` — fetch members with pledge status, tier, Discord social connection
3. Filter to ECL-eligible tiers (ECL Grinder, Gold, Diamond) with active paid status
4. Upsert into `dashboard_patreon_snapshots` for the target month
5. Log unrecognized tier names as warnings for review

### Manual Payments

Dashboard-owned collection for free-entry members who paid directly (full price, no platform fees). Manual-paid members remain `source: "free"` in the `Subscriber` type — the dashboard overlays a "Paid" badge on the UI by cross-referencing this collection. All manual payments are at the configured `manual_net` rate (no custom amounts).

**Collection: `dashboard_manual_payments`**
```
{
  month: "2026-03",
  discord_id: string,
  marked_by: string,
  created_at: string (ISO)
}
```
**Index:** Unique on `(month, discord_id)`

### Ko-fi CSV Backfill

One-time import of Ko-fi transaction CSVs (Dec 2025 – Mar 2026). Extracts Discord username (strip `#0` suffix), amount, and month from each row. Used to cross-reference with `subs_kofi_events` to ensure no gaps. If `subs_kofi_events` already covers these months fully, the CSV import is skipped. If gaps exist, missing records are written to `dashboard_kofi_backfill` (dashboard-owned, never writes to bot collections).

## Income Calculation

### Rate Configuration

**Collection: `dashboard_subscription_rates`**
```
{
  effective_from: "2025-12",
  patreon_net: 5.79,
  kofi_net: 5.63,
  manual_net: 6.50,
  created_by: string,
  created_at: string (ISO)
}
```
**Index:** Unique on `effective_from`

Rate entries are ordered by `effective_from`. When computing income for a given month, use the entry with the latest `effective_from <= month`. Settings page allows adding new rate entries effective from a chosen month (never retroactive — existing entries are immutable once created).

Default rates (hardcoded fallback when no DB entries exist): patreon 5.79, kofi 5.63, manual 6.50.

### Summary Computation

`getMonthlySummary()` in `lib/finance.ts` gains subscription income calculation:

1. Count Ko-fi payments for the month from `subs_kofi_events` (distinct `user_id` where `purchase_month = month`) + any records from `dashboard_kofi_backfill`
2. Count Patreon members for the month from `dashboard_patreon_snapshots`
3. Count manual payments from `dashboard_manual_payments`
4. Look up applicable rates from `dashboard_subscription_rates`
5. Compute: `(kofi_count x kofi_net) + (patreon_count x patreon_net) + (manual_count x manual_net)`

### Interaction with Existing Transactions

Subscription income is auto-calculated and **separate** from manually entered transactions. The `category: "subscription"` transaction category should no longer be used for subscription income going forward — it is superseded by the auto-calculation. Existing historical transactions with `category: "subscription"` remain untouched but are not double-counted: `breakdown.subscription` shows only the auto-calculated amount, while legacy subscription transactions are reclassified under `breakdown.other` in the summary computation.

### New `MonthlySummary` Field

```typescript
subscription_income: {
  patreon: { count: number; amount: number };
  kofi: { count: number; amount: number };
  manual: { count: number; amount: number };
  total: number;
}
```

`subscription_income.total` is added to `income` and `net`. The `breakdown.subscription` field reflects only the auto-calculated total.

### New TypeScript Types (in `lib/types.ts`)

```typescript
interface SubscriptionIncome {
  patreon: { count: number; amount: number };
  kofi: { count: number; amount: number };
  manual: { count: number; amount: number };
  total: number;
}

interface SubscriptionRate {
  _id?: ObjectId | string;
  effective_from: string;
  patreon_net: number;
  kofi_net: number;
  manual_net: number;
  created_by: string;
  created_at: string;
}

interface PatreonSnapshot {
  _id?: ObjectId | string;
  month: string;
  discord_username: string | null;
  patreon_name: string;
  tier: string;
  pledge_amount: number;
  patreon_user_id: string;
  synced_at: string;
}

interface ManualPayment {
  _id?: ObjectId | string;
  month: string;
  discord_id: string;
  marked_by: string;
  created_at: string;
}
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/subscribers/[discordId]/manual-payment` | POST | Mark as manual-paid for `?month=` |
| `DELETE /api/subscribers/[discordId]/manual-payment` | DELETE | Unmark manual-paid for `?month=` |
| `GET /api/finance/subscription-rates` | GET | Get rate history |
| `POST /api/finance/subscription-rates` | POST | Add new rate entry |
| `POST /api/patreon/sync` | POST | Trigger Patreon API sync for `?month=` (defaults to current month) |

All mutation routes require `auth()` and return 401 if unauthenticated. All mutations call `logActivity()` with entity types: `"manual_payment"`, `"subscription_rate"`, `"patreon_sync"`.

Existing `/api/finance/summary` response gains the `subscription_income` field.

## UI Changes

### Finance Page — Subscription Income Card

- Breakdown: X Patreon x rate, Y Ko-fi x rate, Z Manual x rate
- Total subscription income displayed prominently
- Sits alongside existing P&L summary cards
- "Sync Patreon" button to trigger Patreon API fetch for the selected month
- Error state shown if Patreon sync fails (token expired, API unreachable)

### Subscribers Page — Manual-Paid Toggle

- Free-tier subscribers get a "Mark as paid" action button
- When marked, shows "Paid" badge instead of "Free" / "Manual" tier
- Scoped to currently selected month
- Reversible (can unmark via same button)

### Settings Page — Subscription Rates Section

- Shows current active rates (patreon_net, kofi_net, manual_net)
- "Add new rates" form with month picker for `effective_from`
- Table showing rate history (immutable past entries)

## Patreon API Details

**Auth:** Creator Access Token from Patreon developer portal. Long-lived, no OAuth flow required (creator accessing own campaign data).

**Endpoints used:**
- `GET /api/oauth2/v2/campaigns` — discover campaign ID
- `GET /api/oauth2/v2/campaigns/{id}/members?include=currently_entitled_tiers,user&fields[member]=patron_status,pledge_relationship_start,last_charge_date,last_charge_status&fields[tier]=title,amount_cents&fields[user]=social_connections` — fetch members with tier and Discord info

**Matching to Discord:** Patreon API returns linked social connections including Discord. Members without Discord links fall back to manual matching or are flagged for review.

**ECL-eligible tiers:** ECL Grinder, Gold, Diamond (matched by tier title from API response). Unrecognized tier names are logged as warnings. As a secondary check, tiers with `amount_cents >= 650` are flagged for review if their title doesn't match known tiers.

**Error handling:** If the Patreon API is unreachable or returns errors, the sync fails gracefully — no partial writes. The UI shows the error message. If the Creator Access Token is expired/invalid, the error message instructs the user to regenerate it from Patreon.

## Backfill Script

One-time script exposed as `POST /api/admin/backfill-subscriptions` (auth-gated):

1. Parse Patreon CSV — for each member on ECL-eligible tier:
   - Determine active months from `Patronage Since Date` to `Last Charge Date` (or current if active)
   - Write to `dashboard_patreon_snapshots` for each month
2. Parse Ko-fi CSVs — verify `subs_kofi_events` has coverage for Dec 2025 – Mar 2026
   - If gaps exist, insert records into `dashboard_kofi_backfill`
3. Log activity for the backfill operation (`entity_type: "backfill"`)

## Constants

In `lib/constants.ts`:
- `ECL_ELIGIBLE_PATREON_TIERS = ["ECL Grinder", "Gold", "Diamond"]`
- Default subscription rates (used when no `dashboard_subscription_rates` entry exists):
  - `DEFAULT_PATREON_NET = 5.79`
  - `DEFAULT_KOFI_NET = 5.63`
  - `DEFAULT_MANUAL_NET = 6.50`

## MongoDB Indexes

| Collection | Index | Type |
|-----------|-------|------|
| `dashboard_patreon_snapshots` | `(month, patreon_user_id)` | Unique |
| `dashboard_manual_payments` | `(month, discord_id)` | Unique |
| `dashboard_subscription_rates` | `(effective_from)` | Unique |
| `dashboard_kofi_backfill` | `(month, discord_username)` | Unique |
