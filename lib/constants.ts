function parseStringSet(csv: string | undefined): Set<string> {
  if (!csv) return new Set();
  const out = new Set<string>();
  for (const part of csv.split(",")) {
    const trimmed = part.trim();
    if (trimmed && /^\d+$/.test(trimmed)) {
      out.add(trimmed);
    }
  }
  return out;
}

export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";

export const PATREON_ROLE_IDS = parseStringSet(process.env.PATREON_ROLE_IDS);
export const KOFI_ROLE_IDS = parseStringSet(process.env.KOFI_ROLE_IDS);
export const FREE_ENTRY_ROLE_IDS = parseStringSet(process.env.FREE_ENTRY_ROLE_IDS);
export const JUDGE_ROLE_IDS = parseStringSet(process.env.JUDGE_ROLE_IDS);
export const ECL_MOD_ROLE_IDS = parseStringSet(process.env.ECL_MOD_ROLE_IDS);
export const ARENA_VANGUARD_ROLE_IDS = parseStringSet(process.env.ARENA_VANGUARD_ROLE_IDS);

export const TOPDECK_BRACKET_ID = process.env.TOPDECK_BRACKET_ID || "";

export const ALLOWED_DISCORD_IDS = parseStringSet(
  process.env.DASHBOARD_ALLOWED_DISCORD_IDS
);

export const ALL_SUB_ROLE_IDS = new Set([
  ...PATREON_ROLE_IDS,
  ...KOFI_ROLE_IDS,
  ...FREE_ENTRY_ROLE_IDS,
  ...JUDGE_ROLE_IDS,
  ...ECL_MOD_ROLE_IDS,
]);

export const FIRESTORE_DOC_URL_TEMPLATE = process.env.FIRESTORE_DOC_URL_TEMPLATE || "";
export const WAGER_RATE = parseFloat(process.env.WAGER_RATE || "0.07");

// ─── Top16 Eligibility Thresholds ───
export const TOP16_MIN_ONLINE_GAMES = parseInt(process.env.TOP16_MIN_ONLINE_GAMES || "10", 10);
export const TOP16_MIN_TOTAL_GAMES = parseInt(process.env.TOP16_MIN_TOTAL_GAMES || "10", 10);
export const TOP16_NO_RECENCY_GAMES = parseInt(process.env.TOP16_NO_RECENCY_GAMES || "20", 10);
export const TOP16_RECENCY_AFTER_DAY = parseInt(process.env.TOP16_RECENCY_AFTER_DAY || "20", 10);

// ─── Subscription Income ───

export const ECL_ELIGIBLE_PATREON_TIERS = ["ECL Grinder", "Gold", "Diamond", "Bronze", "Silver"];

// Net income per Patreon tier after ~10.9% Patreon fee.
// Gold/Diamond pay more but extra is donation — capped at Grinder rate.
export const PATREON_TIER_NET: Record<string, number> = {
  "Bronze": 2.67,
  "Silver": 4.45,
  "ECL Grinder": 5.79,
  "Gold": 5.79,
  "Diamond": 5.79,
};

export const DEFAULT_PATREON_NET = 5.79;
export const DEFAULT_KOFI_NET = 5.63;
export const DEFAULT_MANUAL_NET = 6.50;

// ─── Firebase / Taskpad ───
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
export const TASKPAD_TEAM_ID = process.env.TASKPAD_TEAM_ID || "";

export const PATREON_CREATOR_TOKEN = process.env.PATREON_CREATOR_TOKEN || "";
export const PATREON_CLIENT_ID = process.env.PATREON_CLIENT_ID || "";
export const PATREON_CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET || "";
export const PATREON_REFRESH_TOKEN = process.env.PATREON_REFRESH_TOKEN || "";

// ─── Team Members & Groups ───

export interface TeamMember {
  id: string;
  name: string;
  group: "cedhpt" | "ca";
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "kakah",    name: "Kakah",    group: "cedhpt" },
  { id: "graca",    name: "Graça",    group: "ca" },
  { id: "rodrigo",  name: "Rodrigo",  group: "ca" },
  { id: "ruka",     name: "Ruka",     group: "ca" },
  { id: "bezugas",  name: "Bezugas",  group: "ca" },
];

export const TREASURER_ID = "kakah";

export const GROUPS = {
  cedhpt: { label: "cedhpt", members: ["kakah"] },
  ca:     { label: "CommanderArena", members: ["graca", "rodrigo", "ruka", "bezugas"] },
} as const;
