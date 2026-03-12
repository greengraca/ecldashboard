function parseIntSet(csv: string | undefined): Set<number> {
  if (!csv) return new Set();
  const out = new Set<number>();
  for (const part of csv.split(",")) {
    const trimmed = part.trim();
    if (trimmed && /^\d+$/.test(trimmed)) {
      out.add(parseInt(trimmed, 10));
    }
  }
  return out;
}

export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";

export const PATREON_ROLE_IDS = parseIntSet(process.env.PATREON_ROLE_IDS);
export const KOFI_ROLE_IDS = parseIntSet(process.env.KOFI_ROLE_IDS);
export const FREE_ENTRY_ROLE_IDS = parseIntSet(process.env.FREE_ENTRY_ROLE_IDS);
export const JUDGE_ROLE_IDS = parseIntSet(process.env.JUDGE_ROLE_IDS);
export const ECL_MOD_ROLE_IDS = parseIntSet(process.env.ECL_MOD_ROLE_IDS);
export const ARENA_VANGUARD_ROLE_IDS = parseIntSet(process.env.ARENA_VANGUARD_ROLE_IDS);

export const TOPDECK_BRACKET_ID = process.env.TOPDECK_BRACKET_ID || "";

export const ALLOWED_DISCORD_IDS = parseIntSet(
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

export const PATREON_CREATOR_TOKEN = process.env.PATREON_CREATOR_TOKEN || "";
