# Data Model

## Bot Collections (Read-Only — never write)

| Collection | Key Fields | Unique Index |
|---|---|---|
| `subs_access` | `guild_id`, `user_id`, `month`, `kind`, `starts_at`, `expires_at`, `sources[]`, `txn_ids[]` | `(guild_id, user_id, month)` |
| `subs_free_entries` | `guild_id`, `user_id`, `month` | `(guild_id, user_id, month)` |
| `subs_kofi_events` | `txn_id`, `guild_id`, `user_id` (Int64), `source`, `purchase_month`, `effective_month`, `amount`, `currency` | `txn_id` |
| `online_games` | `bracket_id`, `year`, `month`, `season`, `tid`, `entrant_ids[]`, `topdeck_uids[]` | `(bracket_id, year, month, season, tid)` |
| `topdeck_month_dump_runs` | `bracket_id`, `month`, `run_id`, `created_at`, `chunk_count` | — |
| `topdeck_month_dump_chunks` | `run_id`, `run_doc_id`, `chunk_index`, `data` (string fragment) | — |

Access uses try-catch with graceful fallback for missing collections.

## Dashboard Collections (Full CRUD)

| Collection | Key Fields | Unique Index |
|---|---|---|
| `dashboard_transactions` | `month`, `date`, `type` (income\|expense), `category`, `description`, `amount`, `currency` (EUR), `tags[]` | — |
| `dashboard_fixed_costs` | `name`, `amount`, `category`, `active`, `start_month`, `end_month` | — |
| `dashboard_fixed_cost_payments` | `fixed_cost_id`, `month`, `paid_by`, `amount`, `reimbursed` | — |
| `dashboard_activity_log` | `action`, `entity_type`, `entity_id`, `details`, `user_id`, `user_name`, `timestamp` | — |
| `dashboard_subscription_rates` | `effective_from` (YYYY-MM), `patreon_net`, `kofi_net`, `manual_net` | `effective_from` |
| `dashboard_patreon_snapshots` | `month`, `patreon_user_id`, `discord_id` (polymorphic*), `patreon_name`, `tier`, `pledge_amount` | `(month, patreon_user_id)` |
| `dashboard_manual_payments` | `month`, `discord_id`, `marked_by` | `(month, discord_id)` |
| `dashboard_kofi_backfill` | `month`, `discord_username`, `transaction_id`, `amount` | `(month, discord_username, transaction_id)` |
| `dashboard_player_identities` | `discord_id`, `discord_username`, `topdeck_uid`, `display_name` | `discord_id` |
| `dashboard_bracket_results` | `month`, `top16_winners[]`, `top4_order[]`, `top4_winner` | `month` |
| `dashboard_prizes` | `month`, `category`, `name`, `value`, `recipient_type`, `placement`, `recipient_uid`, `shipping_status`, `transaction_id`, `status` | — |
| `dashboard_prize_budgets` | `month`, `total_budget`, `allocations`, `notes` | `month` |
| `dashboard_media_files` | `name`, `type` (file\|folder), `mimeType`, `size`, `r2Key`, `thumbR2Key`, `parentId`, `path`, `sortOrder`, `uploadedBy`, `createdAt`, `updatedAt` | `(parentId, name)` unique |
| `dashboard_error_log` | `level`, `source`, `message`, `details`, `timestamp`, `created_at` | TTL 30d on `created_at`; `(level, timestamp)` |
| `dashboard_caption_templates` | `templateId`, `captionTemplate`, `updatedAt`, `updatedBy` | `templateId` |

*Polymorphic `discord_id`: API-synced = real snowflake (all digits), CSV-backfilled = discord username. Check `/^\d+$/.test(value)`.

## Queries & Eligibility

Fixed cost active: `active: true` AND `start_month <= month` AND (`end_month` null OR `>= month`). Subscription eligibility: see `domain_subscriptions.md`. Top 16 eligibility: see `domain_standings.md` (total-games rule from 2026-05, freeze-aware in `lib/top16-eligibility.ts`).

## Type Conventions

- `_id`: `ObjectId | string`. DB fields use `snake_case`. All interfaces in `lib/types.ts`. Amounts are numbers, currency always "EUR".
- **BSON Long**: Bot collections store Discord snowflakes as Int64. Use `.toString()` method (not `String()`).
