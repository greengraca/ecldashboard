# ECL Dashboard

Management dashboard for the European cEDH League (~5-person team). Shares a MongoDB Atlas cluster with eclBot (Python Discord bot) — reads bot collections for subscriber/player data, owns separate collections for finances and audit logging.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS v4 + CSS variables (dark glassmorphism) — see `.claude/docs/ui_conventions.md`
- **Database**: `mongodb` Node.js driver (no Mongoose/Prisma), lazy singleton via `lib/mongodb.ts:getDb()`
- **Auth**: NextAuth v5 + Discord OAuth, allowlist in `DASHBOARD_ALLOWED_DISCORD_IDS`
- **Client data**: SWR for fetching/caching, `lucide-react` for icons
- **Hosting**: Vercel free tier

## Commands

```bash
npm run dev      # Dev server (Turbopack)
npm run build    # Production build (works without env vars)
npm run start    # Production server
npm run lint     # ESLint
```

## Project Structure

```
app/
├── (auth)/login/           # Discord OAuth login page
├── (dashboard)/            # Auth-gated layout with sidebar
│   ├── page.tsx            # Home — stat cards, recent activity, quick links
│   ├── subscribers/        # Subscriber table, sync, churn
│   ├── finance/            # Transactions CRUD, fixed costs, P&L
│   ├── players/            # Player list, Top 16, [uid] detail
│   ├── activity/           # Paginated activity log with filters
│   └── settings/           # User profile, environment info
└── api/                    # REST routes (see below)

components/
├── dashboard/              # StatCard, DataTable, Modal, MonthPicker, Sidebar
├── subscribers/            # SubscriberTable, SyncButton
├── finance/                # TransactionForm, TransactionTable, FixedCostManager, BalanceCard
├── players/                # PlayerTable, StandingsTable, PlayerDetail
└── activity/               # ActivityTable, ActivityFilters

lib/
├── mongodb.ts              # MongoClient singleton (globalThis cache, lazy init)
├── auth.ts                 # NextAuth config — signIn, signOut, auth exports
├── types.ts                # All TypeScript interfaces
├── constants.ts            # Env var parsing — role IDs, guild ID, bracket ID
├── discord.ts              # Discord REST API — fetchGuildMembers (5-min cache)
├── subscribers.ts          # Aggregates Patreon/Ko-fi/Free from roles + DB
├── finance.ts              # Transaction/fixed-cost CRUD + monthly P&L
├── activity.ts             # logActivity() — audit trail writer
├── topdeck.ts              # TopDeck dump reassembly + standings computation
└── players.ts              # Player list, detail, standings from dumps
```

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/subscribers` | GET | Subscriber list + summary for `?month=` |
| `/api/subscribers/sync` | POST | Clear Discord cache, re-fetch members |
| `/api/discord/members` | GET | Cached Discord guild members |
| `/api/finance/transactions` | GET, POST | List by month / create transaction |
| `/api/finance/transactions/[id]` | PATCH, DELETE | Update / delete transaction |
| `/api/finance/fixed-costs` | GET, POST | List all / create fixed cost |
| `/api/finance/fixed-costs/[id]` | PATCH, DELETE | Update / delete fixed cost |
| `/api/finance/summary` | GET | Monthly P&L (`?month=` or `?months=`) |
| `/api/players` | GET | Player list with `?month=` |
| `/api/players/[uid]` | GET | Single player detail + history |
| `/api/players/standings` | GET | Top 16 standings with `?month=` |
| `/api/activity` | GET | Paginated log (`?page=&limit=&action=&entity_type=&from=&to=`) |

All routes return `{ data: T }` or `{ error: string }`. Mutation routes check `auth()` and return 401 if unauthenticated.

## Key Lib Functions

| Function | File | Purpose |
|----------|------|---------|
| `getDb()` | `lib/mongodb.ts` | Get MongoDB Db instance (cached singleton) |
| `auth()` | `lib/auth.ts` | Get current session (server-side) |
| `fetchGuildMembers()` | `lib/discord.ts` | Discord REST with 5-min cache |
| `getSubscribers(month)` | `lib/subscribers.ts` | Aggregate all subscription sources |
| `logActivity(action, ...)` | `lib/activity.ts` | Write audit log entry |
| `computeStandings(matches, ids)` | `lib/topdeck.ts` | Staking model (1000 start, 10% wager) |
| `reassembleMonthDump(info)` | `lib/topdeck.ts` | Chunk reassembly + JSON parse |
| `getMonthlySummary(month)` | `lib/finance.ts` | Income - expenses - fixed costs |

## Environment Variables

See `.env.local.example`. The build succeeds without them (lazy MongoDB init).

## Additional Documentation

Check these when working on specific areas:

- **`.claude/docs/architectural_patterns.md`** — API response contract, caching strategy, auth guard layers, data enrichment pattern, audit trail conventions, TopDeck standings math
- **`.claude/docs/ui_conventions.md`** — CSS variable theming rules, reusable component APIs, badge/loading/form patterns, date format conventions
- **`.claude/docs/data_model.md`** — MongoDB collection schemas (bot read-only vs dashboard-owned), subscription eligibility priority, type conventions
