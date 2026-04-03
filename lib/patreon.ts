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
): Promise<{ synced: number; skipped: number; removed: number; warnings: string[] }> {
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

  // Process members
  const db = await getDb();
  const collection = db.collection<PatreonSnapshot>(COLLECTION);
  const syncStartTime = new Date();
  let synced = 0;
  let skipped = 0;
  let formerIncluded = 0;

  // Helper: extract YYYY-MM from a date string
  function toMonth(dateStr: string | null): string | null {
    if (!dateStr) return null;
    return dateStr.slice(0, 7); // "2026-02-28T..." → "2026-02"
  }

  for (const member of members) {
    const status = member.attributes.patron_status;
    const isActive = status === "active_patron";
    const isFormer = status === "former_patron";

    if (!isActive && !isFormer) {
      skipped++;
      continue;
    }
    if (member.attributes.last_charge_status !== "Paid") {
      skipped++;
      continue;
    }

    // Skip patrons who started after the target month
    const pledgeStart = member.attributes.pledge_relationship_start || null;
    const pledgeStartMonth = toMonth(pledgeStart);
    if (pledgeStartMonth && pledgeStartMonth > month) {
      skipped++;
      continue;
    }

    // For former patrons: skip if their last charge was before the target month
    const lastChargeDate = member.attributes.last_charge_date || null;
    const lastChargeMonth = toMonth(lastChargeDate);
    if (isFormer) {
      if (!lastChargeMonth || lastChargeMonth < month) {
        skipped++;
        continue;
      }
    }

    // Resolve tier — active patrons have current entitlements, former patrons don't
    const tierIds =
      member.relationships.currently_entitled_tiers?.data?.map((t) => t.id) ||
      [];
    const memberTiers = tierIds
      .map((id) => tiers.get(id))
      .filter((t): t is PatreonTier => !!t);

    const eclTier = memberTiers.find((t) =>
      ECL_ELIGIBLE_PATREON_TIERS.includes(t.attributes.title)
    );

    const patreonUserId = member.relationships.user?.data?.id;

    // For former patrons with no current tier, look up their most recent snapshot
    let tierTitle: string | null = eclTier?.attributes.title ?? null;
    let pledgeAmount: number | null = eclTier
      ? eclTier.attributes.amount_cents / 100
      : null;

    if (!tierTitle && isFormer) {
      const prevSnapshot = await collection.findOne(
        { patreon_user_id: patreonUserId || member.id, tier: { $exists: true, $ne: "" } },
        { sort: { month: -1 } }
      );
      if (prevSnapshot) {
        tierTitle = prevSnapshot.tier;
        pledgeAmount = prevSnapshot.pledge_amount;
      } else {
        warnings.push(
          `Former patron "${member.attributes.full_name}" has no tier history — skipped`
        );
        skipped++;
        continue;
      }
    }

    if (!tierTitle) {
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
    const user = patreonUserId ? users.get(patreonUserId) : null;
    const discordConnection =
      user?.attributes?.social_connections?.discord ?? null;
    let discordId = discordConnection?.user_id ?? null;

    // Fallback: look up discord_id from player identities by exact patreon_name
    if (!discordId) {
      const identity = await db
        .collection("dashboard_player_identities")
        .findOne({ patreon_name: member.attributes.full_name });
      if (identity?.discord_id) {
        discordId = identity.discord_id as string;
      }
    }

    const now = new Date().toISOString();

    // Only overwrite discord_id when the API provides one — preserve manual patches
    const setFields: Record<string, unknown> = {
      month,
      patreon_name: member.attributes.full_name,
      tier: tierTitle,
      pledge_amount: pledgeAmount,
      patreon_user_id: patreonUserId || member.id,
      pledge_start: pledgeStart,
      last_charge_date: lastChargeDate,
      synced_at: now,
    };
    if (discordId) {
      setFields.discord_id = discordId;
    }

    await collection.updateOne(
      { month, patreon_user_id: patreonUserId || member.id },
      {
        $set: setFields,
        ...(!discordId ? { $setOnInsert: { discord_id: null } } : {}),
      },
      { upsert: true }
    );

    synced++;
    if (isFormer) formerIncluded++;
  }

  // Remove stale snapshots — patrons no longer in the API response for this month
  // (e.g. mid-month cancellations). Their synced_at is older than this sync run.
  const staleResult = await collection.deleteMany({
    month,
    synced_at: { $lt: syncStartTime.toISOString() },
  });
  const removed = staleResult.deletedCount;

  logActivity(
    "sync",
    "patreon_sync",
    month,
    { synced, skipped, removed, former_included: formerIncluded, warnings_count: warnings.length },
    userId,
    userName
  );

  return { synced, skipped, removed, warnings };
}
