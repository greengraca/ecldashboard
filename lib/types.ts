import type { ObjectId } from "mongodb";

// ─── Subscriber Types ───

export type SubscriptionSource = "patreon" | "kofi" | "free";

export interface Subscriber {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  source: SubscriptionSource;
  tier: string;
  is_playing: boolean;
  games_played: number;
  free_entry_reason: string | null;
  joined_at: string | null;
  expires_at: string | null;
}

export interface SubscriberSummary {
  total: number;
  patreon: number;
  kofi: number;
  free: number;
  paying_not_playing: number;
  churn: ChurnDataPoint[];
}

export interface ChurnDataPoint {
  month: string;
  new_subs: number;
  retained: number;
  churned: number;
  total: number;
}

// ─── Discord Types ───

export interface DiscordMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  roles: string[];
  joined_at: string;
}

// ─── Finance Types ───

export type TransactionType = "income" | "expense";
export type TransactionCategory =
  | "subscription"
  | "prize"
  | "operational"
  | "sponsorship"
  | "other";

export interface Transaction {
  _id?: ObjectId | string;
  month: string;
  date: string;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;
  currency: string;
  tags: string[];
  modified_by: string;
  created_at: string;
  updated_at: string;
}

export interface FixedCost {
  _id?: ObjectId | string;
  name: string;
  amount: number;
  category: "prize" | "operational";
  active: boolean;
  start_month: string;
  end_month: string | null;
  modified_by: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  fixed_costs: number;
  net: number;
  breakdown: {
    subscription: number;
    prize: number;
    operational: number;
    sponsorship: number;
    other: number;
  };
  subscription_income: SubscriptionIncome;
}

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

// ─── Player Types ───

export interface Player {
  uid: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  win_pct: number;
  rank: number | null;
  is_subscriber: boolean;
  subscription_source: SubscriptionSource | null;
}

export interface PlayerAchievements {
  top16: string[];   // months as "YYYY-MM"
  top4: string[];
  champion: string[];
}

export interface PlayerDetail extends Player {
  monthly_history: PlayerMonthStats[];
  first_month: string | null;
  achievements: PlayerAchievements;
}

export interface PlayerMonthStats {
  month: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  win_pct: number;
  rank: number | null;
}

export interface Standing {
  rank: number;
  uid: string;
  name: string;
  points: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  win_pct: number;
  avatar_url?: string | null;
}

export interface LiveStanding {
  rank: number;
  uid: string;
  name: string;
  discord: string;
  avatar_url?: string | null;
  points: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  win_pct: number;
  ow_pct: number;
  online_games: number;
  dropped: boolean;
  eligible: boolean;
}

// ─── Activity Types ───

export type ActivityAction = "create" | "update" | "delete" | "sync";

export interface ActivityEntry {
  _id?: ObjectId | string;
  action: ActivityAction;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  user_id: string;
  user_name: string;
  timestamp: string;
}

// ─── Dashboard User Types ───

export interface DashboardUser {
  _id: string; // discord user id
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ───

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
