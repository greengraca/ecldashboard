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

export interface DataHealthWarning {
  source: string;
  message: string;
}

export interface SubscriberSummary {
  total: number;
  patreon: number;
  kofi: number;
  free: number;
  paying_not_playing: number;
  churn: ChurnDataPoint[];
  registered_players: number | null;
  data_warnings: DataHealthWarning[];
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
  paid_by?: string | null;
  reimbursed?: boolean;
  reimbursed_at?: string | null;
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
  paid_by?: string | null;
  modified_by: string;
  created_at: string;
  updated_at: string;
}

export interface FixedCostPayment {
  _id?: ObjectId | string;
  fixed_cost_id: string;
  month: string;
  paid_by: string;
  amount: number;
  reimbursed: boolean;
  reimbursed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupSummary {
  month: string;
  total_income: number;
  total_expenses: number;
  total_net: number;
  profit_split: number;
  groups: { cedhpt: GroupDetail; ca: GroupDetail };
  pending_reimbursements: PendingReimbursement[];
}

export interface GroupDetail {
  label: string;
  profit_share: number;
  expenses_paid: number;
  pending: number;
}

export interface PendingReimbursement {
  id: string;
  source: "transaction" | "fixed_cost";
  description: string;
  amount: number;
  paid_by: string;
  paid_by_name: string;
  date: string;
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

export interface SubscriptionBreakdownEntry {
  name: string;
  discord_id?: string;
  topdeck_uid?: string;
  tier?: string;
  amount: number;
}

export interface SubscriptionIncomeBreakdown {
  patreon: SubscriptionBreakdownEntry[];
  kofi: SubscriptionBreakdownEntry[];
  manual: SubscriptionBreakdownEntry[];
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
  pledge_start: string | null;
  last_charge_date: string | null;
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
  avatar_url?: string | null;
}

export interface PlayerAchievements {
  top16: string[];   // months as "YYYY-MM"
  top4: string[];
  champion: string[];
}

export interface PlayerDetail extends Player {
  discord_username: string | null;
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
  meets_recency: boolean;
}

// ─── Prize Types ───

export type PrizeCategory = "mtg_single" | "sponsor" | "treasure_pod" | "ticket" | "ring" | "other";
export type RecipientType = "placement" | "most_games" | "treasure_pod" | "top16" | "custom";
export type ShippingStatus = "not_applicable" | "pending" | "shipped" | "delivered";
export type PrizeStatus = "planned" | "confirmed" | "awarded";

export interface Prize {
  _id?: ObjectId | string;
  month: string;
  category: PrizeCategory;
  name: string;
  description: string;
  image_url: string | null;
  r2_key: string | null;
  value: number;
  recipient_type: RecipientType;
  placement: number | null;
  recipient_uid: string | null;
  recipient_name: string;
  recipient_discord_id: string | null;
  shipping_status: ShippingStatus;
  tracking_number: string | null;
  shipping_date: string | null;
  delivery_date: string | null;
  shipping_notes: string | null;
  transaction_id: string | null;
  status: PrizeStatus;
  created_by: string;
  modified_by: string;
  created_at: string;
  updated_at: string;
}

export interface PrizeBudgetAllocations {
  placement_1st: number;
  placement_2nd: number;
  placement_3rd: number;
  placement_4th: number;
  most_games: number;
  treasure_pods: number;
  top16: number;
  ring: number;
  other: number;
}

export interface PrizeBudget {
  _id?: ObjectId | string;
  month: string;
  total_budget: number;
  allocations: PrizeBudgetAllocations;
  notes: string;
  created_by: string;
  modified_by: string;
  created_at: string;
  updated_at: string;
}

export interface PrizeSummary {
  total_prizes: number;
  total_value: number;
  awarded: number;
  pending_shipment: number;
  shipped: number;
  delivered: number;
  budget_remaining: number | null;
}

// ─── Activity Types ───

export type ActivityAction = "create" | "update" | "delete" | "sync" | "join" | "detect" | "end";

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

// ─── Treasure Pod Types ───

export interface TreasurePodTypeConfig {
  type: string;
  count: number;
  title: string;
  description: string;
  image_url: string | null;
}

export interface TreasurePodSchedule {
  _id?: ObjectId | string;
  guild_id: string;
  month: string;
  estimated_total: number;
  player_count_at_creation: number;
  fired_tables: number[];
  pod_types_config: TreasurePodTypeConfig[];
}

export interface TreasurePod {
  _id?: ObjectId | string;
  guild_id: string;
  month: string;
  table: number;
  status: "pending" | "won" | "draw";
  pod_type: string;
  pod_title: string;
  pod_description: string;
  pod_image_url: string | null;
  player_discord_ids: string[];
  player_topdeck_uids: string[];
  winner_entrant_id: string | null;
  winner_topdeck_uid: string | null;
  winner_discord_handle: string | null;
}

export interface TreasurePodClaim {
  _id?: ObjectId | string;
  treasure_pod_id: string;
  month: string;
  pod_type: string;
  claimed_at: string;
  claimed_by: string;
  friend_discord_id: string | null;
  friend_name: string | null;
  notes: string | null;
}

export interface TreasurePodTypeStat {
  type: string;
  title: string;
  total: number;
  triggered: number;
  won: number;
  claimed: number;
}

export interface TreasurePodWithClaim extends TreasurePod {
  claim?: TreasurePodClaim | null;
  triggered_at: string;
  winner_display_name: string | null;
}

export interface TreasurePodData {
  schedule: TreasurePodSchedule | null;
  pods: TreasurePodWithClaim[];
  stats: TreasurePodTypeStat[];
}

// ─── Treasure Pod Config Types ───

export interface TreasurePodMonthlyConfig {
  _id?: ObjectId | string;
  guild_id: string;
  month: string;
  pod_types: TreasurePodTypeConfig[];
  games_per_player: number;
  notes: string;
  status: "draft" | "active";
  created_by: string;
  modified_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Error Log Types ───

export type ErrorLogLevel = "error" | "warn" | "info";

export interface ErrorLogEntry {
  _id?: ObjectId | string;
  level: ErrorLogLevel;
  source: string;
  message: string;
  details: Record<string, unknown> | null;
  timestamp: string;
  created_at: Date;
}

// ─── Calendar Types ───

export type CalendarEventType = "league" | "feature" | "deadline" | "urgent" | "meeting";

export interface RecurrencePattern {
  day_of_month: number;
  months?: string[];
}

export interface CalendarEventSource {
  type: "meeting" | "manual";
  meeting_id?: string;
}

export interface CalendarEvent {
  _id?: ObjectId | string;
  title: string;
  date: string;
  type: CalendarEventType;
  recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  template_id?: string;
  source?: CalendarEventSource;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarTemplate {
  _id?: ObjectId | string;
  title: string;
  type: CalendarEventType;
  day_of_month: number;
  active: boolean;
  created_by: string;
  created_at: string;
}

// ─── User Mapping Types ───

export type TeamMemberColor = "amber" | "blue" | "green" | "purple" | "red";

export interface UserMapping {
  _id?: ObjectId | string;
  discord_id: string;
  discord_username: string;
  firebase_uid: string;
  display_name: string;
  color: TeamMemberColor;
  avatar_url?: string | null;
  created_at: string;
}

// ─── Meeting Types ───

export type MeetingStatus = "active" | "ended";

export interface MeetingAttendee {
  discord_id: string;
  display_name: string;
  color: TeamMemberColor;
  avatar_url?: string | null;
  joined_at: string;
}

export interface Meeting {
  _id?: ObjectId | string;
  number: number;
  title: string;
  date: string;
  started_at: string;
  ended_at?: string;
  status: MeetingStatus;
  attendees: MeetingAttendee[];
  present_ids?: string[];
  created_by: string;
  created_at: string;
}

export interface MeetingNote {
  _id?: ObjectId | string;
  meeting_id: string;
  author_discord_id: string;
  author_name: string;
  author_color: TeamMemberColor;
  content: string;
  timestamp: string;
}

export type MeetingItemType = "task" | "deadline" | "prize";
export type MeetingItemStatus = "pending" | "accepted" | "dismissed";

export interface MeetingItemMetadata {
  assignee_discord_id?: string;
  assignee_name?: string;
  due_date?: string;
  date?: string;
  event_type?: string;
  budget?: number;
  breakdown?: Record<string, number | string>;
}

export interface MeetingItem {
  _id?: ObjectId | string;
  meeting_id: string;
  type: MeetingItemType;
  title: string;
  status: MeetingItemStatus;
  metadata: MeetingItemMetadata;
  source_quote: string;
  created_entity_id?: string;
  created_entity_type?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// ─── Taskpad Types ───

export interface TaskpadTask {
  id: string;
  text: string;
  done: boolean;
  deleted?: boolean;
  createdByUid: string;
  createdByEmail?: string | null;
  ts: number;
  order?: number;
  updatedAt?: number;
  source_meeting_id?: string;
  source_meeting_number?: number;
}

// ─── Media Drive Types ───

export interface MediaFile {
  _id: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  size?: number;
  r2Key?: string;
  thumbR2Key?: string;
  parentId: string | null;
  path: string;
  previewUrl?: string;
  folderPreviews?: string[];
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}
