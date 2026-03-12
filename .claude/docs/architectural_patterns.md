# Architectural Patterns

## API Response Contract

All API routes return `{ data: T }` on success or `{ error: string }` on failure. Defined in `lib/types.ts:ApiResult<T>`. The discriminated union uses `data?: never` / `error?: never` to make the two cases mutually exclusive at the type level.

**Files**: Every route in `app/api/`

**Error handling**: Every route wraps its logic in try-catch, logs to console with route identifier, returns 500 with generic message. Never leaks stack traces.

**Status codes**: 201 for creation, 401 for auth, 400 for validation, 404 for missing resources, 500 for server errors.

---

## MongoDB Lazy Singleton

`lib/mongodb.ts:getDb()` caches the connection on `globalThis._mongoCache` to survive HMR reloads in dev. The URI is read inside `getDb()` (not at module scope) so the build succeeds without env vars.

---

## In-Memory TTL Cache

Generic cache pattern used for expensive or rate-limited operations:

- `lib/discord.ts` — guild members, 5-minute TTL
- `lib/topdeck.ts` — reassembled dump payloads, 5-minute TTL

Both use a `Map<string, { data: T; expires: number }>` with helper functions `getCached` / `setCache`. Expiration checked on read. Manual `clear` functions exposed for sync operations.

---

## Multi-Source Data Enrichment

Pattern: fetch independent data in parallel via `Promise.all()`, build `Map` lookups from results, then iterate the primary dataset enriching with O(1) lookups.

- `lib/subscribers.ts:getSubscribers` — fetches members, subs_access, subs_free_entries, online_games in parallel, builds lookup maps, enriches member list
- `lib/players.ts:getPlayers` — fetches subscriber lookup and name lookup in parallel, enriches player standings

Prevents N+1 query patterns.

---

## Activity Audit Trail

Every data mutation calls `lib/activity.ts:logActivity()` which inserts into `dashboard_activity_log`. Convention for `details` field:

- **create**: log key fields of created document (description, amount, type)
- **update**: log `updated_fields: Object.keys(data)` — which fields changed
- **delete**: log original document fields for forensic reference

Called from `lib/finance.ts` for all transaction/fixed-cost mutations.

---

## SWR Data Fetching

All pages use SWR with a shared `fetcher` function. After mutations, related SWR keys are revalidated via `mutate()` calls. Activity page uses `keepPreviousData: true` for smooth pagination.

Pattern: `const { data, isLoading, error, mutate } = useSWR(url, fetcher);`

---

## Auth Guard (Two Layers)

1. **Middleware** (`middleware.ts`): redirects unauthenticated requests to `/login` (except `/login` and `/api/auth/*`)
2. **API route checks**: mutation endpoints call `auth()` and verify `session?.user?.id` before proceeding, returning 401 if missing

User identity from session is passed to `logActivity()` for attribution.

---

## Read-Only vs Dashboard-Owned Collections

Bot collections are **never written to** by the dashboard:
- `subs_access`, `subs_free_entries`, `subs_kofi_events`, `online_games`, `topdeck_month_dump_runs`, `topdeck_month_dump_chunks`

Dashboard-owned collections have full CRUD:
- `dashboard_transactions`, `dashboard_fixed_costs`, `dashboard_activity_log`

Access to bot collections uses try-catch with graceful fallback to handle cases where collections may not exist.

---

## TopDeck Standings Computation

`lib/topdeck.ts:computeStandings()` ports the bot's staking model:
- START_POINTS = 1000, WAGER_RATE = 0.1
- Each match: players stake 10% of current points into pot
- Winner takes entire pot; draws split evenly
- Ranking: sort by (-points, -games)
- A match is valid if `winner !== null` and `es.length >= 2`

Month dump chunks are reassembled by fetching from `topdeck_month_dump_chunks`, sorting by `chunk_index`, concatenating `data` strings, then `JSON.parse()`.
