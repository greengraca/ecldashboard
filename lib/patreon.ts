import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { ECL_ELIGIBLE_PATREON_TIERS } from "./constants";
import { getAccessToken, refreshAccessToken } from "./patreon-token";
import type { PatreonSnapshot } from "./types";

const PATREON_API = "https://www.patreon.com/api/oauth2/v2";
const COLLECTION = "dashboard_patreon_snapshots";

interface PatreonMember {
  id: string;
  attributes: {
    patron_status: string;
    last_charge_date: string | null;
    last_charge_status: string | null;
    pledge_relationship_start: string | null;
    full_name: string;
  };
  relationships: {
    currently_entitled_tiers?: { data: { id: string; type: string }[] };
    user?: { data: { id: string; type: string } };
  };
}

interface PatreonTier {
  id: string;
  attributes: { title: string; amount_cents: number };
}

interface PatreonUser {
  id: string;
  attributes: {
    social_connections?: {
      discord?: { user_id: string; url?: string } | null;
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function patreonFetch(url: string, isRetry = false): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401 && !isRetry) {
      await refreshAccessToken();
      return patreonFetch(url, true);
    }
    const text = await res.text();
    throw new Error(`Patreon API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getCampaignId(): Promise<string> {
  const data = await patreonFetch(`${PATREON_API}/campaigns`);
  if (!data.data?.[0]?.id) {
    throw new Error("No Patreon campaign found");
  }
  return data.data[0].id;
}

export async function syncPatreonForMonth(
  month: string,
  userId: string,
  userName: string
): Promise<{ synced: number; skipped: number; warnings: string[] }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("PATREON_CREATOR_TOKEN not configured");
  }

  const campaignId = await getCampaignId();
  const warnings: string[] = [];

  // Fetch all members (paginated)
  const members: PatreonMember[] = [];
  const tiers: Map<string, PatreonTier> = new Map();
  const users: Map<string, PatreonUser> = new Map();

  let url: string | null =
    `${PATREON_API}/campaigns/${campaignId}/members` +
    `?include=currently_entitled_tiers,user` +
    `&fields[member]=patron_status,full_name,last_charge_date,last_charge_status,pledge_relationship_start` +
    `&fields[tier]=title,amount_cents` +
    `&fields[user]=social_connections` +
    `&page[size]=500`;

  while (url) {
    const page = await patreonFetch(url);

    for (const item of page.data || []) {
      members.push(item);
    }

    for (const inc of page.included || []) {
      if (inc.type === "tier") tiers.set(inc.id, inc);
      if (inc.type === "user") users.set(inc.id, inc);
    }

    url = page.links?.next || null;
  }

  // Process members — atomic: collect all docs first, then bulk write
  const db = await getDb();
  const collection = db.collection<PatreonSnapshot>(COLLECTION);
  let synced = 0;
  let skipped = 0;

  for (const member of members) {
    if (member.attributes.patron_status !== "active_patron") {
      skipped++;
      continue;
    }
    if (member.attributes.last_charge_status !== "Paid") {
      skipped++;
      continue;
    }

    const tierIds =
      member.relationships.currently_entitled_tiers?.data?.map((t) => t.id) ||
      [];
    const memberTiers = tierIds
      .map((id) => tiers.get(id))
      .filter((t): t is PatreonTier => !!t);

    const eclTier = memberTiers.find((t) =>
      ECL_ELIGIBLE_PATREON_TIERS.includes(t.attributes.title)
    );

    if (!eclTier) {
      for (const t of memberTiers) {
        if (
          !ECL_ELIGIBLE_PATREON_TIERS.includes(t.attributes.title) &&
          t.attributes.amount_cents >= 650
        ) {
          warnings.push(
            `Unrecognized tier "${t.attributes.title}" (${t.attributes.amount_cents}c) for ${member.attributes.full_name}`
          );
        }
      }
      skipped++;
      continue;
    }

    // Discord user ID from social connections (snowflake, not username)
    const patreonUserId = member.relationships.user?.data?.id;
    const user = patreonUserId ? users.get(patreonUserId) : null;
    const discordConnection =
      user?.attributes?.social_connections?.discord ?? null;
    const discordId = discordConnection?.user_id ?? null;

    const now = new Date().toISOString();
    await collection.updateOne(
      { month, patreon_user_id: patreonUserId || member.id },
      {
        $set: {
          month,
          discord_id: discordId,
          patreon_name: member.attributes.full_name,
          tier: eclTier.attributes.title,
          pledge_amount: eclTier.attributes.amount_cents / 100,
          patreon_user_id: patreonUserId || member.id,
          synced_at: now,
        },
      },
      { upsert: true }
    );

    synced++;
  }

  await logActivity(
    "sync",
    "patreon_sync",
    month,
    { synced, skipped, warnings_count: warnings.length },
    userId,
    userName
  );

  return { synced, skipped, warnings };
}
