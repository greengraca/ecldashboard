# Domain: Standings & Players

## Dump Data Flow

```
topdeck_month_dump_runs (bracket_id + month → latest run_id by created_at)
  → topdeck_month_dump_chunks (run_id, sort by chunk_index)
  → concatenate chunk.data → JSON.parse → MonthDumpPayload
Fallback: If entrant_to_uid missing (Dec 2025, Jan 2026), fetch Firestore doc → parse E{id}:P1 fields
```

Key: `lib/topdeck.ts:reassembleMonthDump()` — 5-min in-memory cache.

## Standings Computation (Staking Model)

```
lib/topdeck.ts:computeStandings(matches, allEntrantIds)
  START_POINTS=1000, WAGER_RATE=0.07 (env). Each match: participants wager 7%, winner takes pot, draws split.
  Sort by (-points, -games). Match valid if winner !== null && es.length >= 2.
  One UID may have multiple entrant_ids → aggregate by UID.

lib/topdeck-live.ts — same model + OW%. Sort by (-points, -ow_pct, -win_pct).
  Extra filter: !mute && end !== null.
```

## Live vs Historical

| | Historical (dumps) | Live (current month) |
|---|---|---|
| Source | MongoDB dump runs/chunks | Firestore doc + PublicPData |
| Function | `reassembleMonthDump()` → `computeStandings()` | `fetchLiveStandings()` |
| File | `lib/topdeck.ts` | `lib/topdeck-live.ts` |
| Extra | — | OW%, drop state |
| Cache | 5-min (dump), 30-min (PublicPData) | 5-min |

`lib/players.ts:getPlayerDetail()` merges both: historical from dumps, current from live if not yet dumped.

## Player Name Resolution

`TopDeck UID → fetchPublicPData(bracket_id) → { name, discord }`. Each bracket has its own PublicPData — use correct bracket_id per month, not `TOPDECK_BRACKET_ID`.

**PublicPData URL**: `https://topdeck.gg/PublicPData/{bracket_id}` — NOT `/api/v2/brackets/...`. Central cache in `lib/topdeck-cache.ts` (30-min TTL).

## Top 16 / Top 4

- **Eligibility (total-games rule, effective 2026-05)**: not dropped + `games >= TOP16_MIN_TOTAL_GAMES` (10) + recency. Recency: `games >= TOP16_NO_RECENCY_GAMES` (20) auto-passes, otherwise need a game on/after day `TOP16_RECENCY_AFTER_DAY` (default 20, applies from 2026-03). Predicate lives in `lib/top16-eligibility.ts` and is **freeze-aware** via `usesTotalGamesRule(month)` — months `< TOP16_TOTAL_GAMES_FROM` (default `"2026-05"`) stay frozen on the old online-games rule for historical display. The boundary value must match eclBot's effective month.
- **Snake-draft**: `[0,1,2,3,3,2,1,0,0,1,2,3,3,2,1,0]`
- **Results**: `dashboard_bracket_results` — `top16_winners[]`, `top4_order[]`, `top4_winner`
- **Firestore seasons**: 0=Swiss, 1=Top 16, 2=Top 4 (same doc, no separate bracket)
- **Consumers**: `getEligibleTop16(month)` in `lib/players.ts` (used by prize auto-populate + Dragon Shield codes) and the live standings route both call `isTop16Eligible` from `lib/top16-eligibility.ts`.

## Cross-Domain

- **→ Subscribers**: Game counts feed `is_playing`/`games_played`. Bracket registration determines Gold/Diamond filtering.
- **→ Finance**: Indirect via bracket registration → subscription income exclusions.

## Gotchas

- **Multiple entrant IDs per UID**: Player can re-register mid-month. Always aggregate by UID.
- **Schema v1 dumps**: All dumps so far. Dec 2025 + Jan 2026 lack `entrant_to_uid`; Feb 2026 has it. Always check `raw.entrant_to_uid`.
- **Dump discovery**: Query `topdeck_month_dump_runs` first (latest by `created_at`), then load chunks by `run_id`.
- **Current month has no dump**: Fall back to live Firestore + PublicPData.
