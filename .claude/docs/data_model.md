# Data Model

## Bot Collections (Read-Only)

These are owned by eclBot (Python Discord bot). The dashboard reads but NEVER writes to them.

### `subs_access`
Subscription access records. Key fields: `guild_id`, `user_id`, `month`, `kind` ("kofi-one-time" or others), `starts_at`, `expires_at`, `sources[]`, `txn_ids[]`.
Unique index on `(guild_id, user_id, month)`.

### `subs_free_entries`
Free entry grants. Key fields: `guild_id`, `user_id`, `month`.
Unique index on `(guild_id, user_id, month)`.

### `subs_kofi_events`
Ko-fi transaction audit log. Key fields: `txn_id`, `guild_id`, `user_id`, `source`, `amount`, `currency`.
Unique index on `txn_id`.

### `online_games`
Game records. Key fields: `bracket_id`, `year`, `month`, `season`, `tid`, `entrant_ids[]`, `topdeck_uids[]`.
Unique index on `(bracket_id, year, month, season, tid)`.

### `topdeck_month_dump_runs`
Metadata for monthly dump runs. Key fields: `bracket_id`, `month`, `run_id`, `created_at`, `chunk_count`.

### `topdeck_month_dump_chunks`
Chunked JSON payloads. Key fields: `bracket_id`, `month`, `run_id`, `run_doc_id`, `chunk_index`, `data` (string fragment).
Reassemble by sorting on `chunk_index`, concatenating `data`, then `JSON.parse()`.

---

## Dashboard Collections (Full CRUD)

### `dashboard_transactions`
Financial transactions. Fields: `month`, `date`, `type` ("income"|"expense"), `category` ("subscription"|"prize"|"operational"|"sponsorship"|"other"), `description`, `amount`, `currency` ("EUR"), `tags[]`, `modified_by`, `created_at`, `updated_at`.

### `dashboard_fixed_costs`
Recurring monthly costs. Fields: `name`, `amount`, `category` ("prize"|"operational"), `active` (boolean), `start_month`, `end_month` (null = ongoing), `modified_by`, `created_at`, `updated_at`.

Active fixed costs for a month: `active: true` AND `start_month <= month` AND (`end_month` is null OR `end_month >= month`).

### `dashboard_activity_log`
Audit trail. Fields: `action` ("create"|"update"|"delete"|"sync"), `entity_type`, `entity_id`, `details` (object), `user_id`, `user_name`, `timestamp`.

---

## Subscription Eligibility (Priority Order)

Checked in `lib/subscribers.ts:getSubscribers()`:

1. Has any Patreon Discord role → source: "patreon"
2. Has any Ko-fi Discord role → source: "kofi"
3. Has any free-entry Discord role → source: "free"
4. Has DB free entry (`subs_free_entries`) → source: "free"
5. Has valid Ko-fi one-time pass (`subs_access` where `kind="kofi-one-time"`, current time within `starts_at`/`expires_at`) → source: "kofi"

Role IDs configured via `PATREON_ROLE_IDS`, `KOFI_ROLE_IDS`, `FREE_ENTRY_ROLE_IDS` env vars, parsed in `lib/constants.ts`.

---

## Type Conventions

- `_id` fields typed as `ObjectId | string` (MongoDB native vs JSON serialized)
- Database field names use `snake_case` (matches eclBot's Python conventions)
- All TypeScript interfaces defined in `lib/types.ts`
- Amounts are numbers (not strings), currency always "EUR"
